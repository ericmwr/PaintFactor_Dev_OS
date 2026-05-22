import { SPEC_SUBSTRATE_MAP } from '../data/spec-maps.js';
import { SUBSTRATE_APPLICATION_METHODS } from '../data/substrate-catalog.js';

// Specs where room complexity does NOT apply — door/frame type and QT already cover variation
const COMPLEXITY_OPT_OUT_SPECS = new Set([
  'SF_DOOR_SLAB_INT_NC',
  'SF_DOOR_FRAME_NC_FINISH',
]);

// Default complexity modifier values — used when no DB rows exist for an interior spec
const COMPLEXITY_DEFAULTS = {
  OPEN: 0.85,
  STD: 1.0,
  MOD: 1.2,
  COMPLEX: 1.2,   // legacy — maps to MOD for unmigrated data
  VCOMPLEX: 1.5,
};

/**
 * Compute modifier stack for a spec family + context.
 * Returns { qt, height, texture, complexity, ...dynamicCategories, total }
 *
 * For interior specs: returns the 4 legacy categories (qt, height, texture, complexity).
 * For exterior specs: dynamically iterates ALL modifier_category values found in
 * db.factor_modifiers for this spec, resolving each from ctx[category_name].
 * This is backward-compatible: interior specs only have qt/height/texture/complexity
 * in their factor_modifiers, so they get the same 4 fields.
 */
export function computeModifierStack(specFamilyId, ctx, db, warnings) {
  const result = {};
  let total = 1.0;

  // 1. QT modifier — always from quality_tier_effects table
  let qtMod = 1.0;
  const qteRow = db.quality_tier_effects.find(
    r => r.spec_family_id === specFamilyId && r.quality_tier === ctx.quality_tier
  );
  if (qteRow && qteRow.time_modifier != null) {
    qtMod = qteRow.time_modifier;
  } else if (ctx.quality_tier && ctx.quality_tier !== 'QT3') {
    warnings.push(`QT modifier for ${ctx.quality_tier} not found in DB for ${specFamilyId}. Using 1.0 (neutral).`);
  }
  result.qt = qtMod;
  total *= qtMod;

  // 2. Dynamic modifier categories from factor_modifiers table
  // Collect all unique categories for this spec
  const specFactors = db.factor_modifiers.filter(f => f.spec_family_id === specFamilyId);
  const categories = [...new Set(specFactors.map(f => f.modifier_category).filter(Boolean))];

  categories.forEach(category => {
    const factors = specFactors.filter(f => f.modifier_category === category);
    let mod = 1.0;

    if (category === 'height') {
      mod = resolveHeightModifier(factors, ctx, specFamilyId, warnings);
    } else if (category === 'texture') {
      mod = resolveConditionModifier(factors, ctx.surface_texture || 'smooth', category, specFamilyId, warnings);
    } else if (category === 'complexity') {
      // Interior specs: room complexity — resolve but DON'T fold into total
      // Applied per-task in run-estimate based on phase + method
      const cMod = resolveConditionModifier(factors, ctx.complexity || 'STD', category, specFamilyId, warnings);
      result.complexity = cMod;
      result.complexityApplicable = !COMPLEXITY_OPT_OUT_SPECS.has(specFamilyId);
      return; // skip the result[category] = mod; total *= mod; below
    } else {
      // Dynamic exterior categories: access, wind, sun, profile, siding_profile, coating_type, etc.
      // First try values_map (new exterior pattern), then condition (interior pattern), then direct match
      mod = resolveDynamicModifier(factors, ctx, category, specFamilyId, warnings);
    }

    result[category] = mod;
    total *= mod;
  });

  // Ensure legacy fields exist even if no factors found
  if (result.height === undefined) result.height = 1.0;
  if (result.texture === undefined) result.texture = 1.0;
  if (result.complexity === undefined) {
    if (COMPLEXITY_OPT_OUT_SPECS.has(specFamilyId)) {
      result.complexity = 1.0;
      result.complexityApplicable = false;
    } else {
      // Use defaults map for specs without DB complexity rows
      const cxVal = (ctx.complexity || 'STD').toUpperCase();
      result.complexity = COMPLEXITY_DEFAULTS[cxVal] ?? 1.0;
      result.complexityApplicable = true;
    }
  }
  // Ensure complexityApplicable is always set
  if (result.complexityApplicable === undefined) {
    result.complexityApplicable = !COMPLEXITY_OPT_OUT_SPECS.has(specFamilyId);
  }

  result.total = Math.round(total * 1000) / 1000;
  return result;
}

/**
 * Resolve height modifier from factor rows — handles both interior (H-prefix ID match)
 * and exterior (values_map with access band keys) patterns.
 */
