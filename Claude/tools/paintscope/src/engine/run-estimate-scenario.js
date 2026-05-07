import {
  DOOR_TYPE_MODIFIERS,
  DOOR_TYPE_LABELS,
  WINDOW_SIZE_MODIFIERS,
  WINDOW_TYPE_MODIFIERS,
  WINDOW_SIZE_LABELS,
  WINDOW_TYPE_LABELS,
  MUNTIN_MODIFIER,
} from '../data/modifiers.js';
import { getFactor, getModifier } from './modifier-registry.js';

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
//                        //   height_band, complexity, substrate_state, paintable_item,
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

const QT_MODIFIERS = { QT1: 0.80, QT2: 0.80, QT3: 1.00, QT4: 1.30, QT5: 1.50 };

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

const CONDITION_MODIFIERS = {
  good: 0.70,
  fair: 1.00,
  poor: 1.50,
  // Exterior RP canonical scale (uppercase, different from interior)
  GOOD: 1.00,
  FAIR: 1.50,
  POOR: 2.00,
};

// Exterior access modifier — applied when ctx.access_type is set (ground/ladder/
// scaffold/lift). Mirrors FAC_EXT_ACCESS from exterior specs. Phase 2a exterior
// modules declare this as `height: true` in modifier_eligibility; we map
// ctx.access_type to the modifier table here since exterior work uses a
// different height scheme than interior (no STEP/EXT/SCAFFOLD ladder bands).
const EXT_ACCESS_MODIFIERS = {
  ground:   1.00,
  ladder:   1.35,
  scaffold: 1.60,
  lift:     1.50,
};

