import { createContext, useContext, useReducer, useState, useEffect, useRef, useCallback } from 'react';
import { specEditorReducer, createInitialSpecData, extractEditableTables } from '../state/spec-editor-reducer';
import { loadWorkingCopy, saveWorkingCopy, clearWorkingCopy, loadAndClearOverlays } from '../state/spec-editor-db';
import { DB_BUNDLE } from '../data/db-bundle';

const SpecDataContext = createContext(null);

export function SpecDataProvider({ children }) {
  const [specData, dispatch] = useReducer(specEditorReducer, null, () => JSON.parse(JSON.stringify(DB_BUNDLE)));
  const [dirty, setDirty] = useState(false);
  const initialized = useRef(false);
  const saveTimer = useRef(null);

  // Load working copy + migrate overlays on mount
  useEffect(() => {
    (async () => {
      try {
        const [workingCopy, overlays] = await Promise.all([
          loadWorkingCopy(),
          loadAndClearOverlays(),
        ]);
        if (workingCopy || (overlays && overlays.length > 0)) {
          const initial = createInitialSpecData(workingCopy, overlays);
          dispatch({ type: '_LOAD', payload: initial });
          setDirty(!!workingCopy);
        }
        initialized.current = true;
      } catch (e) {
        console.error('[SpecEditor] Failed to load working copy:', e);
        initialized.current = true;
      }
    })();
  }, []);

  // Debounced auto-save to IndexedDB
  useEffect(() => {
    if (!initialized.current) return;
    setDirty(true);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const delta = extractEditableTables(specData);
      if (delta) {
        saveWorkingCopy(delta).catch(e =>
          console.error('[SpecEditor] Auto-save failed:', e)
        );
      } else {
        // No changes from DB_BUNDLE — clear the working copy
        clearWorkingCopy().catch(() => {});
        setDirty(false);
      }
    }, 500);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [specData]);

  const resetAll = useCallback(async () => {
    await clearWorkingCopy();
    dispatch({ type: 'RESET_ALL' });
    setDirty(false);
  }, []);

  const resetSpec = useCallback((specId) => {
    dispatch({ type: 'RESET_SPEC', payload: { specId } });
  }, []);

  const exportBundle = useCallback(() => {
    const json = JSON.stringify(specData, null, 2);
    const blob = new Blob([`export const DB_BUNDLE = ${json};`], { type: 'text/javascript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'db-bundle.js';
    a.click();
    URL.revokeObjectURL(url);
  }, [specData]);

  return (
    <SpecDataContext.Provider value={{ specData, dispatch, dirty, resetAll, resetSpec, exportBundle }}>
      {children}
    </SpecDataContext.Provider>
  );
}

export function useSpecData() {
  const ctx = useContext(SpecDataContext);
  if (!ctx) throw new Error('useSpecData must be used within SpecDataProvider');
  return ctx;
}