function resolveHeightModifier(factors, ctx, specFamilyId, warnings) {
  let mod = 1.0;

  for (const hf of factors) {
    // Try values_map first (exterior pattern: { "ground": 1.0, "ladder": 1.35, ... })
    if (hf.values_map && typeof hf.values_map === 'object') {
      const band = (ctx.height_band || ctx.access_type || 'ground').toLowerCase();
      for (const [k, v] of Object.entries(hf.values_map)) {
        if (k.toLowerCase() === band) {
          mod = typeof v === 'number' ? v : 1.0;
          return mod;
        }
      }
    }

    // Try condition JSON (interior pattern)
    if (hf.condition && typeof hf.condition === 'object') {
      const bandKey = ctx.height_band ? ctx.height_band.toLowerCase() : 'standard';
      for (const [k, v] of Object.entries(hf.condition)) {
        const kLower = k.toLowerCase();
        if (kLower.includes(bandKey) || kLower === bandKey ||
            (bandKey === 'std' && kLower.includes('standard'))) {
          if (typeof v === 'object' && v.value != null) mod = v.value;
          else if (typeof v === 'number') mod = v;
        }
      }
    }

    // Direct ID match via H-prefix (H1=STD, H2=STEP, H3=EXT, H4=SCAFFOLD)
    const modValue = hf.time_modifier != null ? hf.time_modifier : hf.value;
    if (hf.id && modValue != null) {
      const idLower = hf.id.toLowerCase();
      const band = (ctx.height_band || 'STD').toLowerCase();
      if ((band === 'std' && (idLower.startsWith('h1') || idLower.includes('standard'))) ||
          (band === 'step' && (idLower.startsWith('h2') || idLower.includes('tall'))) ||
          (band === 'ext' && (idLower.startsWith('h3') || idLower.includes('high'))) ||
          (band === 'scaffold' && (idLower.startsWith('h4') || idLower.includes('scaffold'))) ||
          (band === 'lift' && (idLower.startsWith('h5') || idLower.includes('lift')))) {
        mod = modValue;
      }
    }
  }

  if (mod === 1.0 && ctx.height_band && ctx.height_band !== 'STD' && ctx.height_band !== 'GROUND') {
    warnings.push(`Height modifier for band ${ctx.height_band} not resolved from DB for ${specFamilyId}. Using 1.0 (neutral).`);
  }

  return mod;
}

/**
 * Resolve a condition-based modifier (texture, complexity) from factor rows.
 */
function resolveConditionModifier(factors, contextValue, category, specFamilyId, warnings) {
  let mod = 1.0;

  for (const tf of factors) {
    // values_map pattern (exterior)
    if (tf.values_map && typeof tf.values_map === 'object') {
      const val = contextValue.toLowerCase();
      for (const [k, v] of Object.entries(tf.values_map)) {
        if (k.toLowerCase() === val) {
          return typeof v === 'number' ? v : 1.0;
        }
      }
    }

    // condition JSON pattern (interior)
    if (tf.condition && typeof tf.condition === 'object') {
      for (const [k, v] of Object.entries(tf.condition)) {
        if (k === contextValue || k.toLowerCase() === contextValue.toLowerCase()) {
          if (typeof v === 'object' && v.value != null) mod = v.value;
          else if (typeof v === 'number') mod = v;
        }
      }
    }
  }

  return mod;
}

/**
 * Resolve a dynamic modifier category (exterior: access, wind, sun, profile, etc.)
 * Tries values_map, then condition, then time_modifier with value matching.
 */
function resolveDynamicModifier(factors, ctx, category, specFamilyId, warnings) {
  // Map category name to context key
  const contextValue = ctx[category] || ctx[category + '_type'] || null;
  if (!contextValue) return 1.0;

  for (const f of factors) {
    // values_map: { "ground": 1.0, "ladder": 1.35, ... }
    if (f.values_map && typeof f.values_map === 'object') {
      const val = String(contextValue).toLowerCase();
      for (const [k, v] of Object.entries(f.values_map)) {
        if (k.toLowerCase() === val) {
          return typeof v === 'number' ? v : 1.0;
        }
      }
    }

    // condition JSON
    if (f.condition && typeof f.condition === 'object') {
      const val = String(contextValue).toLowerCase();
      for (const [k, v] of Object.entries(f.condition)) {
        if (k.toLowerCase() === val) {
          if (typeof v === 'object' && v.value != null) return v.value;
          if (typeof v === 'number') return v;
        }
      }
    }

    // Direct value match: f.value matches ctx value, use f.time_modifier
    if (f.value && f.time_modifier != null) {
      if (String(f.value).toLowerCase() === String(contextValue).toLowerCase()) {
        return f.time_modifier;
      }
    }
  }

  return 1.0;
}

export { COMPLEXITY_OPT_OUT_SPECS };
