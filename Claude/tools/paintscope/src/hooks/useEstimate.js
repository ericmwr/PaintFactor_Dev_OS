import { useMemo } from 'react';
import { useProject } from './useProject';
import { useSpecData } from './useSpecData';
import { useCompanyProfile } from './useCompanyProfile';
import { useProducts } from './useProducts';
import { runEstimate } from '../engine/run-estimate';
import { computePricing } from '../engine/pricing.js';
import { buildManualMaterialEstimates } from '../engine/manual-materials.js';

export function useEstimate() {
  const { state } = useProject();
  const { specData } = useSpecData();
  const { profile } = useCompanyProfile();
  const { products } = useProducts();
  return useMemo(() => {
    try {
      const result = runEstimate(state, specData, undefined, profile);
      if (!result) return result;
      // Augment materialEstimates with manual entries from state.project.material_overrides.manual,
      // then recompute pricing so the bid reflects manual material costs.
      const manualEntries = state.project?.material_overrides?.manual || [];
      const manuals = buildManualMaterialEstimates(manualEntries, products);
      if (manuals.length === 0) return result;
      const augmentedMaterials = [...(result.materialEstimates || []), ...manuals];
      const augmentedPricing = profile
        ? computePricing(profile, result.specResults || [], augmentedMaterials)
        : result.pricing;
      return { ...result, materialEstimates: augmentedMaterials, pricing: augmentedPricing };
    } catch (e) {
      console.error('[PaintScope] Estimate error:', e);
      return null;
    }
  }, [state, specData, profile, products]);
}
