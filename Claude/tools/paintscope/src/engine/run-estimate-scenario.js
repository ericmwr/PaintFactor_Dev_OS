// Phase 0: Parallel scenario-based estimation orchestrator.
//
// This is the new-architecture counterpart to run-estimate.js. It consumes
// flat modules + scenario packs (from Claude/modules/ and Claude/scenarios/)
// instead of spec families + sop_modules + sop_tasks + task_production_rates.
//
// Phase 0 scope is limited: interior drywall wall finish only. It does NOT
// implement the full run-estimate pipeline (no floor/fixture protection
// resolvers, no material estimates, no pricing). It is a PURE TASK GENERATOR
// that produces the same TaskResult shape used by run-estimate.js lines 354-373.
//
// Diff harness calls both engines on the same synthetic room and compares
// per-phase totals. See Claude/scripts/phase0-diff.mjs.
//
// Contract:
//   runScenarioEstimate({
//     scenarioBundle,    // { modules: {MOD_ID: {...}}, scenarios: [{...}, ...] }
//     ctx,               // { quality_tier, application_method, surface_texture,
//                        //   height_band, complexity, substrate_state, substrate,
//                        //   surface, floor_type }
//     roomQty,           // Map<ps_key, { value }>
//     roomIndex,         // number (for TaskResult.roomIndex)
//     roomLabel,         // string (for TaskResult.roomLabel)
//   })
//   → {
//       scenarioId,
//       scenarioName,
//       totalHours,
//       phaseHours: { protection, prep, apply, interstage, cleanup, ... },
//       tasks: [ TaskResult, ... ],
//       warnings: [],
//     }

// ============================================================
// INTERIOR MODIFIER DEFAULTS
// ============================================================
// Mirrors modifier-stack.js COMPLEXITY_DEFAULTS + the interior factor_modifiers
// rows that live in db-bundle.js for SF_DRYWALL_WALL_NC_FINISH. Extracted here
// so the new orchestrator doesn't depend on the spec-keyed db.factor_modifiers.
// These values are the canonical Modifier_Registry defaults for interior work.

const QT_MODIFIERS = { QT2: 1.00, QT3: 1.00, QT4: 1.20, QT5: 1.50 };

const HEIGHT_MODIFIERS = {
  STD:      1.00,  // <= 9 ft
  STEP:     1.30,  // 10-12 ft (step ladder)
  EXT:      1.50,  // 13-17 ft (extension ladder)
  SCAFFOLD: 2.00,  // 18+ ft (scaffold)
};

const TEXTURE_MODIFIERS = {
  smooth:      1.00,
  orange_peel: 1.15,
  knockdown:   1.25,
};

const COMPLEXITY_MODIFIERS = {
  OPEN:     0.85,
  STD:      1.00,
  MOD:      1.20,
  COMPLEX:  1.20, // legacy alias
  VCOMPLEX: 1.50,
};

/**
 * Build the modifier stack for a module in a given context.
 * Returns { qt, height, texture, complexity, complexityApplicable, total }.
 * The `total` field is the product of all eligible modifiers EXCEPT complexity
 * (which is applied per-task by shouldApplyComplexity, matching run-estimate.js
 * lines 24-46). This keeps the field shape compatible with the legacy engine.
 */
export function computeScenarioModifierStack(module, ctx) {
  const eligibility = module.modifier_eligibility || {};

  const qt = eligibility.qt !== false
    ? (QT_MODIFIERS[ctx.quality_tier] ?? 1.0)
    : 1.0;

  const height = eligibility.height !== false
    ? (HEIGHT_MODIFIERS[ctx.height_band || 'STD'] ?? 1.0)
    : 1.0;

  const texture = eligibility.texture === true
    ? (TEXTURE_MODIFIERS[ctx.surface_texture || 'smooth'] ?? 1.0)
    : 1.0;

  const complexity = eligibility.complexity !== false
    ? (COMPLEXITY_MODIFIERS[(ctx.complexity || 'STD').toUpperCase()] ?? 1.0)
    : 1.0;

  // Total excludes complexity — same pattern as modifier-stack.js for interior specs
  const total = Math.round(qt * height * texture * 1000) / 1000;

  return {
    qt,
    height,
    texture,
    complexity,
    complexityApplicable: eligibility.complexity !== false,
    total,
  };
}

/**
 * Determine if complexity should fold into the effective modifier for a given
 * task phase + method. Matches run-estimate.js shouldApplyComplexity exactly.
 */
