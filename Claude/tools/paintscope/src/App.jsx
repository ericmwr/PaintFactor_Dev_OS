import { useState, useEffect, useCallback } from 'react';
import { ProjectProvider } from './hooks/useProject';
import { useProject } from './hooks/useProject';
import { useEstimate } from './hooks/useEstimate';
import { saveToStorage } from './state/persistence';
import ErrorBoundary from './components/shared/ErrorBoundary';
import ProjectSetup from './components/setup/ProjectSetup';
import RoomEditor from './components/room-editor/RoomEditor';
import ProjectSummary from './components/summary/ProjectSummary';
import EstimateView from './components/estimate/EstimateView';
import WorkOrderView from './components/workorder/WorkOrderView';
import ExportImport from './components/export/ExportImport';
import PhotoAnalysisModal from './components/photo-analysis/PhotoAnalysisModal';
import { usePhotoAnalysis } from './hooks/usePhotoAnalysis';

const NAV_VIEWS = [
  { id:'setup',    label:'Setup',        key:'1' },
  { id:'editor',   label:'Room Editor',  key:'2' },
  { id:'summary',  label:'Summary',      key:'3' },
  { id:'estimate', label:'Estimate',     key:'4' },
  { id:'workorder',label:'Work Order',   key:'5' },
  { id:'export',   label:'Export/Import', key:'6' },
];

function AppShell() {
  const { state, dispatch } = useProject();
  const estimate = useEstimate();
  const view = state.ui.view;
  const photoAnalysis = usePhotoAnalysis();
  const activeRoom = state.rooms.find(r => r.id === state.ui.activeRoomId) || state.rooms[0];
  const [saveFlash, setSaveFlash] = useState(false);

  // Manual save handler (also shows confirmation flash)
  const handleSave = useCallback(() => {
    saveToStorage(state);
    setSaveFlash(true);
    setTimeout(() => setSaveFlash(false), 1500);
  }, [state]);

  // Keyboard shortcuts: Ctrl+1-6 switch views, Ctrl+N add room, Ctrl+S save
  const handleKeyDown = useCallback((e) => {
    // Skip if user is typing in an input/textarea/select
    const tag = e.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    if (e.ctrlKey || e.metaKey) {
      // Ctrl+S: manual save
      if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        handleSave();
        return;
      }
      // Ctrl+1 through Ctrl+6: switch views
      const idx = parseInt(e.key) - 1;
      if (idx >= 0 && idx < NAV_VIEWS.length) {
        e.preventDefault();
        dispatch({ type: 'SET_VIEW', payload: NAV_VIEWS[idx].id });
        return;
      }
      // Ctrl+N: add room
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        dispatch({ type: 'ADD_ROOM' });
        dispatch({ type: 'SET_VIEW', payload: 'editor' });
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
              className={`room-item ${r.id === state.ui.activeRoomId ? 'active' : ''}`}
              onClick={() => { dispatch({type:'SET_ACTIVE_ROOM', payload:r.id}); dispatch({type:'SET_VIEW', payload:'editor'}); }}
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
                >⧉</button>
                <button
                  className="room-action-btn room-action-delete"
                  title="Delete room"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (state.rooms.length <= 1) return;
                    dispatch({type:'REMOVE_ROOM', payload:r.id});
                  }}
                  disabled={state.rooms.length <= 1}
                >✕</button>
              </div>
            </div>
          ))}
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
              {saveFlash ? '✓ Saved' : '💾 Save'}
            </button>
            <span style={{fontSize:10,color:'var(--text-muted)',opacity:0.5}} title="Ctrl+1-6 switch views, Ctrl+N add room, Ctrl+S save">
              ⌨ Ctrl+1-6 / S
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
          <ErrorBoundary label="Room Editor" key={view === 'editor' ? 'editor' : undefined}>
            {view === 'editor' && <RoomEditor room={activeRoom} project={state.project} dispatch={dispatch} />}
          </ErrorBoundary>
          <ErrorBoundary label="Summary" key={view === 'summary' ? 'summary' : undefined}>
            {view === 'summary' && <ProjectSummary />}
          </ErrorBoundary>
          <ErrorBoundary label="Estimate" key={view === 'estimate' ? 'estimate' : undefined}>
            {view === 'estimate' && <EstimateView />}
          </ErrorBoundary>
          <ErrorBoundary label="Work Order" key={view === 'workorder' ? 'workorder' : undefined}>
            {view === 'workorder' && <WorkOrderView />}
          </ErrorBoundary>
          <ErrorBoundary label="Export/Import" key={view === 'export' ? 'export' : undefined}>
            {view === 'export' && <ExportImport />}
          </ErrorBoundary>
        </div>
      </div>

      {/* Photo analysis modal (from sidebar "Scan Room") */}
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
