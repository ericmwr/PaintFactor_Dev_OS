// Pure implicit-fork edit orchestration for the QT Builder vantage grid. Each
// plan* function composes the Phase 1a tier-files ops over the OVERLAID bundle
// and returns the draft writes (and deletes) the component should persist — so
// the fork-on-edit sequencing is testable apart from React/IndexedDB. Reads
// only; never mutates the bundle.

import { findBestMatch } from '../../../engine/scenario-matcher.js';
import {
  scenarioTierPin, forkScenarioForTier, forkModuleForTier,
  addTask, removeTask, addModuleToTier, removeModuleFromTier,
  setScenarioQtFactor, clearScenarioQtFactor,
  setScenarioMaterial, clearScenarioMaterial,
} from './tier-files.js';
import { buildRoleBySystemId, classifySystemRole } from '../../../engine/material-system-roles.js';
import { MATERIAL_SYSTEM_PRODUCTS } from '../../../data/scenario-rate-data.js';

function baseId(id) { return id.replace(/_QT[2-5](?=_|$)/g, ''); }

function resolveTierScenario(bundle, sel, tier) {
  const ctx = {
    paintable_item: sel.paintable_item, application_method: sel.application_method,
    substrate_state: sel.substrate_state, coating_type: sel.coating_type, quality_tier: tier,
  };
  return findBestMatch(bundle, ctx).scenario || null;
}

// Governing scenario for `tier`, forked to its own file if still the baseline.
function ensureScenarioForTier(bundle, sel, tier) {
  const gov = resolveTierScenario(bundle, sel, tier);
  if (!gov) return null;
  return forkScenarioForTier(gov, tier).scenario;
}

// The actual module id in scenario.modules whose base id is baseModuleId.
function actualModuleId(scenario, baseModuleId) {
  return (scenario.modules || []).find(id => baseId(id) === baseModuleId) || null;
}

function planTaskEdit(bundle, sel, tier, baseModuleId, taskId, op) {
  const scn = ensureScenarioForTier(bundle, sel, tier);
  if (!scn) return {};
  const modId = actualModuleId(scn, baseModuleId);
  if (!modId) return {};
  const source = bundle.modules?.[modId];
  if (!source) return {};
  const { scenario, module } = forkModuleForTier(scn, modId, source, tier);
  return { scenario, module: op(module, taskId) };
}

export function planAddTask(bundle, sel, tier, baseModuleId, taskId) {
  return planTaskEdit(bundle, sel, tier, baseModuleId, taskId, addTask);
}

export function planRemoveTask(bundle, sel, tier, baseModuleId, taskId) {
  return planTaskEdit(bundle, sel, tier, baseModuleId, taskId, removeTask);
}

export function planAddModule(bundle, sel, tier, moduleId) {
  const scn = ensureScenarioForTier(bundle, sel, tier);
  if (!scn) return {};
  if (!bundle.modules?.[moduleId]) return {};   // don't add a module the library doesn't have
  return { scenario: addModuleToTier(scn, moduleId) };
}

export function planRemoveModule(bundle, sel, tier, baseModuleId) {
  const scn = ensureScenarioForTier(bundle, sel, tier);
  if (!scn) return {};
  const modId = actualModuleId(scn, baseModuleId);
  if (!modId) return {};
  return { scenario: removeModuleFromTier(scn, modId) };
}

export function planSetCoats(bundle, sel, tier, baseModuleId, n) {
  if (!Number.isInteger(n) || n < 1) return {};
  const scn = ensureScenarioForTier(bundle, sel, tier);
  if (!scn) return {};
  const modId = actualModuleId(scn, baseModuleId);
  if (!modId) return {};
  let scenario = scn;
  let count = (scenario.modules || []).filter(id => baseId(id) === baseModuleId).length;
  while (count < n) { scenario = addModuleToTier(scenario, modId); count++; }
  while (count > n) { scenario = removeModuleFromTier(scenario, modId); count--; }
  return { scenario };
}

// The tier's own scenario + its forked (_QT) modules to delete, reverting the
// tier to the baseline. {} when the tier is baseline-served (not forked). A
// _QT<tier> module is exclusive to this tier's scenario, so deleting it is safe.
export function planRevertTier(bundle, sel, tier) {
  const gov = resolveTierScenario(bundle, sel, tier);
  if (!gov || scenarioTierPin(gov) !== tier) return {};
  const deleteModuleIds = (gov.modules || []).filter(id => baseId(id) !== id);
  return { deleteScenarioId: gov.scenario_id, deleteModuleIds };
}

const ANCHOR_TIER = 'QT3';

function sameModules(a, b) {
  const x = a || [], y = b || [];
  return x.length === y.length && x.every((v, i) => v === y[i]);
}

