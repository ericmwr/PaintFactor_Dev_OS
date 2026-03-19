import { useState, useEffect, useCallback, useRef } from 'react';
import { listProjects, loadProject, saveProject, createProject, deleteProject, migrateFromLocalStorage } from '../data/project-db';
import { initialState } from '../state/initial-state';

/**
 * Manages the project list and active project selection with IndexedDB persistence.
 * Returns project list, active project, and CRUD operations.
 */
export function useProjectDB() {
  const [projects, setProjects] = useState([]);
  const [activeProjectId, setActiveProjectId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const saveTimerRef = useRef(null);

  // Load project list + migrate on first mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Run migration from localStorage if needed
        const migrated = await migrateFromLocalStorage();

        const list = await listProjects();
        if (cancelled) return;
        setProjects(list);

        // Auto-select: migrated project, or most recent, or null
        if (migrated) {
          setActiveProjectId(migrated.id);
        } else if (list.length > 0) {
          setActiveProjectId(list[0].id);
        }
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const refreshList = useCallback(async () => {
    const list = await listProjects();
    setProjects(list);
  }, []);

  const handleCreateProject = useCallback(async (name) => {
    const projectData = {
      project: { ...initialState.project, name: name || '' },
      rooms: initialState.rooms,
      exterior: initialState.exterior,
      ui: initialState.ui,
    };
    const proj = await createProject(name || 'Untitled Project', projectData);
    await refreshList();
    setActiveProjectId(proj.id);
    return proj;
  }, [refreshList]);

  const handleDeleteProject = useCallback(async (id) => {
    await deleteProject(id);
    await refreshList();
    if (activeProjectId === id) {
      const remaining = await listProjects();
      setActiveProjectId(remaining.length > 0 ? remaining[0].id : null);
    }
  }, [activeProjectId, refreshList]);

  const handleSaveProject = useCallback(async (id, name, clientName, address, status, projectData) => {
    const proj = await loadProject(id);
    if (!proj) return;
    proj.name = name ?? proj.name;
    proj.client_name = clientName ?? proj.client_name;
    proj.address = address ?? proj.address;
    proj.status = status ?? proj.status;
    proj.project_data = projectData ?? proj.project_data;
    await saveProject(proj);
    await refreshList();
  }, [refreshList]);

  // Debounced auto-save for active project state changes
  const autoSave = useCallback((state) => {
    if (!activeProjectId) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      try {
        const proj = await loadProject(activeProjectId);
        if (!proj) return;
        proj.project_data = {
          project: state.project,
          rooms: state.rooms,
          exterior: state.exterior,
          ui: state.ui,
        };
        proj.name = state.project.name || proj.name;
        await saveProject(proj);
      } catch (e) {
        console.error('[PaintFactor] Auto-save error:', e);
      }
    }, 1000);
  }, [activeProjectId]);

  const switchProject = useCallback(async (id) => {
    setActiveProjectId(id);
  }, []);

  return {
    projects,
    activeProjectId,
    loading,
    error,
    createProject: handleCreateProject,
    deleteProject: handleDeleteProject,
    saveProject: handleSaveProject,
    autoSave,
    switchProject,
    refreshList,
  };
}