// ============================================================
// DYNAMIC MODIFIER REGISTRY
// ============================================================
// Exterior and specialty specs declare named modifiers in their scenario JSON
// (e.g. FAC_EXT_ACCESS, FAC_MSRY_SUBSTRATE_TYPE, FAC_STCO_TEXTURE_PROFILE).
// The scenario's `modifiers: [...]` array lists which dynamic modifiers apply
// to the whole scenario. Each modifier ID maps to a lookup table + ctx key
// below. When a module's modifier_eligibility includes the corresponding
// category (currently only `height` is coupled — to FAC_EXT_ACCESS), the
// modifier is folded into the stack total.
//
// Non-hardcoded modifiers (substrate type, coating system, texture profile,
// siding profile, fence style, etc.) are applied via DYNAMIC_MODIFIERS and
// folded into `total` unconditionally when the scenario declares them.
const DYNAMIC_MODIFIERS = {
  // Exterior
  FAC_EXT_ACCESS: { ctxKey: 'access_type', table: EXT_ACCESS_MODIFIERS, default: 'ground' },

  // Masonry
  FAC_MSRY_SUBSTRATE_TYPE: { ctxKey: 'substrate_type', table: { brick: 1.00, CMU: 1.15, concrete: 1.05, limestone: 1.10 }, default: 'brick' },
  FAC_MSRY_COATING_SYSTEM: { ctxKey: 'coating_system', table: { acrylic: 1.00, elastomeric: 1.50 }, default: 'acrylic' },

  // Foundation
  FAC_FNDN_FOUNDATION_TYPE: { ctxKey: 'foundation_type', table: { poured: 1.00, CMU: 1.15 }, default: 'poured' },
  FAC_FNDN_CONDITION_SCALE: { ctxKey: 'condition_scale', table: { GOOD: 1.00, FAIR: 1.30, POOR: 1.60 }, default: 'GOOD' },

  // Stucco
  FAC_STCO_TEXTURE_PROFILE: { ctxKey: 'texture_profile', table: { smooth: 1.00, sand: 1.25, lace: 1.50, dash: 2.00 }, default: 'smooth' },

  // Siding profile / texture (shared pattern across engineered / fibercement)
  FAC_ENSD_SIDING_PROFILE: { ctxKey: 'siding_profile', table: { lap: 1.00, panel: 1.10, t1_11: 1.80 }, default: 'lap' },
  FAC_ENSD_SURFACE_TEXTURE: { ctxKey: 'surface_texture', table: { smooth: 1.00, cedarmill: 1.20, roughsawn: 1.30 }, default: 'smooth' },
  FAC_FCSD_SIDING_PROFILE: { ctxKey: 'siding_profile', table: { lap: 1.00, panel: 1.10, shingle: 2.00 }, default: 'lap' },
  FAC_FCSD_SURFACE_TEXTURE: { ctxKey: 'surface_texture', table: { smooth: 1.00, cedarmill: 1.20, roughsawn: 1.30 }, default: 'smooth' },

  // Soffit / metal
  FAC_SFIT_FACE_TYPE: { ctxKey: 'soffit_face_type', table: { closed_face: 1.00, open_face: 2.00 }, default: 'closed_face' },
  FAC_METAL_PROFILE_COMPLEXITY: { ctxKey: 'metal_profile_complexity', table: { simple: 1.00, moderate: 1.50, ornate: 2.50 }, default: 'simple' },

  // Garage door
  FAC_GRDR_DOOR_SIZE: { ctxKey: 'door_size', table: { single: 1.00, double: 1.80 }, default: 'single' },
  FAC_GRDR_PANEL_COMPLEXITY: { ctxKey: 'panel_complexity', table: { flush: 1.00, raised_panel: 1.10, carriage: 1.30 }, default: 'flush' },

  // Fence / aluminum
  FAC_FENCE_STYLE: { ctxKey: 'fence_style', table: { privacy: 1.00, picket: 1.30, rail: 0.80 }, default: 'privacy' },
  FAC_ALRP_CHALK_SEVERITY: { ctxKey: 'chalk_severity', table: { none: 1.00, light: 1.25, heavy: 1.75 }, default: 'none' },

  // Grain fill
  FAC_SURFACE_PROFILE: { ctxKey: 'surface_profile', table: { flat: 1.00, light_profile: 1.30, medium_profile: 2.00, heavy_profile: 2.80 }, default: 'flat' },
  FAC_WOOD_SPECIES: { ctxKey: 'wood_species_group', table: { closed_grain: 1.00, moderate_grain: 1.20, deep_grain: 1.40, open_grain: 1.30 }, default: 'closed_grain' },

  // Universal condition scale (exterior RP fallback)
  FAC_CONDITION_SCALE: { ctxKey: 'substrate_condition', table: { good: 0.70, fair: 1.00, poor: 1.50, GOOD: 1.00, FAIR: 1.50, POOR: 2.00 }, default: 'fair' },
};

/**
 * Resolve dynamic modifiers declared in scenario.modifiers[]. Returns an
 * object { modifierId: value } with every listed modifier folded into the
 * scenario's context. Unknown modifier IDs log a warning (passed in) and
 * default to 1.0.
 */
function resolveScenarioModifiers(scenario, ctx, warnings, bundle = null) {
  const result = {};
  const list = Array.isArray(scenario.modifiers) ? scenario.modifiers : [];
  for (const modId of list) {
    // Prefer bundle-sourced definition (from Claude/modifiers/FAC_*.json).
    // Falls back to hardcoded DYNAMIC_MODIFIERS for backward compat during migration.
    const bundleDef = getModifier(bundle, modId);
    if (bundleDef) {
      const ctxKey = bundleDef.ctx_key;
      const raw = ctxKey ? ctx[ctxKey] : undefined;
      const key = raw ?? bundleDef.default;
      const val = bundleDef.factors?.[key];
      result[modId] = (typeof val === 'number') ? val : 1.0;
      continue;
    }
    const legacy = DYNAMIC_MODIFIERS[modId];
    if (!legacy) {
      if (warnings) warnings.push(`Unknown modifier ${modId} in scenario ${scenario.scenario_id}`);
      result[modId] = 1.0;
      continue;
    }
    const raw = ctx[legacy.ctxKey];
    const key = raw ?? legacy.default;
    const val = legacy.table[key];
    result[modId] = (typeof val === 'number') ? val : 1.0;
  }
  return result;
}

