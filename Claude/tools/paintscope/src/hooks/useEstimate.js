import { useMemo } from 'react';
import { useProject } from './useProject';
import { useSpecData } from './useSpecData';
import { useCompanyProfile } from './useCompanyProfile';
import { runEstimate } from '../engine/run-estimate';

export function useEstimate() {
  const { state } = useProject();
  const { specData } = useSpecData();
  const { profile } = useCompanyProfile();
  return useMemo(() => {
    try {
      return runEstimate(state, specData, undefined, profile);
    } catch (e) {
      console.error('[PaintScope] Estimate error:', e);
      return null;
    }
  }, [state, specData, profile]);
}