function shouldApplyComplexity(modStack, phase, ctx) {
  if (!modStack.complexityApplicable) return false;
  if (modStack.complexity === 1.0) return false;
  if (phase === 'prep' || phase === 'interstage') return true;
  if (phase === 'apply' || phase === 'finish' || phase === 'prime') {
    const method = (ctx.application_method || '').toLowerCase();
    return !method.startsWith('spray');
  }
  return false;
}

/**
 * Compute the effective total modifier for a task, conditionally folding
 * complexity. Mirrors run-estimate.js computeEffectiveTotal.
 */
function computeEffectiveTotal(modStack, phase, ctx) {
  const complexityApplied = shouldApplyComplexity(modStack, phase, ctx);
  const effectiveTotal = complexityApplied
    ? Math.round(modStack.total * modStack.complexity * 1000) / 1000
    : modStack.total;
  return { effectiveTotal, complexityApplied };
}

/**
 * Evaluate a task's applies_when condition against ctx + coat_number.
 * Extends the legacy applies_when shape with an optional `coat` key so that
 * rate variants can be filtered by which coat invocation is running.
 */
function evaluateAppliesWhen(condition, ctx, coatNumber) {
  if (!condition || typeof condition !== 'object' || Object.keys(condition).length === 0) {
    return true;
  }
  for (const [key, values] of Object.entries(condition)) {
    if (!Array.isArray(values)) continue;
    let ctxValue;
    if (key === 'coat') {
      ctxValue = coatNumber;
    } else {
      ctxValue = ctx[key];
    }
    // Accept both number and string forms of coat (JSON keys stringify)
    if (key === 'coat') {
      if (!values.map(String).includes(String(ctxValue))) return false;
    } else {
      if (!values.includes(ctxValue)) return false;
    }
  }
  return true;
}

/**
 * Resolve a task's effective rate for a given ctx + coat number.
 * Priority order (matches resolveTaskRate in run-estimate.js, extended for
 * the new module shape):
 *   1. task.rates[] — array of rate variants with applies_when (incl. coat key)
 *   2. task.rates_by_coat — { "1": n, "2": n } keyed by coat number
 *   3. task.rates_by_tier — { QT3: n, QT4: n, QT5: n }
 *   4. task.rate_per_hour — flat number
 *   5. task.fixed_minutes — flat number, no modifier applied
 *
 * Returns { effectiveRate, isFixed, fixedMinutes, uom, source } or null.
 */
function resolveTaskRate(task, ctx, coatNumber) {
  const uom = task.uom;

  // 1. rates[] with per-variant applies_when
  if (Array.isArray(task.rates)) {
    for (const variant of task.rates) {
      if (!evaluateAppliesWhen(variant.applies_when, ctx, coatNumber)) continue;
      if (variant.rate_per_hour != null && variant.rate_per_hour > 0) {
        return { effectiveRate: variant.rate_per_hour, isFixed: false, fixedMinutes: null, uom, source: 'rates[].rate_per_hour' };
      }
      if (variant.fixed_minutes != null && variant.fixed_minutes > 0) {
        return { effectiveRate: null, isFixed: true, fixedMinutes: variant.fixed_minutes, uom, source: 'rates[].fixed_minutes' };
      }
    }
    return null; // rates[] present but nothing matched
  }

  // 2. rates_by_coat
  if (task.rates_by_coat && typeof task.rates_by_coat === 'object') {
    const rate = task.rates_by_coat[String(coatNumber)] ?? task.rates_by_coat[coatNumber];
    if (typeof rate === 'number' && rate > 0) {
      return { effectiveRate: rate, isFixed: false, fixedMinutes: null, uom, source: 'rates_by_coat' };
    }
  }

  // 3. rates_by_tier
  if (task.rates_by_tier && typeof task.rates_by_tier === 'object') {
    const rate = task.rates_by_tier[ctx.quality_tier];
    if (typeof rate === 'number' && rate > 0) {
      return { effectiveRate: rate, isFixed: false, fixedMinutes: null, uom, source: 'rates_by_tier' };
    }
    // No entry for this QT in rates_by_tier = task skips this tier
    return null;
  }

  // 4. rate_per_hour
  if (task.rate_per_hour != null && task.rate_per_hour > 0) {
    return { effectiveRate: task.rate_per_hour, isFixed: false, fixedMinutes: null, uom, source: 'rate_per_hour' };
  }

  // 5. fixed_minutes
  if (task.fixed_minutes != null && task.fixed_minutes > 0) {
    return { effectiveRate: null, isFixed: true, fixedMinutes: task.fixed_minutes, uom, source: 'fixed_minutes' };
  }

  return null;
}

