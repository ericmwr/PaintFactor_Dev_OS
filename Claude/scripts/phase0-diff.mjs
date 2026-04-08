// Phase 0 diff harness.
//
// Runs the NEW scenario orchestrator against a synthetic drywall room and
// compares per-task hours against hand-computed expected values derived from
// the ORIGINAL SF_DRYWALL_WALL_NC_FINISH_v1 production.json.
//
// This isolates the comparison to the task-generation layer only. We don't
// try to run the full run-estimate.js pipeline (it requires db-bundle, state
// reducer, protection resolvers, etc.) — instead we derive expected values
// directly from the source spec, which is the same thing the old engine
// would compute.
//
// Usage:  node Claude/scripts/phase0-diff.mjs [scenario_id]
//
// Default scenario: SCN_DRYWALL_FINISH_QT3_SPRAY_BACKROLL

import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadScenarioBundle } from '../tools/paintscope/src/engine/scenario-loader.js';
import { runScenarioEstimate, runScenarioChain } from '../tools/paintscope/src/engine/run-estimate-scenario.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const REPO_ROOT  = path.resolve(__dirname, '..', '..');

// ============================================================
// SYNTHETIC ROOM
// ============================================================
// A single 12x10x9 drywall bedroom with primed walls, finished floor,
// standard height, standard complexity, smooth texture.
// Quantities derived by hand from those dimensions:
//   wall field:    2*(12+10)*9 = 396 SF   (round to 400)
//   ceiling edge:  2*(12+10)   = 44 LF
//   trim edges:    44 LF baseboard + ~30 LF door/window casing edges = 74 LF
//   floor vacuum:  12*10 = 120 SF
//   floor protect: 120 SF (fully finished)
//   rooms total:   1 EA

// Synthetic 12x10x9 bedroom with 2 windows, 1 door, baseboard around perimeter,
// casings on the door and windows, no other trim. Sums:
//   baseboard:    44 LF (perimeter, minus door opening = 41 LF, rounded to 44 for simplicity)
//   door casing:  17 LF (one door, ~17 LF per opening)
//   window casing: 14 LF (two windows, ~7 LF each)
//   trim_total:   75 LF (44 + 17 + 14)
//   trim_joints:  20 LF (estimate of joint count)
//   knot_count:   8 EA (typical solid wood)
//   casing_ends:  6 EA (3 ends per door, 1.5 per window x 2 = 3, total ~6)
//   wall_adjacent: 75 LF (matches trim total since trim is wall-mounted)
//   fixture_assets: 4 EA (door hardware sets and outlet/switch covers near trim)
const SYNTHETIC_ROOM_QTY = new Map([
  ['PS_SURFACE_SF.WALL_FIELD',          { value: 400 }],
  ['PS_SURFACE_SF.CEILING_FIELD',       { value: 120 }],
  ['PS_SURFACE_LF.TRIM_TOTAL',          { value: 75  }],
  ['PS_EDGE_LF.TO_CEILING',             { value: 44  }],
  ['PS_EDGE_LF.TO_WALL',                { value: 44  }],
  ['PS_EDGE_LF.TRIM_JOINTS',            { value: 20  }],
  ['PS_PROTECT_LF.TRIM_EDGES',          { value: 74  }],
  ['PS_PROTECT_LF.WALL_ADJACENT',       { value: 75  }],
  ['PS_PROTECT_SF.FLOOR_EXPOSED',       { value: 120 }],
  ['PS_PROTECT_SF.FLOOR_PERIMETER',     { value: 132 }],
  ['PS_PROTECT_EA.ASSET.FIXTURES',      { value: 4   }],
  ['PS_META.SF.FLOOR_VACUUM_AREA',      { value: 120 }],
  ['PS_META.EA.ROOMS_TOTAL',            { value: 1   }],
  ['PS_META.EA.CASING_END_COUNT',       { value: 6   }],
  ['PS_META.EA.KNOT_COUNT',             { value: 8   }],
  ['PS_OPENING_EA.WINDOW_OPENINGS_TOTAL', { value: 2 }],
  // Door quantities: 1 four-panel door, factory-primed by default
  ['PS_OPENING_EA.DOOR_OPENINGS_TOTAL',  { value: 1 }],
  ['PS_SURFACE_EA_SIDE.DOOR_SLAB',       { value: 2 }],
  ['PS_META.EA.DOOR_PANES_TOTAL',        { value: 0 }],
  // Window quantities: 2 windows, ~6 SF glass each = 12 SF, ~14 LF wall adjacent
  ['PS_OPENING_EA.WINDOW_TOTAL',         { value: 2  }],
  ['PS_PROTECT_SF.ASSET.GLASS_AREA',     { value: 12 }],
  ['PS_PROTECT_LF.WALL_ADJACENT_WINDOW', { value: 14 }],
  ['PS_PROTECT_LF.SILL',                 { value: 8  }],
  ['PS_PROTECT_EA.ASSET.HARDWARE_GROUPS',{ value: 2  }],
]);

const BASE_CTX_WALL = {
  substrate:          'drywall',
  surface:            'wall',
  surface_texture:    'smooth',
  height_band:        'STD',
  complexity:         'STD',
  floor_type:         'finished',
};

const BASE_CTX_CEILING = {
  substrate:          'drywall',
  surface:            'ceiling',
  surface_texture:    'smooth',
  height_band:        'STD',
  complexity:         'STD',
  floor_type:         'finished',
};

const BASE_CTX_TRIM = {
  substrate:           'trim',
  surface_texture:     'smooth',
  height_band:         'STD',
  complexity:          'STD',
  profile_complexity:  'standard',
  floor_type:          'finished',
};

const BASE_CTX_DOOR = {
  substrate:    'door_slab',
  height_band:  'STD',
  complexity:   'STD',
  floor_type:   'finished',
};

const BASE_CTX_WINDOW = {
  substrate:    'window',
  height_band:  'STD',
  complexity:   'STD',
  floor_type:   'finished',
  window_substrate_material: 'wood',
};

