// SHIM — spec-system retirement P1 (2026-06-16).
// resolveSubstrateStateForSpec / specAcceptsState / isSpecStateCompatible now live
// in the scenario-owned module engine/scenario-compatibility.js.
// evaluateAppliesWhen is kept here because its only consumer is legacy
// run-estimate.js (the scenario adapter never imports it). Deleted in Phase 6.
export { resolveSubstrateStateForSpec, specAcceptsState, isSpecStateCompatible } from './scenario-compatibility.js';

/**
 * Evaluate applies_when JSON condition against room context.
 * Condition format: {"quality_tier":["QT3","QT4"], "application_method":["spray_backroll"]}
 * All keys must match (AND logic). Each value is an array of allowed values (OR logic).
 */
export function evaluateAppliesWhen(condition, ctx) {
  if (!condition || typeof condition !== 'object') return true;
  for (const [key, allowed] of Object.entries(condition)) {
    if (!Array.isArray(allowed)) continue;
    const ctxVal = ctx[key];
    if (ctxVal === undefined || ctxVal === null) continue; // Missing context = pass
    if (!allowed.includes(ctxVal)) return false;
  }
  return true;
}
