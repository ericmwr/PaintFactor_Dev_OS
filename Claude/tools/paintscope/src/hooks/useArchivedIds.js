// Hook that returns a Set<string> of IDs currently archived for a given
// kind. Used by the active TaskList / ModuleList / ScenarioList to filter
// out entries whose underlying file has moved to Claude/{kind}/archive/.
//
// Without this, archived items continue to appear in the active list
// until `node Claude/scripts/build-scenario-bundle.mjs` is run — because
// `canonicalBundle` is a build-time-frozen import that doesn't reflect
// runtime file moves.
//
// `refresh` returns a Promise so callers can `await` it after triggering
// an archive action and have the list re-render before the alert dialog.

import { useCallback, useEffect, useState } from 'react';
import { listArchive } from '../authoring/archive-ops.js';

export function useArchivedIds(kind) {
  const [ids, setIds] = useState(() => new Set());

  const refresh = useCallback(async () => {
    try {
      const entries = await listArchive(kind);
      setIds(new Set(entries.map(e => e.id)));
    } catch (e) {
      // Endpoint may be unavailable in production builds; log + treat as empty.
      console.warn(`[useArchivedIds:${kind}] refresh failed:`, e.message);
      setIds(new Set());
    }
  }, [kind]);

  useEffect(() => { refresh(); }, [refresh]);

  return { ids, refresh };
}
