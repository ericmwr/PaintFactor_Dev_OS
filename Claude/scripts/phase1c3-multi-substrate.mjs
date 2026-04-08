// Phase 1c.3 multi-substrate integration smoke test.
//
// Runs the new scenario engine against a synthetic room that has ALL the
// interior substrates active simultaneously: drywall walls + drywall ceiling
// + interior trim + 1 door + 2 windows. Sums per-phase hours across all
// substrates and reports the room-level total.
//
// This validates cross-substrate integration (no scenario lookup errors,
// no quantity-key collisions, reasonable room-level totals) without
// requiring the legacy engine to run in Node.
//
// The full legacy-engine-in-Node diff is Phase 1c.3b and is deferred until
// UI integration is in place in Phase 2 — constructing a valid project state
// object for runEstimate() requires substantial boilerplate (reducer,
// substrate catalog, room presets, company profile, etc.) that's easier to
// wire through the existing UI than to replicate in a standalone harness.
//
// For this smoke test, we reuse the hand-computed expected values from
// phase0-diff.mjs and sum them as the expected room total:
//
//   Walls prime+finish QT3 spray_backroll chain:   13.836 hrs
//   Ceiling prime+finish QT3 spray_backroll chain:  4.956 hrs
//   Trim prime+paint QT3 brush chain:               7.270 hrs  (approx from phase0-diff)
//   Doors: 1 panel_4 bare wood QT3 spray:           3.168 hrs
//   Windows: 2 bare wood QT3 brush:                 4.362 hrs
//   ----------------------------------------------
//   Multi-substrate room total:                    33.592 hrs
//
// These substrates run independently in the new engine (each has its own
// scenario chain with its own protection setup/teardown), so the multi-
// substrate total = sum of per-substrate totals. A more sophisticated test
// would exercise cross-substrate protection dedup, but that's Phase 1c.3b.

import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadScenarioBundle } from '../tools/paintscope/src/engine/scenario-loader.js';
import { runScenarioChain, runScenarioEstimate } from '../tools/paintscope/src/engine/run-estimate-scenario.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const REPO_ROOT  = path.resolve(__dirname, '..', '..');

// Multi-substrate synthetic room — 12x10x9 bedroom with all substrates.
const ROOM = new Map([
  // Walls
  ['PS_SURFACE_SF.WALL_FIELD',          { value: 400 }],
  ['PS_EDGE_LF.TO_CEILING',             { value: 44  }],
  ['PS_PROTECT_LF.TRIM_EDGES',          { value: 74  }],
  // Ceilings
  ['PS_SURFACE_SF.CEILING_FIELD',       { value: 120 }],
  ['PS_EDGE_LF.TO_WALL',                { value: 44  }],
  // Trim
  ['PS_SURFACE_LF.TRIM_TOTAL',          { value: 75  }],
  ['PS_EDGE_LF.TRIM_JOINTS',            { value: 20  }],
  ['PS_META.EA.CASING_END_COUNT',       { value: 6   }],
  ['PS_META.EA.KNOT_COUNT',             { value: 8   }],
  ['PS_PROTECT_LF.WALL_ADJACENT',       { value: 75  }],
  ['PS_PROTECT_SF.FLOOR_PERIMETER',     { value: 132 }],
  ['PS_PROTECT_EA.ASSET.FIXTURES',      { value: 4   }],
  // Doors
  ['PS_OPENING_EA.DOOR_OPENINGS_TOTAL', { value: 1 }],
  ['PS_SURFACE_EA_SIDE.DOOR_SLAB',      { value: 2 }],
  ['PS_META.EA.DOOR_PANES_TOTAL',       { value: 0 }],
  // Windows
  ['PS_OPENING_EA.WINDOW_TOTAL',            { value: 2  }],
  ['PS_OPENING_EA.WINDOW_OPENINGS_TOTAL',   { value: 2  }],
  ['PS_PROTECT_SF.ASSET.GLASS_AREA',        { value: 12 }],
  ['PS_PROTECT_LF.WALL_ADJACENT_WINDOW',    { value: 14 }],
  ['PS_PROTECT_LF.SILL',                    { value: 8  }],
  ['PS_PROTECT_EA.ASSET.HARDWARE_GROUPS',   { value: 2  }],
  // Shared
  ['PS_PROTECT_SF.FLOOR_EXPOSED',       { value: 120 }],
  ['PS_META.SF.FLOOR_VACUUM_AREA',      { value: 120 }],
  ['PS_META.EA.ROOMS_TOTAL',            { value: 1   }],
]);

console.log('Loading scenario bundle...');
const bundle = loadScenarioBundle(REPO_ROOT);
console.log(`  ${Object.keys(bundle.modules).length} modules`);
console.log(`  ${bundle.scenarios.length} scenarios`);
console.log('');

