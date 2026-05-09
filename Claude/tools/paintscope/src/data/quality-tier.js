// Quality-tier classification. Each scenario specifies its applicable
// QT(s) at scenario.matches.quality_tier (string or string[]). Tasks
// and modules are classified transitively through the scenarios that
// reference them — same pattern as domain-context.js.
//
// QT2 / QT3 / QT4 / QT5 are the buckets currently in the catalog.
// QT1 is reserved (low-end) but unused.

export const QT_BUCKETS = ['QT2', 'QT3', 'QT4', 'QT5'];

export const QT_BUCKET_LABELS = {
  QT2: 'QT2',
  QT3: 'QT3',
  QT4: 'QT4',
  QT5: 'QT5',
};

/**
 * Pull the QT set out of a scenario's match criteria. The field can be
 * absent (~3% of scenarios — typically setup/cleanup-only scenarios that
 * apply across all tiers), a single string, or an array of strings.
 */
export function deriveQualityTiers(scenario) {
  const set = new Set();
  if (!scenario) return set;
  const qt = scenario.matches?.quality_tier;
  if (!qt) return set;
  if (Array.isArray(qt)) {
    for (const t of qt) if (t) set.add(t);
  } else {
    set.add(qt);
  }
  return set;
}

export function countScenarioQTs(scenarios) {
  const counts = { QT2: 0, QT3: 0, QT4: 0, QT5: 0 };
  for (const s of scenarios || []) {
    for (const qt of deriveQualityTiers(s)) counts[qt] = (counts[qt] || 0) + 1;
  }
  return counts;
}

/**
 * Build moduleId → Set<QT> by walking every scenario's modules[]. A
 * module is "in" a QT if at least one referencing scenario is in that QT.
 */
export function qtsByModuleId(scenarios) {
  const map = new Map();
  for (const s of scenarios || []) {
    const qts = deriveQualityTiers(s);
    if (qts.size === 0) continue;
    for (const modId of s.modules || []) {
      if (typeof modId !== 'string') continue;
      let cur = map.get(modId);
      if (!cur) { cur = new Set(); map.set(modId, cur); }
      for (const qt of qts) cur.add(qt);
    }
  }
  return map;
}

/**
 * Build taskId → Set<QT> by walking modules[].tasks[].task_ref and
 * unioning the QTs of every module that references the task.
 */
export function qtsByTaskId(scenarios, modules) {
  const moduleQTs = qtsByModuleId(scenarios);
  const map = new Map();
  for (const mod of Object.values(modules || {})) {
    const modQTs = moduleQTs.get(mod.module_id);
    if (!modQTs || modQTs.size === 0) continue;
    for (const entry of mod.tasks || []) {
      if (!entry?.task_ref) continue;
      let cur = map.get(entry.task_ref);
      if (!cur) { cur = new Set(); map.set(entry.task_ref, cur); }
      for (const qt of modQTs) cur.add(qt);
    }
  }
  return map;
}