const SCENARIOS_TO_TEST = [
  // Wall finish scenarios (Phase 0)
  { scenario: 'SCN_DRYWALL_FINISH_QT2_ROLL',             qt: 'QT2', method: 'roll',           state: 'SS_PRIMED_FIELD', surface: 'wall' },
  { scenario: 'SCN_DRYWALL_FINISH_QT3_ROLL',             qt: 'QT3', method: 'roll',           state: 'SS_PRIMED_FIELD', surface: 'wall' },
  { scenario: 'SCN_DRYWALL_FINISH_QT3_SPRAY_BACKROLL',   qt: 'QT3', method: 'spray_backroll', state: 'SS_PRIMED_FIELD', surface: 'wall' },
  { scenario: 'SCN_DRYWALL_FINISH_QT4_SPRAY_BACKROLL',   qt: 'QT4', method: 'spray_backroll', state: 'SS_PRIMED_FIELD', surface: 'wall' },
  { scenario: 'SCN_DRYWALL_FINISH_QT5_SPRAY_BACKROLL',   qt: 'QT5', method: 'spray_backroll', state: 'SS_PRIMED_FIELD', surface: 'wall' },
  // Wall prime scenarios (Phase 1a)
  { scenario: 'SCN_DRYWALL_PRIME_QT3_ROLL',              qt: 'QT3', method: 'roll',           state: 'SS_BARE',         surface: 'wall' },
  { scenario: 'SCN_DRYWALL_PRIME_QT3_SPRAY_BACKROLL',    qt: 'QT3', method: 'spray_backroll', state: 'SS_BARE',         surface: 'wall' },
  { scenario: 'SCN_DRYWALL_PRIME_QT4_SPRAY_BACKROLL',    qt: 'QT4', method: 'spray_backroll', state: 'SS_BARE',         surface: 'wall' },
  // Ceiling prime scenarios (Phase 1b)
  { scenario: 'SCN_CEILING_PRIME_QT3_ROLL',              qt: 'QT3', method: 'roll',           state: 'SS_BARE',         surface: 'ceiling' },
  { scenario: 'SCN_CEILING_PRIME_QT3_SPRAY_BACKROLL',    qt: 'QT3', method: 'spray_backroll', state: 'SS_BARE',         surface: 'ceiling' },
  // Ceiling finish scenarios (Phase 1b)
  { scenario: 'SCN_CEILING_FINISH_QT3_ROLL',             qt: 'QT3', method: 'roll',           state: 'SS_PRIMED_FIELD', surface: 'ceiling' },
  { scenario: 'SCN_CEILING_FINISH_QT3_SPRAY_BACKROLL',   qt: 'QT3', method: 'spray_backroll', state: 'SS_PRIMED_FIELD', surface: 'ceiling' },
  { scenario: 'SCN_CEILING_FINISH_QT4_SPRAY_BACKROLL',   qt: 'QT4', method: 'spray_backroll', state: 'SS_PRIMED_FIELD', surface: 'ceiling' },
  // Trim scenarios (Phase 1b)
  { scenario: 'SCN_TRIM_PRIME_FROM_BARE_QT3_BRUSH',      qt: 'QT3', method: 'brush',          state: 'SS_BARE',              surface: 'trim', substrate_condition: 'bare_solid_wood' },
  { scenario: 'SCN_TRIM_PRIME_FROM_FACTORY_QT3_BRUSH',   qt: 'QT3', method: 'brush',          state: 'SS_PRIMED_FACTORY',    surface: 'trim', substrate_condition: 'factory_primed', primer_on_factory_primed: 'true' },
  { scenario: 'SCN_TRIM_PRIME_FROM_GLOSSY_QT3_BRUSH',    qt: 'QT3', method: 'brush',          state: 'SS_PAINTED_SEMIGLOSS', surface: 'trim', substrate_condition: 'glossy_existing' },
  { scenario: 'SCN_TRIM_PAINT_QT3_BRUSH',                qt: 'QT3', method: 'brush',          state: 'SS_PRIMED_FIELD',      surface: 'trim' },
  { scenario: 'SCN_TRIM_PAINT_QT4_SPRAY',                qt: 'QT4', method: 'spray',          state: 'SS_PRIMED_FIELD',      surface: 'trim' },
  // Door scenarios (Phase 1b)
  { scenario: 'SCN_DOOR_SLAB_NC_QT3_SPRAY_FROM_BARE',    qt: 'QT3', method: 'spray',          state: 'SS_BARE',           surface: 'door', substrate_condition: 'bare_wood',     door_type: 'panel_4' },
  { scenario: 'SCN_DOOR_SLAB_NC_QT4_SPRAY_FROM_FACTORY', qt: 'QT4', method: 'spray',          state: 'SS_PRIMED_FACTORY', surface: 'door', substrate_condition: 'factory_primed', door_type: 'panel_4' },
  { scenario: 'SCN_DOOR_SLAB_NC_QT3_BRUSH_FROM_BARE',    qt: 'QT3', method: 'brush',          state: 'SS_BARE',           surface: 'door', substrate_condition: 'bare_wood',     door_type: 'panel_4' },
  // Window scenarios (Phase 1b)
  { scenario: 'SCN_WINDOW_INT_NC_QT3_BRUSH_FROM_BARE_WOOD',     qt: 'QT3', method: 'brush', state: 'SS_BARE',           surface: 'window' },
  { scenario: 'SCN_WINDOW_INT_NC_QT3_SPRAY_FROM_BARE_WOOD',     qt: 'QT3', method: 'spray', state: 'SS_BARE',           surface: 'window' },
  { scenario: 'SCN_WINDOW_INT_NC_QT4_SPRAY_FROM_FACTORY_WOOD',  qt: 'QT4', method: 'spray', state: 'SS_PRIMED_FACTORY', surface: 'window' },
];

// ============================================================
// LOAD BUNDLE
// ============================================================
console.log('Loading scenario bundle from', REPO_ROOT);
const bundle = loadScenarioBundle(REPO_ROOT);
console.log(`  ${Object.keys(bundle.modules).length} modules`);
console.log(`  ${bundle.scenarios.length} scenarios`);
console.log('');

