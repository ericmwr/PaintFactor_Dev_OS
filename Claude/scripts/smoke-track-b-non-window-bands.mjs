// Smoke test: Track B non-window per-substrate height-band override.
// Verifies that for a 12-ft-ceiling room with crown/picture_rail/panel_mold/
// shadow_box enabled, the adapter emits ctx.height_band per the helper rules:
//   crown        → STEP (12 ft ≥ 9)
//   picture_rail → STD  (12-1 = 11 ft, but 11 ≥ 9 → STEP) — recheck below
//   panel_mold   → STD (no override)
//   shadow_box   → EXT (with explicit override)
//
// Runs the context-adapter against a synthetic state and prints
// (specId, height_band) for each per-substrate input.

import { buildScenarioInputs } from '../tools/paintscope/src/engine/context-adapter.js';

const state = {
  project: {
    project_name: 'Smoke',
    default_quality_tier: 'QT3',
    default_application_method: 'brush_roll',
  },
  rooms: [
    {
      id: 'r1',
      label: 'Tall Room',
      height_ft: 12,
      length_ft: 12, width_ft: 10,
      complexity: 'STD',
      substrates: {
        walls: { active: true, substrate_state: 'new_drywall', application_method: 'brush_roll', quality_tier: 'QT3', sf_manual: 0, sf_override: false },
        ceiling: { active: true, substrate_state: 'new_drywall', application_method: 'brush_roll', quality_tier: 'QT3', sf_manual: 0, sf_override: false },
        crown:        { active: true, substrate_state: 'bare_wood', application_method: 'brush', quality_tier: 'QT3', lf_manual: 40, lf_override: true },
        picture_rail: { active: true, substrate_state: 'bare_wood', application_method: 'brush', quality_tier: 'QT3', lf_manual: 40, lf_override: true },
        panel_mold:   { active: true, substrate_state: 'bare_wood', application_method: 'brush', quality_tier: 'QT3', lf_manual: 30, lf_override: true },
        shadow_box:   { active: true, substrate_state: 'bare_wood', application_method: 'brush', quality_tier: 'QT3', lf_manual: 30, lf_override: true, height_band_override: 'EXT' },
      },
      doors: { items: [] },
      windows: { items: [] },
      closets: [],
    },
  ],
  exterior: { elevations: [], standalone_items: [] },
  ui: {},
};

const { roomInputs } = buildScenarioInputs(state);
const targets = ['SF_CROWN_NC_PAINT', 'SF_CROWN_NC_PRIME', 'SF_PICTURE_RAIL_NC_PAINT', 'SF_PICTURE_RAIL_NC_PRIME', 'SF_PANEL_MOLD_NC_PAINT', 'SF_PANEL_MOLD_NC_PRIME', 'SF_SHADOW_BOX_NC_PAINT', 'SF_SHADOW_BOX_NC_PRIME'];

console.log('Room ceiling = 12 ft (room band: STEP)');
console.log('Per-substrate spec inputs:');
for (const ri of roomInputs) {
  if (targets.includes(ri.specId)) {
    console.log(`  ${ri.specId.padEnd(28)} height_band=${ri.ctx.height_band}`);
  }
}

const expectations = {
  // crown at 12 ft → STEP (≥9, <13)
  SF_CROWN_NC_PAINT: 'STEP',
  SF_CROWN_NC_PRIME: 'STEP',
  // picture_rail at 12-1=11 ft → STEP (≥9, <13)
  SF_PICTURE_RAIL_NC_PAINT: 'STEP',
  SF_PICTURE_RAIL_NC_PRIME: 'STEP',
  // panel_mold without explicit override → constant STD (wall-mounted, ignores room band)
  SF_PANEL_MOLD_NC_PAINT: 'STD',
  SF_PANEL_MOLD_NC_PRIME: 'STD',
  // shadow_box explicit override → EXT
  SF_SHADOW_BOX_NC_PAINT: 'EXT',
  SF_SHADOW_BOX_NC_PRIME: 'EXT',
};

let pass = 0, fail = 0;
for (const [specId, expected] of Object.entries(expectations)) {
  const ri = roomInputs.find(r => r.specId === specId);
  if (!ri) { console.log(`  MISSING ${specId}`); fail++; continue; }
  const actual = ri.ctx.height_band;
  const ok = actual === expected;
  console.log(`  ${ok ? 'PASS' : 'FAIL'} ${specId.padEnd(28)} expected=${expected} actual=${actual}`);
  if (ok) pass++; else fail++;
}
console.log(`\n${pass} pass / ${fail} fail`);
process.exit(fail > 0 ? 1 : 0);
