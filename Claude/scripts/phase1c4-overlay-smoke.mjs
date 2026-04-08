// Phase 1c.4 rate edit overlay smoke test.
//
// Verifies that passing overlayMap to runScenarioEstimate overrides the
// module-defined rates for tagged task IDs. This is the mechanism that
// powers the field-edit rate capability.
//
// Test: run SCN_DRYWALL_FINISH_QT3_SPRAY_BACKROLL twice —
//   1. Baseline: no overlay, expected 10.16 hrs
//   2. Overlay: halve the spray rate (390 → 195 SF/hr), which doubles
//      the spray hours and should push the total up by (400 SF / 195 -
//      400/390) × 2 coats = about 2.052 hrs
//
// Expected:
//   baseline total: 10.16 hrs
//   overlay total:  10.16 + 2.052 = ~12.21 hrs
//
// If the overlay mechanism works, we'll see a ~2 hour increase.

import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadScenarioBundle } from '../tools/paintscope/src/engine/scenario-loader.js';
import { runScenarioEstimate } from '../tools/paintscope/src/engine/run-estimate-scenario.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const REPO_ROOT  = path.resolve(__dirname, '..', '..');

const ROOM = new Map([
  ['PS_SURFACE_SF.WALL_FIELD',       { value: 400 }],
  ['PS_EDGE_LF.TO_CEILING',          { value: 44  }],
  ['PS_PROTECT_LF.TRIM_EDGES',       { value: 74  }],
  ['PS_PROTECT_SF.FLOOR_EXPOSED',    { value: 120 }],
  ['PS_META.SF.FLOOR_VACUUM_AREA',   { value: 120 }],
  ['PS_META.EA.ROOMS_TOTAL',         { value: 1   }],
]);

const CTX = {
  substrate: 'drywall', surface: 'wall', substrate_state: 'SS_PRIMED_FIELD',
  surface_texture: 'smooth', height_band: 'STD', complexity: 'STD',
  floor_type: 'finished', quality_tier: 'QT3', application_method: 'spray_backroll',
};

console.log('Loading bundle...');
const bundle = loadScenarioBundle(REPO_ROOT);
console.log('');

// Baseline run
const baseline = runScenarioEstimate({
  scenarioBundle: bundle, ctx: CTX, roomQty: ROOM,
  roomIndex: 0, roomLabel: 'Overlay Test Room',
});

// Overlay run: halve the spray rate
const overlayMap = {
  TSK_SPRAY_WALL_FINISH: { rate_per_hour: 195 },  // was 390 in rates_by_coat for coat 1
};
const withOverlay = runScenarioEstimate({
  scenarioBundle: bundle, ctx: CTX, roomQty: ROOM, overlayMap,
  roomIndex: 0, roomLabel: 'Overlay Test Room',
});

console.log('='.repeat(80));
console.log('PHASE 1c.4 — OVERLAY MECHANISM SMOKE TEST');
console.log('='.repeat(80));
console.log('');
console.log(`Scenario: ${baseline.scenarioId}`);
console.log('');
console.log(`Baseline total:        ${baseline.totalHours} hrs`);
console.log(`With overlay total:    ${withOverlay.totalHours} hrs`);
console.log(`Delta:                 ${(Math.round((withOverlay.totalHours - baseline.totalHours) * 100) / 100)} hrs`);
console.log('');

// Verify the overlay fired on the target task
const overlayTasks = withOverlay.tasks.filter(t => t.taskId === 'TSK_SPRAY_WALL_FINISH');
const anyOverlaySource = overlayTasks.some(t => t.rateSource === 'overlay');
console.log(`Overlay applied to TSK_SPRAY_WALL_FINISH: ${anyOverlaySource ? 'YES' : 'NO'}`);
if (overlayTasks.length > 0) {
  console.log(`  Task entries: ${overlayTasks.length}`);
  for (const t of overlayTasks) {
    console.log(`    baseRate=${t.baseRate}  hours=${t.hours}  source=${t.rateSource}`);
  }
}
console.log('');

// Quantitative check: with spray rate halved, spray hours should double
// Baseline spray: 400/390 = 1.026 per coat × 2 coats = 2.051 hrs
// Overlay spray:  400/195 = 2.051 per coat × 2 coats = 4.103 hrs
// Delta: +2.051 hrs
const expectedDelta = 2.051;
const actualDelta = withOverlay.totalHours - baseline.totalHours;
const deltaOk = Math.abs(actualDelta - expectedDelta) < 0.1;
console.log(`Expected delta (halved spray rate on 2 coats): ~${expectedDelta} hrs`);
console.log(`Actual delta:                                   ${actualDelta.toFixed(3)} hrs`);
console.log('');

const pass = anyOverlaySource && deltaOk;
console.log(pass ? 'OVERLAY: PASS' : 'OVERLAY: FAIL');
process.exit(pass ? 0 : 1);
