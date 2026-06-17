// Domain × context bucket derivation. Four mutually-exclusive buckets:
//   nc_interior — new-construction interior   (domain=interior, context=NC)
//   nc_exterior — new-construction exterior   (domain=exterior, context=NC)
//   rp_interior — interior repaint            (domain=interior, context=RP)
//   rp_exterior — exterior repaint            (domain=exterior, context=RP)
//
// Used by the Authoring lists (Tasks/Modules/Scenarios) as a chip filter
// that narrows the catalog to one workstream at a time. Tasks and modules
// don't carry domain/context directly — the bucket is derived transitively
// through the scenarios that reference each module, and the modules that
// reference each task.

export const DC_BUCKETS = ['nc_interior', 'nc_exterior', 'rp_interior', 'rp_exterior'];

export const DC_BUCKET_LABELS = {
  nc_interior: 'NC Interior',
  nc_exterior: 'NC Exterior',
  rp_interior: 'RP Interior',
  rp_exterior: 'RP Exterior',
};

/**
 * Classify a single scenario into the bucket set it belongs to. In current
 * data every scenario falls into exactly one bucket, but the function
 * returns a Set so 'both' / 'mixed' values in future data widen naturally.
 */
export function deriveDomainContextBuckets(scenario) {
  const buckets = new Set();
  if (!scenario) return buckets;
  const domain = scenario.domain;
  const context = scenario.context;

  const interiorOk = domain === 'interior' || domain === 'both';
  const exteriorOk = domain === 'exterior' || domain === 'both';
  const ncOk = context === 'NC' || context === 'mixed';
  const rpOk = context === 'RP' || context === 'mixed';

  if (interiorOk && ncOk) buckets.add('nc_interior');
  if (exteriorOk && ncOk) buckets.add('nc_exterior');
  if (interiorOk && rpOk) buckets.add('rp_interior');
  if (exteriorOk && rpOk) buckets.add('rp_exterior');

  return buckets;
}

/**
 * For a list of canonical scenarios, count how many fall into each bucket.
 * Uses Set semantics so a scenario in multiple buckets only contributes
 * once per bucket.
 */
export function countScenarioBuckets(scenarios) {
  const counts = { nc_interior: 0, nc_exterior: 0, rp_interior: 0, rp_exterior: 0 };
  for (const s of scenarios || []) {
    const buckets = deriveDomainContextBuckets(s);
    for (const b of buckets) counts[b] = (counts[b] || 0) + 1;
  }
  return counts;
}

/**
 * Build moduleId → Set<bucket> by walking every scenario's modules[]. A
 * module is "in" a bucket if at least one scenario in that bucket
 * references it. Used by ModuleList to filter modules without forcing
 * the user to think about scenario joins.
 */
export function bucketsByModuleId(scenarios) {
  const map = new Map();
  for (const s of scenarios || []) {
    const buckets = deriveDomainContextBuckets(s);
    if (buckets.size === 0) continue;
    for (const modId of s.modules || []) {
      if (typeof modId !== 'string') continue;
      let cur = map.get(modId);
      if (!cur) { cur = new Set(); map.set(modId, cur); }
      for (const b of buckets) cur.add(b);
    }
  }
  return map;
}

/**
 * Build taskId → Set<bucket> by walking modules[].tasks[].task_ref and
 * unioning the buckets of every module that references the task. Two-hop
 * traversal: scenario → module → task_ref. Used by TaskList.
 */
export function bucketsByTaskId(scenarios, modules) {
  const moduleBuckets = bucketsByModuleId(scenarios);
  const map = new Map();
  for (const mod of Object.values(modules || {})) {
    const modBuckets = moduleBuckets.get(mod.module_id);
    if (!modBuckets || modBuckets.size === 0) continue;
    for (const entry of mod.tasks || []) {
      if (!entry?.task_ref) continue;
      let cur = map.get(entry.task_ref);
      if (!cur) { cur = new Set(); map.set(entry.task_ref, cur); }
      for (const b of modBuckets) cur.add(b);
    }
  }
  return map;
}