// Set the per-tier QT time multiplier on the tier's scenario (fork-on-edit).
// {} for the QT3 anchor or a non-positive / non-finite value.
export function planSetQtFactor(bundle, sel, tier, value) {
  if (tier === ANCHOR_TIER) return {};
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return {};
  const scn = ensureScenarioForTier(bundle, sel, tier);
  if (!scn) return {};
  return { scenario: setScenarioQtFactor(scn, tier, value) };
}

// Clear the per-tier multiplier. No-op when the tier is baseline-served. When
// clearing removes the fork's last divergence (modules == baseline, no other
// modifier_overrides), reclaim the baseline by deleting the fork; otherwise
// keep the thinned fork (structural edits intact).
export function planClearQtFactor(bundle, sel, tier) {
  const gov = resolveTierScenario(bundle, sel, tier);
  if (!gov || scenarioTierPin(gov) !== tier) return {};
  const thinned = clearScenarioQtFactor(gov, tier);
  const baseline = (bundle.scenarios || []).find(s => s.scenario_id === baseId(gov.scenario_id));
  if (baseline && !thinned.modifier_overrides && sameModules(thinned.modules, baseline.modules)) {
    return { deleteScenarioId: gov.scenario_id, deleteModuleIds: [] };
  }
  return { scenario: thinned };
}

const ROLE_BY_SYSTEM_ID = buildRoleBySystemId(MATERIAL_SYSTEM_PRODUCTS);

// QT3 edits the baseline in place (materials are editable at QT3, unlike the
// locked QT-multiplier anchor); QT2/4/5 fork and own a fresh material_systems
// array. Returns null when no scenario governs the tier.
function ensureScenarioForMaterial(bundle, sel, tier) {
  const gov = resolveTierScenario(bundle, sel, tier);
  if (!gov) return null;
  if (tier === ANCHOR_TIER) return { ...gov, material_systems: [...(gov.material_systems || [])] };
  const fork = forkScenarioForTier(gov, tier).scenario;
  return { ...fork, material_systems: [...(fork.material_systems || [])] };
}

function materialsEqual(a, b) {
  const x = a || [], y = b || [];
  return x.length === y.length && x.every((v, i) => v === y[i]);
}

// Full equality to the canonical scenario: modules + material_systems +
// modifier_overrides. Used to decide auto-reclaim (the tier has returned to
// canonical, so its draft/fork can be dropped).
function matchesCanonical(scn, canonical) {
  if (!canonical) return false;
  return sameModules(scn.modules, canonical.modules)
    && materialsEqual(scn.material_systems, canonical.material_systems)
    && JSON.stringify(scn.modifier_overrides || null) === JSON.stringify(canonical.modifier_overrides || null);
}

function reclaimOrSave(scn, canonical) {
  if (matchesCanonical(scn, canonical)) {
    const deleteModuleIds = (scn.modules || []).filter(id => baseId(id) !== id);
    return { deleteScenarioId: scn.scenario_id, deleteModuleIds };
  }
  return { scenario: scn };
}

// The canonical scenario's system id for `role` (the "default" to clear back to).
function canonicalSystemForRole(canonical, role) {
  if (!canonical) return null;
  return (canonical.material_systems || []).find(id => classifySystemRole(id, ROLE_BY_SYSTEM_ID) === role) || null;
}

// Set the per-tier material system for a role (fork-on-edit). QT3 → baseline;
// QT2/4/5 → fork. Auto-reclaims when the result returns fully to canonical.
export function planSetMaterial(bundle, canonicalBundle, sel, tier, role, systemId) {
  if (!systemId) return {};
  const scn = ensureScenarioForMaterial(bundle, sel, tier);
  if (!scn) return {};
  const next = setScenarioMaterial(scn, systemId, role, ROLE_BY_SYSTEM_ID);
  const canonical = resolveTierScenario(canonicalBundle, sel, tier);
  return reclaimOrSave(next, canonical);
}

// Clear a tier's material override for a role back to the canonical pick. Never
// forks (a clear only thins/removes). No-op when the tier already matches canonical.
export function planClearMaterial(bundle, canonicalBundle, sel, tier, role) {
  const gov = resolveTierScenario(bundle, sel, tier);
  if (!gov) return {};
  // Only the anchor edits the baseline; a non-anchor tier must be served by its
  // OWN fork, else "clear" would thin the shared baseline and revert siblings.
  if (tier !== ANCHOR_TIER && scenarioTierPin(gov) !== tier) return {};
  const canonical = resolveTierScenario(canonicalBundle, sel, tier);
  const baselineSystemId = canonicalSystemForRole(canonical, role);
  const next = clearScenarioMaterial(gov, role, baselineSystemId, ROLE_BY_SYSTEM_ID);
  if (next === gov) return {};
  return reclaimOrSave(next, canonical);
}