/**
 * Compute the combined dynamic multiplier for a module — the product of every
 * scenario-declared modifier that applies to this module. FAC_EXT_ACCESS only
 * applies when module.modifier_eligibility.height is true (matches the legacy
 * convention that height/access modifiers are per-module eligible). All other
 * dynamic modifiers apply unconditionally when the scenario declares them.
 */
function computeDynamicStack(module, scenarioModifiers) {
  const eligibility = module.modifier_eligibility || {};
  let dyn = 1.0;
  const applied = {};
  for (const [modId, val] of Object.entries(scenarioModifiers)) {
    if (modId === 'FAC_EXT_ACCESS' && eligibility.height === false) continue;
    dyn = Math.round(dyn * val * 1000) / 1000;
    applied[modId] = val;
  }
  return { dyn, applied };
}

/**
 * Build the modifier stack for a module in a given context.
 * Returns { qt, height, texture, complexity, complexityApplicable, total }.
 * The `total` field is the product of all eligible modifiers EXCEPT complexity
 * (which is applied per-task by shouldApplyComplexity, matching run-estimate.js
 * lines 24-46). This keeps the field shape compatible with the legacy engine.
 */
/**
 * Module eligibility + optional task-level overrides merged into a single map.
 * Per-task override semantics: if task.modifier_eligibility[key] is defined,
 * it wins over module.modifier_eligibility[key]. Otherwise module wins.
 * Used by spray+backroll-style modules where one task is texture-sensitive
 * and the other isn't.
 */
function resolveEligibility(module, task) {
  const modEl = module.modifier_eligibility || {};
  const taskEl = (task && task.modifier_eligibility) || null;
  if (!taskEl) return modEl;
  return { ...modEl, ...taskEl };
}

/**
 * Derive surface orientation for FAC_OVERHEAD. Two signals:
 *   1. task.ps_key contains 'CEILING' → CEILING (per-task source of truth,
 *      lets a single module mix wall + ceiling tasks)
 *   2. otherwise, if module's eligibility.overhead === true → CEILING
 *      (the module declares itself as overhead work — used when entries
 *      don't carry per-task ps_keys, which is the common case for the
 *      consolidated wood-ceiling modules)
 *   3. otherwise → WALL (neutral default; FAC_OVERHEAD = 1.0× anyway when
 *      eligibility.overhead is falsy, so the orientation is informational)
 */
function deriveSurfaceOrientation(task, eligibility) {
  const psKey = task && task.ps_key;
  if (typeof psKey === 'string' && /CEILING/i.test(psKey)) return 'CEILING';
  if (eligibility && eligibility.overhead === true) return 'CEILING';
  return 'WALL';
}

