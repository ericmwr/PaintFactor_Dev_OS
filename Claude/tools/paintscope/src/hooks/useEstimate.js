import { useMemo } from 'react';
import { useProject } from './useProject';
import { useSpecData } from './useSpecData';
import { runEstimate } from '../engine/run-estimate';

export function useEstimate() {
  const { state } = useProject();
  const { specData } = useSpecData();
  return useMemo(() => {
    try {
      return runEstimate(state, specData);
    } catch (e) {
      console.error('[PaintScope] Estimate error:', e);
      return null;
    }
  }, [state, specData]);
}
