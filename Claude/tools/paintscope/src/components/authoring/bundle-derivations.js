// Reverse-walk derivations on the canonical bundle.
//
// Tasks and modules don't carry domain / spec_family / phase fields
// directly. They inherit transitively:
//
//   scenario.domain          →  scenario.modules[]    (modules inherit domain)
//                             →  module.tasks[].task_ref  (tasks inherit transitively)
//   scenario.spec_family_id  →  scenario.modules[]    (modules inherit spec family)
//                             →  module.tasks[].task_ref  (tasks inherit transitively)
//   module.phase             →  module.tasks[].task_ref  (tasks inherit phase)
//
// A module or task can belong to multiple values for any of these axes
// (e.g., a shared utility module used by both interior and exterior
// scenarios — both domain values appear in its set).
//
// All derivations are computed once and cached. The canonical bundle is
// import-time-frozen and won't mutate at runtime. Drafts and archived
// entries don't enter these derivations — drafts because they may not
// have references yet, archived entries because they've been removed
// from the bundle entirely.

import canonicalBundle from '../../data/scenario-bundle.gen.js';

let _domainCache = null;
let _specFamilyCache = null;
let _phaseCache = null;

/**
 * Builds two maps:
 *   moduleDomains: moduleId → Set<'interior'|'exterior'>
 *   taskDomains:   taskId   → Set<'interior'|'exterior'>
 */
export function getDomainDerivations() {
  if (_domainCache) return _domainCache;

  const moduleDomains = new Map();
  const taskDomains = new Map();

  const scenarios = canonicalBundle.scenarios || [];
  const modules = canonicalBundle.modules || {};

  for (const sc of scenarios) {
    const domain = sc.domain;
    if (!domain) continue;
    const moduleIds = Array.isArray(sc.modules) ? sc.modules : [];
    for (const mid of moduleIds) {
      if (!moduleDomains.has(mid)) moduleDomains.set(mid, new Set());
      moduleDomains.get(mid).add(domain);
    }
  }

  for (const [moduleId, mod] of Object.entries(modules)) {
    const modDomainSet = moduleDomains.get(moduleId);
    if (!modDomainSet || modDomainSet.size === 0) continue;
    const tasks = Array.isArray(mod.tasks) ? mod.tasks : [];
    for (const entry of tasks) {
      const ref = entry?.task_ref;
      if (!ref) continue;
      if (!taskDomains.has(ref)) taskDomains.set(ref, new Set());
      for (const d of modDomainSet) taskDomains.get(ref).add(d);
    }
  }

  _domainCache = { moduleDomains, taskDomains };
  return _domainCache;
}

// Scenarios don't carry an explicit `spec_family_id` field — the bundle
// generator doesn't require one. Derive it from the scenario_id, which
// follows the convention SCN_<spec_family_root>_<variant>. The variant
// portion is recognizable by leading markers like _QT3, _BRUSH, _SPRAY,
// _ROLL, _FROM_, _SPRAY_BACKBRUSH. Strip from the first marker to get
// the family base, then prefix SF_.
//
// Examples:
//   SCN_ARCH_ELEMENT_NC_QT3_BRUSH_FROM_BARE   → SF_ARCH_ELEMENT_NC
//   SCN_BALUSTER_NC_QT4_SPRAY_FROM_PRIMED     → SF_BALUSTER_NC
//   SCN_DRYWALL_WALL_NC_FINISH_QT3_BRUSH_ROLL → SF_DRYWALL_WALL_NC_FINISH
//
// Scenarios without any marker fall back to "SF_" + their entire stripped
// id, which is rare but handles edge cases (some protection scenarios).
const SPEC_FAMILY_VARIANT_MARKERS = /_QT\d+|_BRUSH|_SPRAY|_ROLL|_FROM_|_SPRAY_BACKBRUSH/;

function deriveSpecFamily(scenarioId) {
  if (!scenarioId) return null;
  const stripped = scenarioId.replace(/^SCN_/, '');
  const m = stripped.match(SPEC_FAMILY_VARIANT_MARKERS);
  if (m) {
    return 'SF_' + stripped.slice(0, m.index).replace(/_$/, '');
  }
  return 'SF_' + stripped;
}

