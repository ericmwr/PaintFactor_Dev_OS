import { useState, useEffect, useCallback } from 'react';
import { ProjectProvider } from './hooks/useProject';
import { useProject } from './hooks/useProject';
import { useEstimate } from './hooks/useEstimate';
import { saveToStorage } from './state/persistence';
import { createExteriorState } from './state/exterior-state';
import ErrorBoundary from './components/shared/ErrorBoundary';
import ProjectSetup from './components/setup/ProjectSetup';
import RoomEditor from './components/room-editor/RoomEditor';
import ElevationEditor from './components/exterior-editor/ElevationEditor';
import StandalonePanel from './components/exterior-editor/StandalonePanel';
import EstimateView from './components/estimate/EstimateView';
import OutputView from './components/output/OutputView';
import PhotoAnalysisModal from './components/photo-analysis/PhotoAnalysisModal';
import { usePhotoAnalysis } from './hooks/usePhotoAnalysis';

const NAV_VIEWS = [
  { id:'setup',    label:'Setup',    key:'1' },
  { id:'scope',    label:'Scope',    key:'2' },
  { id:'estimate', label:'Estimate', key:'3' },
  { id:'output',   label:'Output',   key:'4' },
];

function AppShell() {
  const { state, dispatch } = useProject();
  const estimate = useEstimate();
  const view = state.ui.view;
  const scopeMode = state.ui.scopeMode || 'interior';
  const photoAnalysis = usePhotoAnalysis();
  const activeRoom = state.rooms.find(r => r.id === state.ui.activeRoomId) || state.rooms[0];
  const exterior = state.exterior || createExteriorState();
  const elevations = exterior.elevations || [];
  const activeElev = elevations.find(e => e.id === state.ui.activeElevationId) || elevations[0];
  const [saveFlash, setSaveFlash] = useState(false);

  // Manual save handler
  const handleSave = useCallback(() => {
    saveToStorage(state);
    setSaveFlash(true);
    setTimeout(() => setSaveFlash(false), 1500);
  }, [state]);

  // Keyboard shortcuts: Ctrl+1-4 switch views, Ctrl+N add room, Ctrl+S save
  const handleKeyDown = useCallback((e) => {
    const tag = e.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    if (e.ctrlKey || e.metaKey) {
      if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        handleSave();
        return;
      }
      const idx = parseInt(e.key) - 1;
      if (idx >= 0 && idx < NAV_VIEWS.length) {
        e.preventDefault();
        dispatch({ type: 'SET_VIEW', payload: NAV_VIEWS[idx].id });
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

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        {/* ── Interior Rooms ── */}
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
        <div className="room-list">
          {state.rooms.map(r => (
            <div
              key={r.id}
              className={`room-item ${r.id === state.ui.activeRoomId && scopeMode === 'interior' ? 'active' : ''}`}
              onClick={() => { dispatch({type:'SET_ACTIVE_ROOM', payload:r.id}); dispatch({type:'SET_VIEW', payload:'scope'}); }}
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
          ))}
        </div>

        {/* ── Divider ── */}
        <div style={{ borderTop: '1px solid var(--border)', margin: '0 8px' }} />

        {/* ── Exterior Elevations ── */}
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

        {/* ── Standalone Items ── */}
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

      {/* Main panel */}
      <div className="main-panel">
        <header className="app-header">
          <div className="app-title">Paint<span>Scope</span></div>
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
            <span style={{fontSize:10,color:'var(--text-muted)',opacity:0.5}} title="Ctrl+1-4 switch views, Ctrl+N add room, Ctrl+S save">
              Ctrl+1-4 / S
            </span>
          </div>
        </header>

        {/* Nav */}
        <nav className="nav-bar">
          {NAV_VIEWS.map(v => (
            <div
              key={v.id}
              className={`nav-item ${view === v.id ? 'active' : ''}`}
              onClick={() => dispatch({type:'SET_VIEW', payload:v.id})}
              title={`Ctrl+${v.key}`}
            >
              {v.label}
            </div>
          ))}
        </nav>

        {/* Content */}
        <div className="main-content">
          <ErrorBoundary label="Setup" key={view === 'setup' ? 'setup' : undefined}>
            {view === 'setup' && <ProjectSetup />}
          </ErrorBoundary>

          <ErrorBoundary label="Scope" key={view === 'scope' ? `scope-${scopeMode}` : undefined}>
            {view === 'scope' && scopeMode === 'interior' && (
              <RoomEditor room={activeRoom} project={state.project} dispatch={dispatch} />
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

          <ErrorBoundary label="Output" key={view === 'output' ? 'output' : undefined}>
            {view === 'output' && <OutputView />}
          </ErrorBoundary>
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

export default function App() {
  return (
    <ProjectProvider>
      <AppShell />
    </ProjectProvider>
  );
}
