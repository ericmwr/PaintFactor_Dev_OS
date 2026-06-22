// Pure view-model for the QT Builder Materials section. Resolves the governing
// scenario per tier (findBestMatch) over the overlaid bundle, scopes candidate
// SYS_* systems to that scenario's spec family, reads the resolved system per
// role from the scenario's material_systems array, and flags per-role overrides
// vs the canonical bundle. No mutation; the only engine calls are findBestMatch
// + specForScenarioMatches + classifySystemRole.

import { findBestMatch } from '../../../engine/scenario-matcher.js';
import { specForScenarioMatches } from '../../../engine/spec-for-scenario.js';
import { buildRoleBySystemId, classifySystemRole } from '../../../engine/material-system-roles.js';
import { MATERIAL_SYSTEMS, MATERIAL_SYSTEM_PRODUCTS } from '../../../data/scenario-rate-data.js';
import { QT_BUCKETS } from '../../../data/quality-tier.js';

const PAINT_ROLES = ['primer', 'finish'];
const STAIN_ROLES = ['stain', 'sealer', 'clear'];
const ROLE_ORDER = ['primer', 'finish', 'stain', 'sealer', 'clear'];
const ROLE_BY_SYSTEM_ID = buildRoleBySystemId(MATERIAL_SYSTEM_PRODUCTS);
const NAME_BY_SYSTEM_ID = Object.fromEntries(MATERIAL_SYSTEMS.map(s => [s.id, s.name || s.id]));

function ctxFor(sel, tier) {
  return {
    paintable_item: sel.paintable_item, application_method: sel.application_method,
    substrate_state: sel.substrate_state, coating_type: sel.coating_type, quality_tier: tier,
  };
}

// resolvedByRole: first system per role in the array.
function resolvedByRoleFrom(systems, baseRole) {
  const out = {};
  for (const id of systems || []) {
    // baseRole fallback is intentional: a system absent from MATERIAL_SYSTEM_PRODUCTS
    // (a placeholder stub, ~90% of materials) gracefully classifies to the base role
    // for display rather than returning an unknown/null role.
    const role = classifySystemRole(id, ROLE_BY_SYSTEM_ID, baseRole);
    if (!(role in out)) out[role] = id;
  }
  return out;
}

export function deriveMaterials(bundle, canonicalBundle, sel) {
  const tiers = [...QT_BUCKETS];
  const byTier = {};
  const served = [];

  for (const tier of tiers) {
    const { scenario } = findBestMatch(bundle, ctxFor(sel, tier));
    if (!scenario) { byTier[tier] = null; continue; }
    const specId = specForScenarioMatches(scenario.matches);
    if (!specId) { byTier[tier] = null; continue; }

    const isStain = specId.includes('STAIN');
    const baseRole = isStain ? 'stain' : 'finish';
    const roleOrder = isStain ? STAIN_ROLES : PAINT_ROLES;

    // Candidate systems: the family's catalog, grouped by role.
    const candidatesByRole = {};
    for (const ms of MATERIAL_SYSTEMS) {
      if (ms.spec_family_id !== specId) continue;
      const role = classifySystemRole(ms.id, ROLE_BY_SYSTEM_ID, baseRole);
      (candidatesByRole[role] = candidatesByRole[role] || []).push({ id: ms.id, name: ms.name || ms.id });
    }

    const resolvedByRole = resolvedByRoleFrom(scenario.material_systems, baseRole);

    // Ensure each resolved system appears among its role's candidates (the array
    // may carry a cross-family system the family catalog lacks).
    for (const [role, sysId] of Object.entries(resolvedByRole)) {
      const list = (candidatesByRole[role] = candidatesByRole[role] || []);
      if (sysId && !list.some(c => c.id === sysId)) list.push({ id: sysId, name: NAME_BY_SYSTEM_ID[sysId] || sysId });
    }

    // Override = resolved differs from the canonical scenario's array element.
    const { scenario: canon } = findBestMatch(canonicalBundle, ctxFor(sel, tier));
    const canonResolved = resolvedByRoleFrom(canon && canon.material_systems, baseRole);
    const isOverrideByRole = {};
    // Iterate the UNION of all three role key sets so a role present only in
    // canonical (dropped by the override scenario) is still flagged.
    const overrideRoleKeys = new Set([
      ...Object.keys(resolvedByRole),
      ...Object.keys(canonResolved),
      ...Object.keys(candidatesByRole),
    ]);
    for (const role of overrideRoleKeys) {
      isOverrideByRole[role] = (resolvedByRole[role] || null) !== (canonResolved[role] || null);
    }

    byTier[tier] = { scenarioId: scenario.scenario_id, specId, candidatesByRole, resolvedByRole, isOverrideByRole };
    // per-tier role list (paint vs stain variant)
    byTier[tier].roles = roleOrder.filter(r => candidatesByRole[r] && candidatesByRole[r].length);
    served.push(tier);
  }

  const roleSet = new Set();
  for (const t of served) (byTier[t].roles || []).forEach(r => roleSet.add(r));
  const materialRoles = ROLE_ORDER.filter(r => roleSet.has(r));

  return { tiers, served, materialRoles, byTier };
}
