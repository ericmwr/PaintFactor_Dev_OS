// Pure helper for the Retire-module-with-cascade modal. Given a moduleId
// and the canonical bundle, returns the scenario draft writes that, when
// applied, strip every reference to this module from scenario.modules[]
// arrays. The cascade does NOT archive the module here — the modal calls
// archiveEntity('module', id) after saving scenario drafts.
//
// Validation rules:
//   - moduleId must be a current canonical module
//
// Result shape mirrors rename-cascade.js for consistency.

import { findModuleUsage } from '../components/authoring/ModuleUsagePanel.jsx';

/**
 * @param {string} moduleId
 * @param {object} bundle - { modules, scenarios }
 * @returns {{
 *   ok: boolean,
 *   error?: string,
 *   scenarioDrafts?: object[],   // scenario draft records to save
 *   usageCount: number,          // # of scenarios that will be rewritten
 *   scenarioIds: string[],       // scenario IDs being rewritten
 * }}
 */
export function planRetireModuleCascade(moduleId, bundle) {
  if (!moduleId) return { ok: false, error: 'No moduleId provided', usageCount: 0, scenarioIds: [] };

  const modules = bundle?.modules || {};
  const scenarios = Array.isArray(bundle?.scenarios) ? bundle.scenarios : [];

  if (!modules[moduleId]) {
    return { ok: false, error: `Module ${moduleId} not found in canonical bundle`, usageCount: 0, scenarioIds: [] };
  }

  const usages = findModuleUsage(moduleId, scenarios);

  // Pre-index scenarios by id for O(1) lookup and to make the find safe
  // against any drift between findModuleUsage's identity logic and ours.
  const scenarioById = new Map(
    scenarios.map(s => [s.scenario_id || s.id, s])
  );

  // For each scenario that references the module, build a draft that
  // strips it from scenario.modules[].
  const scenarioDrafts = usages
    .map(u => {
      const sc = scenarioById.get(u.scenario_id);
      if (!sc) return null;
      const newModules = (sc.modules || []).filter(m => m !== moduleId);
      return {
        id: sc.scenario_id || sc.id,
        payload: { ...sc, modules: newModules },
        status: 'local_override',
      };
    })
    .filter(Boolean);

  return {
    ok: true,
    scenarioDrafts,
    usageCount: usages.length,
    scenarioIds: usages.map(u => u.scenario_id),
  };
}
