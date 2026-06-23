// Resolve a scenario's spec_family_id from its `matches`. Canonical scenario→spec
// bridge shared by the estimate material path (scenario-estimate.js) and the
// QT-Builder Materials authoring UI (derive-materials.js). It must live in the
// engine layer because material system ids are SHARED across spec families
// (e.g. SYS_FF_PREMIUM belongs to 11 families), so a material selection cannot be
// attributed to a family by its system-id value — only the scenario's own
// paintable_item (+ surface/state) disambiguates.

import { SPEC_TO_PAINTABLE_ITEM } from './context-adapter.js';
import { SPEC_ROLE, SPEC_VALID_INPUT_STATES } from '../data/scenario-maps.js';

// paintable_item -> [specId...] (inverse of SPEC_TO_PAINTABLE_ITEM).
const SPECS_BY_PAINTABLE_ITEM = {};
for (const [specId, pi] of Object.entries(SPEC_TO_PAINTABLE_ITEM)) {
  (SPECS_BY_PAINTABLE_ITEM[pi] = SPECS_BY_PAINTABLE_ITEM[pi] || []).push(specId);
}

// Fine-grained tokens that have no entry in SPEC_TO_PAINTABLE_ITEM because they
// are stair sub-parts (balusters, risers, etc.) or RP / stain tokens that use
// a different paintable_item string than the main NC path. Each value is
// [paintSpec, stainSpec] where coating_type discriminates (see step 3 below).
// Eric's split: railing family = baluster/newel/open_rail/wall_rail;
//               riser family  = riser/tread/stringer/skirtboard.
const EXTRA_TOKEN_SPECS = {
  // Stair fine tokens — railing family
  baluster:  ['SF_STAIR_RAILING_NC', 'SF_STAIR_RAILING_NC_STAIN'],
  newel:     ['SF_STAIR_RAILING_NC', 'SF_STAIR_RAILING_NC_STAIN'],
  open_rail: ['SF_STAIR_RAILING_NC', 'SF_STAIR_RAILING_NC_STAIN'],
  wall_rail: ['SF_STAIR_RAILING_NC', 'SF_STAIR_RAILING_NC_STAIN'],
  // Stair fine tokens — riser family
  riser:      ['SF_STAIR_RISER_NC', 'SF_STAIR_RISER_NC_STAIN'],
  tread:      ['SF_STAIR_RISER_NC', 'SF_STAIR_RISER_NC_STAIN'],
  stringer:   ['SF_STAIR_RISER_NC', 'SF_STAIR_RISER_NC_STAIN'],
  skirtboard: ['SF_STAIR_RISER_NC', 'SF_STAIR_RISER_NC_STAIN'],
  // RP tokens that use a shorter token than the SPEC_TO_PAINTABLE_ITEM key
  door:       ['SF_DOOR_INT_RP'],
  stair:      ['SF_STAIR_INT_RP'],
  specialty:  ['SF_SPECIALTY_INT_RP'],
  // RP tokens that use an 'int_*' prefix not in SPEC_TO_PAINTABLE_ITEM
  int_drywall_wall:    ['SF_DRYWALL_WALL_INT_RP'],
  int_drywall_ceiling: ['SF_DRYWALL_CEILING_INT_RP'],
  // Stain-only tokens whose paintable_item is prefixed differently from the NC path
  int_stair_railing: ['SF_STAIR_RAILING_NC_STAIN'],
  int_stair_riser:   ['SF_STAIR_RISER_NC_STAIN'],
};

// Returns true if matches.coating_type indicates a stain/clear scenario.
function isStainCoating(ct) {
  if (!ct) return false;
  const vals = Array.isArray(ct) ? ct : [ct];
  return vals.some(v => v === 'stain' || v === 'stain_clear' || v === 'stain_only' || v === 'clear_only');
}