// Per-substrate chain runs
const runs = [
  {
    label: 'Drywall walls (QT3 SB, bare→primed→painted)',
    ctx: {
      substrate: 'drywall', surface: 'wall', surface_texture: 'smooth',
      height_band: 'STD', complexity: 'STD', floor_type: 'finished',
      quality_tier: 'QT3', application_method: 'spray_backroll',
      substrate_state: 'SS_BARE',
    },
    expected: 13.836,
    chainFn: true,
  },
  {
    label: 'Drywall ceiling (QT3 SB, bare→primed→painted)',
    ctx: {
      substrate: 'drywall', surface: 'ceiling', surface_texture: 'smooth',
      height_band: 'STD', complexity: 'STD', floor_type: 'finished',
      quality_tier: 'QT3', application_method: 'spray_backroll',
      substrate_state: 'SS_BARE',
    },
    expected: 4.956,
    chainFn: true,
  },
  {
    label: 'Interior trim (QT3 brush, bare wood→primed→painted)',
    ctx: {
      substrate: 'trim', surface_texture: 'smooth', height_band: 'STD',
      complexity: 'STD', profile_complexity: 'standard', floor_type: 'finished',
      quality_tier: 'QT3', application_method: 'brush',
      substrate_state: 'SS_BARE', substrate_condition: 'bare_solid_wood',
    },
    expected: 7.270,
    chainFn: true,
  },
  {
    label: 'Interior door (QT3 spray, bare wood, panel_4)',
    ctx: {
      substrate: 'door_slab', height_band: 'STD', complexity: 'STD',
      floor_type: 'finished', quality_tier: 'QT3', application_method: 'spray',
      substrate_state: 'SS_BARE', substrate_condition: 'bare_wood',
      door_type: 'panel_4',
    },
    expected: 3.168,
    chainFn: false, // single scenario, not chain
  },
  {
    label: 'Interior windows (2 bare wood, QT3 brush)',
    ctx: {
      substrate: 'window', height_band: 'STD', complexity: 'STD',
      floor_type: 'finished', quality_tier: 'QT3', application_method: 'brush',
      substrate_state: 'SS_BARE', window_substrate_material: 'wood',
    },
    expected: 4.362,
    chainFn: false,
  },
];

console.log('='.repeat(80));
console.log('PHASE 1c.3 — MULTI-SUBSTRATE INTEGRATION SMOKE TEST');
console.log('='.repeat(80));
console.log('');
console.log('Synthetic 12x10x9 bedroom with all interior substrates active');
console.log('');

const phaseTotals = {};
let grandTotal = 0;
let allMatch = true;

for (const run of runs) {
  const result = run.chainFn
    ? runScenarioChain({
        scenarioBundle: bundle, ctx: run.ctx, roomQty: ROOM,
        roomIndex: 0, roomLabel: 'Multi-Substrate Test',
      })
    : runScenarioEstimate({
        scenarioBundle: bundle, ctx: run.ctx, roomQty: ROOM,
        roomIndex: 0, roomLabel: 'Multi-Substrate Test',
      });

  const actual = result.totalHours;
  const delta = Math.round((actual - run.expected) * 1000) / 1000;
  const pct = (delta / run.expected * 100).toFixed(2);
  const pass = Math.abs(pct) <= 5;
  if (!pass) allMatch = false;

  const mark = pass ? 'OK ' : '!! ';
  console.log(`${mark}${run.label}`);
  console.log(`    expected ${run.expected.toFixed(3)}, actual ${actual}, delta ${delta} (${pct}%)`);

  // Merge phase totals
  for (const [phase, hrs] of Object.entries(result.phaseHours)) {
    phaseTotals[phase] = Math.round(((phaseTotals[phase] || 0) + hrs) * 100) / 100;
  }
  grandTotal += actual;
}

grandTotal = Math.round(grandTotal * 100) / 100;
const expectedGrand = runs.reduce((s, r) => s + r.expected, 0).toFixed(3);

console.log('');
console.log('-'.repeat(80));
console.log('ROOM-LEVEL PHASE TOTALS:');
for (const [phase, hrs] of Object.entries(phaseTotals).sort()) {
  console.log(`  ${phase.padEnd(12)} ${hrs.toString().padStart(8)} hrs`);
}
console.log('');
console.log(`  GRAND TOTAL:  ${grandTotal} hrs`);
console.log(`  Expected:     ${expectedGrand} hrs`);
console.log('');
console.log('='.repeat(80));
console.log(allMatch
  ? 'PHASE 1c.3: PASS — multi-substrate room resolves cleanly, all per-substrate chains match Phase 0/1b expected values within 5%'
  : 'PHASE 1c.3: FAIL — one or more per-substrate chains drifted from expected');
console.log('='.repeat(80));
process.exit(allMatch ? 0 : 1);
