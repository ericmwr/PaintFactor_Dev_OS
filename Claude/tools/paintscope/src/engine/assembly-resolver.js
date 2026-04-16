// Assembly resolver: given an assembly + project quantities, expands
// the assembly's scenario_rules into a concrete list of match criteria
// that downstream code (scenario-matcher) can use to find scenarios.
//
// Assembly rules use a tiny expression language for `if`:
//   "quantities.<key> > 0"  — numeric gate
//   "quantities.<key> >= <n>"
//   "quantities.<key> > 0 && <bool>"
//   true                     — always fires
// Anything more complex: admin can write a JS-style boolean; we eval
// it in a sandboxed Function. Inputs: `quantities`, `ctx`.

function evalCondition(expr, quantities, ctx) {
  if (expr === true || expr === 'true' || !expr) return true;
  if (expr === false || expr === 'false') return false;
  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function('quantities', 'ctx', `return (${expr});`);
    return !!fn(quantities || {}, ctx || {});
  } catch (e) {
    console.warn('[assembly-resolver] condition failed:', expr, e);
    return false;
  }
}

/**
 * Resolve an assembly into a list of scenario match criteria.
 * @param {object} assembly — shape: { assembly_id, scenario_rules: [{ if, scenario_match }] }
 * @param {object} quantities — e.g. { cabinet_sf: 120, trim_lf: 80 }
 * @param {object} ctx — any baseline context shared across scenarios
 * @returns {Array<{ scenario_match: object, ctx: object }>}
 */
export function resolveAssembly(assembly, quantities, ctx = {}) {
  if (!assembly || !Array.isArray(assembly.scenario_rules)) return [];
  const out = [];
  for (const rule of assembly.scenario_rules) {
    if (!evalCondition(rule.if, quantities, ctx)) continue;
    out.push({
      scenario_match: rule.scenario_match || {},
      ctx: { ...ctx, ...(rule.ctx_overrides || {}) },
      rule_label: rule.label || null,
    });
  }
  return out;
}

/**
 * Validate an assembly record's structure. Returns { ok, errors }.
 */
export function validateAssembly(asm) {
  const errors = [];
  if (!asm || typeof asm !== 'object') { errors.push('Assembly must be an object'); return { ok: false, errors }; }
  if (!asm.assembly_id) errors.push('assembly_id required');
  if (!asm.name) errors.push('name required');
  if (!Array.isArray(asm.scenario_rules) || asm.scenario_rules.length === 0) {
    errors.push('scenario_rules must be a non-empty array');
  } else {
    asm.scenario_rules.forEach((r, i) => {
      if (!r.scenario_match || typeof r.scenario_match !== 'object') {
        errors.push(`rule[${i}]: scenario_match required`);
      }
    });
  }
  return { ok: errors.length === 0, errors };
}
