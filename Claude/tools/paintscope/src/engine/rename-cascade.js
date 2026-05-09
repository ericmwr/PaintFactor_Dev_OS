// Pure helper for the Rename-with-cascade modal. Given (oldId, newId,
// canonicalBundle), returns the draft writes that, when published, swap
// every task_ref over to the new ID.
//
// The cascade only writes drafts — it does NOT archive the old canonical
// task. After publishing the rename drafts, the old canonical task can
// be retired via the existing Archive button in TaskEditor (or left in
// place if the user wants to keep both IDs alive temporarily).
//
// Validation rules (UI-side):
//   - newId must match /^TSK_[A-Z0-9_]+$/ (task ID format)
//   - newId must not already exist in canonicalBundle.tasks
//   - oldId must be a current canonical task

import { findTaskUsage } from '../components/authoring/TaskUsagePanel.jsx';

const TASK_ID_PATTERN = /^TSK_[A-Z0-9_]+$/;

export function isValidTaskId(id) {
  return typeof id === 'string' && TASK_ID_PATTERN.test(id);
}

/**
 * @param {string} oldId
 * @param {string} newId
 * @param {object} bundle - { tasks, modules }
 * @returns {{
 *   ok: boolean,
 *   error?: string,
 *   taskDraft?: object,         // task draft record to save
 *   moduleDrafts?: object[],    // module draft records to save
 *   usageCount: number,         // # of modules that will be rewritten
 *   moduleIds: string[],        // module IDs being rewritten
 * }}
 */
export function planRenameCascade(oldId, newId, bundle) {
  if (!oldId) return { ok: false, error: 'No oldId provided', usageCount: 0, moduleIds: [] };
  if (!newId) return { ok: false, error: 'New ID is required', usageCount: 0, moduleIds: [] };
  if (oldId === newId) return { ok: false, error: 'New ID is the same as the old', usageCount: 0, moduleIds: [] };
  if (!isValidTaskId(newId)) return { ok: false, error: 'New ID must match TSK_[A-Z0-9_]+', usageCount: 0, moduleIds: [] };

  const tasks = bundle?.tasks || {};
  const modules = bundle?.modules || {};

  if (!tasks[oldId]) {
    return { ok: false, error: `Old task ${oldId} not found in canonical bundle`, usageCount: 0, moduleIds: [] };
  }
  if (tasks[newId]) {
    return { ok: false, error: `New ID ${newId} already exists`, usageCount: 0, moduleIds: [] };
  }

  // Build the renamed task payload — straight clone with task_id swapped.
  const oldTask = tasks[oldId];
  const newTaskPayload = { ...oldTask, task_id: newId };

  // Find every module that references the old ID and rewrite each entry.
  const usages = findTaskUsage(oldId, modules);
  const moduleDrafts = usages.map(u => {
    const mod = modules[u.module_id];
    const rewrittenTasks = (mod.tasks || []).map(entry => {
      if (entry?.task_ref === oldId) return { ...entry, task_ref: newId };
      return entry;
    });
    return {
      id: mod.module_id,
      payload: { ...mod, tasks: rewrittenTasks },
      status: 'local_override',
    };
  });

  return {
    ok: true,
    taskDraft: {
      id: newId,
      payload: newTaskPayload,
      status: 'new',
    },
    moduleDrafts,
    usageCount: usages.length,
    moduleIds: usages.map(u => u.module_id),
  };
}
