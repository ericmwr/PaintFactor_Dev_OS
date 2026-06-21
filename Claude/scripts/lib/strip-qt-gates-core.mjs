// Pure core for the QT3-gate strip migration. No fs, no engine — just classify
// and transform individual module task entries.
//
// Classifies each task entry by its applies_when.quality_tier array:
//   - include_qt3: array contains 'QT3' → strip the quality_tier key (fire at all tiers)
//   - exclude_qt3: array does NOT contain 'QT3' → drop the entry entirely
//   - none:        no applies_when.quality_tier array gate → leave unchanged
//
// Engine rule replicated: only array-valued applies_when keys are enforced.
// A scalar quality_tier value is skipped by the engine and treated as 'none' here.

/**
 * Classify a single task entry by its applies_when.quality_tier gate.
 * @param {object} entry - a task entry from module.tasks[]
 * @returns {'include_qt3' | 'exclude_qt3' | 'none'}
 */
export function entryClass(entry) {
  const aw = entry?.applies_when;
  if (!aw || typeof aw !== 'object') return 'none';
  const qt = aw.quality_tier;
  // Engine only enforces array-valued applies_when keys — scalar is skipped
  if (!Array.isArray(qt)) return 'none';
  return qt.includes('QT3') ? 'include_qt3' : 'exclude_qt3';
}

/**
 * Transform a module by stripping/removing applies_when.quality_tier gates.
 *
 * - include_qt3 entries: delete entry.applies_when.quality_tier; if applies_when
 *   becomes empty, delete applies_when entirely. Record task_ref in stripped[].
 * - exclude_qt3 entries: drop the entry from tasks[]. Record task_ref in removed[].
 * - none entries: pass through unchanged.
 *
 * Never mutates the input module. Returns a deep clone.
 *
 * @param {object} module - a parsed MOD_*.json module object
 * @returns {{ module: object, stripped: string[], removed: string[] }}
 */
export function transformModule(module) {
  const clone = JSON.parse(JSON.stringify(module));
  const stripped = [];
  const removed = [];

  const newTasks = [];
  for (const entry of clone.tasks || []) {
    const cls = entryClass(entry);
    if (cls === 'none') {
      newTasks.push(entry);
    } else if (cls === 'include_qt3') {
      // Strip quality_tier from applies_when
      delete entry.applies_when.quality_tier;
      // Remove applies_when entirely if now empty
      if (Object.keys(entry.applies_when).length === 0) {
        delete entry.applies_when;
      }
      newTasks.push(entry);
      stripped.push(entry.task_ref);
    } else {
      // exclude_qt3 — drop the entry
      removed.push(entry.task_ref);
    }
  }

  clone.tasks = newTasks;
  return { module: clone, stripped, removed };
}
