// Helper: shape manual material override entries (state.project.material_overrides.manual)
// into materialEstimate records the rest of the engine + UI already understand.
// Consumed by useEstimate + useEstimateScenario before computePricing so manual
// entries flow into the bid as well as the Materials views.

/**
 * @param {Array} manualEntries — state.project.material_overrides.manual array
 * @param {Array} products      — catalog from useProducts()
 * @returns {Array} materialEstimate-shaped records
 */
export function buildManualMaterialEstimates(manualEntries, products) {
  if (!Array.isArray(manualEntries) || manualEntries.length === 0) return [];
  const productsById = new Map((products || []).map(p => [p.id, p]));

  return manualEntries.map(m => {
    const p = productsById.get(m.product_id);
    const gallons = Number(m.gallons) || 0;
    const unitCost = p?.unit_cost || 0;
    const totalCost = Math.round(gallons * unitCost * 100) / 100;
    return {
      // materialEstimate keys consumed by pricing.js + EstimateView's consolidatedMaterials
      specFamilyId: `MANUAL::${m.id}`,
      systemId: null,
      systemName: p ? `Manual: ${p.product_type || 'product'}` : 'Manual entry',
      productId: m.product_id,
      productName: p?.product_name || `(deleted product: ${m.product_id})`,
      brand: p?.brand || null,
      resolvedBy: 'manual',
      productRole: 'manual',
      surfaceTexture: '',
      totalSF: 0,
      coverageRate: p?.coverage_sf_per_gal || null,
      coats: 1,
      gallonsRaw: gallons,
      gallons,
      pricePerGallon: unitCost || null,
      totalCost: totalCost || null,
      sprayLoss: 0,
      psKey: null,
      _manual: true,
    };
  });
}
