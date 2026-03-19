import { useState, useEffect, useCallback } from 'react';
import { listOverlays, saveOverlay, deleteOverlay, buildOverlayMap } from '../data/overlay-db';

export function useRateOverlays() {
  const [overlays, setOverlays] = useState([]);
  const [overlayMap, setOverlayMap] = useState({});
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const all = await listOverlays();
    setOverlays(all);
    const map = await buildOverlayMap();
    setOverlayMap(map);
  }, []);

  useEffect(() => {
    refresh().then(() => setLoading(false));
  }, [refresh]);

  const setOverride = useCallback(async (specFamilyId, taskId, fieldName, baseValue, overrideValue, notes) => {
    // Find existing overlay for this spec+task
    const existing = overlays.find(o => o.spec_family_id === specFamilyId && o.task_id === taskId && o.field_name === fieldName);
    if (existing) {
      existing.override_value = overrideValue;
      existing.notes = notes || existing.notes;
      await saveOverlay(existing);
    } else {
      await saveOverlay({
        spec_family_id: specFamilyId,
        task_id: taskId,
        overlay_type: 'rate',
        field_name: fieldName,
        base_value: baseValue,
        override_value: overrideValue,
        notes: notes || '',
      });
    }
    await refresh();
  }, [overlays, refresh]);

  const resetOverride = useCallback(async (specFamilyId, taskId, fieldName) => {
    const existing = overlays.find(o => o.spec_family_id === specFamilyId && o.task_id === taskId && o.field_name === fieldName);
    if (existing) {
      await deleteOverlay(existing.id);
      await refresh();
    }
  }, [overlays, refresh]);

  return { overlays, overlayMap, loading, setOverride, resetOverride, refresh };
}
