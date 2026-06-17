// Phase 3 closet shelf smoke test.
//
// Loads the full scenario bundle and runs closet shelf scenarios against
// a synthetic room with closet_shelving substrate. Verifies:
//   1. Scenario matches the expected ID (result.scenarioId)
//   2. Total hours > 0
//   3. No warnings
//
// Pattern mirrors phase3-door-frame-smoke.mjs.
//
// Coverage:
//   - 28 NC closet scenarios (4 QT x 7 state-method combos)
//   - 2 RP regression cases (painted closets must match RP, not NC)

import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadScenarioBundle } from '../tools/paintscope/src/engine/scenario-loader.js';
import { runScenarioEstimate } from '../tools/paintscope/src/engine/run-estimate-scenario.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const REPO_ROOT  = path.resolve(__dirname, '..', '..');

// Synthetic room: 12 LF of closet shelving.
const ROOM = new Map([
  ['PS_SURFACE_LF.CLOSET_SHELF',    { value: 12 }],
  ['PS_PROTECT_SF.FLOOR_PERIMETER', { value: 20 }],
  ['PS_PROTECT_LF.WALL_ADJACENT',   { value: 8 }],
  ['PS_PROTECT_EA.ASSET.FIXTURES',  { value: 1 }],
  ['PS_META.EA.ROOMS_TOTAL',        { value: 1 }],
  ['PS_PROTECT_LF.CLOSET_SHELF_MASK',    { value: 20 }],
]);

const QTS = ['QT2', 'QT3', 'QT4', 'QT5'];

// [substrate_state, state_short, application_method, method_short]
const COMBOS = [
  ['SS_BARE',           'BARE',     'brush_roll',    'BR'],
  ['SS_BARE',           'BARE',     'spray',         'SPRAY'],
  ['SS_BARE',           'BARE',     'spray_rolloff', 'ROLLOFF'],
  ['SS_PRIMED_FACTORY', 'PRIMED',   'brush_roll',    'BR'],
  ['SS_PRIMED_FACTORY', 'PRIMED',   'spray',         'SPRAY'],
  ['SS_FACTORY_FINISH', 'MELAMINE', 'brush_roll',    'BR'],
  ['SS_FACTORY_FINISH', 'MELAMINE', 'spray',         'SPRAY'],
];

// Build the 28 NC test cases programmatically.
const TESTS = [];
for (const qt of QTS) {
  for (const [state, stateShort, method, methodShort] of COMBOS) {
    TESTS.push({
      id: `SCN_CLOSET_SHELF_NC_${qt}_${stateShort}_${methodShort}`,
      ctx: {
        paintable_item: 'closet',
        substrate_state: state,
        quality_tier: qt,
        application_method: method,
        coating_type: 'paint',
        height_band: 'STD',
        complexity: 'STD',
      },
    });
  }
}

// 2 RP regression cases — verify NC scenarios do NOT fire on painted closets,
// and that the existing RP scenarios match instead.
TESTS.push(
  {
    id: 'SCN_INT_CLOSET_RP_SOUND',
    ctx: {
      paintable_item: 'closet',
      substrate_state: 'SS_SOUND_PAINT',
      quality_tier: 'QT3',
      application_method: 'brush_roll',
      coating_type: 'paint',
      height_band: 'STD',
      complexity: 'STD',
    },
    regression: true,
  },
  {
    id: 'SCN_INT_CLOSET_RP_FAILING',
    ctx: {
      paintable_item: 'closet',
      substrate_state: 'SS_FAILING_PAINT',
      quality_tier: 'QT3',
      application_method: 'brush_roll',
      coating_type: 'paint',
      height_band: 'STD',
      complexity: 'STD',
    },
    regression: true,
  }
);

// 3 closet shelf protect cases
TESTS.push(
  { id: 'SCN_CLOSET_SHELF_PROTECT_ITEM_MASK',     ctx: { paintable_item: 'closet', coating_type: 'protect', protection_level: 'item_mask',     quality_tier: 'QT3', application_method: 'n/a', substrate_state: 'SS_PROTECTED', height_band: 'STD', complexity: 'STD' } },
  { id: 'SCN_CLOSET_SHELF_PROTECT_PARTIAL_COVER', ctx: { paintable_item: 'closet', coating_type: 'protect', protection_level: 'partial_cover', quality_tier: 'QT3', application_method: 'n/a', substrate_state: 'SS_PROTECTED', height_band: 'STD', complexity: 'STD' } },
  { id: 'SCN_CLOSET_SHELF_PROTECT_FULL_COVER',    ctx: { paintable_item: 'closet', coating_type: 'protect', protection_level: 'full_cover',    quality_tier: 'QT3', application_method: 'n/a', substrate_state: 'SS_PROTECTED', height_band: 'STD', complexity: 'STD' } },
);

console.log('Loading bundle from', REPO_ROOT);
const bundle = loadScenarioBundle(REPO_ROOT);
console.log(`  ${Object.keys(bundle.modules).length} modules`);
console.log(`  ${bundle.scenarios.length} scenarios`);
console.log('');
console.log('='.repeat(80));
console.log(`PHASE 3 CLOSET SHELF SMOKE TEST  (${TESTS.length} cases)`);
console.log('='.repeat(80));
console.log('');

let allPass = true;
let passCount = 0;
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
  if (!pass) allPass = false; else passCount++;

  const mark = pass ? 'PASS' : 'FAIL';
  const label = t.regression ? 'REGRESSION' : 'NC';
  console.log(`[${mark}] ${label} ${t.id}`);
  if (!pass) {
    console.log(`       matched: ${matched}   hours: ${result.totalHours}   tasks: ${result.tasks.length}   warnings: ${result.warnings.length}`);
    if (!matched) console.log(`       expected ${t.id}, got ${result.scenarioId}`);
    if (result.warnings.length > 0) {
      for (const w of result.warnings) console.log(`       WARN: ${w}`);
    }
  }
}

console.log('');
console.log('='.repeat(80));
console.log(`${passCount}/${TESTS.length} passed`);
if (!allPass) {
  console.log('SOME FAILED');
  process.exit(1);
}
console.log('ALL PASSED');