// 1:1 for most paintable items; multi-spec ones (drywall: wall/ceiling ×
// prime/finish; cabinet NC vs RP) disambiguate by matches.surface and
// matches.substrate_state. Returns null when unknown.
export function specForScenarioMatches(matches) {
  if (!matches) return null;

  // Step A: resolve the canonical token (string or first-element of array).
  const rawPi = matches.paintable_item;
  if (rawPi == null) return null;  // combined pass-group (no paintable_item)
  const token = Array.isArray(rawPi) ? rawPi[0] : rawPi;
  if (!token) return null;

  // Step B: build initial candidate list from main map + extra-token map.
  const fromMain = SPECS_BY_PAINTABLE_ITEM[token] || [];
  const fromExtra = EXTRA_TOKEN_SPECS[token] || [];
  // Merge, deduplicating (main entries first).
  const all = [...new Set([...fromMain, ...fromExtra])];
  if (all.length === 0) return null;
  if (all.length === 1) return all[0];

  let cands = all;

  // 1. surface filter (drywall: wall vs ceiling)
  if (matches.surface === 'wall') cands = cands.filter(id => id.includes('WALL'));
  else if (matches.surface === 'ceiling') cands = cands.filter(id => id.includes('CEILING'));

  // 2. state-compatibility filter (NC vs RP, prime vs finish)
  const states = Array.isArray(matches.substrate_state)
    ? matches.substrate_state
    : (matches.substrate_state ? [matches.substrate_state] : []);
  if (states.length > 0) {
    const compatible = cands.filter(id => {
      const valid = SPEC_VALID_INPUT_STATES[id];
      return !valid || states.some(s => valid.includes(s));
    });
    if (compatible.length > 0) cands = compatible;
  }
  if (cands.length <= 1) return cands[0] || null;

  // 2.5 coating_phase discriminator: for decomposed stain families the scenario
  // carries a coating_phase field ('stain' | 'sealer' | 'clear') that maps
  // directly to SPEC_ROLE. Apply this before coating_type narrowing so that
  // e.g. int_window SEALER scenarios correctly resolve to SF_WINDOW_INT_NC_SEALER
  // rather than the _STAIN family.
  if (matches.coating_phase) {
    const PHASE_TO_ROLE = { stain: 'STAIN', sealer: 'SEALER', clear: 'CLEAR' };
    const wantedRole = PHASE_TO_ROLE[matches.coating_phase];
    if (wantedRole) {
      const narrowed = cands.filter(id => SPEC_ROLE[id] === wantedRole);
      if (narrowed.length > 0) cands = narrowed;
    }
  }
  if (cands.length <= 1) return cands[0] || null;

  // 2.6 coating_type discriminator: narrow paint vs stain families.
  // Only applies when candidates contain both _STAIN and non-stain specs.
  const hasStainCand = cands.some(id => id.includes('_STAIN'));
  const hasPaintCand = cands.some(id => !id.includes('_STAIN'));
  if (hasStainCand && hasPaintCand) {
    const isStain = isStainCoating(matches.coating_type);
    const narrowed = isStain
      ? cands.filter(id => id.includes('_STAIN'))
      : cands.filter(id => !id.includes('_STAIN'));
    if (narrowed.length > 0) cands = narrowed;
  }
  if (cands.length <= 1) return cands[0] || null;

  // 3. PRIME/FINISH role filter (remaining drywall ambiguity).
  // Guard: only apply if the filter is non-empty (prevents closet / COMBINED specs
  // from resolving to null when SS_BARE triggers wantsPrime but no candidate has
  // SPEC_ROLE=PRIME).
  const wantsPrime = states.some(s => s === 'SS_BARE');
  const wantsFinish = states.some(s => /^SS_PRIMED/.test(s));
  if (wantsPrime && !wantsFinish) {
    const narrowed = cands.filter(id => SPEC_ROLE[id] === 'PRIME' || id.includes('PRIME'));
    if (narrowed.length > 0) cands = narrowed;
  } else if (wantsFinish && !wantsPrime) {
    const narrowed = cands.filter(id => SPEC_ROLE[id] === 'FINISH' || id.includes('FINISH'));
    if (narrowed.length > 0) cands = narrowed;
  }
  return cands[0] || null;
}

// NOTE — first-wins tie-break gap:
// paintable_items that map to multiple specs but share no differentiation in
// SPEC_VALID_INPUT_STATES *or* SPEC_ROLE (e.g. the exterior NC/RP pairs:
// ext_trim, ext_door, ext_window, ext_porch_ceiling) all reach this point
// with cands.length > 1 and silently return the first entry in the
// SPECS_BY_PAINTABLE_ITEM array (order determined by SPEC_TO_PAINTABLE_ITEM
// insertion order). This is a known gap — do not let exterior callers rely
// on the resolved family until these pairs gain state-based differentiation.
