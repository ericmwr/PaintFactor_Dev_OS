// Module authoring drafts hook. Mirrors useAssemblies.js shape.
// Drafts are stored in IndexedDB via authoring-db.js. The scenario
// engine overlays active drafts on the canonical bundle at estimate
// time (see overlay-loader.js).

import { useState, useEffect, useCallback } from 'react';
import {
  listModuleDrafts,
  saveModuleDraft,
  deleteModuleDraft,
  loadModuleDraft,
} from '../data/authoring-db.js';

export function useModuleDrafts() {
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const all = await listModuleDrafts();
    all.sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || ''));
    setDrafts(all);
  }, []);

  useEffect(() => {
    refresh().then(() => setLoading(false));
  }, [refresh]);

  const save = useCallback(async (draft) => {
    const saved = await saveModuleDraft(draft);
    await refresh();
    return saved;
  }, [refresh]);

  const load = useCallback(async (id) => loadModuleDraft(id), []);

  const remove = useCallback(async (id) => {
    await deleteModuleDraft(id);
    await refresh();
  }, [refresh]);

  return { drafts, loading, save, load, remove, refresh };
}
