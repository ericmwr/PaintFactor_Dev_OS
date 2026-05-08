import { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import { ProjectProvider } from './hooks/useProject';
import { useProject } from './hooks/useProject';
import { useEstimate } from './hooks/useEstimate';
import { useProjectDB } from './hooks/useProjectDB';
import { loadProject } from './data/project-db';
import { saveToStorage } from './state/persistence';
import { createExteriorState } from './state/exterior-state';
import { SpecDataProvider } from './hooks/useSpecData';
import ErrorBoundary from './components/shared/ErrorBoundary';
import ProjectSetup from './components/setup/ProjectSetup';
import RoomEditor from './components/room-editor/RoomEditor';
import ElevationEditor from './components/exterior-editor/ElevationEditor';
import StandalonePanel from './components/exterior-editor/StandalonePanel';
import EstimateView from './components/estimate/EstimateView';
import OutputView from './components/output/OutputView';
import PhotoAnalysisModal from './components/photo-analysis/PhotoAnalysisModal';
import { usePhotoAnalysis } from './hooks/usePhotoAnalysis';
import ProjectListView from './components/projects/ProjectListView';
import CompanyProfileView from './components/settings/CompanyProfileView';
import SpecEditorView from './components/rates/SpecEditorView';
import AssemblyManagerView from './components/assemblies/AssemblyManagerView';
import MaterialsView from './components/materials/MaterialsView';
import TimeTrackerView from './components/tracker/TimeTrackerView';
import AnalyticsDashboard from './components/analytics/AnalyticsDashboard';
import ColorsView from './components/colors/ColorsView.jsx';
import AuthoringView, { isAuthoringEnabled } from './components/authoring/AuthoringView.jsx';
import DevView from './components/dev/DevView.jsx';

const BASE_NAV_VIEWS = [
  { id:'projects',   label:'Projects' },
  { id:'setup',      label:'Setup' },
  { id:'scope',      label:'Scope' },
  { id:'estimate',   label:'Estimate' },
  { id:'colors',     label:'Colors' },
  { id:'output',     label:'Output' },
  { id:'rates',      label:'Rates' },
  { id:'assemblies', label:'Assemblies' },
  { id:'materials',  label:'Materials' },
  { id:'tracker',    label:'Tracker' },
  { id:'analytics',  label:'Analytics' },
  { id:'settings',   label:'Settings' },
];
// Admin-gated via localStorage.paintscope.admin = '1'.
const NAV_VIEWS = isAuthoringEnabled()
  ? [...BASE_NAV_VIEWS, { id: 'authoring', label: 'Authoring' }, { id: 'dev', label: 'Dev' }]
  : BASE_NAV_VIEWS;

function AppShell({ projectDb }) {
  const { state, dispatch, saveNow } = useProject();
  const estimate = useEstimate();
  const view = state.ui.view;
  const scopeMode = state.ui.scopeMode || 'interior';
  const photoAnalysis = usePhotoAnalysis();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [dragRoomId, setDragRoomId] = useState(null);
  const [dragOverRoomId, setDragOverRoomId] = useState(null);
  const touchDragRef = useRef({ id: null, timer: null, active: false, startY: 0 });
  const roomListRef = useRef(null);

  const getTouchTargetRoomId = useCallback((touchY) => {
    if (!roomListRef.current) return null;
    const items = roomListRef.current.querySelectorAll('[data-room-id]');
    for (const el of items) {
      const rect = el.getBoundingClientRect();
      if (touchY >= rect.top && touchY <= rect.bottom) return el.dataset.roomId;
    }
    return null;
  }, []);

  const handleTouchStart = useCallback((e, roomId) => {
    const td = touchDragRef.current;
    td.id = roomId;
    td.startY = e.touches[0].clientY;
    td.active = false;
    td.timer = setTimeout(() => {
      td.active = true;
      setDragRoomId(roomId);
    }, 300);
  }, []);

  const handleTouchMove = useCallback((e) => {
    const td = touchDragRef.current;
    if (!td.active) {
      if (td.timer && Math.abs(e.touches[0].clientY - td.startY) > 10) {
        clearTimeout(td.timer);
        td.timer = null;
      }
      return;
    }
    e.preventDefault();
    const overId = getTouchTargetRoomId(e.touches[0].clientY);
    setDragOverRoomId(overId);
  }, [getTouchTargetRoomId]);

  const handleTouchEnd = useCallback(() => {
    const td = touchDragRef.current;
    if (td.timer) { clearTimeout(td.timer); td.timer = null; }
    if (td.active && td.id && dragOverRoomId && td.id !== dragOverRoomId) {
      dispatch({ type: 'REORDER_ROOM', payload: { dragId: td.id, dropId: dragOverRoomId } });
    }
    td.id = null;
    td.active = false;
    setDragRoomId(null);
    setDragOverRoomId(null);
  }, [dragOverRoomId, dispatch]);

  const activeRoom = state.rooms.find(r => r.id === state.ui.activeRoomId) || state.rooms[0];
  const exterior = state.exterior || createExteriorState();
  const elevations = exterior.elevations || [];
  const activeElev = elevations.find(e => e.id === state.ui.activeElevationId) || elevations[0];
  const [saveFlash, setSaveFlash] = useState(false);

  // Manual save handler
  const handleSave = useCallback(() => {
    saveNow();
    setSaveFlash(true);
    setTimeout(() => setSaveFlash(false), 1500);
  }, [saveNow]);

  // Keyboard shortcuts
  const handleKeyDown = useCallback((e) => {
    const tag = e.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    if (e.ctrlKey || e.metaKey) {
      if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        handleSave();
        return;
      }
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        dispatch({ type: 'ADD_ROOM' });
        return;
      }
    }
  }, [dispatch, handleSave]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const setView = (id) => dispatch({ type: 'SET_VIEW', payload: id });

  // Check if current view is a scope-editing view (needs sidebar)
  const isScopeView = ['setup', 'scope', 'estimate', 'output'].includes(view);

  return (
    <div className="app-layout">
      {/* Sidebar — only for scope-editing views */}
      {isScopeView && (
        <aside className={`sidebar ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
          {/* Collapse toggle */}
          <button
            className="sidebar-toggle"
            onClick={() => setSidebarCollapsed(c => !c)}
            title={sidebarCollapsed ? 'Expand panel' : 'Collapse panel'}
          >
            {sidebarCollapsed ? '\u25B6' : '\u25C0'}
          </button>
          {/* Interior Rooms */}
          <div className="sidebar-header">
            <span className="sidebar-title">Rooms</span>
            <button className="btn btn-sm" onClick={() => dispatch({type:'ADD_ROOM'})} title="Ctrl+N">+ Add</button>
          </div>
          <button
            className="btn-scan-room"
            onClick={photoAnalysis.openForNewRoom}
            title="Create room from photos"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
              <circle cx="12" cy="13" r="4"/>
            </svg>
            Scan Room
          </button>
          <div style={{ padding: '2px 8px' }}>
            <button className="btn btn-sm" style={{ width: '100%', fontSize: 9, padding: '2px 4px' }}
              onClick={() => {
                const name = prompt('Category name:');
                if (name?.trim()) dispatch({ type: 'ADD_ROOM_CATEGORY', payload: { name: name.trim() } });
              }}>+ Add Category</button>
          </div>
          <div className="room-list" ref={roomListRef}>
            {(() => {
              const categories = state.room_categories || [];
              const grouped = new Map();
              for (const cat of categories) grouped.set(cat, []);
              grouped.set('', []);
              for (const r of state.rooms) {
                const cat = r.area_group?.trim() || '';
                if (!grouped.has(cat)) grouped.set(cat, []);
                grouped.get(cat).push(r);
              }

              const renderRoom = (r) => (
                <div
                  key={r.id}
                  data-room-id={r.id}
                  className={`room-item ${r.id === state.ui.activeRoomId && scopeMode === 'interior' ? 'active' : ''}`}
                  draggable
                  onDragStart={(e) => { setDragRoomId(r.id); e.dataTransfer.effectAllowed = 'move'; }}
                  onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOverRoomId(r.id); }}
                  onDragLeave={() => { if (dragOverRoomId === r.id) setDragOverRoomId(null); }}
                  onDrop={(e) => { e.preventDefault(); if (dragRoomId && dragRoomId !== r.id) dispatch({ type: 'REORDER_ROOM', payload: { dragId: dragRoomId, dropId: r.id } }); setDragRoomId(null); setDragOverRoomId(null); }}
                  onDragEnd={() => { setDragRoomId(null); setDragOverRoomId(null); }}
                  onTouchStart={(e) => handleTouchStart(e, r.id)}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                  onClick={() => { if (!touchDragRef.current.active) { dispatch({type:'SET_ACTIVE_ROOM', payload:r.id}); dispatch({type:'SET_VIEW', payload:'scope'}); } }}
                  style={{
                    ...(dragOverRoomId === r.id && dragRoomId !== r.id ? { borderTop: '2px solid var(--accent)' } : {}),
                    ...(dragRoomId === r.id ? { opacity: 0.5 } : {}),
                  }}
                >
                  <div className="room-item-info">
                    <span className="room-item-label">{r.label || 'Untitled'}</span>
                    <span className="room-item-meta">{r.length_ft}x{r.width_ft}</span>
                  </div>
                  {r.photoAnalysis && (
                    <button
                      className="room-action-btn room-action-scan"
                      title="Review scan results"
                      onClick={(e) => { e.stopPropagation(); photoAnalysis.openForRoom(r.id); }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
                        <circle cx="12" cy="13" r="4"/>
                      </svg>
                    </button>
                  )}
                  <div className="room-item-actions">
                    <button
                      className="room-action-btn"
                      title="Duplicate room"
                      onClick={(e) => { e.stopPropagation(); dispatch({type:'DUPLICATE_ROOM', payload:r.id}); }}
                    >&#x29C9;</button>
                    <button
                      className="room-action-btn room-action-delete"
                      title="Delete room"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (state.rooms.length <= 1) return;
                        dispatch({type:'REMOVE_ROOM', payload:r.id});
                      }}
                      disabled={state.rooms.length <= 1}
                    >&#x2715;</button>
                  </div>
                </div>
              );

              return [...grouped.entries()].map(([cat, catRooms]) => {
                if (!cat) {
                  return catRooms.map(renderRoom);
                }
                return (
                  <div key={cat}>
                    <div style={{ display: 'flex', alignItems: 'center', padding: '4px 8px 2px', gap: 4 }}>
                      <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--accent)', fontWeight: 600, flex: 1 }}>{cat}</span>
                      <button
                        className="room-action-btn"
                        title="Remove category"
                        style={{ fontSize: 9, padding: '0 2px' }}
                        onClick={() => {
                          dispatch({ type: 'REMOVE_ROOM_CATEGORY', payload: cat });
                          // Also clear area_group on rooms for orphan groups not in room_categories
                          catRooms.forEach(r => {
                            if (r.area_group === cat) dispatch({ type: 'SET_ROOM', payload: { roomId: r.id, field: 'area_group', value: '' } });
                          });
                        }}
                      >&#x2715;</button>
                    </div>
                    {catRooms.map(renderRoom)}
                  </div>
                );
              });
            })()}
          </div>

          <div style={{ borderTop: '1px solid var(--border)', margin: '0 8px' }} />

          {/* Exterior Elevations */}
          <div className="sidebar-header">
            <span className="sidebar-title">Elevations</span>
            <button className="btn btn-sm" onClick={() => dispatch({ type: 'ADD_ELEVATION' })}>+ Add</button>
          </div>
          <div className="room-list" style={{ flex: '0 1 auto', maxHeight: '30vh' }}>
            {elevations.map(e => (
              <div
                key={e.id}
                className={`room-item ${e.id === state.ui.activeElevationId && scopeMode === 'exterior' ? 'active' : ''}`}
                onClick={() => { dispatch({ type: 'SET_ACTIVE_ELEVATION', payload: e.id }); dispatch({ type: 'SET_VIEW', payload: 'scope' }); }}
              >
                <div className="room-item-info">
                  <span className="room-item-label">{e.label || 'Untitled'}</span>
                  <span className="room-item-meta">{e.width_ft || 0}&times;{e.height_to_eave_ft || 0}</span>
                </div>
                <div className="room-item-actions">
                  <button
                    className="room-action-btn"
                    title="Duplicate elevation"
                    onClick={ev => { ev.stopPropagation(); dispatch({ type: 'DUPLICATE_ELEVATION', payload: e.id }); }}
                  >&#x29C9;</button>
                  <button
                    className="room-action-btn room-action-delete"
                    title="Delete elevation"
                    onClick={ev => {
                      ev.stopPropagation();
                      dispatch({ type: 'REMOVE_ELEVATION', payload: e.id });
                    }}
                  >&#x2715;</button>
                </div>
              </div>
            ))}
            {elevations.length === 0 && (
              <div style={{ padding: '8px 12px', fontSize: 11, color: 'var(--text-muted)' }}>
                No elevations yet.
              </div>
            )}
          </div>

          {/* Standalone Items */}
          <div
            className={`room-item ${scopeMode === 'standalone' ? 'active' : ''}`}
            onClick={() => { dispatch({ type: 'SET_SCOPE_MODE', payload: 'standalone' }); dispatch({ type: 'SET_VIEW', payload: 'scope' }); }}
            style={{ borderTop: '1px solid var(--border)', margin: '0 0 0 0' }}
          >
            <div className="room-item-info">
              <span className="room-item-label" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', fontWeight: 600 }}>
                Standalone Items
              </span>
            </div>
          </div>
        </aside>
      )}

      {/* Main panel */}
      <div className="main-panel" style={!isScopeView ? { marginLeft: 0 } : undefined}>
        <header className="app-header">
          <div className="app-title">Paint<span>Factor</span></div>
          <div style={{display:'flex',gap:10,alignItems:'center'}}>
            <span style={{fontSize:12,color:'var(--text-muted)'}}>
              {state.project.name || 'Untitled Project'}
            </span>
            <button
              className={`btn btn-sm btn-save ${saveFlash ? 'save-flash' : ''}`}
              onClick={handleSave}
              title="Save project (Ctrl+S)"
            >
              {saveFlash ? '\u2713 Saved' : 'Save'}
            </button>
          </div>
        </header>

        {/* Nav */}
        <nav className="nav-bar" style={{ overflowX: 'auto' }}>
          {NAV_VIEWS.map(v => (
            <div
              key={v.id}
              className={`nav-item ${view === v.id ? 'active' : ''}`}
              onClick={() => setView(v.id)}
              style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
            >
              {v.label}
            </div>
          ))}
        </nav>

        {/* Content */}
        <div className="main-content">
          {view === 'projects' && (
            <ProjectListView
              projects={projectDb.projects}
              activeProjectId={projectDb.activeProjectId}
              onSelect={(id) => { projectDb.switchProject(id); dispatch({ type: 'SET_VIEW', payload: 'setup' }); }}
              onCreate={projectDb.createProject}
              onDelete={projectDb.deleteProject}
              onSave={projectDb.saveProject}
              onImport={async (data) => { await projectDb.importProject(data); dispatch({ type: 'SET_VIEW', payload: 'setup' }); }}
            />
          )}

          <ErrorBoundary label="Setup" key={view === 'setup' ? 'setup' : undefined}>
            {view === 'setup' && <ProjectSetup />}
          </ErrorBoundary>

          <ErrorBoundary label="Scope" key={view === 'scope' ? `scope-${scopeMode}` : undefined}>
            {view === 'scope' && scopeMode === 'interior' && (
              activeRoom ? (
                <RoomEditor room={activeRoom} project={state.project} dispatch={dispatch} roomCategories={state.room_categories} />
              ) : (
                <div className="no-data-msg">Add a room to begin.</div>
              )
            )}
            {view === 'scope' && scopeMode === 'exterior' && (
              activeElev ? (
                <ElevationEditor
                  elevation={activeElev}
                  dispatch={dispatch}
                  exterior={exterior}
                  project={state.project}
                />
              ) : (
                <div className="no-data-msg">Add an elevation to begin.</div>
              )
            )}
            {view === 'scope' && scopeMode === 'standalone' && (
              <div style={{ padding: 12, overflow: 'auto', flex: 1 }}>
                <StandalonePanel exterior={exterior} dispatch={dispatch} />
              </div>
            )}
          </ErrorBoundary>

          <ErrorBoundary label="Estimate" key={view === 'estimate' ? 'estimate' : undefined}>
            {view === 'estimate' && <EstimateView />}
          </ErrorBoundary>

          {view === 'colors' && (
            <ErrorBoundary label="Colors">
              <ColorsView state={state} dispatch={dispatch} />
            </ErrorBoundary>
          )}

          <ErrorBoundary label="Output" key={view === 'output' ? 'output' : undefined}>
            {view === 'output' && <OutputView />}
          </ErrorBoundary>

          {view === 'rates' && (
            <ErrorBoundary label="Rates">
              <SpecEditorView />
            </ErrorBoundary>
          )}

          {view === 'assemblies' && (
            <ErrorBoundary label="Assemblies">
              <AssemblyManagerView />
            </ErrorBoundary>
          )}

          {view === 'materials' && (
            <ErrorBoundary label="Materials">
              <MaterialsView />
            </ErrorBoundary>
          )}

          {view === 'tracker' && (
            <ErrorBoundary label="Tracker">
              <TimeTrackerView estimate={estimate} />
            </ErrorBoundary>
          )}

          {view === 'analytics' && (
            <ErrorBoundary label="Analytics">
              <AnalyticsDashboard estimate={estimate} />
            </ErrorBoundary>
          )}

          {view === 'settings' && (
            <ErrorBoundary label="Settings">
              <CompanyProfileView />
            </ErrorBoundary>
          )}

          {view === 'authoring' && (
            <ErrorBoundary label="Authoring">
              <AuthoringView />
            </ErrorBoundary>
          )}

          {view === 'dev' && (
            <ErrorBoundary label="Dev">
              <DevView />
            </ErrorBoundary>
          )}
        </div>
      </div>

      {/* Photo analysis modal */}
      {photoAnalysis.showModal && (
        <PhotoAnalysisModal
          roomId={photoAnalysis.targetRoomId}
          savedResult={state.rooms.find(r => r.id === photoAnalysis.targetRoomId)?.photoAnalysis || null}
          onApply={(roomId, patch, analysisResult) => dispatch({ type: 'APPLY_PHOTO_ANALYSIS', payload: { roomId, patch, analysisResult } })}
          onCreateRoom={(patch, analysisResult) => dispatch({ type: 'CREATE_ROOM_FROM_PHOTO', payload: { patch, analysisResult } })}
          onClose={photoAnalysis.close}
        />
      )}
    </div>
  );
}

function ProjectLoader({ projectDb }) {
  // loaded.forId tracks WHICH project the data was loaded for
  // This prevents rendering with stale data from a previous project
  const [loaded, setLoaded] = useState({ data: null, forId: null });

  useEffect(() => {
    let cancelled = false;
    // Reset so we show loading while fetching
    setLoaded({ data: null, forId: null });
    (async () => {
      if (projectDb.activeProjectId) {
        const proj = await loadProject(projectDb.activeProjectId);
        if (!cancelled) {
          setLoaded({ data: proj?.project_data || null, forId: projectDb.activeProjectId });
        }
      } else {
        if (!cancelled) {
          setLoaded({ data: null, forId: '__none__' });
        }
      }
    })();
    return () => { cancelled = true; };
  }, [projectDb.activeProjectId]);

  // Don't render until we've loaded data for the CURRENT active project
  const isReady = !projectDb.loading && loaded.forId === (projectDb.activeProjectId || '__none__');

  if (!isReady) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--text-muted)' }}>Loading...</div>;
  }

  return (
    <SpecDataProvider>
      <ProjectProvider key={loaded.forId} initialData={loaded.data} projectId={projectDb.activeProjectId}>
        <AppShell projectDb={projectDb} />
      </ProjectProvider>
    </SpecDataProvider>
  );
}

// Lab sandbox — isolated render path for /lab/* surfaces. Lazy-loaded so
// the production bundle pays no cost; isolated so a lab crash can't break
// the main app. Activate with ?lab=scope-tree (or any future lab id).
const LabRoot = lazy(() => import('./components/scope-tree-lab/LabRoot.jsx'));

function getLabId() {
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get('lab');
  } catch {
    return null;
  }
}

export default function App() {
  const labId = getLabId();
  if (labId) {
    return (
      <Suspense fallback={<div style={{ padding: 24, color: 'var(--text-muted)' }}>Loading lab…</div>}>
        <LabRoot labId={labId} />
      </Suspense>
    );
  }
  const projectDb = useProjectDB();
  return <ProjectLoader projectDb={projectDb} />;
}
