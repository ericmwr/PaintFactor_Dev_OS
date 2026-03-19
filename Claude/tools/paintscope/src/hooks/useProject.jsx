import { createContext, useContext, useReducer, useEffect, useCallback, useRef } from 'react';
import { reducer } from '../state/reducer';
import { initialState } from '../state/initial-state';
import { loadFromStorage, saveToStorage } from '../state/persistence';
import { loadProject, saveProject as saveProjectDB } from '../data/project-db';

const ProjectContext = createContext(null);

export function ProjectProvider({ children, initialData, projectId }) {
  const initFn = (init) => {
    // If initialData is provided (loaded from IndexedDB), use it
    if (initialData && initialData.project && initialData.rooms) {
      return { ...init, ...initialData, ui: initialData.ui || init.ui };
    }
    // Otherwise fall back to localStorage
    return loadFromStorage(init);
  };

  const [state, dispatch] = useReducer(reducer, initialState, initFn);
  const saveTimerRef = useRef(null);

  // Auto-save to localStorage (legacy compat)
  useEffect(() => {
    saveToStorage(state);
  }, [state]);

  // Auto-save to IndexedDB if we have a projectId
  useEffect(() => {
    if (!projectId) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      try {
        const proj = await loadProject(projectId);
        if (!proj) return;
        proj.project_data = {
          project: state.project,
          rooms: state.rooms,
          exterior: state.exterior,
          colors: state.colors,
          ui: state.ui,
        };
        proj.name = state.project.name || proj.name;
        await saveProjectDB(proj);
      } catch (e) {
        console.error('[PaintFactor] IDB auto-save error:', e);
      }
    }, 1000);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [state, projectId]);

  // Set initial active room
  useEffect(() => {
    if (!state.ui.activeRoomId && state.rooms.length > 0) {
      dispatch({ type: 'SET_ACTIVE_ROOM', payload: state.rooms[0].id });
    }
  }, []);

  // Immediate save handler for Ctrl+S
  const saveNow = useCallback(async () => {
    saveToStorage(state);
    if (projectId) {
      try {
        const proj = await loadProject(projectId);
        if (proj) {
          proj.project_data = { project: state.project, rooms: state.rooms, exterior: state.exterior, colors: state.colors, ui: state.ui };
          proj.name = state.project.name || proj.name;
          await saveProjectDB(proj);
        }
      } catch (e) {
        console.error('[PaintFactor] Manual save error:', e);
      }
    }
  }, [state, projectId]);

  return (
    <ProjectContext.Provider value={{ state, dispatch, saveNow, projectId }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error('useProject must be used within a ProjectProvider');
  return ctx;
}