// ============================================================
// RUN EACH SCENARIO
// ============================================================
const results = [];
for (const test of SCENARIOS_TO_TEST) {
  const { scenario: scenarioId, qt, method, state, surface, substrate_condition, primer_on_factory_primed } = test;
  let baseCtx;
  if (surface === 'ceiling') baseCtx = BASE_CTX_CEILING;
  else if (surface === 'trim') baseCtx = BASE_CTX_TRIM;
  else if (surface === 'door') baseCtx = BASE_CTX_DOOR;
  else if (surface === 'window') baseCtx = BASE_CTX_WINDOW;
  else baseCtx = BASE_CTX_WALL;
  const ctx = { ...baseCtx, quality_tier: qt, application_method: method, substrate_state: state };
  if (substrate_condition) ctx.substrate_condition = substrate_condition;
  if (primer_on_factory_primed) ctx.primer_on_factory_primed = primer_on_factory_primed;
  if (test.door_type) ctx.door_type = test.door_type;
  const result = runScenarioEstimate({
    scenarioBundle: bundle,
    ctx,
    roomQty: SYNTHETIC_ROOM_QTY,
    roomIndex: 0,
    roomLabel: 'Test Bedroom',
  });
  results.push({ expected: scenarioId, result });
}

// ============================================================
// REPORT
// ============================================================
console.log('='.repeat(80));
console.log('PHASE 0 DIFF TEST — NEW SCENARIO ENGINE');
console.log('='.repeat(80));
console.log('');
console.log('Synthetic room: 12x10x9 drywall bedroom, primed, smooth, finished floor');
console.log('  wall SF: 400   ceiling LF: 44   trim LF: 74   floor SF: 120');
console.log('');

for (const { expected, result } of results) {
  const matchMark = result.scenarioId === expected ? '[OK]' : '[MISMATCH]';
  console.log('-'.repeat(80));
  console.log(`${matchMark} ${expected}`);
  if (result.scenarioId !== expected) {
    console.log(`  Got: ${result.scenarioId}`);
  }
  console.log(`  Total hours: ${result.totalHours}`);
  console.log(`  Per phase:`);
  for (const [phase, hrs] of Object.entries(result.phaseHours)) {
    console.log(`    ${phase.padEnd(12)} ${hrs.toString().padStart(8)}`);
  }
  if (result.warnings.length > 0) {
    console.log(`  WARNINGS:`);
    for (const w of result.warnings) console.log(`    - ${w}`);
  }
  console.log('');
}

// ============================================================
// SANITY CHECKS against hand-computed expected values
// ============================================================
// These are derived by hand from SF_DRYWALL_WALL_NC_FINISH_v1/production.json
// using the synthetic room quantities above.
//
// QT3 SPRAY_BACKROLL expected hours (no modifiers — QT3 total = 1.0, STD = 1.0):
//
//   protection phase:
//     TSK_INSPECT_FLOOR_PROTECTION:    120 / 1500 = 0.080
//     TSK_MASK_TRIM_BASEBOARD:          74 / 200  = 0.370
//     TSK_MASK_TRIM_DOOR_CASING:        74 / 180  = 0.411
//     TSK_MASK_TRIM_WINDOW_CASING:      74 / 180  = 0.411
//     TSK_MASK_WALL_FIXTURES:            1 / 4    = 0.250
//     total:                                       1.522
//
//   prep phase (QT3):
//     TSK_INSPECT_PRIMED_WALL:         400 / 1500 = 0.267
//     TSK_SPACKLE_WALL_DEFECTS:        400 / 1000 = 0.400
//     TSK_SAND_SPACKLE_WALL:           400 / 1200 = 0.333
//     TSK_SPOT_PRIME_WALL:             400 / 1800 = 0.222
//     TSK_DUST_WIPE_WALL:              400 / 1000 = 0.400
//     total:                                       1.622
//
//   apply phase (QT3, spray_backroll, smooth, 2 coats):
//     coat 1:
//       TSK_CUTIN_WALL_TO_CEILING (r1):          44 / 130 = 0.338
//       TSK_CUTIN_WALL_TO_TRIM_SPRAY:            74 / 120 = 0.617
//       TSK_SPRAY_WALL_FINISH (coat 1):         400 / 390 = 1.026
//       TSK_BACKROLL_WALL_FINISH (coat 1):      400 / 390 = 1.026
//     coat 2:
//       TSK_CUTIN_WALL_TO_CEILING (r2):          44 / 100 = 0.440
//       TSK_CUTIN_WALL_TO_TRIM_SPRAY:            74 / 120 = 0.617
//       TSK_SPRAY_WALL_FINISH (coat 2):         400 / 420 = 0.952
//       TSK_BACKROLL_WALL_FINISH (coat 2):      400 / 420 = 0.952
//     total:                                            ~5.968
//
//   cleanup phase:
//     TSK_REMOVE_TRIM_MASKING:          74 / 400  = 0.185
//     TSK_VACUUM_SUBFLOOR_POST_WALL:   120 / 1500 = 0.080
//     TSK_REMOVE_FIXTURE_PROTECTION:     1 / 8    = 0.125
//     TSK_CLEAN_TOOLS_WALL:           30 min flat = 0.500
//     TSK_FINAL_INSPECT_WALL (QT3):    400 / 2500 = 0.160
//     total:                                       1.050
//
//   GRAND TOTAL: 1.522 + 1.622 + 5.968 + 1.050 = 10.162 hours

console.log('='.repeat(80));
console.log('SANITY CHECK — QT3 SPRAY_BACKROLL vs hand-computed expected');
console.log('='.repeat(80));

const qt3sb = results.find(r => r.expected === 'SCN_DRYWALL_FINISH_QT3_SPRAY_BACKROLL').result;

const expected = {
  protection: 1.522,
  prep:       1.622,
  apply:      5.968,
  cleanup:    1.050,
  total:     10.162,
};

console.log('\nPhase-by-phase comparison:');
console.log(`${'phase'.padEnd(12)} ${'expected'.padStart(10)} ${'actual'.padStart(10)} ${'delta'.padStart(10)} ${'pct'.padStart(8)}`);
let allPass = true;
const TOLERANCE = 0.05; // 5%

