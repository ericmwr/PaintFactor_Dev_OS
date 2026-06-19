// Pure compile helpers for the QT Builder editor. Each returns a NEW module
// payload (never mutates) so callers can save it as a module draft. The tier
// membership of a task is expressed via applies_when.quality_tier — the set of
// tiers it fires at.

const ACTIVE_DRAFT = new Set(['draft', 'local_override']);

export function mergeModuleDrafts(canonicalModules, drafts) {
  const out = { ...(canonicalModules || {}) };
  for (const d of drafts || []) {
    if (d && d.payload && ACTIVE_DRAFT.has(d.status)) out[d.id] = { ...d.payload, tasks: [...(d.payload.tasks || [])] };
  }
  return out;
}

export function setTierMembership(module, task_ref, desiredTiers, servedTiers) {
  const list = module.tasks || [];
  const idx = list.findIndex(e => e && e.task_ref === task_ref);
  if (idx === -1) return module;

  const tasks = list.map(e => ({ ...e }));
  const desired = new Set(desiredTiers || []);

  if (desired.size === 0) {
    tasks.splice(idx, 1);
    return { ...module, tasks };
  }

  const entry = { ...tasks[idx] };
  const aw = { ...(entry.applies_when || {}) };
  const firesAllServed = (servedTiers || []).every(t => desired.has(t));
  if (firesAllServed) {
    delete aw.quality_tier;
  } else {
    aw.quality_tier = [...desired].sort();
  }
  if (Object.keys(aw).length === 0) delete entry.applies_when;
  else entry.applies_when = aw;
  tasks[idx] = entry;
  return { ...module, tasks };
}

export function addTaskEntry(module, task_ref, tiers) {
  const list = module.tasks || [];
  if (list.some(e => e && e.task_ref === task_ref)) return module;
  const entry = { task_ref };
  if (tiers && tiers.length) entry.applies_when = { quality_tier: [...tiers].sort() };
  return { ...module, tasks: [...list, entry] };
}
