// Phase 3 door frame smoke test.
//
// Loads the full scenario bundle and runs the 5 door frame scenarios against
// a synthetic room with door_frames substrate. Verifies:
//   1. Scenario matches the expected ID (result.scenarioId)
//   2. Total hours > 0
//   3. No warnings
//
// Follows the same pattern as phase1b-specialty-smoke.mjs.

import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadScenarioBundle } from '../tools/paintscope/src/engine/scenario-loader.js';
import { runScenarioEstimate } from '../tools/paintscope/src/engine/run-estimate-scenario.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const REPO_ROOT  = path.resolve(__dirname, '..', '..');

// Synthetic room: 3 door frames, standard 32x80 openings.
const ROOM = new Map([
  ['PS_SURFACE_EA.DOOR_FRAME_SET',   { value: 3 }],
  ['PS_PROTECT_SF.FLOOR_PERIMETER',  { value: 30 }],
  ['PS_PROTECT_LF.WALL_ADJACENT',    { value: 20 }],
  ['PS_PROTECT_EA.ASSET.FIXTURES',   { value: 2 }],
  ['PS_META.EA.ROOMS_TOTAL',         { value: 1 }],
]);

const TESTS = [
  { id: 'SCN_DOOR_FRAME_NC_QT3_BRUSH',
    ctx: { paintable_item: 'door_frame', substrate_state: 'SS_PRIMED_FACTORY', quality_tier: 'QT3', application_method: 'brush', height_band: 'STD', complexity: 'STD' } },
  { id: 'SCN_DOOR_FRAME_NC_QT4_BRUSH',
    ctx: { paintable_item: 'door_frame', substrate_state: 'SS_PRIMED_FACTORY', quality_tier: 'QT4', application_method: 'brush', height_band: 'STD', complexity: 'STD' } },
  { id: 'SCN_DOOR_FRAME_NC_QT4_SPRAY',
    ctx: { paintable_item: 'door_frame', substrate_state: 'SS_PRIMED_FACTORY', quality_tier: 'QT4', application_method: 'spray', height_band: 'STD', complexity: 'STD' } },
  { id: 'SCN_DOOR_FRAME_NC_QT5_BRUSH',
    ctx: { paintable_item: 'door_frame', substrate_state: 'SS_PRIMED_FACTORY', quality_tier: 'QT5', application_method: 'brush', height_band: 'STD', complexity: 'STD' } },
  { id: 'SCN_DOOR_FRAME_NC_QT5_SPRAY',
    ctx: { paintable_item: 'door_frame', substrate_state: 'SS_PRIMED_FACTORY', quality_tier: 'QT5', application_method: 'spray', height_band: 'STD', complexity: 'STD' } },
];

console.log('Loading bundle from', REPO_ROOT);
const bundle = loadScenarioBundle(REPO_ROOT);
console.log(`  ${Object.keys(bundle.modules).length} modules`);
console.log(`  ${bundle.scenarios.length} scenarios`);
console.log('');
console.log('='.repeat(80));
console.log('PHASE 3 DOOR FRAME SMOKE TEST');
console.log('='.repeat(80));
console.log('');

let allPass = true;
for (const t of TESTS) {
  const result = runScenarioEstimate({
    scenarioBundle: bundle,
    ctx: t.ctx,
    roomQty: ROOM,
    roomIndex: 0,
    roomLabel: 'Smoke Test Room',
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