for (const [phase, exp] of Object.entries(expected)) {
  const actual = phase === 'total' ? qt3sb.totalHours : (qt3sb.phaseHours[phase] || 0);
  const delta  = Math.round((actual - exp) * 1000) / 1000;
  const pct    = exp === 0 ? 0 : (delta / exp * 100);
  const pass   = Math.abs(pct) <= (TOLERANCE * 100);
  if (!pass) allPass = false;
  const mark = pass ? 'OK ' : '!! ';
  console.log(`${mark}${phase.padEnd(10)} ${exp.toString().padStart(10)} ${actual.toString().padStart(10)} ${delta.toString().padStart(10)} ${pct.toFixed(1).padStart(7)}%`);
}

console.log('');
console.log(allPass ? 'RESULT: PASS (all phases within 5%)' : 'RESULT: FAIL (one or more phases outside 5%)');

// ============================================================
// PHASE 1a — PRIME SANITY CHECK
// ============================================================
// Hand-computed expected values for SCN_DRYWALL_PRIME_QT3_SPRAY_BACKROLL
// derived from SF_DRYWALL_WALL_NC_PRIME_v1/production.json on the same
// synthetic room (400 SF walls, 44 LF ceiling edge, 120 SF floor, 1 room).
//
// QT3 spray_backroll, smooth, STD height/complexity (all modifiers = 1.0):
//
// prep:
//   TSK_WALL_INSPECT_PREPRIME (QT3=1500):     400/1500 = 0.267
//   TSK_WALL_VACUUM_DUST_PREPRIME (800):      400/800  = 0.500
//   total prep:                                          0.767
//
// setup:
//   TSK_FLOOR_PROTECT_FULL_SETUP (400):       120/400  = 0.300
//   TSK_FIXTURE_COVERS_SETUP (15):              1/15   = 0.067
//   total setup:                                         0.367
//
// apply (no ceiling cut-in for spray prime):
//   TSK_WALL_SPRAY_PRIMER (QT3=600):          400/600  = 0.667
//   TSK_WALL_BACKROLL_PRIMER (QT3 smooth=400): 400/400 = 1.000
//   total apply:                                         1.667
//
// cleanup:
//   TSK_FLOOR_PROTECT_FULL_TEARDOWN (600):    120/600  = 0.200
//   TSK_FIXTURE_COVERS_TEARDOWN_PRIME (25):     1/25   = 0.040
//   TSK_WALL_FINAL_INSPECT_PRIME (2000):      400/2000 = 0.200
//   TSK_WALL_VACUUM_CLEANUP_PRIME (1200):     120/1200 = 0.100
//   TSK_WALL_CLEAN_TOOLS_PRIME (20 min fixed):           0.333
//   total cleanup:                                       0.873
//
// GRAND TOTAL: 0.767 + 0.367 + 1.667 + 0.873 = 3.674 hours

console.log('');
console.log('='.repeat(80));
console.log('PHASE 1a — PRIME SANITY CHECK (QT3 SPRAY_BACKROLL vs hand-computed)');
console.log('='.repeat(80));

const qt3sbPrime = results.find(r => r.expected === 'SCN_DRYWALL_PRIME_QT3_SPRAY_BACKROLL').result;

const expectedPrime = {
  prep:    0.767,
  setup:   0.367,
  apply:   1.667,
  cleanup: 0.873,
  total:   3.674,
};

console.log('\nPhase-by-phase comparison:');
console.log(`${'phase'.padEnd(12)} ${'expected'.padStart(10)} ${'actual'.padStart(10)} ${'delta'.padStart(10)} ${'pct'.padStart(8)}`);
let primePass = true;
for (const [phase, exp] of Object.entries(expectedPrime)) {
  const actual = phase === 'total' ? qt3sbPrime.totalHours : (qt3sbPrime.phaseHours[phase] || 0);
  const delta  = Math.round((actual - exp) * 1000) / 1000;
  const pct    = exp === 0 ? 0 : (delta / exp * 100);
  const pass   = Math.abs(pct) <= 5;
  if (!pass) primePass = false;
  const mark = pass ? 'OK ' : '!! ';
  console.log(`${mark}${phase.padEnd(10)} ${exp.toString().padStart(10)} ${actual.toString().padStart(10)} ${delta.toString().padStart(10)} ${pct.toFixed(1).padStart(7)}%`);
}
console.log('');
console.log(primePass ? 'PRIME: PASS' : 'PRIME: FAIL');

// ============================================================
// PHASE 1a — CHAIN TEST: prime + finish on bare-drywall room
// ============================================================
// Initial ctx: substrate_state = SS_BARE
// Step 1: Match SCN_DRYWALL_PRIME_QT3_SPRAY_BACKROLL (matches SS_BARE)
//         Run → 3.674 hrs, output_state = SS_PRIMED_FIELD
// Step 2: Update ctx.substrate_state = SS_PRIMED_FIELD
//         Match SCN_DRYWALL_FINISH_QT3_SPRAY_BACKROLL (matches SS_PRIMED_FIELD)
//         Run → 10.16 hrs, output_state = SS_PAINTED_EGGSHELL
// Step 3: No scenario matches SS_PAINTED_EGGSHELL → chain stops
//
// Expected total: 3.674 + 10.162 = 13.836 hours

console.log('');
console.log('='.repeat(80));
console.log('PHASE 1a — CHAIN TEST: bare drywall → primed → finished');
console.log('='.repeat(80));

const chainResult = runScenarioChain({
  scenarioBundle: bundle,
  ctx: { ...BASE_CTX_WALL, quality_tier: 'QT3', application_method: 'spray_backroll', substrate_state: 'SS_BARE' },
  roomQty: SYNTHETIC_ROOM_QTY,
  roomIndex: 0,
  roomLabel: 'Test Bedroom',
});

