// Phase 1c.2 per-item compute smoke test.
//
// Validates that the new orchestrator produces per-item door/window results
// when tasks are tagged `per_item: "doors"` / `"windows"` and roomItems is
// passed alongside roomQty. This matches the legacy engine's
// computeDoorPerItemResults / computeWindowPerItemResults output shape.
//
// Phase 1c.2 is a mechanism test — the tasks in the current door/window
// modules are NOT yet tagged with per_item. We test the mechanism directly
// by constructing a synthetic module and scenario inline and running them
// through the orchestrator.

import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { runScenarioEstimate } from '../tools/paintscope/src/engine/run-estimate-scenario.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// Synthetic module with per_item tasks — not authored as a real module file
// because this is a mechanism test, not a production scenario.
const testBundle = {
  modules: {
    MOD_TEST_DOOR_FINISH_PER_ITEM: {
      module_id: 'MOD_TEST_DOOR_FINISH_PER_ITEM',
      name: 'Test Door Finish (Per-Item)',
      phase: 'finish',
      intent: 'Per-item door finish test module',
      tasks: [
        {
          task_id: 'TSK_TEST_DOOR_SPRAY',
          name: 'Spray Door Finish (Per-Item)',
          uom: 'EA_SIDE',
          skill_level: 'experienced',
          rate_per_hour: 10,
          per_item: 'doors',
        },
      ],
      modifier_eligibility: { qt: false, height: false, texture: false, complexity: false },
      doctrine: 'Test module',
    },
    MOD_TEST_WINDOW_FINISH_PER_ITEM: {
      module_id: 'MOD_TEST_WINDOW_FINISH_PER_ITEM',
      name: 'Test Window Finish (Per-Item)',
      phase: 'finish',
      intent: 'Per-item window finish test module',
      tasks: [
        {
          task_id: 'TSK_TEST_WIN_BRUSH',
          name: 'Brush Window Finish (Per-Item)',
          uom: 'EA',
          skill_level: 'experienced',
          rate_per_hour: 3.5,
          per_item: 'windows',
        },
      ],
      modifier_eligibility: { qt: false, height: false, texture: false, complexity: false },
      doctrine: 'Test module',
    },
  },
  scenarios: [
    {
      scenario_id: 'SCN_TEST_DOOR_PER_ITEM',
      name: 'Test Scenario - Per-Item Doors',
      matches: { paintable_item: 'test_door' },
      modules: ['MOD_TEST_DOOR_FINISH_PER_ITEM'],
      output_state: 'SS_PAINTED_TEST',
    },
    {
      scenario_id: 'SCN_TEST_WINDOW_PER_ITEM',
      name: 'Test Scenario - Per-Item Windows',
      matches: { paintable_item: 'test_window' },
      modules: ['MOD_TEST_WINDOW_FINISH_PER_ITEM'],
      output_state: 'SS_PAINTED_TEST',
    },
  ],
};

// Mixed door room: 2 flush + 2 panel_4 + 1 french
const roomItemsDoors = {
  doors: [
    { count: 2, door_type: 'flush',   sides_per_door: 2 },
    { count: 2, door_type: 'panel_4', sides_per_door: 2 },
    { count: 1, door_type: 'french',  sides_per_door: 2 },
  ],
};

// Mixed window room: 2 double_hung M + 1 fixed L + 1 casement S with muntins
const roomItemsWindows = {
  windows: [
    { count: 2, window_type: 'double_hung', size_bucket: 'M',  has_muntins: false },
    { count: 1, window_type: 'fixed',       size_bucket: 'L',  has_muntins: false },
    { count: 1, window_type: 'casement',    size_bucket: 'S',  has_muntins: true  },
  ],
};

console.log('='.repeat(80));
console.log('PHASE 1c.2 — PER-ITEM COMPUTE SMOKE TEST');
console.log('='.repeat(80));
console.log('');

// -------- Door per-item test --------
console.log('Door per-item test (5 doors: 2 flush, 2 panel_4, 1 french)');
console.log('  Base rate: 10 sides/hr (spray door finish)');
console.log('  Modifiers: flush=1.0, panel_4=1.25, french=2.0');
console.log('');

