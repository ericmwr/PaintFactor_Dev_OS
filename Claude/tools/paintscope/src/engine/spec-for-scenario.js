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

// 1:1 for most paintable items; multi-spec ones (drywall: wall/ceiling ×
// prime/finish; cabinet NC vs RP) disambiguate by matches.surface and
// matches.substrate_state. Returns null when unknown.
export function specForScenarioMatches(matches) {
  if (!matches) return null;
  const all = SPECS_BY_PAINTABLE_ITEM[matches.paintable_item] || [];
  if (all.length <= 1) return all[0] || null;
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
  // 3. PRIME/FINISH role filter (remaining drywall ambiguity)
  const wantsPrime = states.some(s => s === 'SS_BARE');
  const wantsFinish = states.some(s => /^SS_PRIMED/.test(s));
  if (wantsPrime && !wantsFinish) cands = cands.filter(id => SPEC_ROLE[id] === 'PRIME' || id.includes('PRIME'));
  else if (wantsFinish && !wantsPrime) cands = cands.filter(id => SPEC_ROLE[id] === 'FINISH' || id.includes('FINISH'));
  return cands[0] || null;
}