console.log(`Chain depth:    ${chainResult.scenarioResults.length} scenarios`);
console.log(`Final state:    ${chainResult.finalState}`);
console.log(`Chain total:    ${chainResult.totalHours} hrs`);
console.log(`Per scenario:`);
for (const sr of chainResult.scenarioResults) {
  console.log(`  ${sr.scenarioId.padEnd(45)} ${sr.totalHours.toString().padStart(8)} hrs`);
}
console.log(`Per phase (merged):`);
for (const [phase, hrs] of Object.entries(chainResult.phaseHours)) {
  console.log(`  ${phase.padEnd(12)} ${hrs.toString().padStart(8)} hrs`);
}

const expectedChainTotal = 3.674 + 10.162;
const chainDelta = Math.round((chainResult.totalHours - expectedChainTotal) * 1000) / 1000;
const chainPct = (chainDelta / expectedChainTotal * 100).toFixed(2);
const chainPass = Math.abs(chainPct) <= 5
  && chainResult.scenarioResults.length === 2
  && chainResult.finalState === 'SS_PAINTED_EGGSHELL';

console.log('');
console.log(`Expected chain total: ${expectedChainTotal} hrs (prime ${3.674} + finish ${10.162})`);
console.log(`Actual chain total:   ${chainResult.totalHours} hrs (delta ${chainDelta}, ${chainPct}%)`);
console.log('');
console.log(chainPass ? 'CHAIN: PASS' : 'CHAIN: FAIL');

if (chainResult.warnings.length > 0) {
  console.log('Chain warnings:');
  for (const w of chainResult.warnings) console.log(`  - ${w}`);
}

// ============================================================
// PHASE 1b — CEILING SANITY CHECKS
// ============================================================
// Hand-computed expected values for ceiling scenarios on the synthetic room.
// Synthetic ceiling: 120 SF (12x10), 44 LF perimeter (TO_WALL), 2 windows.
//
// SCN_CEILING_PRIME_QT3_SPRAY_BACKROLL expected (no modifiers):
//   prep:    inspect 120/1250=0.096 + vacuum 120/700=0.171         = 0.267
//   setup:   floor 120/400=0.300 + mask wall 44/130=0.338          = 0.638
//   apply:   spray 120/500=0.240 + backroll 120/325=0.369
//            + cutin 44/100=0.440                                  = 1.049
//   cleanup: floor td 120/600=0.200 + mask td 44/275=0.160
//            + inspect 120/1750=0.069 + clean tools 20min=0.333    = 0.762
//   TOTAL:                                                           2.716
//
// SCN_CEILING_FINISH_QT3_SPRAY_BACKROLL expected (single coat at QT3):
//   protection: fixtures 1/4=0.250 + verify openings 2/20=0.100    = 0.350
//   prep:    inspect 120/1200=0.100 + spackle 120/800=0.150
//            + sand 120/1000=0.120 + spot prime 120/1500=0.080
//            + vacuum 120/600=0.200                                 = 0.650
//   apply:   spray 120/450=0.267 + backroll 120/320=0.375          = 0.642
//   cleanup: vacuum 120/1500=0.080 + remove fix 1/8=0.125
//            + clean tools 0.333 + final inspect 120/2000=0.060    = 0.598
//   TOTAL:                                                           2.240
//
// Ceiling chain: 2.716 + 2.240 = 4.956 hrs

console.log('');
console.log('='.repeat(80));
console.log('PHASE 1b — CEILING PRIME SANITY CHECK (QT3 SPRAY_BACKROLL)');
console.log('='.repeat(80));

const ceilPrime = results.find(r => r.expected === 'SCN_CEILING_PRIME_QT3_SPRAY_BACKROLL').result;
const expectedCeilPrime = {
  prep:    0.267,
  setup:   0.638,
  apply:   1.049,
  cleanup: 0.762,
  total:   2.716,
};

console.log('\nPhase-by-phase:');
console.log(`${'phase'.padEnd(12)} ${'expected'.padStart(10)} ${'actual'.padStart(10)} ${'delta'.padStart(10)} ${'pct'.padStart(8)}`);
let ceilPrimePass = true;
for (const [phase, exp] of Object.entries(expectedCeilPrime)) {
  const actual = phase === 'total' ? ceilPrime.totalHours : (ceilPrime.phaseHours[phase] || 0);
  const delta  = Math.round((actual - exp) * 1000) / 1000;
  const pct    = exp === 0 ? 0 : (delta / exp * 100);
  const pass   = Math.abs(pct) <= 5;
  if (!pass) ceilPrimePass = false;
  const mark = pass ? 'OK ' : '!! ';
  console.log(`${mark}${phase.padEnd(10)} ${exp.toString().padStart(10)} ${actual.toString().padStart(10)} ${delta.toString().padStart(10)} ${pct.toFixed(1).padStart(7)}%`);
}
console.log('');
console.log(ceilPrimePass ? 'CEILING PRIME: PASS' : 'CEILING PRIME: FAIL');

console.log('');
console.log('='.repeat(80));
console.log('PHASE 1b — CEILING FINISH SANITY CHECK (QT3 SPRAY_BACKROLL)');
console.log('='.repeat(80));

const ceilFinish = results.find(r => r.expected === 'SCN_CEILING_FINISH_QT3_SPRAY_BACKROLL').result;
const expectedCeilFinish = {
  protection: 0.350,
  prep:       0.650,
  apply:      0.642,
  cleanup:    0.598,
  total:      2.240,
};

console.log('\nPhase-by-phase:');
console.log(`${'phase'.padEnd(12)} ${'expected'.padStart(10)} ${'actual'.padStart(10)} ${'delta'.padStart(10)} ${'pct'.padStart(8)}`);
let ceilFinishPass = true;
for (const [phase, exp] of Object.entries(expectedCeilFinish)) {
  const actual = phase === 'total' ? ceilFinish.totalHours : (ceilFinish.phaseHours[phase] || 0);
  const delta  = Math.round((actual - exp) * 1000) / 1000;
  const pct    = exp === 0 ? 0 : (delta / exp * 100);
  const pass   = Math.abs(pct) <= 5;
  if (!pass) ceilFinishPass = false;
  const mark = pass ? 'OK ' : '!! ';
  console.log(`${mark}${phase.padEnd(10)} ${exp.toString().padStart(10)} ${actual.toString().padStart(10)} ${delta.toString().padStart(10)} ${pct.toFixed(1).padStart(7)}%`);
}
console.log('');
console.log(ceilFinishPass ? 'CEILING FINISH: PASS' : 'CEILING FINISH: FAIL');

