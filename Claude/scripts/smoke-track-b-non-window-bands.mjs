// Smoke test: Track B non-window per-substrate height-band override.
// Verifies that for a 12-ft-ceiling room with crown/picture_rail/panel_mold/
// shadow_box enabled, the adapter emits ctx.height_band per the helper rules
// for BOTH paint and stain spec families:
//   crown        → STEP (12 ft ≥ 9)
//   picture_rail → STEP (12-1=11 ft ≥ 9)
//   panel_mold   → STD (no override)
//   shadow_box   → EXT (with explicit override)
//
// The helper normalizes int_<sub> → <sub> so stain specs share the same
// substrate config as paint.

import { buildScenarioInputs } from '../tools/paintscope/src/engine/context-adapter.js';

const state = {
  project: {
    project_name: 'Smoke',
    default_quality_tier: 'QT3',
    default_application_method: 'brush_roll',
  },
  rooms: [
    // Room 1 — paint coating (activates SF_<SUB>_NC_PAINT/PRIME specs)
    {
      id: 'r1', label: 'Tall Room (Paint)',
      height_ft: 12, length_ft: 12, width_ft: 10, complexity: 'STD',
      substrates: {
        walls:        { active: true, substrate_state: 'new_drywall', application_method: 'brush_roll', quality_tier: 'QT3', sf_manual: 0, sf_override: false },
        ceiling:      { active: true, substrate_state: 'new_drywall', application_method: 'brush_roll', quality_tier: 'QT3', sf_manual: 0, sf_override: false },
        crown:        { active: true, substrate_state: 'bare_wood', application_method: 'brush', quality_tier: 'QT3', lf_manual: 40, lf_override: true },
        picture_rail: { active: true, substrate_state: 'bare_wood', application_method: 'brush', quality_tier: 'QT3', lf_manual: 40, lf_override: true },
        panel_mold:   { active: true, substrate_state: 'bare_wood', application_method: 'brush', quality_tier: 'QT3', lf_manual: 30, lf_override: true },
        shadow_box:   { active: true, substrate_state: 'bare_wood', application_method: 'brush', quality_tier: 'QT3', lf_manual: 30, lf_override: true, height_band_override: 'EXT' },
      },
      doors: { items: [] }, windows: { items: [] }, closets: [],
    },
    // Room 2 — stain coating (activates SF_<SUB>_NC_STAIN specs via coating_type)
    {
      id: 'r2', label: 'Tall Room (Stain)',
      height_ft: 12, length_ft: 12, width_ft: 10, complexity: 'STD',
      substrates: {
        walls:        { active: true, substrate_state: 'new_drywall', application_method: 'brush_roll', quality_tier: 'QT3', sf_manual: 0, sf_override: false },
        ceiling:      { active: true, substrate_state: 'new_drywall', application_method: 'brush_roll', quality_tier: 'QT3', sf_manual: 0, sf_override: false },
        crown:        { active: true, substrate_state: 'bare_wood', application_method: 'brush', application_method_stain: 'brush', application_method_clear: 'brush', coating_type: 'stain_clear', wood_species_group: 'hardwood', stain_coats: 1, sealer_coats: 0, clear_coats: 1, clear_sheen: 'satin', quality_tier: 'QT3', lf_manual: 40, lf_override: true },
        picture_rail: { active: true, substrate_state: 'bare_wood', application_method: 'brush', application_method_stain: 'brush', application_method_clear: 'brush', coating_type: 'stain_clear', wood_species_group: 'hardwood', stain_coats: 1, sealer_coats: 0, clear_coats: 1, clear_sheen: 'satin', quality_tier: 'QT3', lf_manual: 40, lf_override: true },
        panel_mold:   { active: true, substrate_state: 'bare_wood', application_method: 'brush', application_method_stain: 'brush', application_method_clear: 'brush', coating_type: 'stain_clear', wood_species_group: 'hardwood', stain_coats: 1, sealer_coats: 0, clear_coats: 1, clear_sheen: 'satin', quality_tier: 'QT3', lf_manual: 30, lf_override: true },
        shadow_box:   { active: true, substrate_state: 'bare_wood', application_method: 'brush', application_method_stain: 'brush', application_method_clear: 'brush', coating_type: 'stain_clear', wood_species_group: 'hardwood', stain_coats: 1, sealer_coats: 0, clear_coats: 1, clear_sheen: 'satin', quality_tier: 'QT3', lf_manual: 30, lf_override: true, height_band_override: 'EXT' },
      },
      doors: { items: [] }, windows: { items: [] }, closets: [],
    },
  ],
  exterior: { elevations: [], standalone_items: [] },
  ui: {},
};

const { roomInputs } = buildScenarioInputs(state);
const paintTargets = ['SF_CROWN_NC_PAINT', 'SF_CROWN_NC_PRIME', 'SF_PICTURE_RAIL_NC_PAINT', 'SF_PICTURE_RAIL_NC_PRIME', 'SF_PANEL_MOLD_NC_PAINT', 'SF_PANEL_MOLD_NC_PRIME', 'SF_SHADOW_BOX_NC_PAINT', 'SF_SHADOW_BOX_NC_PRIME'];
const stainTargets = ['SF_CROWN_NC_STAIN', 'SF_PICTURE_RAIL_NC_STAIN', 'SF_PANEL_MOLD_NC_STAIN', 'SF_SHADOW_BOX_NC_STAIN'];
const targets = [...paintTargets, ...stainTargets];

console.log('Room ceiling = 12 ft (room band: STEP)');
console.log('Per-substrate spec inputs:');
for (const ri of roomInputs) {
  if (targets.includes(ri.specId)) {
    console.log(`  ${ri.specId.padEnd(28)} height_band=${ri.ctx.height_band}`);
  }
}

const expectations = {
  // PAINT side
  SF_CROWN_NC_PAINT: 'STEP',
  SF_CROWN_NC_PRIME: 'STEP',
  SF_PICTURE_RAIL_NC_PAINT: 'STEP',
  SF_PICTURE_RAIL_NC_PRIME: 'STEP',
  SF_PANEL_MOLD_NC_PAINT: 'STD',
  SF_PANEL_MOLD_NC_PRIME: 'STD',
  SF_SHADOW_BOX_NC_PAINT: 'EXT',
  SF_SHADOW_BOX_NC_PRIME: 'EXT',
  // STAIN side — same physical reality, helper normalizes int_<sub> → <sub>
  SF_CROWN_NC_STAIN: 'STEP',
  SF_PICTURE_RAIL_NC_STAIN: 'STEP',
  SF_PANEL_MOLD_NC_STAIN: 'STD',
  SF_SHADOW_BOX_NC_STAIN: 'EXT',
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
