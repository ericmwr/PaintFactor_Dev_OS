// Smoke: confirm door_frame + window_jamb main caulk_joints bill non-zero hours
// after Track A's per-substrate rewiring. Verifies bug #2/#3 from the
// 2026-05-03 next-session doc are actually resolved.

import { buildRoomQuantityLookups } from '../tools/paintscope/src/engine/quantity-lookups.js';
import { buildScenarioInputs } from '../tools/paintscope/src/engine/context-adapter.js';
import canonicalBundle from '../tools/paintscope/src/data/scenario-bundle.gen.js';

const state = {
  project: { project_name: 'Smoke', default_quality_tier: 'QT3', default_application_method: 'brush_roll' },
  rooms: [
    {
      id: 'r1', label: 'Test Room',
      length_ft: 12, width_ft: 10, height_ft: 8,
      complexity: 'STD',
      substrates: {
        walls:        { active: true, substrate_state: 'new_drywall', application_method: 'brush_roll', quality_tier: 'QT3', sf_manual: 0, sf_override: false },
        door_frames:  { active: true, substrate_state: 'bare_wood',   application_method: 'brush',      quality_tier: 'QT3' },
        window_jamb:  { active: true, substrate_state: 'bare_wood',   application_method: 'brush',      quality_tier: 'QT3' },
        windows:      { painting: true, items: [{ count: 3, size_bucket: 'M', painting: true }] },
      },
      doors:   { items: [{ count: 2, sides_per_door: 2, painting: true }] },
      openings: [{ opening_type: 'single', count: 2 }],
      closets: [],
    },
  ],
  exterior: { elevations: [], standalone_items: [] },
  ui: {},
};

// 1) Verify the per-substrate ps_keys are emitted with non-zero qty
const lookups = buildRoomQuantityLookups(state);
const room0 = lookups.get(0).qty;
const door_frame_caulk = room0.get('PS_EDGE_LF.TRIM_JOINTS_DOOR_FRAME');
const window_jamb_caulk = room0.get('PS_EDGE_LF.TRIM_JOINTS_WINDOW_JAMB');

console.log('PS key emissions:');
console.log(`  PS_EDGE_LF.TRIM_JOINTS_DOOR_FRAME  = ${door_frame_caulk?.value ?? 0} ${door_frame_caulk?.uom ?? '-'}`);
console.log(`  PS_EDGE_LF.TRIM_JOINTS_WINDOW_JAMB = ${window_jamb_caulk?.value ?? 0} ${window_jamb_caulk?.uom ?? '-'}`);

// 2) Verify modules reference per-substrate tasks (not legacy TSK_TRIM_CAULK_JOINTS)
const doorFrameModule = canonicalBundle.modules?.MOD_PREP_DOOR_FRAME_PAINT;
const windowJambModule = canonicalBundle.modules?.MOD_PREP_WINDOW_JAMB_PAINT;
const doorFrameUsesNew = doorFrameModule?.tasks?.some(t => t.task_ref === 'TSK_DOOR_FRAME_CAULK_JOINTS');
const doorFrameUsesLegacy = doorFrameModule?.tasks?.some(t => t.task_ref === 'TSK_TRIM_CAULK_JOINTS');
const windowJambUsesNew = windowJambModule?.tasks?.some(t => t.task_ref === 'TSK_WINDOW_JAMB_CAULK_JOINTS');
const windowJambUsesLegacy = windowJambModule?.tasks?.some(t => t.task_ref === 'TSK_TRIM_CAULK_JOINTS');

console.log('\nModule wiring:');
console.log(`  MOD_PREP_DOOR_FRAME_PAINT  uses TSK_DOOR_FRAME_CAULK_JOINTS  : ${doorFrameUsesNew}`);
console.log(`  MOD_PREP_DOOR_FRAME_PAINT  uses legacy TSK_TRIM_CAULK_JOINTS : ${doorFrameUsesLegacy}`);
console.log(`  MOD_PREP_WINDOW_JAMB_PAINT uses TSK_WINDOW_JAMB_CAULK_JOINTS : ${windowJambUsesNew}`);
console.log(`  MOD_PREP_WINDOW_JAMB_PAINT uses legacy TSK_TRIM_CAULK_JOINTS : ${windowJambUsesLegacy}`);

// 3) Verify the legacy lumped key is pinned to 0
const lumped = lookups.get(0).qty.get('PS_EDGE_LF.TRIM_JOINTS');
console.log(`\nLegacy lumped key (should be 0 to prevent double-count):`);
console.log(`  PS_EDGE_LF.TRIM_JOINTS = ${lumped?.value ?? 'unset'}`);

// Pass criteria
const checks = [
  { name: 'door_frame caulk LF > 0',     pass: (door_frame_caulk?.value ?? 0) > 0 },
  { name: 'window_jamb caulk LF > 0',    pass: (window_jamb_caulk?.value ?? 0) > 0 },
  { name: 'door_frame uses new task',    pass: doorFrameUsesNew === true },
  { name: 'door_frame NOT legacy',       pass: doorFrameUsesLegacy === false },
  { name: 'window_jamb uses new task',   pass: windowJambUsesNew === true },
  { name: 'window_jamb NOT legacy',      pass: windowJambUsesLegacy === false },
  // addQ short-circuits on 0 so the key stays unset — same effect as 0
  { name: 'legacy lumped key unset (≡ 0)', pass: lumped === undefined },
];

console.log('\nResults:');
let pass = 0, fail = 0;
for (const c of checks) {
  console.log(`  ${c.pass ? 'PASS' : 'FAIL'} — ${c.name}`);
  if (c.pass) pass++; else fail++;
}
console.log(`\n${pass} pass / ${fail} fail`);
process.exit(fail > 0 ? 1 : 0);