/**
 * Builds two maps + a sorted list of spec-family IDs:
 *   moduleSpecFamilies: moduleId → Set<spec_family_id>
 *   taskSpecFamilies:   taskId   → Set<spec_family_id>
 *   specFamilies:       sorted [spec_family_id, ...]
 *
 * Used to populate the spec-family filter dropdowns. A module/task can
 * belong to multiple spec families if shared across spec definitions.
 */
export function getSpecFamilyDerivations() {
  if (_specFamilyCache) return _specFamilyCache;

  const moduleSpecFamilies = new Map();
  const taskSpecFamilies = new Map();
  const allFamilies = new Set();

  const scenarios = canonicalBundle.scenarios || [];
  const modules = canonicalBundle.modules || {};

  for (const sc of scenarios) {
    const fam = deriveSpecFamily(sc.scenario_id);
    if (!fam) continue;
    allFamilies.add(fam);
    const moduleIds = Array.isArray(sc.modules) ? sc.modules : [];
    for (const mid of moduleIds) {
      if (!moduleSpecFamilies.has(mid)) moduleSpecFamilies.set(mid, new Set());
      moduleSpecFamilies.get(mid).add(fam);
    }
  }

  for (const [moduleId, mod] of Object.entries(modules)) {
    const fams = moduleSpecFamilies.get(moduleId);
    if (!fams || fams.size === 0) continue;
    const tasks = Array.isArray(mod.tasks) ? mod.tasks : [];
    for (const entry of tasks) {
      const ref = entry?.task_ref;
      if (!ref) continue;
      if (!taskSpecFamilies.has(ref)) taskSpecFamilies.set(ref, new Set());
      for (const f of fams) taskSpecFamilies.get(ref).add(f);
    }
  }

  const specFamilies = [...allFamilies].sort();
  _specFamilyCache = { moduleSpecFamilies, taskSpecFamilies, specFamilies };
  return _specFamilyCache;
}

/**
 * Tasks inherit phase from every module that references them via
 * task_ref. A task used by multiple modules across different phases
 * (rare but possible for shared cleanup work) shows up under each.
 *
 *   taskPhases: taskId → Set<phase>
 */
export function getPhaseDerivations() {
  if (_phaseCache) return _phaseCache;

  const taskPhases = new Map();
  const modules = canonicalBundle.modules || {};

  for (const mod of Object.values(modules)) {
    const phase = mod.phase;
    if (!phase) continue;
    const tasks = Array.isArray(mod.tasks) ? mod.tasks : [];
    for (const entry of tasks) {
      const ref = entry?.task_ref;
      if (!ref) continue;
      if (!taskPhases.has(ref)) taskPhases.set(ref, new Set());
      taskPhases.get(ref).add(phase);
    }
  }

  _phaseCache = { taskPhases };
  return _phaseCache;
}

/**
 * `'all' | 'interior' | 'exterior' | 'shared' | 'unused'` filter.
 *  - 'all'      — pass everything
 *  - 'interior' — pass entities that include 'interior' in their set
 *  - 'exterior' — pass entities that include 'exterior' in their set
 *  - 'shared'   — pass entities with BOTH interior and exterior
 *  - 'unused'   — pass entities with no scenario coverage at all
 */
export function passesDomainFilter(entityDomains, filter) {
  if (filter === 'all') return true;
  const has = (d) => entityDomains?.has(d);
  if (filter === 'interior') return has('interior');
  if (filter === 'exterior') return has('exterior');
  if (filter === 'shared')   return has('interior') && has('exterior');
  if (filter === 'unused')   return !entityDomains || entityDomains.size === 0;
  return true;
}

export const DOMAIN_FILTERS = ['all', 'interior', 'exterior', 'shared', 'unused'];
export const DOMAIN_FILTER_LABELS = {
  all:      'All domains',
  interior: 'Interior only',
  exterior: 'Exterior only',
  shared:   'Both (shared)',
  unused:   'Unused (no scenarios)',
};