// ============================================================
// PHASE 1b — CEILING CHAIN TEST: bare ceiling → primed → finished
// ============================================================
console.log('');
console.log('='.repeat(80));
console.log('PHASE 1b — CEILING CHAIN TEST: bare ceiling → primed → finished');
console.log('='.repeat(80));

const ceilChain = runScenarioChain({
  scenarioBundle: bundle,
  ctx: { ...BASE_CTX_CEILING, quality_tier: 'QT3', application_method: 'spray_backroll', substrate_state: 'SS_BARE' },
  roomQty: SYNTHETIC_ROOM_QTY,
  roomIndex: 0,
  roomLabel: 'Test Bedroom',
});

console.log(`Chain depth:    ${ceilChain.scenarioResults.length} scenarios`);
console.log(`Final state:    ${ceilChain.finalState}`);
console.log(`Chain total:    ${ceilChain.totalHours} hrs`);
console.log(`Per scenario:`);
for (const sr of ceilChain.scenarioResults) {
  console.log(`  ${sr.scenarioId.padEnd(45)} ${sr.totalHours.toString().padStart(8)} hrs`);
}
console.log(`Per phase (merged):`);
for (const [phase, hrs] of Object.entries(ceilChain.phaseHours)) {
  console.log(`  ${phase.padEnd(12)} ${hrs.toString().padStart(8)} hrs`);
}

const expectedCeilChain = 2.716 + 2.240;
const ceilChainDelta = Math.round((ceilChain.totalHours - expectedCeilChain) * 1000) / 1000;
const ceilChainPct = (ceilChainDelta / expectedCeilChain * 100).toFixed(2);
const ceilChainPass = Math.abs(ceilChainPct) <= 5
  && ceilChain.scenarioResults.length === 2
  && ceilChain.finalState === 'SS_PAINTED_FLAT';

console.log('');
console.log(`Expected ceiling chain: ${expectedCeilChain} hrs (prime ${2.716} + finish ${2.240})`);
console.log(`Actual ceiling chain:   ${ceilChain.totalHours} hrs (delta ${ceilChainDelta}, ${ceilChainPct}%)`);
console.log('');
console.log(ceilChainPass ? 'CEILING CHAIN: PASS' : 'CEILING CHAIN: FAIL');

// ============================================================
// PHASE 1b — TRIM SANITY CHECK (PRIME from BARE)
// ============================================================
// Synthetic room trim quantities:
//   trim_total: 75 LF, trim_joints: 20 LF, knot_count: 8 EA, casing_ends: 6 EA,
//   floor_perimeter: 132 SF, wall_adjacent: 75 LF, fixtures: 4 EA
//
// SCN_TRIM_PRIME_FROM_BARE_QT3_BRUSH (substrate_condition=bare_solid_wood):
//
//   setup:   floor protect 132/1200 = 0.110                              = 0.110
//   prep:    dust wipe 75/300=0.250 + fill fasteners 75/120=0.625
//            + caulk joints 20/135=0.148 + sand prep 75/200=0.375
//            (NO end grain fill for solid wood)                          = 1.398
//   apply:   spot prime knots 8/40=0.200 + brush prime 75/90=0.833
//            (NO MDF edge seal for solid wood)                           = 1.033
//   cleanup: floor td 132/1500=0.088 + final cleanup 15min=0.250         = 0.338
//   TOTAL:                                                                 2.879

console.log('');
console.log('='.repeat(80));
console.log('PHASE 1b — TRIM PRIME FROM BARE WOOD SANITY CHECK (QT3 BRUSH)');
console.log('='.repeat(80));

const trimPrime = results.find(r => r.expected === 'SCN_TRIM_PRIME_FROM_BARE_QT3_BRUSH').result;
const expectedTrimPrime = {
  setup:   0.110,
  prep:    1.398,
  apply:   1.033,
  cleanup: 0.338,
  total:   2.879,
};

console.log('\nPhase-by-phase:');
console.log(`${'phase'.padEnd(12)} ${'expected'.padStart(10)} ${'actual'.padStart(10)} ${'delta'.padStart(10)} ${'pct'.padStart(8)}`);
let trimPrimePass = true;
for (const [phase, exp] of Object.entries(expectedTrimPrime)) {
  const actual = phase === 'total' ? trimPrime.totalHours : (trimPrime.phaseHours[phase] || 0);
  const delta  = Math.round((actual - exp) * 1000) / 1000;
  const pct    = exp === 0 ? 0 : (delta / exp * 100);
  const pass   = Math.abs(pct) <= 5;
  if (!pass) trimPrimePass = false;
  const mark = pass ? 'OK ' : '!! ';
  console.log(`${mark}${phase.padEnd(10)} ${exp.toString().padStart(10)} ${actual.toString().padStart(10)} ${delta.toString().padStart(10)} ${pct.toFixed(1).padStart(7)}%`);
}
console.log('');
console.log(trimPrimePass ? 'TRIM PRIME (bare wood): PASS' : 'TRIM PRIME (bare wood): FAIL');

// ============================================================
// PHASE 1b — TRIM STATE BRANCHING DEMONSTRATION
// ============================================================
// Verify that the SAME modules produce DIFFERENT outputs for different
// substrate states/conditions because of task-level applies_when gating.
//
// From bare wood:        spot prime knots fires (8 EA), MDF edge seal skips
// From factory primed:   both spot prime knots AND MDF edge seal skip
// From glossy existing:  both spot prime knots AND MDF edge seal skip

console.log('');
console.log('='.repeat(80));
console.log('PHASE 1b — TRIM STATE BRANCHING DEMO (3 starting states, same modules)');
console.log('='.repeat(80));

