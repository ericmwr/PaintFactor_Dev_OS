// Task authoring drafts hook. Mirrors useModuleDrafts.js shape.
// Canonical tasks live in Claude/tasks/TSK_*.json and ship in the bundle;
// drafts are user-edited overrides stored in IndexedDB. The scenario
// engine overlays active task drafts over the canonical bundle at
// estimate time (via overlay-loader.js, same as modules/scenarios).

import { useState, useEffect, useCallback } from 'react';
import {
  listTaskDrafts,
  saveTaskDraft,
  deleteTaskDraft,
  loadTaskDraft,
} from '../data/authoring-db.js';

export function useTaskDrafts() {
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const all = await listTaskDrafts();
    all.sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || ''));
    setDrafts(all);
  }, []);

  useEffect(() => {
    refresh().then(() => setLoading(false));
  }, [refresh]);

  const save = useCallback(async (draft) => {
    const saved = await saveTaskDraft(draft);
    await refresh();
    return saved;
  }, [refresh]);

  const load = useCallback(async (id) => loadTaskDraft(id), []);

  const remove = useCallback(async (id) => {
    await deleteTaskDraft(id);
    await refresh();
  }, [refresh]);

  return { drafts, loading, save, load, remove, refresh };
}
