// useTrackerSnapshot — React hook wrapping tracker-db.js. Loads the
// current (newest) snapshot for the given projectId. Mirrors the shape
// of useTaskDrafts / useModuleDrafts.

import { useState, useEffect, useCallback } from 'react';
import {
  loadCurrentTrackerSnapshot,
  saveTrackerSnapshot,
} from '../data/tracker-db.js';

export function useTrackerSnapshot(projectId) {
  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!projectId) {
      setSnapshot(null);
      setLoading(false);
      return;
    }
    const snap = await loadCurrentTrackerSnapshot(projectId);
    setSnapshot(snap);
  }, [projectId]);

  useEffect(() => {
    setLoading(true);
    refresh().then(() => setLoading(false));
  }, [refresh]);

  const save = useCallback(async (snap) => {
    const saved = await saveTrackerSnapshot(snap);
    await refresh();
    return saved;
  }, [refresh]);

  return { snapshot, loading, save, refresh };
}
