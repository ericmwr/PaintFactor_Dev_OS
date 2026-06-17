// Scenario authoring drafts hook. Mirrors useModuleDrafts.js.

import { useState, useEffect, useCallback } from 'react';
import {
  listScenarioDrafts,
  saveScenarioDraft,
  deleteScenarioDraft,
  loadScenarioDraft,
} from '../data/authoring-db.js';

export function useScenarioDrafts() {
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const all = await listScenarioDrafts();
    all.sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || ''));
    setDrafts(all);
  }, []);

  useEffect(() => {
    refresh().then(() => setLoading(false));
  }, [refresh]);

  const save = useCallback(async (draft) => {
    const saved = await saveScenarioDraft(draft);
    await refresh();
    return saved;
  }, [refresh]);

  const load = useCallback(async (id) => loadScenarioDraft(id), []);

  const remove = useCallback(async (id) => {
    await deleteScenarioDraft(id);
    await refresh();
  }, [refresh]);

  return { drafts, loading, save, load, remove, refresh };
}
