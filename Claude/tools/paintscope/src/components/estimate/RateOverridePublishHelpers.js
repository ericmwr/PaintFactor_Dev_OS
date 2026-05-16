/**
 * Find a non-published draft for a task in the drafts list, or null.
 * Used by RateOverridePublishModal to detect conflicts before publishing.
 *
 * @param {string} taskId
 * @param {Array} drafts  — list of task-draft records from useTaskDrafts()
 * @returns {object|null} the matching draft with status !== 'published', else null
 */
export function findConflictingDraft(taskId, drafts) {
  if (!Array.isArray(drafts)) return null;
  return drafts.find(d => d.task_id === taskId && d.status !== 'published') || null;
}
