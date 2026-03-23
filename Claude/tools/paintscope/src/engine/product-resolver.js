import { SYSTEM_INDEX } from '../data/product-catalog.js';
import { getProductTier } from '../data/brand-tier-map.js';

/**
 * Resolve a material system ID to a specific catalog product.
 *
 * @param {string} systemId - e.g. 'SYS_WALL_EGGSHELL'
 * @param {Object} ctx - { quality_tier, brand_preference, sheen }
 * @param {Object} overrides - { system: {sysId: productId}, manual: {} }
 * @returns {Object|null} resolved product with all catalog fields + resolved_by
 */
export function resolveProduct(systemId, ctx, overrides = {}) {
  // 1. Get all catalog products for this system
  const candidates = SYSTEM_INDEX.get(systemId);
  if (!candidates || candidates.length === 0) return null;

  // 2. Check manual override (Level 3)
  if (overrides.manual && overrides.manual[systemId]) {
    const pinned = candidates.find(p => p.product_id === overrides.manual[systemId]);
    if (pinned) return { ...pinned, resolved_by: 'manual_override' };
  }

  // 3. Check system override (Level 2)
  if (overrides.system && overrides.system[systemId]) {
    const pinned = candidates.find(p => p.product_id === overrides.system[systemId]);
    if (pinned) return { ...pinned, resolved_by: 'system_override' };
  }

  const qt = ctx.quality_tier || 'QT3';
  const brandPref = ctx.brand_preference || null;

  // 4. Score each candidate
  const scored = candidates.map(p => {
    let score = 0;

    // Brand preference match (+10)
    if (brandPref && p.brand === brandPref) score += 10;

    // QT tier match via brand-tier map (+5 exact, +2 adjacent)
    const tierRange = getProductTier(p.brand, p.product_line);
    if (tierRange) {
      if (tierRange.includes(qt)) score += 5;
      else {
        // Adjacent tier fallback: QT5→QT4, QT4→QT3, QT2→QT3
        const adjacent = qt === 'QT5' ? 'QT4' : qt === 'QT2' ? 'QT3' : null;
        if (adjacent && tierRange.includes(adjacent)) score += 2;
      }
    }

    // Has coverage data (+1, penalize null -5)
    if (p.coverage_sf_per_gallon) score += 1;
    else score -= 5;

    // Has price (+1)
    if (p.price_per_gallon) score += 1;

    return { product: p, score };
  });

  // 5. Sort by score descending, pick best
  scored.sort((a, b) => b.score - a.score);
  const best = scored[0];

  const resolved_by = [];
  if (brandPref && best.product.brand === brandPref) resolved_by.push('brand_preference');
  const tierRange = getProductTier(best.product.brand, best.product.product_line);
  if (tierRange && tierRange.includes(qt)) resolved_by.push('tier_match');
  if (resolved_by.length === 0) resolved_by.push('best_available');

  return { ...best.product, resolved_by: resolved_by.join(' + ') };
}

/**
 * Resolve all material systems for a spec, given project context.
 * Returns Map<systemId, resolvedProduct>
 */
export function resolveSpecMaterials(systemIds, ctx, overrides = {}) {
  const results = new Map();
  systemIds.forEach(sysId => {
    const product = resolveProduct(sysId, ctx, overrides);
    if (product) results.set(sysId, product);
  });
  return results;
}
