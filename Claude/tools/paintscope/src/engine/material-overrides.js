// Pure layered resolvers for project-level material overrides (P3).
// Layering for a given (role, finishGroup):
//   1. overrides.byFinishGroup[finishGroup]?.[<role>_<kind>]   (finest)
//   2. overrides.byRole?.[<role>_<kind>]                       (project-wide)
//   3. fall-through (scenario file value)
// Nullish (null/undefined) at any layer falls through. `0` is a valid value
// (sealer can be authored as 0 coats); use `!= null` not `||`.
//
// `kind` is 'system' or 'coats'. Field naming is `<role>_<kind>` —
// e.g. 'clear_system', 'finish_coats'. Works for paint (primer, finish)
// and stain (stain, sealer, clear) roles uniformly.

function pick(overrides, finishGroup, key) {
  const fg = overrides?.byFinishGroup?.[finishGroup]?.[key];
  if (fg != null) return fg;
  const def = overrides?.byRole?.[key];
  if (def != null) return def;
  return undefined;
}

export function resolveSystem(role, finishGroup, overrides, scenarioSystem) {
  const v = pick(overrides, finishGroup, `${role}_system`);
  return v !== undefined ? v : scenarioSystem;
}

export function resolveCoats(role, finishGroup, overrides, scenarioCoats) {
  const v = pick(overrides, finishGroup, `${role}_coats`);
  return v !== undefined ? v : scenarioCoats;
}
