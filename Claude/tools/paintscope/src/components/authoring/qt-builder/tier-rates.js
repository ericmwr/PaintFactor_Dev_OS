// Per-tier rate authoring for the QT Builder. A task's rates_by_tier map sets an
// explicit production rate per quality tier; the engine reads it at
// resolveTaskRate priority 3 (a tier absent from the map = the task SKIPS that
// tier). An explicit per-tier rate and the FAC_QT multiplier would double-count,
// so opting a task in also writes task-level modifier_eligibility.qt=false
// (shallow over the module — kills only QT, preserves height/texture/complexity).
// All helpers are immutable so callers can save the result as a task draft.

import { getFactor } from '../../../engine/modifier-registry.js';
import { QT_BUCKETS } from '../../../data/quality-tier.js';

const ACTIVE_DRAFT = new Set(['draft', 'local_override']);

export function mergeTaskDrafts(canonicalTasks, drafts) {
  const out = { ...(canonicalTasks || {}) };
  for (const d of drafts || []) {
    if (d && d.payload && ACTIVE_DRAFT.has(d.status)) out[d.id] = d.payload;
  }
  return out;
}

// Per-tier rate editing is supported for a scalar rate_per_hour baseline or an
// existing rates_by_tier map. rates[]/rates_by_coat/fixed_minutes shapes are out
// of scope for v1 (editing them here could corrupt the shape).
export function rateEditable(task) {
  if (!task) return { editable: false, reason: 'No task' };
  if (Array.isArray(task.rates)) return { editable: false, reason: 'Variant rates — edit in Task editor' };
  if (task.rates_by_coat) return { editable: false, reason: 'Per-coat rates — edit in Task editor' };
  if (task.rates_by_tier && typeof task.rates_by_tier === 'object') return { editable: true, reason: '' };
  if (typeof task.rate_per_hour === 'number' && task.rate_per_hour > 0) return { editable: true, reason: '' };
  if (typeof task.fixed_minutes === 'number') return { editable: false, reason: 'Fixed-minutes task — no rate' };
  return { editable: false, reason: 'No scalar rate to seed from' };
}

// Seed/current per-tier rate for each firing tier. An existing rates_by_tier
// entry wins; otherwise baseRate / FAC_QT[tier] reproduces today's effective
// rate (estimate-neutral opt-in). Missing-tier fallback carries the nearest
// authored tier forward (then back) so byTier covers every firing tier.
export function effectiveTierRates(task, firingTiers, bundle) {
  const { editable, reason } = rateEditable(task);
  const byTier = {};
  if (!editable || !Array.isArray(firingTiers)) return { editable, reason, byTier };
  const existing = task.rates_by_tier && typeof task.rates_by_tier === 'object' ? task.rates_by_tier : null;
  const base = typeof task.rate_per_hour === 'number' && task.rate_per_hour > 0 ? task.rate_per_hour : null;
  for (const tier of firingTiers) {
    if (existing && typeof existing[tier] === 'number') { byTier[tier] = existing[tier]; continue; }
    if (base != null) {
      const f = getFactor(bundle, 'FAC_QT', tier) || 1;
      byTier[tier] = Math.round(base / f);
    }
  }
  const ordered = QT_BUCKETS.filter(t => firingTiers.includes(t));
  for (let i = 0, last = null; i < ordered.length; i++) {
    const t = ordered[i];
    if (byTier[t] != null) last = byTier[t]; else if (last != null) byTier[t] = last;
  }
  for (let i = ordered.length - 1, next = null; i >= 0; i--) {
    const t = ordered[i];
    if (byTier[t] != null) next = byTier[t]; else if (next != null) byTier[t] = next;
  }
  return { editable, reason, byTier };
}

// Write a full rates_by_tier map over firingTiers (edited tier = value, others
// kept from current/seed) and neutralize FAC_QT for the task. Immutable;
// returns the same task on a no-op.
export function setTierRate(task, editTier, value, firingTiers, bundle) {
  if (!task || !Array.isArray(firingTiers) || !firingTiers.includes(editTier)) return task;
  if (!Number.isFinite(value) || value <= 0) return task;
  const { editable, byTier } = effectiveTierRates(task, firingTiers, bundle);
  if (!editable) return task;
  const merged = { ...byTier, [editTier]: Math.round(value) };
  const rates_by_tier = {};
  for (const tier of firingTiers) if (typeof merged[tier] === 'number') rates_by_tier[tier] = merged[tier];
  const modifier_eligibility = { ...(task.modifier_eligibility || {}), qt: false };
  return { ...task, rates_by_tier, modifier_eligibility };
}
