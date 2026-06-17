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

/**
 * Build the JSON payload that publishTask() will write to disk.
 * Preserves all canonical fields, replaces rate_per_hour, stamps _meta.
 *
 * @param canonical       The bundleTasks[taskId] record (must have rate_per_hour).
 * @param newRate         The override's rate_per_hour value (number).
 * @param projectContext  { projectId, projectName }. previous_rate is derived
 *                        from canonical.rate_per_hour inside the helper.
 * @returns {object} canonical-shaped task JSON with rate replaced + _meta stamped
 */
export function buildPublishedTaskPayload(canonical, newRate, projectContext) {
  const { projectId, projectName } = projectContext || {};
  // bundleTasks[taskId] returns the BUNDLE's enriched copy, which carries
  // `_derived` (phases/methods/substrates/qts walked from modules+scenarios
  // at build time). That field is a bundle artifact and must NOT be written
  // back into the on-disk canonical — strip it before persisting.
  const { _derived, ...stripped } = canonical;
  return {
    ...stripped,
    rate_per_hour: newRate,
    _meta: {
      ...(stripped._meta || {}),
      last_calibrated_at: new Date().toISOString(),
      last_calibrated_from: {
        project_id: projectId ?? null,
        project_name: projectName ?? 'Untitled Project',
        previous_rate: canonical.rate_per_hour,
      },
    },
  };
}
