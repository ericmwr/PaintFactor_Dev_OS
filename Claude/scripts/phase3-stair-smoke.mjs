// Phase 3 stair smoke test.
//
// Covers all 156 scenarios:
//   - 84 NC paint (7 components × 2 methods × 3 QT × 2 states)
//   - 72 NC stain (6 components × 2 methods × 3 QT × 2 states)
// + 2 RP regression cases.
// Total: 158 cases.
//
// Note: SF_STAIR_INT_RP keeps its spec-level paintable_item 'int_stair'; the
// per-component model applies only to the 5 NC specs.

import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadScenarioBundle } from '../tools/paintscope/src/engine/scenario-loader.js';
import { runScenarioEstimate } from '../tools/paintscope/src/engine/run-estimate-scenario.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const REPO_ROOT  = path.resolve(__dirname, '..', '..');

// Synthetic room covering all stair PS keys
const ROOM = new Map([
  ['PS_SURFACE_LF.STAIR_STRINGER',    { value: 30 }],
  ['PS_SURFACE_EA.STAIR_RISER',       { value: 14 }],
  ['PS_SURFACE_EA.STAIR_TREAD',       { value: 14 }],
  ['PS_SURFACE_LF.STAIR_SKIRTBOARD',  { value: 20 }],
  ['PS_SURFACE_EA.STAIR_BALUSTER',    { value: 26 }],
  ['PS_SURFACE_EA.STAIR_NEWEL',       { value: 3 }],
  ['PS_SURFACE_LF.STAIR_OPEN_RAIL',   { value: 14 }],
  ['PS_SURFACE_LF.STAIR_WALL_RAIL',   { value: 14 }],
  ['PS_META.EA.ROOMS_TOTAL',          { value: 1 }],
]);

const QTS = ['QT3', 'QT4', 'QT5'];
const PAINT_COMPONENTS = ['stringer', 'riser', 'skirtboard', 'baluster', 'newel', 'open_rail', 'wall_rail'];
const STAIN_COMPONENTS = ['tread', 'riser', 'baluster', 'newel', 'open_rail', 'wall_rail'];
const PAINT_METHODS = [['spray', 'SPRAY'], ['brush', 'BRUSH']];
const STAIN_METHODS = [['brush', 'BRUSH'], ['wipe', 'WIPE']];
const PAINT_STATES = [['SS_BARE', 'BARE'], ['SS_PRIMED_FACTORY', 'PRIMED_FACTORY']];
const STAIN_STATES = [['SS_BARE', 'BARE'], ['SS_STAINED', 'STAINED']];

const TESTS = [];

// 84 paint cases
for (const qt of QTS) {
  for (const comp of PAINT_COMPONENTS) {
    for (const [method, methodShort] of PAINT_METHODS) {
      for (const [state, stateShort] of PAINT_STATES) {
        TESTS.push({
          id: `SCN_${comp.toUpperCase()}_NC_${qt}_${methodShort}_FROM_${stateShort}`,
          ctx: {
            paintable_item: comp,
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
}

// 72 stain cases
for (const qt of QTS) {
  for (const comp of STAIN_COMPONENTS) {
    for (const [method, methodShort] of STAIN_METHODS) {
      for (const [state, stateShort] of STAIN_STATES) {
        TESTS.push({
          id: `SCN_${comp.toUpperCase()}_NC_STAIN_${qt}_${methodShort}_FROM_${stateShort}`,
          ctx: {
            paintable_item: comp,
            substrate_state: state,
            quality_tier: qt,
            application_method: method,
            coating_type: 'stain_clear',
            height_band: 'STD',
            complexity: 'STD',
          },
        });
      }
    }
  }
}

// 2 RP regression — actual winning scenario IDs are SCN_INT_STRP_*
// (The SCN_INT_STAIR_RP_* files exist but have a broken paintable_item: 'stair' match — pre-existing.)
TESTS.push(
  { id: 'SCN_INT_STRP_SOUND',   ctx: { paintable_item: 'int_stair', substrate_state: 'SS_SOUND_PAINT',   quality_tier: 'QT3', application_method: 'brush', coating_type: 'paint', height_band: 'STD', complexity: 'STD' }, regression: true },
  { id: 'SCN_INT_STRP_FAILING', ctx: { paintable_item: 'int_stair', substrate_state: 'SS_FAILING_PAINT', quality_tier: 'QT3', application_method: 'brush', coating_type: 'paint', height_band: 'STD', complexity: 'STD' }, regression: true },
);

console.log('Loading bundle from', REPO_ROOT);
const bundle = loadScenarioBundle(REPO_ROOT);
console.log(`  ${Object.keys(bundle.modules).length} modules`);
console.log(`  ${bundle.scenarios.length} scenarios`);
console.log('');
console.log('='.repeat(80));
console.log(`PHASE 3 STAIR SMOKE TEST  (${TESTS.length} cases)`);
console.log('='.repeat(80));
console.log('');

let allPass = true;
let passCount = 0;
const failSamples = [];
for (const t of TESTS) {
  const result = runScenarioEstimate({
    scenarioBundle: bundle,
    ctx: t.ctx,
    roomQty: ROOM,
    roomIndex: 0,
    roomLabel: 'Smoke Test Stairway',
  });

  const matched = result.scenarioId === t.id;
  const nonZero = result.totalHours > 0;
  const noWarnings = result.warnings.length === 0;
  const pass = matched && nonZero && noWarnings;
  if (!pass) { allPass = false; if (failSamples.length < 5) failSamples.push({ t, result }); }
  else passCount++;
}

// Print up to 5 failure samples for diagnosis, then summary
for (const { t, result } of failSamples) {
  const label = t.regression ? 'REGRESSION' : (t.ctx.coating_type === 'stain_clear' ? 'STAIN' : 'PAINT');
  console.log(`[FAIL] ${label} ${t.id}`);
  console.log(`       matched: ${result.scenarioId === t.id}   hours: ${result.totalHours}   tasks: ${result.tasks.length}   warnings: ${result.warnings.length}`);
  if (result.scenarioId !== t.id) console.log(`       expected ${t.id}, got ${result.scenarioId}`);
  if (result.warnings.length > 0) console.log(`       WARN: ${result.warnings[0]}`);
}

console.log('');
console.log('='.repeat(80));
console.log(`${passCount}/${TESTS.length} passed`);
if (!allPass) {
  console.log('SOME FAILED');
  process.exit(1);
}
console.log('ALL PASSED');
