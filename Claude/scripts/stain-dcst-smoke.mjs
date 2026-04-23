#!/usr/bin/env node
// Smoke test for SF_DOOR_CASING_NC_STAIN extraction pilot.
// Constructs a synthetic door_casing stain ctx, matches against the bundle,
// runs the estimator, and prints per-task / per-phase hours.

import { scenarioBundle } from '../tools/paintscope/src/data/scenario-bundle.gen.js';
import { runScenarioEstimate } from '../tools/paintscope/src/engine/run-estimate-scenario.js';
import { findBestMatch } from '../tools/paintscope/src/engine/scenario-matcher.js';

const bundle = scenarioBundle;
console.log(`Bundle: ${Object.keys(bundle.modules).length} modules, ${bundle.scenarios.length} scenarios, ${Object.keys(bundle.tasks).length} tasks`);

const ctx = {
  paintable_item: 'int_door_casing',
  substrate_state: 'SS_BARE',
  quality_tier: 'QT3',
  coating_type: 'stain_clear',
  application_method_stain: 'brush',
  application_method_clear: 'brush',
  wood_species_group: 'softwood',
  clear_sheen: 'satin',
  stain_coats: 1,
  sealer_coats: 1,
  clear_coats: 2,
  height_band: 'STD',
  complexity: 'STD',
  substrate_condition: 'fair',
};

const roomQty = new Map([
  ['PS_SURFACE_LF.TRIM_CASING_DOOR', { value: 80 }],
]);

const { scenario, tied, warnings: matchWarns } = findBestMatch(bundle, ctx);
console.log(`\nBest-match scenario: ${scenario ? scenario.scenario_id : 'NONE'}`);
if (matchWarns?.length) console.log('Match warnings:', matchWarns);
if (!scenario) { process.exit(1); }
if (scenario.scenario_id !== 'SCN_INT_DCST_STAIN_CLEAR') {
  console.error(`FAIL: expected SCN_INT_DCST_STAIN_CLEAR, got ${scenario.scenario_id}`);
  process.exit(1);
}

const warnings = [];
const result = runScenarioEstimate({
  scenarioBundle: bundle,
  ctx,
  roomQty,
  roomIndex: 0,
  roomLabel: 'SmokeRoom',
});

console.log(`\nTotal hours: ${result.totalHours.toFixed(3)}`);
console.log(`Phase hours: ${JSON.stringify(result.phaseHours)}`);
console.log(`Task count: ${result.tasks.length}`);
if (warnings.length) console.log('Warnings:', warnings);

console.log('\nTasks:');
result.tasks.forEach(t => {
  console.log(`  ${t.phase.padEnd(10)} ${t.taskId.padEnd(32)} qty=${String(t.quantity).padStart(6)} hrs=${t.hours}`);
});

if (result.totalHours <= 0) {
  console.error('\nFAIL: totalHours is zero');
  process.exit(1);
}
console.log('\nPASS: non-zero hours produced from door_casing stain scenario');
