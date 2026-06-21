// Pure, copy-on-write authoring ops for the file-naming quality-tier model.
// Tier = file identity: a baseline scenario (no matches.quality_tier) serves all
// tiers; forks add matches.quality_tier and win by matcher specificity. Modules
// fork to MOD_..._QT<n> when a tier needs a different task set. No
// applies_when.quality_tier is ever written. All immutable; callers save results
// as scenario / module drafts. Replaces edit-tier-ladder.js.

// Strip any existing _QT<n> token (mid-id or suffix), then append _QT<n>.
// Tier ids are QT2–QT5; the strip regex only matches _QT[2-5].
export function tierId(baseId, tier) {
  const n = String(tier).replace(/^QT/, '');
  return baseId.replace(/_QT[2-5](?=_|$)/g, '') + '_QT' + n;
}

// The single tier this scenario pins via matches.quality_tier, or null
// (baseline = no quality_tier; multi-tier array = null).
export function scenarioTierPin(scenario) {
  const qt = scenario && scenario.matches && scenario.matches.quality_tier;
  if (qt == null) return null;
  const arr = Array.isArray(qt) ? qt : [qt];
  return arr.length === 1 ? arr[0] : null;
}

// Clone a scenario into a tier-pinned fork (new id, matches.quality_tier=tier).
// Additive: never mutates the source. No-op (same ref) if already pinned to tier.
export function forkScenarioForTier(scenario, tier) {
  if (!scenario || scenarioTierPin(scenario) === tier) return { scenario, created: false };
  const scenario_id = tierId(scenario.scenario_id, tier);
  const fork = {
    ...scenario,
    scenario_id,
    matches: { ...(scenario.matches || {}), quality_tier: tier },
    modules: [...(scenario.modules || [])],
  };
  return { scenario: fork, created: true };
}

// Insert a module id into the tier scenario's modules[] (append by default, or
// at index; repeats allowed for coats). Always returns a new scenario.
export function addModuleToTier(scenario, moduleId, index) {
  const modules = [...(scenario.modules || [])];
  if (index == null || index < 0 || index > modules.length) modules.push(moduleId);
  else modules.splice(index, 0, moduleId);
  return { ...scenario, modules };
}

// Remove the first occurrence of moduleId; same ref when absent.
export function removeModuleFromTier(scenario, moduleId) {
  const modules = [...(scenario.modules || [])];
  const i = modules.indexOf(moduleId);
  if (i === -1) return scenario;
  modules.splice(i, 1);
  return { ...scenario, modules };
}

// Reorder modules[] from index → to; same ref on no-op / out-of-range.
export function moveModule(scenario, from, to) {
  const modules = [...(scenario.modules || [])];
  if (from < 0 || from >= modules.length || to < 0 || to >= modules.length || from === to) return scenario;
  const [m] = modules.splice(from, 1);
  modules.splice(to, 0, m);
  return { ...scenario, modules };
}

// Append an existing task as a plain { task_ref } entry — NEVER with
// applies_when.quality_tier. Dedup by task_ref (same ref on no-op).
export function addTask(module, taskId) {
  const tasks = module.tasks || [];
  if (tasks.some(t => t && t.task_ref === taskId)) return module;
  return { ...module, tasks: [...tasks, { task_ref: taskId }] };
}

// Remove every entry whose task_ref matches; same ref when none matched.
export function removeTask(module, taskId) {
  const tasks = module.tasks || [];
  const next = tasks.filter(t => !(t && t.task_ref === taskId));
  if (next.length === tasks.length) return module;
  return { ...module, tasks: next };
}

// Set scenario.modifier_overrides.FAC_QT[tier] = value (immutable, nested
// create). The per-tier QT time multiplier lives on the tier's own (forked)
// scenario; the engine's resolveFactor reads it over the global FAC_QT table.
// Same ref on a true no-op. NEVER called for the QT3 anchor (caller-gated).
export function setScenarioQtFactor(scenario, tier, value) {
  const cur = scenario && scenario.modifier_overrides && scenario.modifier_overrides.FAC_QT
    ? scenario.modifier_overrides.FAC_QT[tier] : undefined;
  if (cur === value) return scenario;
  const modifier_overrides = { ...(scenario.modifier_overrides || {}) };
  modifier_overrides.FAC_QT = { ...(modifier_overrides.FAC_QT || {}), [tier]: value };
  return { ...scenario, modifier_overrides };
}

// Remove scenario.modifier_overrides.FAC_QT[tier]; prune an emptied FAC_QT and
// an emptied modifier_overrides. Same ref when the key was absent.
export function clearScenarioQtFactor(scenario, tier) {
  const facqt = scenario && scenario.modifier_overrides && scenario.modifier_overrides.FAC_QT;
  if (!facqt || !(tier in facqt)) return scenario;
  const nextFacqt = { ...facqt };
  delete nextFacqt[tier];
  const modifier_overrides = { ...scenario.modifier_overrides };
  if (Object.keys(nextFacqt).length === 0) delete modifier_overrides.FAC_QT;
  else modifier_overrides.FAC_QT = nextFacqt;
  const next = { ...scenario };
  if (Object.keys(modifier_overrides).length === 0) delete next.modifier_overrides;
  else next.modifier_overrides = modifier_overrides;
  return next;
}

// Clone a shared module into a tier copy (MOD_..._QT<n>) and swap the first
// occurrence of moduleId in scenario.modules to the fork. Additive: source
// scenario/module untouched. No-op when moduleId already pins that tier.
export function forkModuleForTier(scenario, moduleId, sourceModule, tier) {
  const forkedId = tierId(moduleId, tier);
  if (forkedId === moduleId) return { scenario, module: sourceModule, created: false };
  const modules = [...(scenario.modules || [])];
  const i = modules.indexOf(moduleId);
  if (i === -1) return { scenario, module: sourceModule, created: false };
  const module = { ...sourceModule, module_id: forkedId, tasks: (sourceModule.tasks || []).map(t => ({ ...t })) };
  modules[i] = forkedId;
  return { scenario: { ...scenario, modules }, module, created: true };
}
