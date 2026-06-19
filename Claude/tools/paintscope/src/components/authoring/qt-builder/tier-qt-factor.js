// Per-tier FAC_QT override authoring for the QT Builder. Writes
// scenario.modifier_overrides.FAC_QT[tier]; the engine reads it via resolveFactor
// (a scenario override beats the global FAC_QT table). The governing scenario is
// resolved PER tier (findBestMatch), so an override lands on the file that serves
// that tier under both the multi-tier and per-tier-file scenario patterns.
// Immutable; callers save the result as a scenario draft. mergeScenarioDrafts is
// reused from tier-coats.js.

import { findBestMatch } from '../../../engine/scenario-matcher.js';
import { getFactor } from '../../../engine/modifier-registry.js';
import { QT_BUCKETS } from '../../../data/quality-tier.js';

export function deriveTierQtFactors(bundle, sel) {
  const out = {};
  for (const tier of QT_BUCKETS) {
    const ctx = {
      paintable_item: sel.paintable_item, application_method: sel.application_method,
      substrate_state: sel.substrate_state, coating_type: sel.coating_type, quality_tier: tier,
    };
    const { scenario } = findBestMatch(bundle, ctx);
    if (!scenario) { out[tier] = null; continue; }
    const ov = scenario.modifier_overrides?.FAC_QT?.[tier];
    out[tier] = {
      scenarioId: scenario.scenario_id,
      value: typeof ov === 'number' ? ov : getFactor(bundle, 'FAC_QT', tier),
      isOverride: typeof ov === 'number',
    };
  }
  return out;
}

export function setQtFactor(scenario, tier, value) {
  if (!scenario || !Number.isFinite(value) || value <= 0) return scenario;
  const mo = scenario.modifier_overrides || {};
  const fq = mo.FAC_QT || {};
  return { ...scenario, modifier_overrides: { ...mo, FAC_QT: { ...fq, [tier]: value } } };
}

export function clearQtFactor(scenario, tier) {
  const fq = scenario?.modifier_overrides?.FAC_QT;
  if (!fq || !(tier in fq)) return scenario;
  const nextFq = { ...fq };
  delete nextFq[tier];
  const mo = { ...scenario.modifier_overrides };
  if (Object.keys(nextFq).length === 0) delete mo.FAC_QT; else mo.FAC_QT = nextFq;
  const next = { ...scenario, modifier_overrides: mo };
  if (Object.keys(mo).length === 0) delete next.modifier_overrides;
  return next;
}
