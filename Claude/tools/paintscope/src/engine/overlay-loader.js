// Overlay loader: merges IndexedDB authoring drafts over the canonical
// scenario bundle. Drafts win on id collision. Assemblies are a parallel
// collection (not part of the canonical bundle) — they're returned as-is.
//
// Called once per scenario-engine run. Async because IndexedDB is async.
// Returns a merged bundle the scenario engine can consume directly.
//
// Status filtering:
//   - 'draft'         → overlay active (author is testing)
//   - 'local_override'→ overlay active (one-off tweak, never published)
//   - 'published'     → overlay INACTIVE (canonical JSON is now truth)
//
// Any other status is treated as inactive.

import { loadAllDrafts } from '../data/authoring-db.js';

const ACTIVE_STATUSES = new Set(['draft', 'local_override']);

function isActive(draft) {
  return draft && ACTIVE_STATUSES.has(draft.status);
}

/**
 * Merge drafts over the canonical bundle.
 *
 * @param {{ modules: object, scenarios: array }} canonicalBundle
 * @returns {Promise<{
 *   modules: object,
 *   scenarios: array,
 *   assemblies: array,
 *   overlayStats: { modulesOverlaid: number, scenariosOverlaid: number, assembliesActive: number }
 * }>}
 */
export async function loadOverlayBundle(canonicalBundle) {
  let drafts;
  try {
    drafts = await loadAllDrafts();
  } catch (e) {
    console.warn('[overlay-loader] Failed to load drafts, using canonical only:', e);
    return {
      modules: canonicalBundle.modules,
      scenarios: canonicalBundle.scenarios,
      assemblies: [],
      overlayStats: { modulesOverlaid: 0, scenariosOverlaid: 0, assembliesActive: 0 },
    };
  }

  const activeModules = drafts.modules.filter(isActive);
  const activeScenarios = drafts.scenarios.filter(isActive);
  const activeAssemblies = drafts.assemblies.filter(isActive);
  const activeModifiers = (drafts.modifiers || []).filter(isActive);

  // Modules: merge by id. Drafts win.
  const mergedModules = { ...canonicalBundle.modules };
  for (const mod of activeModules) {
    mergedModules[mod.id] = mod.payload || mod;
  }

  // Scenarios: index canonical by scenario_id for override, append new ones.
  const mergedScenarios = [];
  const draftIdSet = new Set(activeScenarios.map(s => s.id));
  for (const canonScn of canonicalBundle.scenarios) {
    if (!draftIdSet.has(canonScn.scenario_id)) {
      mergedScenarios.push(canonScn);
    }
  }
  for (const scn of activeScenarios) {
    mergedScenarios.push(scn.payload || scn);
  }

  // Modifiers: merge by id. Drafts win.
  const mergedModifiers = { ...(canonicalBundle.modifiers || {}) };
  for (const fac of activeModifiers) {
    mergedModifiers[fac.id] = fac.payload || fac;
  }

  const overlayStats = {
    modulesOverlaid: activeModules.length,
    scenariosOverlaid: activeScenarios.length,
    assembliesActive: activeAssemblies.length,
    modifiersOverlaid: activeModifiers.length,
  };

  if (overlayStats.modulesOverlaid || overlayStats.scenariosOverlaid || overlayStats.assembliesActive || overlayStats.modifiersOverlaid) {
    console.log('[overlay-loader]', overlayStats);
  }

  return {
    modules: mergedModules,
    scenarios: mergedScenarios,
    assemblies: activeAssemblies.map(a => a.payload || a),
    modifiers: mergedModifiers,
    overlayStats,
  };
}
