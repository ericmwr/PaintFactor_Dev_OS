import { useState, useEffect, useCallback } from 'react';
import { listTimeEntries, saveTimeEntry, deleteTimeEntry } from '../data/timeentry-db';

export function useTimeEntries(projectId) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const all = await listTimeEntries(projectId);
    setEntries(all);
  }, [projectId]);

  useEffect(() => {
    refresh().then(() => setLoading(false));
  }, [refresh]);

  const save = useCallback(async (entry) => {
    entry.project_id = projectId;
    const saved = await saveTimeEntry(entry);
    await refresh();
    return saved;
  }, [projectId, refresh]);

  const remove = useCallback(async (id) => {
    await deleteTimeEntry(id);
    await refresh();
  }, [refresh]);

  return { entries, loading, save, remove, refresh };
}
