// Phase 3 closet shelf smoke test.
//
// Loads the full scenario bundle and runs closet shelf NC scenarios against
// a synthetic room with closet_shelving substrate. Verifies:
//   1. Scenario matches the expected ID (result.scenarioId)
//   2. Total hours > 0
//   3. No warnings
//
// Pattern mirrors phase3-door-frame-smoke.mjs.

import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadScenarioBundle } from '../tools/paintscope/src/engine/scenario-loader.js';
import { runScenarioEstimate } from '../tools/paintscope/src/engine/run-estimate-scenario.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const REPO_ROOT  = path.resolve(__dirname, '..', '..');

// Synthetic room: 12 LF of closet shelving (e.g. 4 shelves at 3 LF each).
const ROOM = new Map([
  ['PS_SURFACE_LF.CLOSET_SHELF',    { value: 12 }],
  ['PS_PROTECT_SF.FLOOR_PERIMETER', { value: 20 }],
  ['PS_PROTECT_LF.WALL_ADJACENT',   { value: 8 }],
  ['PS_PROTECT_EA.ASSET.FIXTURES',  { value: 1 }],
  ['PS_META.EA.ROOMS_TOTAL',        { value: 1 }],
]);

const TESTS = [
  { id: 'SCN_CLOSET_SHELF_NC_QT3_BARE_BR',
    ctx: { paintable_item: 'closet', substrate_state: 'SS_BARE', quality_tier: 'QT3', application_method: 'brush_roll', coating_type: 'paint', height_band: 'STD', complexity: 'STD' } },
  { id: 'SCN_CLOSET_SHELF_NC_QT3_MELAMINE_BR',
    ctx: { paintable_item: 'closet', substrate_state: 'SS_FACTORY_FINISH', quality_tier: 'QT3', application_method: 'brush_roll', coating_type: 'paint', height_band: 'STD', complexity: 'STD' } },
];

console.log('Loading bundle from', REPO_ROOT);
const bundle = loadScenarioBundle(REPO_ROOT);
console.log(`  ${Object.keys(bundle.modules).length} modules`);
console.log(`  ${bundle.scenarios.length} scenarios`);
console.log('');
console.log('='.repeat(80));
console.log('PHASE 3 CLOSET SHELF SMOKE TEST');
console.log('='.repeat(80));
console.log('');

let allPass = true;
for (const t of TESTS) {
  const result = runScenarioEstimate({
    scenarioBundle: bundle,
    ctx: t.ctx,
    roomQty: ROOM,
    roomIndex: 0,
    roomLabel: 'Smoke Test Closet',
  });

  const matched = result.scenarioId === t.id;
  const nonZero = result.totalHours > 0;
  const noWarnings = result.warnings.length === 0;
  const pass = matched && nonZero && noWarnings;
  if (!pass) allPass = false;

  const mark = pass ? 'PASS' : 'FAIL';
  console.log(`[${mark}] ${t.id}`);
  console.log(`       matched: ${matched}   hours: ${result.totalHours}   tasks: ${result.tasks.length}   warnings: ${result.warnings.length}`);
  if (!matched) console.log(`       expected ${t.id}, got ${result.scenarioId}`);
  if (result.warnings.length > 0) {
    for (const w of result.warnings) console.log(`       WARN: ${w}`);
  }
}

console.log('');
console.log('='.repeat(80));
if (allPass) {
  console.log('ALL PASSED');
} else {
  console.log('SOME FAILED');
  process.exit(1);
}
