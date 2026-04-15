// Verifies resolveSystem returns a non-null system for items-based specs (doors).
// Before the fix: SF_DOOR_SLAB_INT_NC returns null because items[0].substrate_state
// isn't read. After the fix: returns a real system like paint_finish.

import { resolveSystem } from '../tools/paintscope/src/engine/spec-resolution.js';

// Test room with doors substrate (items-based — no top-level substrate_state)
const room = {
  substrates: {
    doors: {
      painting: true,
      application_method: 'brush',
      items: [
        { count: 2, door_type: 'panel_6', substrate_state: 'factory_primed', sides_per_door: 2 }
      ]
    }
  }
};
const project = {};

const cases = [
  { specId: 'SF_DOOR_SLAB_INT_NC',       label: 'Door slab (items-based)',   expectNotNull: true },
  { specId: 'SF_CABINET_NC_PAINT',       label: 'Cabinet (via doors proxy)', expectNotNull: true },
];

let failed = 0;
for (const c of cases) {
  const sys = resolveSystem(c.specId, room, project);
  if (c.expectNotNull && !sys) {
    console.error(`[FAIL] ${c.label} (${c.specId}): system=null, expected non-null`);
    failed++;
  } else {
    console.log(`[PASS] ${c.label}: system=${sys}`);
  }
}

if (failed > 0) {
  console.error(`\n${failed}/${cases.length} system resolution cases failed`);
  process.exit(1);
}
console.log(`\nAll ${cases.length} cases passed`);
