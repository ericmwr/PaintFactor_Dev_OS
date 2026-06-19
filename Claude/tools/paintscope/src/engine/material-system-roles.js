// Pure, role-aware material-system selection. Each MATERIAL_SYSTEM is a
// single-product coating system; its role is its product's product_role
// (primer/finish for paint; stain/sealer/clear for stain). A paint family may
// hold primers (substrate/state- or QT-keyed) AND finishes (QT-keyed); a stain
// family holds stain/sealer/clear. For each role present, selection is:
//   override (if it names a same-role system) > first system whose declared
//   applies_when constraints all match the active context > first of that role.
// No I/O — all inputs explicit; nothing mutated.

const PAINT_ROLES = ['primer', 'finish'];
const STAIN_ROLES = ['stain', 'sealer', 'clear'];

function parseAw(aw) {
  if (!aw) return {};
  if (typeof aw === 'string') { try { return JSON.parse(aw); } catch { return {}; } }
  return aw;
}
const arr = (v) => (Array.isArray(v) ? v : v == null ? [] : [v]);

// system_id -> product_role, from MATERIAL_SYSTEM_PRODUCTS (first wins).
export function buildRoleBySystemId(products) {
  const out = {};
  for (const p of products || []) {
    if (p && p.system_id && p.product_role && !(p.system_id in out)) out[p.system_id] = p.product_role;
  }
  return out;
}

// Role for a system: product_role wins; id-pattern fallback; else baseRole.
export function classifySystemRole(systemId, roleBySystemId, baseRole = 'finish') {
  const r = roleBySystemId && roleBySystemId[systemId];
  if (r) return r;
  if (/PRIMER/.test(systemId)) return 'primer';
  if (/SEALER/.test(systemId)) return 'sealer';
  if (/CLEAR|POLY|LACQUER/.test(systemId)) return 'clear';
  return baseRole;
}

// True when every applies_when constraint the system declares matches the ctx.
// Undeclared constraints don't disqualify. Substrate sub-type ignored in v1.
export function systemMatches(system, { defaultQT, defaultSheen, specStates = [] }) {
  const aw = parseAw(system.applies_when);
  if (aw.quality_tier && !arr(aw.quality_tier).includes(defaultQT)) return false;
  if (aw.finish_sheen && !arr(aw.finish_sheen).includes(defaultSheen)) return false;
  if (aw.substrate_state && specStates.length > 0) {
    if (!arr(aw.substrate_state).some(s => specStates.includes(s))) return false;
  }
  return true;
}

// Resolve one { system, role } per role present in the family.
export function resolveSpecSystems({ specSystems, roleBySystemId, isStain, defaultQT, defaultSheen, specStates = [], specOverride = null }) {
  const roleOrder = isStain ? STAIN_ROLES : PAINT_ROLES;
  const baseRole = isStain ? 'stain' : 'finish';
  const byRole = {};
  for (const ms of specSystems || []) {
    const role = classifySystemRole(ms.id, roleBySystemId, baseRole);
    (byRole[role] = byRole[role] || []).push(ms);
  }
  const out = [];
  for (const role of roleOrder) {
    const candidates = byRole[role];
    if (!candidates || candidates.length === 0) continue;
    let system = null;
    const ovId = specOverride && specOverride[role];
    if (ovId) system = candidates.find(s => s.id === ovId) || null;
    if (!system) system = candidates.find(s => systemMatches(s, { defaultQT, defaultSheen, specStates })) || candidates[0];
    out.push({ system, role });
  }
  return out;
}