const branchScenarios = [
  'SCN_TRIM_PRIME_FROM_BARE_QT3_BRUSH',
  'SCN_TRIM_PRIME_FROM_FACTORY_QT3_BRUSH',
  'SCN_TRIM_PRIME_FROM_GLOSSY_QT3_BRUSH',
];
for (const sid of branchScenarios) {
  const r = results.find(x => x.expected === sid);
  if (!r || !r.result.scenarioId) {
    console.log(`  ${sid.padEnd(45)} NO MATCH`);
    continue;
  }
  console.log(`  ${sid.padEnd(45)} ${r.result.totalHours.toString().padStart(6)} hrs  (${r.result.tasks.length} tasks)`);
  // Show which gated tasks fired
  const gatedTasks = ['TSK_TRIM_SPOT_PRIME_KNOTS', 'TSK_MDF_EDGE_SEAL', 'TSK_TRIM_FILL_END_GRAIN'];
  for (const tid of gatedTasks) {
    const fired = r.result.tasks.some(t => t.taskId === tid);
    console.log(`      ${tid.padEnd(35)} ${fired ? 'FIRED' : 'skipped (gated)'}`);
  }
}

// Verify the branching produces different totals (not all identical)
const branchTotals = branchScenarios.map(sid => results.find(x => x.expected === sid)?.result.totalHours || 0);
const branchPass = new Set(branchTotals).size > 1; // at least 2 distinct totals
console.log('');
console.log(branchPass ? 'STATE BRANCHING: PASS (scenarios produce different totals via task-level gating)'
                       : 'STATE BRANCHING: FAIL (all scenarios produced identical totals)');

// ============================================================
// PHASE 1b — TRIM CHAIN TEST (bare wood → primed → painted)
// ============================================================
console.log('');
console.log('='.repeat(80));
console.log('PHASE 1b — TRIM CHAIN TEST: bare wood → primed → painted');
console.log('='.repeat(80));

const trimChain = runScenarioChain({
  scenarioBundle: bundle,
  ctx: {
    ...BASE_CTX_TRIM,
    quality_tier: 'QT3',
    application_method: 'brush',
    substrate_state: 'SS_BARE',
    substrate_condition: 'bare_solid_wood',
  },
  roomQty: SYNTHETIC_ROOM_QTY,
  roomIndex: 0,
  roomLabel: 'Test Bedroom',
});

console.log(`Chain depth:    ${trimChain.scenarioResults.length} scenarios`);
console.log(`Final state:    ${trimChain.finalState}`);
console.log(`Chain total:    ${trimChain.totalHours} hrs`);
console.log(`Per scenario:`);
for (const sr of trimChain.scenarioResults) {
  console.log(`  ${sr.scenarioId.padEnd(45)} ${sr.totalHours.toString().padStart(8)} hrs`);
}

const trimChainPass = trimChain.scenarioResults.length === 2
  && trimChain.finalState === 'SS_PAINTED_SEMIGLOSS';
console.log('');
console.log(trimChainPass ? 'TRIM CHAIN: PASS (bare → primed → painted in 2 scenarios)'
                          : 'TRIM CHAIN: FAIL');

// ============================================================
// PHASE 1b — DOOR SANITY CHECK (1 panel_4 door, bare wood, QT3 spray)
// ============================================================
// Synthetic: 1 four-panel door, 2 sides total, bare wood, QT3 spray, 2 coats
//
// SCN_DOOR_SLAB_NC_QT3_SPRAY_FROM_BARE expected (no modifiers):
//
//   setup:    floor 1/12=0.083 + spray protect 1/6=0.167 + hardware remove 1/3=0.333  = 0.583
//   prep:     inspect 2/20=0.100 + sand 2/8=0.250 + fill 2/30=0.067
//             + sand fill 2/30=0.067 + MDF edge seal 2/15=0.133 (panel_4 OK)
//             + clean dust 2/30=0.067                                                  = 0.684
//   prime:    spray prime 2/12=0.167 (bare wood)                                       = 0.167
//   interstage: inspect 2/20=0.100 + light sand 2/8=0.250
//               + patch 2/20=0.100 + clean 2/30=0.067                                  = 0.517
//   finish:   coat 1 spray 2/10=0.200 + coat 2 spray 2/10=0.200                        = 0.400
//   cleanup:  final inspect 2/20=0.100 + hardware reinstall 1/4=0.250
//             + floor td 1/20=0.050 + clean tools 25min=0.417                          = 0.817
//   TOTAL:                                                                               3.168

console.log('');
console.log('='.repeat(80));
console.log('PHASE 1b — DOOR SANITY CHECK (panel_4 bare wood, QT3 SPRAY)');
console.log('='.repeat(80));

const doorBare = results.find(r => r.expected === 'SCN_DOOR_SLAB_NC_QT3_SPRAY_FROM_BARE').result;
const expectedDoor = {
  setup:      0.583,
  prep:       0.684,
  prime:      0.167,
  interstage: 0.517,
  finish:     0.400,
  cleanup:    0.817,
  total:      3.168,
};

console.log('\nPhase-by-phase:');
console.log(`${'phase'.padEnd(12)} ${'expected'.padStart(10)} ${'actual'.padStart(10)} ${'delta'.padStart(10)} ${'pct'.padStart(8)}`);
let doorPass = true;
for (const [phase, exp] of Object.entries(expectedDoor)) {
  const actual = phase === 'total' ? doorBare.totalHours : (doorBare.phaseHours[phase] || 0);
  const delta  = Math.round((actual - exp) * 1000) / 1000;
  const pct    = exp === 0 ? 0 : (delta / exp * 100);
  const pass   = Math.abs(pct) <= 5;
  if (!pass) doorPass = false;
  const mark = pass ? 'OK ' : '!! ';
  console.log(`${mark}${phase.padEnd(10)} ${exp.toString().padStart(10)} ${actual.toString().padStart(10)} ${delta.toString().padStart(10)} ${pct.toFixed(1).padStart(7)}%`);
}
console.log('');
console.log(doorPass ? 'DOOR (bare wood, spray): PASS' : 'DOOR (bare wood, spray): FAIL');