export function computeScenarioModifierStack(module, ctx, scenarioModifiers = null, bundle = null, task = null) {
  const eligibility = resolveEligibility(module, task);

  // QT resolution honors per-task fac_qt_override (Option 3 from the QT
  // Builder design): if the canonical task declares a tier-specific
  // multiplier, use it in place of the global FAC_QT value for this task.
  // Preserves the "baseline rate + modifier" math — overrides replace the
  // multiplier, not the rate. If the task has no override for this tier,
  // FAC_QT.factors applies as before.
  let qt;
  if (eligibility.qt === false) {
    qt = 1.0;
  } else {
    const taskOverride = task && task.fac_qt_override
      ? task.fac_qt_override[ctx.quality_tier]
      : undefined;
    if (typeof taskOverride === 'number') {
      qt = taskOverride;
    } else {
      qt = bundle ? getFactor(bundle, 'FAC_QT', ctx.quality_tier) : (QT_MODIFIERS[ctx.quality_tier] ?? 1.0);
    }
  }

  // Height resolution: exterior specs use ctx.access_type via FAC_EXT_ACCESS
  // (handled in dynamic modifiers). Interior specs use ctx.height_band directly.
  // When a scenario declares FAC_EXT_ACCESS, the height slot reflects access,
  // not the interior height band. Otherwise fall back to interior height_band.
  const hasExtAccess = scenarioModifiers && scenarioModifiers.FAC_EXT_ACCESS != null;
  const height = eligibility.height !== false
    ? (hasExtAccess ? 1.0 : (bundle ? getFactor(bundle, 'FAC_HEIGHT', ctx.height_band || 'STD') : (HEIGHT_MODIFIERS[ctx.height_band || 'STD'] ?? 1.0)))
    : 1.0;

  const texture = eligibility.texture === true
    ? (bundle ? getFactor(bundle, 'FAC_TEXTURE', ctx.surface_texture || 'smooth') : (TEXTURE_MODIFIERS[ctx.surface_texture || 'smooth'] ?? 1.0))
    : 1.0;

  const complexity = eligibility.complexity !== false
    ? (bundle ? getFactor(bundle, 'FAC_COMPLEXITY', (ctx.complexity || 'STD').toUpperCase()) : (COMPLEXITY_MODIFIERS[(ctx.complexity || 'STD').toUpperCase()] ?? 1.0))
    : 1.0;

  const condition = eligibility.condition !== false
    ? (bundle ? getFactor(bundle, 'FAC_CONDITION', ctx.substrate_condition || 'fair') : (CONDITION_MODIFIERS[ctx.substrate_condition || 'fair'] ?? 1.0))
    : 1.0;

  // FAC_OVERHEAD — ceiling vs wall surface orientation penalty. Module
  // opts in via modifier_eligibility.overhead = true. Surface orientation
  // is derived from the resolved task's ps_key so a single module can mix
  // wall + ceiling tasks (e.g., MOD_PREP_COMBINED_WC_FINISH) and each
  // task's hours scale appropriately. Falls back to WALL (= 1.0×) when
  // no ps_key is available or no eligibility — neutral default.
  const surface_orientation = deriveSurfaceOrientation(task, eligibility);
  const overhead = eligibility.overhead === true
    ? (bundle ? getFactor(bundle, 'FAC_OVERHEAD', surface_orientation) : (surface_orientation === 'CEILING' ? 1.25 : 1.0))
    : 1.0;

  // Dynamic modifiers from scenario.modifiers[] (exterior access, substrate
  // type, coating system, texture profile, etc.). Folded into total.
  const dynamic = scenarioModifiers
    ? computeDynamicStack(module, scenarioModifiers)
    : { dyn: 1.0, applied: {} };

  // Total excludes complexity — same pattern as modifier-stack.js for interior specs
  const total = Math.round(qt * height * texture * condition * overhead * dynamic.dyn * 1000) / 1000;

  return {
    qt,
    height,
    texture,
    condition,
    complexity,
    overhead,
    surfaceOrientation: surface_orientation,
    complexityApplicable: eligibility.complexity !== false,
    dynamic: dynamic.applied,
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
 * Build the display-facing task name, appending "— Coat N" when coatNumber > 1.
 * Keeps the estimate readable when the same task fires on multiple coats.
 */
function displayTaskName(task, coatNumber) {
  const base = task.name;
  if (coatNumber && coatNumber > 1) return `${base} \u2014 Coat ${coatNumber}`;
  return base;
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
    // coat_lt_ctx: "<field>" — fires when coatNumber < ctx[field]. Used to
    // suppress interstage sand on the final coat of a multi-coat module
    // expanded via scenario.dynamic_coats.
    if (key === 'coat_lt_ctx') {
      const field = Array.isArray(values) ? values[0] : values;
      const max = Number(ctx[field]);
      if (!(Number.isFinite(max) && coatNumber < max)) return false;
      continue;
    }
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
 * Resolve a module-level task entry into a concrete task.
 *
 * If the entry has `task_ref`, load the canonical task from the library
 * (scenarioBundle.tasks dict) and shallow-merge any override fields from
 * the entry over it. Override fields use canonical field names directly —
 * e.g., { task_ref: "TSK_CEIL_SPRAY_PRIMER", rate_per_hour: 575 } replaces
 * the canonical 500 with 575 for this module only.
 *
 * If the entry has no `task_ref`, it's an inline task (back-compat) and is
 * returned unchanged.
 *
 * Returns null if task_ref references an unknown task (caller pushes a warning).
 */
function resolveTaskFromRef(entry, tasksLibrary) {
  if (!entry || !entry.task_ref) return entry;
  const canonical = tasksLibrary && tasksLibrary[entry.task_ref];
  if (!canonical) return null;
  // Spread canonical first, then entry overrides (minus task_ref itself)
  const { task_ref: _ref, ...overrides } = entry;
  return { ...canonical, ...overrides };
}

/**
 * Resolve a task's effective rate for a given ctx + coat number.
 * Priority order (matches resolveTaskRate in run-estimate.js, extended for
 * the new module shape):
 *   0. overlayMap[task_id] — field-editable override (Phase 1c.4)
 *   1. task.rates[] — array of rate variants with applies_when (incl. coat key)
 *   2. task.rates_by_coat — { "1": n, "2": n } keyed by coat number
 *   3. task.rates_by_tier — { QT3: n, QT4: n, QT5: n }
 *   4. task.rate_per_hour — flat number
 *   5. task.fixed_minutes — flat number, no modifier applied
 *
 * overlayMap is an optional { task_id: { rate_per_hour | fixed_minutes } }
 * object that gives Phase 1c.4 field-edit capability without mutating
 * module files. Field overrides always win over module-defined rates.
 *
 * Returns { effectiveRate, isFixed, fixedMinutes, uom, source } or null.
 */
function resolveTaskRate(task, ctx, coatNumber, overlayMap = null) {
  const uom = task.uom;

  // 0. Overlay override — short-circuits all other lookups
  if (overlayMap && overlayMap[task.task_id]) {
    const ov = overlayMap[task.task_id];
    if (ov.rate_per_hour != null && ov.rate_per_hour > 0) {
      return { effectiveRate: ov.rate_per_hour, isFixed: false, fixedMinutes: null, uom, source: 'overlay' };
    }
    if (ov.fixed_minutes != null && ov.fixed_minutes > 0) {
      return { effectiveRate: null, isFixed: true, fixedMinutes: ov.fixed_minutes, uom, source: 'overlay' };
    }
  }

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

  // 4. rate_per_hour (+ optional coat_2_rate_multiplier for coat-aware scaling)
  //    coat_2_rate_multiplier semantics: coat 2 rate = rate_per_hour × multiplier.
  //    multiplier > 1 means coat 2 is faster (e.g. 1.25 = 25% faster, less time).
  //    multiplier < 1 means coat 2 is slower. Default 1.0 (same rate as coat 1).
  if (task.rate_per_hour != null && task.rate_per_hour > 0) {
    let effective = task.rate_per_hour;
    if (coatNumber > 1 && typeof task.coat_2_rate_multiplier === 'number' && task.coat_2_rate_multiplier > 0) {
      effective = task.rate_per_hour * task.coat_2_rate_multiplier;
    }
    return { effectiveRate: effective, isFixed: false, fixedMinutes: null, uom, source: coatNumber > 1 && task.coat_2_rate_multiplier ? 'rate_per_hour+coat_2_rate_multiplier' : 'rate_per_hour' };
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

    // Scenario would have matched — but skip if author marked it broken.
    // This is a holding action for scenarios whose tasks point at dead ps_keys
    // or have other latent design defects. See Claude/docs/Future_Work/*_TODO.md
    // files for planned redesign per family.
    if (scenario.status === 'broken') {
      if (warnings) {
        warnings.push(`Scenario ${scenario.scenario_id} matches context but is marked status:"broken" — skipping. Reason: ${scenario.broken_reason || 'no reason given'}`);
      }
      continue;
    }

    // Deprecated scenarios: silently skip. Scenario was intentionally retired
    // (e.g., superseded by a pass-group-based equivalent). No user-visible
    // warning — caller's "no scenario matched" fallback fires only if NO
    // live scenario also matches.
    if (scenario.status === 'deprecated') {
      continue;
    }

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
 *
 * Chain dedup support (Phase 1c.1): when called from runScenarioChain with
 * chainState.dedupEnabled true, tasks tagged `chain_behavior: "once_per_chain"`
 * are skipped if their task_id is already in chainState.claimedTasks. Tasks
 * tagged `chain_behavior: "last_only"` are skipped unless chainState.isLastInChain
 * is true. The chain runner threads chainState across scenarios so setup and
 * teardown work fire only once across a prime+finish chain.
 */
export function runScenarioEstimate({ scenarioBundle, ctx, roomQty, roomItems = null, overlayMap = null, roomIndex = 0, roomLabel = 'Room 1', chainState = null }) {
  const warnings = [];
  const tasks = [];
  const phaseHours = {};
  let totalHours = 0;

  const scenario = findMatchingScenario(scenarioBundle, ctx, warnings);
  if (!scenario) {
    warnings.push(`No scenario matched ctx: quality_tier=${ctx.quality_tier} application_method=${ctx.application_method} paintable_item=${ctx.paintable_item} surface=${ctx.surface} state=${ctx.substrate_state}`);
    return { scenarioId: null, scenarioName: null, totalHours: 0, phaseHours: {}, tasks: [], warnings };
  }

  // Resolve scenario-declared dynamic modifiers (exterior access, substrate
  // type, coating system, texture profile, etc.) once per run — they apply to
  // every module in the scenario.
  const scenarioModifiers = resolveScenarioModifiers(scenario, ctx, warnings, scenarioBundle);

  // Walk the modules[] in order. Repeated module IDs = multi-coat semantics:
  // each apply-phase module invocation increments a PER-MODULE counter, so
  // the Nth time a given module appears in the scenario list, its tasks see
  // coatNumber = N. Non-apply modules (protect, prep, interstage, cleanup)
  // always run at coatNumber = 1.
  //
  // Dynamic coat expansion: if scenario.dynamic_coats maps a module_id to a
  // ctx field (e.g. "stain_coats"), that module is repeated ctx[field] times
  // at this point in the sequence. 0 = skipped. This lets one scenario serve
  // any per-coat user configuration without combinatorial scenario fanout.
  const dynamicCoats = scenario.dynamic_coats || {};
  const expandedModules = [];
  for (const moduleId of scenario.modules) {
    const ctxField = dynamicCoats[moduleId];
    if (ctxField) {
      const n = Number(ctx[ctxField]);
      const reps = Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
      for (let i = 0; i < reps; i++) expandedModules.push(moduleId);
    } else {
      expandedModules.push(moduleId);
    }
  }
  const moduleInvocations = {}; // module_id -> count so far

  for (const moduleId of expandedModules) {
    const mod = scenarioBundle.modules[moduleId];
    if (!mod) {
      warnings.push(`Scenario ${scenario.scenario_id} references unknown module ${moduleId}`);
      continue;
    }

    moduleInvocations[moduleId] = (moduleInvocations[moduleId] || 0) + 1;
    // Coat counter bumps for any module whose phase represents paint application:
    // apply (drywall/ceiling/trim/wall finish), finish (door/window finish coat).
    // Other phases (setup/prep/prime/interstage/cleanup) always run at coat 1.
    const coatNumber = (mod.phase === 'apply' || mod.phase === 'finish') ? moduleInvocations[moduleId] : 1;

    const modStack = computeScenarioModifierStack(mod, ctx, scenarioModifiers, scenarioBundle);

    const tasksLibrary = scenarioBundle.tasks || {};
    for (const taskEntry of mod.tasks) {
      const task = resolveTaskFromRef(taskEntry, tasksLibrary);
      if (!task) {
        warnings.push(`Module ${mod.module_id} references unknown task ${taskEntry.task_ref}`);
        continue;
      }
      // Per-task eligibility override: if this task overrides any eligibility,
      // rebuild the stack scoped to this task. Example: MOD_APPLY_WALL_PRIME_SPRAY_BACKROLL
      // has texture:true at the module level, but the spray task overrides with
      // texture:false because spray pattern is texture-insensitive.
      // Also trigger per-task stack when the canonical task has a
      // fac_qt_override map — the per-tier multiplier override needs the
      // task to be visible to computeScenarioModifierStack.
      const needsTaskStack = !!(task.modifier_eligibility || task.fac_qt_override);
      const taskStack = needsTaskStack
        ? computeScenarioModifierStack(mod, ctx, scenarioModifiers, scenarioBundle, task)
        : modStack;
      // Task-level applies_when (not variant-level; variant-level lives inside rates[])
      if (task.applies_when && !evaluateAppliesWhen(task.applies_when, ctx, coatNumber)) {
        continue;
      }

      // Chain dedup: skip once_per_chain tasks that have already fired earlier
      // in the chain, and skip last_only tasks when we're not the last scenario.
      if (chainState && chainState.dedupEnabled) {
        const cb = task.chain_behavior;
        if (cb === 'once_per_chain' && chainState.claimedTasks.has(task.task_id)) {
          continue;
        }
        if (cb === 'last_only' && !chainState.isLastInChain) {
          continue;
        }
      }

      const resolved = resolveTaskRate(task, ctx, coatNumber, overlayMap);
      if (!resolved) continue;

      const phase = mod.phase;
      const psKey = task.ps_key;

      // Per-item compute path: tasks tagged `per_item: "doors"` or "windows"
      // iterate the corresponding roomItems list and emit one task result
      // per item with the type/size modifier applied to the effective rate.
      // Matches legacy engine's computeDoorPerItemResults / computeWindowPerItemResults.
      if (task.per_item && roomItems && !resolved.isFixed) {
        const { effectiveTotal } = computeEffectiveTotal(taskStack, phase, ctx);
        const items = roomItems[task.per_item] || [];
        if (items.length === 0) continue;

        for (const item of items) {
          const cnt = item.count || 0;
          if (cnt <= 0) continue;

          let itemMod = 1.0;
          let label = '';
          let sizeMod = 1.0;
          let typeMod = 1.0;

          if (task.per_item === 'doors') {
            typeMod = DOOR_TYPE_MODIFIERS[item.door_type] || 1.0;
            itemMod = typeMod;
            label = DOOR_TYPE_LABELS[item.door_type] || item.door_type;
          } else if (task.per_item === 'windows') {
            sizeMod = WINDOW_SIZE_MODIFIERS[item.size_bucket] || 1.0;
            typeMod = WINDOW_TYPE_MODIFIERS[item.window_type] || 1.0;
            const muntinMod = item.has_muntins ? MUNTIN_MODIFIER : 1.0;
            itemMod = sizeMod * typeMod * muntinMod;
            const tLabel = WINDOW_TYPE_LABELS[item.window_type] || item.window_type;
            const sLabel = WINDOW_SIZE_LABELS[item.size_bucket] || item.size_bucket || '';
            label = `${tLabel} ${sLabel}`.trim();
          }

          // For door EA_SIDE tasks, multiply count by sides_per_door (default 2)
          const qty = (task.uom === 'EA_SIDE' && task.per_item === 'doors')
            ? cnt * (parseInt(item.sides_per_door) || 2)
            : cnt;

          const itemEffRate = resolved.effectiveRate / (effectiveTotal * itemMod);
          const itemHours = qty / itemEffRate;
          if (itemHours <= 0) continue;

          const roundedHours = Math.round(itemHours * 1000) / 1000;
          phaseHours[phase] = Math.round(((phaseHours[phase] || 0) + roundedHours) * 1000) / 1000;
          totalHours += roundedHours;

          tasks.push({
            taskId: task.task_id,
            taskName: displayTaskName(task, coatNumber),
            phase,
            moduleId: mod.module_id,
            moduleName: mod.name,
            roomIndex,
            roomLabel,
            psKey: psKey || '(per_item)',
            uom: resolved.uom,
            quantity: Math.round(qty * 100) / 100,
            baseRate: resolved.effectiveRate,
            modStack: { ...taskStack, itemMod, sizeMod, typeMod },
            hours: roundedHours,
            coatNumber,
            skillLevel: task.skill_level || 'general',
            crewSize: 1,
            isFixed: false,
            rateSource: resolved.source + '+per_item',
            itemGroup: label,
            itemLabel: label,
          });
        }
        continue; // per-item compute replaces the standard emit below
      }

      let hours = 0;
      let quantity = 0;

      if (resolved.isFixed) {
        // Fixed minutes: no quantity, no modifier (per doctrine — same as run-estimate.js line 378)
        hours = resolved.fixedMinutes / 60;
        quantity = 1;
      } else if (psKey && roomQty && roomQty.has(psKey)) {
        quantity = roomQty.get(psKey).value;
        if (quantity <= 0) continue;
        const { effectiveTotal } = computeEffectiveTotal(taskStack, phase, ctx);
        const effRate = resolved.effectiveRate / effectiveTotal;
        hours = quantity / effRate;
      } else {
        // No quantity available for this task's PS key — skip silently
        // (matches run-estimate.js behavior at line 419)
        continue;
      }

      if (hours <= 0) continue;

      // Claim the task_id in chain state if it's a once_per_chain task so
      // subsequent scenarios in the chain skip it.
      if (chainState && chainState.dedupEnabled && task.chain_behavior === 'once_per_chain') {
        chainState.claimedTasks.add(task.task_id);
      }

      const roundedHours = Math.round(hours * 1000) / 1000;
      phaseHours[phase] = Math.round(((phaseHours[phase] || 0) + roundedHours) * 1000) / 1000;
      totalHours += roundedHours;

      tasks.push({
        taskId: task.task_id,
        taskName: displayTaskName(task, coatNumber),
        phase,
        moduleId: mod.module_id,
        moduleName: mod.name,
        roomIndex,
        roomLabel,
        psKey: psKey || '(fixed)',
        uom: resolved.uom,
        quantity: Math.round(quantity * 100) / 100,
        baseRate: resolved.isFixed ? `${resolved.fixedMinutes}m` : resolved.effectiveRate,
        modStack: { ...taskStack },
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
 * Phase 1c.1: optional `dedupProtection` flag enables cross-scenario setup task
 * dedup. Tasks tagged `chain_behavior: "once_per_chain"` fire only the first
 * time their task_id appears in the chain. Default is false for backward
 * compatibility with phase0-diff.mjs parity tests.
 *
 * Inputs:
 *   scenarioBundle, ctx (initial), roomQty, roomIndex, roomLabel
 *   dedupProtection: boolean (default false) — enable setup task dedup
 *
 * Returns:
 *   {
 *     totalHours, phaseHours, scenarioResults, finalState, warnings,
 *     dedupSavings: hours saved by setup dedup (only when dedupProtection=true)
 *   }
 */
export function runScenarioChain({ scenarioBundle, ctx, roomQty, roomIndex = 0, roomLabel = 'Room 1', dedupProtection = false }) {
  const warnings = [];
  const scenarioResults = [];
  const mergedPhaseHours = {};
  let totalHours = 0;
  let currentCtx = { ...ctx };
  let finalState = currentCtx.substrate_state;

  // Chain state for dedup tracking (shared across all scenarios in the chain).
  const chainState = {
    dedupEnabled: dedupProtection,
    claimedTasks: new Set(),
    isLastInChain: false,  // we don't know yet; set when we know chain is done
  };

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
      chainState,
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