/**
 * Find the scenario whose matches{} object is compatible with ctx AND is the
 * MOST SPECIFIC match (most keys in matches{}). Specificity scoring prevents
 * a less-specific scenario from accidentally winning over a more-specific one
 * when both could legitimately match — for example, a paint scenario whose
 * state list includes SS_PRIMED_FACTORY would otherwise win over a prime
 * scenario that specifically targets factory-primed substrate.
 *
 * Returns the most-specific matching scenario, or null. If multiple scenarios
 * tie for the highest specificity score, returns the first one and pushes a
 * warning to the caller via the second-arg warnings array (when provided).
 */
function findMatchingScenario(scenarioBundle, ctx, warnings = null) {
  let bestMatch = null;
  let bestScore = -1;
  let tied = false;

  for (const scenario of scenarioBundle.scenarios) {
    const m = scenario.matches || {};
    let ok = true;
    for (const [key, expected] of Object.entries(m)) {
      const ctxVal = ctx[key];
      if (Array.isArray(expected)) {
        if (!expected.includes(ctxVal)) { ok = false; break; }
      } else {
        if (ctxVal !== expected) { ok = false; break; }
      }
    }
    if (!ok) continue;

    // Specificity score: count of keys in matches{} (more keys = more specific)
    const score = Object.keys(m).length;
    if (score > bestScore) {
      bestMatch = scenario;
      bestScore = score;
      tied = false;
    } else if (score === bestScore) {
      tied = true;
    }
  }

  if (tied && warnings) {
    warnings.push(`Multiple scenarios tied at specificity ${bestScore} for ctx; picked ${bestMatch?.scenario_id} (alphabetically first). Consider adding more specific keys to disambiguate.`);
  }

  return bestMatch;
}

/**
 * Main entry point: run the scenario estimator for a single room against a
 * single scenario pack. Returns a flat task result list plus per-phase totals.
 */
export function runScenarioEstimate({ scenarioBundle, ctx, roomQty, roomIndex = 0, roomLabel = 'Room 1' }) {
  const warnings = [];
  const tasks = [];
  const phaseHours = {};
  let totalHours = 0;

  const scenario = findMatchingScenario(scenarioBundle, ctx, warnings);
  if (!scenario) {
    warnings.push(`No scenario matched ctx: quality_tier=${ctx.quality_tier} application_method=${ctx.application_method} substrate=${ctx.substrate} surface=${ctx.surface} state=${ctx.substrate_state}`);
    return { scenarioId: null, scenarioName: null, totalHours: 0, phaseHours: {}, tasks: [], warnings };
  }

  // Walk the modules[] in order. Repeated module IDs = multi-coat semantics:
  // each apply-phase module invocation increments a PER-MODULE counter, so
  // the Nth time a given module appears in the scenario list, its tasks see
  // coatNumber = N. Non-apply modules (protect, prep, interstage, cleanup)
  // always run at coatNumber = 1.
  const moduleInvocations = {}; // module_id -> count so far

  for (const moduleId of scenario.modules) {
    const mod = scenarioBundle.modules[moduleId];
    if (!mod) {
      warnings.push(`Scenario ${scenario.scenario_id} references unknown module ${moduleId}`);
      continue;
    }

    moduleInvocations[moduleId] = (moduleInvocations[moduleId] || 0) + 1;
    const coatNumber = (mod.phase === 'apply') ? moduleInvocations[moduleId] : 1;

    const modStack = computeScenarioModifierStack(mod, ctx);

    for (const task of mod.tasks) {
      // Task-level applies_when (not variant-level; variant-level lives inside rates[])
      if (task.applies_when && !evaluateAppliesWhen(task.applies_when, ctx, coatNumber)) {
        continue;
      }

      const resolved = resolveTaskRate(task, ctx, coatNumber);
      if (!resolved) continue;

      const phase = mod.phase;
      const psKey = task.ps_key;

      let hours = 0;
      let quantity = 0;

      if (resolved.isFixed) {
        // Fixed minutes: no quantity, no modifier (per doctrine — same as run-estimate.js line 378)
        hours = resolved.fixedMinutes / 60;
        quantity = 1;
      } else if (psKey && roomQty && roomQty.has(psKey)) {
        quantity = roomQty.get(psKey).value;
        if (quantity <= 0) continue;
        const { effectiveTotal } = computeEffectiveTotal(modStack, phase, ctx);
        const effRate = resolved.effectiveRate / effectiveTotal;
        hours = quantity / effRate;
      } else {
        // No quantity available for this task's PS key — skip silently
        // (matches run-estimate.js behavior at line 419)
        continue;
      }

      if (hours <= 0) continue;

      const roundedHours = Math.round(hours * 1000) / 1000;
      phaseHours[phase] = Math.round(((phaseHours[phase] || 0) + roundedHours) * 1000) / 1000;
      totalHours += roundedHours;

      tasks.push({
        taskId: task.task_id,
        taskName: task.name,
        phase,
        moduleId: mod.module_id,
        moduleName: mod.name,
        roomIndex,
        roomLabel,
        psKey: psKey || '(fixed)',
        uom: resolved.uom,
        quantity: Math.round(quantity * 100) / 100,
        baseRate: resolved.isFixed ? `${resolved.fixedMinutes}m` : resolved.effectiveRate,
        modStack: { ...modStack },
        hours: roundedHours,
        coatNumber,
        skillLevel: task.skill_level || 'general',
        crewSize: 1,
        isFixed: resolved.isFixed,
        rateSource: resolved.source,
      });
    }

  }

  return {
    scenarioId: scenario.scenario_id,
    scenarioName: scenario.name,
    totalHours: Math.round(totalHours * 100) / 100,
    phaseHours: Object.fromEntries(Object.entries(phaseHours).map(([k, v]) => [k, Math.round(v * 100) / 100])),
    tasks,
    warnings,
    outputState: scenario.output_state || null,
  };
}