// Verify factory-primed door skips the prime module entirely
console.log('');
console.log('Door state branching (factory primed should skip prime tasks):');
const doorFactory = results.find(r => r.expected === 'SCN_DOOR_SLAB_NC_QT4_SPRAY_FROM_FACTORY').result;
const factoryHasPrimeTask = doorFactory.tasks.some(t => t.taskId === 'TSK_DOOR_PRIME_SPRAY' || t.taskId === 'TSK_DOOR_PRIME_BRUSH');
const doorBareHasPrimeTask = doorBare.tasks.some(t => t.taskId === 'TSK_DOOR_PRIME_SPRAY');
console.log(`  bare wood:      ${doorBare.totalHours.toString().padStart(6)} hrs   prime task fired: ${doorBareHasPrimeTask}`);
console.log(`  factory primed: ${doorFactory.totalHours.toString().padStart(6)} hrs   prime task fired: ${factoryHasPrimeTask}`);
const doorBranchPass = doorBareHasPrimeTask === true && factoryHasPrimeTask === false;
console.log('');
console.log(doorBranchPass ? 'DOOR STATE BRANCHING: PASS (prime skipped for factory-primed)'
                            : 'DOOR STATE BRANCHING: FAIL');

// ============================================================
// PHASE 1b — WINDOW SANITY CHECK (2 bare wood windows, QT3 brush)
// ============================================================
// Synthetic: 2 wood windows, bare, 12 SF glass, 14 LF wall adjacent,
// 8 LF sill (skipped for brush), 2 hardware groups, 132 SF floor perimeter
//
// SCN_WINDOW_INT_NC_QT3_BRUSH_FROM_BARE_WOOD expected:
//
//   setup:    floor 132/300=0.440 + glass 12/60=0.200
//             + hardware 2/20=0.100 + wall mask 14/150=0.093
//             (sill skipped for brush)                                           = 0.833
//   prep:     wood sand 2/8=0.250 + wood fill 2/15=0.133 + clean 2/30=0.067
//             (scuff/metal/etch/rust all gated off)                               = 0.450
//   prime:    brush prime 2/6=0.333 (bare wood, brush)                            = 0.333
//   finish:   coat 1 brush 2/3.5=0.571 + coat 2 brush 2/4=0.500                  = 1.071
//   interstage: inspect 2/20=0.100 + sand 2/10=0.200 + patch 2/25=0.080
//               + spot coat 2/30=0.067 + clean 2/30=0.067                         = 0.514
//   cleanup:  final inspect 2/15=0.133 + touchup 2/25=0.080 + scrape 2/12=0.167
//             + hardware reinstall 2/20=0.100 + teardown 132/500=0.264
//             + clean tools 25min=0.417                                           = 1.161
//   TOTAL:                                                                          4.362

console.log('');
console.log('='.repeat(80));
console.log('PHASE 1b — WINDOW SANITY CHECK (2 bare wood windows, QT3 BRUSH)');
console.log('='.repeat(80));

const window = results.find(r => r.expected === 'SCN_WINDOW_INT_NC_QT3_BRUSH_FROM_BARE_WOOD').result;
const expectedWindow = {
  setup:      0.833,
  prep:       0.450,
  prime:      0.333,
  finish:     1.071,
  interstage: 0.514,
  cleanup:    1.161,
  total:      4.362,
};

console.log('\nPhase-by-phase:');
console.log(`${'phase'.padEnd(12)} ${'expected'.padStart(10)} ${'actual'.padStart(10)} ${'delta'.padStart(10)} ${'pct'.padStart(8)}`);
let windowPass = true;
for (const [phase, exp] of Object.entries(expectedWindow)) {
  const actual = phase === 'total' ? window.totalHours : (window.phaseHours[phase] || 0);
  const delta  = Math.round((actual - exp) * 1000) / 1000;
  const pct    = exp === 0 ? 0 : (delta / exp * 100);
  const pass   = Math.abs(pct) <= 5;
  if (!pass) windowPass = false;
  const mark = pass ? 'OK ' : '!! ';
  console.log(`${mark}${phase.padEnd(10)} ${exp.toString().padStart(10)} ${actual.toString().padStart(10)} ${delta.toString().padStart(10)} ${pct.toFixed(1).padStart(7)}%`);
}
console.log('');
console.log(windowPass ? 'WINDOW (bare wood, brush): PASS' : 'WINDOW (bare wood, brush): FAIL');

// Verify factory-primed window skips prime + wood sand/fill
console.log('');
console.log('Window state branching (factory primed should skip prime + wood prep):');
const winFactory = results.find(r => r.expected === 'SCN_WINDOW_INT_NC_QT4_SPRAY_FROM_FACTORY_WOOD').result;
const winBareSpray = results.find(r => r.expected === 'SCN_WINDOW_INT_NC_QT3_SPRAY_FROM_BARE_WOOD').result;
const winFactoryHasPrime = winFactory.tasks.some(t => t.taskId.startsWith('TSK_WIN_PRIME_'));
const winBareHasPrime = winBareSpray.tasks.some(t => t.taskId.startsWith('TSK_WIN_PRIME_'));
console.log(`  bare wood spray:    ${winBareSpray.totalHours.toString().padStart(6)} hrs   prime fired: ${winBareHasPrime}`);
console.log(`  factory primed:     ${winFactory.totalHours.toString().padStart(6)} hrs   prime fired: ${winFactoryHasPrime}`);
const winBranchPass = winBareHasPrime === true && winFactoryHasPrime === false;
console.log('');
console.log(winBranchPass ? 'WINDOW STATE BRANCHING: PASS' : 'WINDOW STATE BRANCHING: FAIL');

const overallPass = allPass && primePass && chainPass && ceilPrimePass && ceilFinishPass && ceilChainPass
  && trimPrimePass && branchPass && trimChainPass && doorPass && doorBranchPass
  && windowPass && winBranchPass;
console.log('');
console.log('='.repeat(80));
console.log(overallPass ? 'OVERALL: ALL TESTS PASS' : 'OVERALL: ONE OR MORE TESTS FAILED');
console.log('='.repeat(80));
process.exit(overallPass ? 0 : 1);
