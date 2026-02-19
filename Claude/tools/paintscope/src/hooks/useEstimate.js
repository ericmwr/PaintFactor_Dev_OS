import { useMemo } from 'react';
import { useProject } from './useProject';
import { runEstimate } from '../engine/run-estimate';
import { DB_BUNDLE } from '../data/db-bundle';

export function useEstimate() {
  const { state } = useProject();
  return useMemo(() => {
    try {
      return runEstimate(state, DB_BUNDLE);
    } catch (e) {
      console.error('[PaintScope] Estimate error:', e);
      return null;
    }
  }, [state]);
}