/**
 * Run a chain of scenarios in sequence on the same room. Each scenario consumes
 * the substrate state produced by the previous scenario, threading state through
 * the chain. Used to model prime → finish on a single room.
 *
 * The chain stops at the first scenario that fails to match (no scenario in the
 * bundle has matches{} compatible with the threaded ctx). A warning is recorded.
 *
 * Phase 1a: chain just runs each scenario standalone in sequence and concatenates
 * results. No cross-scenario protection dedup yet — that's Phase 1c.
 *
 * Inputs:
 *   scenarioBundle, ctx (initial), roomQty, roomIndex, roomLabel
 *
 * Returns:
 *   {
 *     totalHours: sum across all scenarios in chain,
 *     phaseHours: merged across all scenarios,
 *     scenarioResults: [ {scenarioId, totalHours, phaseHours, tasks}, ... ],
 *     finalState: substrate state after all scenarios ran,
 *     warnings: [],
 *   }
 *
 * The orchestrator picks the next scenario in the chain by:
 *   1. Updating ctx.substrate_state to the previous scenario's output_state
 *   2. Calling findMatchingScenario(scenarioBundle, ctx) to get the next match
 *   3. Stopping when no scenario matches the threaded state (chain complete)
 */
export function runScenarioChain({ scenarioBundle, ctx, roomQty, roomIndex = 0, roomLabel = 'Room 1' }) {
  const warnings = [];
  const scenarioResults = [];
  const mergedPhaseHours = {};
  let totalHours = 0;
  let currentCtx = { ...ctx };
  let finalState = currentCtx.substrate_state;

  // Hard cap to prevent infinite loops in case a scenario's output_state somehow
  // re-matches its own input state.
  const MAX_CHAIN_DEPTH = 10;
  let depth = 0;

  while (depth < MAX_CHAIN_DEPTH) {
    const result = runScenarioEstimate({
      scenarioBundle,
      ctx: currentCtx,
      roomQty,
      roomIndex,
      roomLabel,
    });

    if (!result.scenarioId) {
      // No scenario matched the current state — chain is complete
      // (or never started, if depth === 0)
      if (depth === 0) {
        warnings.push(...result.warnings);
      }
      break;
    }

    scenarioResults.push(result);
    totalHours += result.totalHours;
    for (const [phase, hrs] of Object.entries(result.phaseHours)) {
      mergedPhaseHours[phase] = Math.round(((mergedPhaseHours[phase] || 0) + hrs) * 100) / 100;
    }
    warnings.push(...result.warnings);

    // Thread the output state forward
    if (result.outputState) {
      finalState = result.outputState;
      currentCtx = { ...currentCtx, substrate_state: result.outputState };
    } else {
      // No output_state declared = chain stops here
      break;
    }

    depth += 1;
  }

  if (depth === MAX_CHAIN_DEPTH) {
    warnings.push(`Scenario chain hit max depth ${MAX_CHAIN_DEPTH} — possible infinite loop`);
  }

  return {
    totalHours: Math.round(totalHours * 100) / 100,
    phaseHours: mergedPhaseHours,
    scenarioResults,
    finalState,
    warnings,
  };
}
