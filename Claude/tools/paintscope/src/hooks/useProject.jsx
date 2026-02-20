import { createContext, useContext, useReducer, useEffect } from 'react';
import { reducer } from '../state/reducer';
import { initialState } from '../state/initial-state';
import { loadFromStorage, saveToStorage } from '../state/persistence';

const ProjectContext = createContext(null);

export function ProjectProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState, loadFromStorage);

  // Auto-save to localStorage
  useEffect(() => {
    saveToStorage(state);
  }, [state]);

  // Set initial active room
  useEffect(() => {
    if (!state.ui.activeRoomId && state.rooms.length > 0) {
      dispatch({ type: 'SET_ACTIVE_ROOM', payload: state.rooms[0].id });
    }
  }, []);

  return (
    <ProjectContext.Provider value={{ state, dispatch }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error('useProject must be used within a ProjectProvider');
  return ctx;
}
