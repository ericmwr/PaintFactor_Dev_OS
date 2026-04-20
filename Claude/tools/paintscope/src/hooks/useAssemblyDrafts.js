// Assembly authoring drafts hook. Mirrors useScenarioDrafts.js.

import { useState, useEffect, useCallback } from 'react';
import {
  listAssemblyDrafts,
  saveAssemblyDraft,
  deleteAssemblyDraft,
  loadAssemblyDraft,
} from '../data/authoring-db.js';

export function useAssemblyDrafts() {
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const all = await listAssemblyDrafts();
    all.sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || ''));
    setDrafts(all);
  }, []);

  useEffect(() => {
    refresh().then(() => setLoading(false));
  }, [refresh]);

  const save = useCallback(async (draft) => {
    const saved = await saveAssemblyDraft(draft);
    await refresh();
    return saved;
  }, [refresh]);

  const load = useCallback(async (id) => loadAssemblyDraft(id), []);

  const remove = useCallback(async (id) => {
    await deleteAssemblyDraft(id);
    await refresh();
  }, [refresh]);

  return { drafts, loading, save, load, remove, refresh };
}
