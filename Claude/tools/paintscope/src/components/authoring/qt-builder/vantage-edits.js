// Pure implicit-fork edit orchestration for the QT Builder vantage grid. Each
// plan* function composes the Phase 1a tier-files ops over the OVERLAID bundle
// and returns the draft writes (and deletes) the component should persist — so
// the fork-on-edit sequencing is testable apart from React/IndexedDB. Reads
// only; never mutates the bundle.

import { findBestMatch } from '../../../engine/scenario-matcher.js';
import {
  scenarioTierPin, forkScenarioForTier, forkModuleForTier,
  addTask, removeTask, addModuleToTier, removeModuleFromTier,
} from './tier-files.js';

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
