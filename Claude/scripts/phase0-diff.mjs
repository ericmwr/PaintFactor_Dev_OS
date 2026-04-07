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

const SYNTHETIC_ROOM_QTY = new Map([
  ['PS_SURFACE_SF.WALL_FIELD',       { value: 400 }],
  ['PS_EDGE_LF.TO_CEILING',          { value: 44  }],
  ['PS_PROTECT_LF.TRIM_EDGES',       { value: 74  }],
  ['PS_PROTECT_SF.FLOOR_EXPOSED',    { value: 120 }],
  ['PS_META.SF.FLOOR_VACUUM_AREA',   { value: 120 }],
  ['PS_META.EA.ROOMS_TOTAL',         { value: 1   }],
]);

const BASE_CTX = {
  substrate:          'drywall',
  surface:            'wall',
  surface_texture:    'smooth',
  height_band:        'STD',
  complexity:         'STD',
  floor_type:         'finished',
};

const SCENARIOS_TO_TEST = [
  // Finish scenarios (Phase 0)
  { scenario: 'SCN_DRYWALL_FINISH_QT2_ROLL',             qt: 'QT2', method: 'roll',           state: 'SS_PRIMED_FIELD' },
  { scenario: 'SCN_DRYWALL_FINISH_QT3_ROLL',             qt: 'QT3', method: 'roll',           state: 'SS_PRIMED_FIELD' },
  { scenario: 'SCN_DRYWALL_FINISH_QT3_SPRAY_BACKROLL',   qt: 'QT3', method: 'spray_backroll', state: 'SS_PRIMED_FIELD' },
  { scenario: 'SCN_DRYWALL_FINISH_QT4_SPRAY_BACKROLL',   qt: 'QT4', method: 'spray_backroll', state: 'SS_PRIMED_FIELD' },
  { scenario: 'SCN_DRYWALL_FINISH_QT5_SPRAY_BACKROLL',   qt: 'QT5', method: 'spray_backroll', state: 'SS_PRIMED_FIELD' },
  // Prime scenarios (Phase 1a)
  { scenario: 'SCN_DRYWALL_PRIME_QT3_ROLL',              qt: 'QT3', method: 'roll',           state: 'SS_BARE' },
  { scenario: 'SCN_DRYWALL_PRIME_QT3_SPRAY_BACKROLL',    qt: 'QT3', method: 'spray_backroll', state: 'SS_BARE' },
  { scenario: 'SCN_DRYWALL_PRIME_QT4_SPRAY_BACKROLL',    qt: 'QT4', method: 'spray_backroll', state: 'SS_BARE' },
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
for (const { scenario: scenarioId, qt, method, state } of SCENARIOS_TO_TEST) {
  const ctx = { ...BASE_CTX, quality_tier: qt, application_method: method, substrate_state: state };
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
  ctx: { ...BASE_CTX, quality_tier: 'QT3', application_method: 'spray_backroll', substrate_state: 'SS_BARE' },
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

const overallPass = allPass && primePass && chainPass;
console.log('');
console.log('='.repeat(80));
console.log(overallPass ? 'OVERALL: ALL TESTS PASS' : 'OVERALL: ONE OR MORE TESTS FAILED');
console.log('='.repeat(80));
process.exit(overallPass ? 0 : 1);
