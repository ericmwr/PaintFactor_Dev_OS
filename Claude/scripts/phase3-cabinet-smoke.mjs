// Phase 3 cabinet smoke test.
//
// Covers all 24 NC paint scenarios (4 states x 2 methods x 3 QT)
// + 2 RP regression cases
// Total: 26 cases
//
// Note: protection scenarios fire through cabinet-protection.js resolver,
// not through runScenarioEstimate. Protection is tested via dev server.

import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadScenarioBundle } from '../tools/paintscope/src/engine/scenario-loader.js';
import { runScenarioEstimate } from '../tools/paintscope/src/engine/run-estimate-scenario.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const REPO_ROOT  = path.resolve(__dirname, '..', '..');

// Synthetic room: 12 doors, 6 drawers, 45 SF frame, 40 SF interior
const ROOM = new Map([
  ['PS_SURFACE_EA.CABINET_DOOR',      { value: 12 }],
  ['PS_SURFACE_EA.CABINET_DRAWER',    { value: 6 }],
  ['PS_SURFACE_SF.CABINET_FRAME',     { value: 45 }],
  ['PS_SURFACE_SF.CABINET_INTERIOR',  { value: 40 }],
  ['PS_SURFACE_EA.ASSET.CABINET_HARDWARE', { value: 24 }],
  ['PS_SURFACE_LF.CABINET_CAULK',    { value: 30 }],
  ['PS_PROTECT_SF.FLOOR_PERIMETER',   { value: 40 }],
  ['PS_PROTECT_LF.WALL_ADJACENT',     { value: 20 }],
  ['PS_META.EA.ROOMS_TOTAL',          { value: 1 }],
]);

const QTS = ['QT3', 'QT4', 'QT5'];

const STATE_COMBOS = [
  ['SS_BARE',           'BARE'],
  ['SS_PRIMED_FACTORY', 'PRIMED_FACTORY'],
  ['SS_FACTORY_FINISH', 'FACTORY_FINISH'],
  ['SS_STAINED',        'STAINED'],
];

const METHOD_COMBOS = [
  ['spray',  'SPRAY'],
  ['brush',  'BRUSH'],
];

// Build 24 NC paint test cases
const TESTS = [];
for (const qt of QTS) {
  for (const [state, stateShort] of STATE_COMBOS) {
    for (const [method, methodShort] of METHOD_COMBOS) {
      TESTS.push({
        id: `SCN_CABINET_NC_${qt}_${methodShort}_FROM_${stateShort}`,
        ctx: {
          paintable_item: 'cabinet',
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
}

// 2 RP regression cases
TESTS.push(
  {
    id: 'SCN_INT_CABINET_RP_SOUND',
    ctx: { paintable_item: 'cabinet', substrate_state: 'SS_SOUND_PAINT', quality_tier: 'QT3', application_method: 'brush', coating_type: 'paint', height_band: 'STD', complexity: 'STD' },
    regression: true,
  },
  {
    id: 'SCN_INT_CABINET_RP_FAILING',
    ctx: { paintable_item: 'cabinet', substrate_state: 'SS_FAILING_PAINT', quality_tier: 'QT3', application_method: 'brush', coating_type: 'paint', height_band: 'STD', complexity: 'STD' },
    regression: true,
  }
);

console.log('Loading bundle from', REPO_ROOT);
const bundle = loadScenarioBundle(REPO_ROOT);
console.log(`  ${Object.keys(bundle.modules).length} modules`);
console.log(`  ${bundle.scenarios.length} scenarios`);
console.log('');
console.log('='.repeat(80));
console.log(`PHASE 3 CABINET SMOKE TEST  (${TESTS.length} cases)`);
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
    roomLabel: 'Smoke Test Kitchen',
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
