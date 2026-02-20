import { SPEC_SUBSTRATE_MAP } from '../data/spec-maps.js';
import { SUBSTRATE_APPLICATION_METHODS } from '../data/substrate-catalog.js';

/**
 * Compute modifier stack for a spec family + room context.
 * Returns { qt, height, texture, complexity, total }
 */
export function computeModifierStack(specFamilyId, ctx, db, warnings) {
  // Per doctrine: all modifier values must come from the data layer.
  // If a modifier is missing, warn and use 1.0 (neutral) — never silently fallback.

  // 1. QT modifier — from quality_tier_effects table
  let qtMod = 1.0;
  const qteRow = db.quality_tier_effects.find(
    r => r.spec_family_id === specFamilyId && r.quality_tier === ctx.quality_tier
  );
  if (qteRow && qteRow.time_modifier != null) {
    qtMod = qteRow.time_modifier;
  } else if (ctx.quality_tier && ctx.quality_tier !== 'QT3') {
    warnings.push(`QT modifier for ${ctx.quality_tier} not found in DB for ${specFamilyId}. Using 1.0 (neutral).`);
  }

  // 2. Height modifier — from factor_modifiers
  let heightMod = 1.0;
  const heightFactors = db.factor_modifiers.filter(
    f => f.spec_family_id === specFamilyId && f.modifier_category === 'height'
  );
  if (heightFactors.length > 0) {
    // Try to find matching height band in condition JSON
    for (const hf of heightFactors) {
      if (hf.condition && typeof hf.condition === 'object') {
        const bandKey = ctx.height_band ? ctx.height_band.toLowerCase() : 'standard';
        for (const [k, v] of Object.entries(hf.condition)) {
          const kLower = k.toLowerCase();
          if (kLower.includes(bandKey) || kLower === bandKey ||
              (bandKey === 'std' && kLower.includes('standard'))) {
            if (typeof v === 'object' && v.value != null) heightMod = v.value;
            else if (typeof v === 'number') heightMod = v;
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
          heightMod = modValue;
        }
      }
    }
    if (heightMod === 1.0 && ctx.height_band && ctx.height_band !== 'STD') {
      warnings.push(`Height modifier for band ${ctx.height_band} not resolved from DB for ${specFamilyId}. Using 1.0 (neutral).`);
    }
  } else if (ctx.height_band && ctx.height_band !== 'STD') {
    warnings.push(`No height modifiers in DB for ${specFamilyId}. Using 1.0 (neutral).`);
  }

  // 3. Texture modifier — from factor_modifiers
  let textureMod = 1.0;
  const texFactors = db.factor_modifiers.filter(
    f => f.spec_family_id === specFamilyId && f.modifier_category === 'texture'
  );
  if (texFactors.length > 0) {
    for (const tf of texFactors) {
      if (tf.condition && typeof tf.condition === 'object') {
        const texKey = ctx.surface_texture || 'smooth';
        for (const [k, v] of Object.entries(tf.condition)) {
          if (k === texKey || k.toLowerCase() === texKey.toLowerCase()) {
            if (typeof v === 'object' && v.value != null) textureMod = v.value;
            else if (typeof v === 'number') textureMod = v;
          }
        }
      }
    }
  }
  if (textureMod === 1.0 && ctx.surface_texture && ctx.surface_texture !== 'smooth') {
    warnings.push(`Texture modifier for ${ctx.surface_texture} not found in DB for ${specFamilyId}. Using 1.0 (neutral).`);
  }

  // 4. Complexity modifier — no DB rows exist yet; warn if non-standard
  let complexityMod = 1.0;
  if (ctx.complexity && ctx.complexity !== 'STD') {
    warnings.push(`Complexity modifier for ${ctx.complexity} not available in DB for ${specFamilyId}. Using 1.0 (neutral).`);
  }

  const total = qtMod * heightMod * textureMod * complexityMod;

  return { qt: qtMod, height: heightMod, texture: textureMod, complexity: complexityMod, total: Math.round(total * 1000) / 1000 };
}
