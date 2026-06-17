// Modifier draft hook. Mirrors useModuleDrafts.js.

import { useState, useEffect, useCallback } from 'react';
import {
  listModifierDrafts,
  saveModifierDraft,
  deleteModifierDraft,
  loadModifierDraft,
} from '../data/authoring-db.js';

export function useModifierDrafts() {
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const all = await listModifierDrafts();
    all.sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || ''));
    setDrafts(all);
  }, []);

  useEffect(() => {
    refresh().then(() => setLoading(false));
  }, [refresh]);

  const save = useCallback(async (draft) => {
    const saved = await saveModifierDraft(draft);
    await refresh();
    return saved;
  }, [refresh]);

  const load = useCallback(async (id) => loadModifierDraft(id), []);

  const remove = useCallback(async (id) => {
    await deleteModifierDraft(id);
    await refresh();
  }, [refresh]);

  return { drafts, loading, save, load, remove, refresh };
}