const doorResult = runScenarioEstimate({
  scenarioBundle: testBundle,
  ctx: { paintable_item: 'test_door', substrate_state: 'SS_BARE' },
  roomQty: new Map(),
  roomItems: roomItemsDoors,
  roomIndex: 0,
  roomLabel: 'Test Room',
});

// Expected per-item hours:
//   flush:   2 doors × 2 sides ÷ (10 / 1.00) = 4 ÷ 10 = 0.400 hrs
//   panel_4: 2 doors × 2 sides ÷ (10 / 1.25) = 4 ÷ 8  = 0.500 hrs
//   french:  1 door  × 2 sides ÷ (10 / 2.00) = 2 ÷ 5  = 0.400 hrs
//   TOTAL:                                              1.300 hrs
const expectedDoorTotal = 1.300;
console.log(`  tasks emitted: ${doorResult.tasks.length}`);
for (const t of doorResult.tasks) {
  console.log(`    ${t.itemLabel.padEnd(12)} qty=${t.quantity}  typeMod=${t.modStack.typeMod}  hours=${t.hours}`);
}
console.log(`  Actual total:   ${doorResult.totalHours}`);
console.log(`  Expected total: ${expectedDoorTotal}`);
const doorDelta = Math.round((doorResult.totalHours - expectedDoorTotal) * 1000) / 1000;
const doorPass = Math.abs(doorDelta) < 0.01 && doorResult.tasks.length === 3;
console.log(`  ${doorPass ? 'PASS' : 'FAIL'} (delta ${doorDelta}, 3 per-item line items expected)`);
console.log('');

// -------- Window per-item test --------
console.log('Window per-item test (4 windows: 2 DH-M, 1 Fixed-L, 1 Casement-S muntins)');
console.log('  Base rate: 3.5 win/hr (brush window finish)');
console.log('  Modifiers: DH=1.00, Fixed=0.78, Casement=0.96');
console.log('  Size: M=1.00, L=1.40, S=0.75');
console.log('  Muntins: 1.20 when has_muntins=true');
console.log('');

const windowResult = runScenarioEstimate({
  scenarioBundle: testBundle,
  ctx: { paintable_item: 'test_window', substrate_state: 'SS_BARE' },
  roomQty: new Map(),
  roomItems: roomItemsWindows,
  roomIndex: 0,
  roomLabel: 'Test Room',
});

// Expected per-item hours:
//   DH-M:         2 × 1.00 × 1.00 × 1.00 = itemMod 1.00; rate 3.5/1.00 = 3.5;  2/3.5  = 0.571
//   Fixed-L:      1 × 0.78 × 1.40 × 1.00 = itemMod 1.092; rate 3.5/1.092 = 3.205; 1/3.205 = 0.312
//   Casement-S:   1 × 0.96 × 0.75 × 1.20 = itemMod 0.864; rate 3.5/0.864 = 4.051; 1/4.051 = 0.247
//   TOTAL: 1.131
const expectedWindowTotal = 0.571 + 0.312 + 0.247;
console.log(`  tasks emitted: ${windowResult.tasks.length}`);
for (const t of windowResult.tasks) {
  console.log(`    ${t.itemLabel.padEnd(16)} qty=${t.quantity}  sizeMod=${t.modStack.sizeMod}  typeMod=${t.modStack.typeMod}  itemMod=${t.modStack.itemMod.toFixed(3)}  hours=${t.hours}`);
}
console.log(`  Actual total:   ${windowResult.totalHours}`);
console.log(`  Expected total: ${expectedWindowTotal.toFixed(3)}`);
const windowDelta = Math.round((windowResult.totalHours - expectedWindowTotal) * 1000) / 1000;
const windowPass = Math.abs(windowDelta) < 0.02 && windowResult.tasks.length === 3;
console.log(`  ${windowPass ? 'PASS' : 'FAIL'} (delta ${windowDelta}, 3 per-item line items expected)`);
console.log('');

const overallPass = doorPass && windowPass;
console.log('='.repeat(80));
console.log(overallPass ? 'OVERALL: PER-ITEM COMPUTE MECHANISM WORKS' : 'OVERALL: ONE OR MORE TESTS FAILED');
console.log('='.repeat(80));
process.exit(overallPass ? 0 : 1);
