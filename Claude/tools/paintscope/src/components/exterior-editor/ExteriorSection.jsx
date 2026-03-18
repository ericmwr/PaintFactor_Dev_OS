import { useState } from 'react';
import { createExteriorState } from '../../state/exterior-state';
import ErrorBoundary from '../shared/ErrorBoundary';
import ElevationEditor from './ElevationEditor';
import StandalonePanel from './StandalonePanel';
import SiteConditionsPanel from './SiteConditionsPanel';

const PANELS = [
  { id: 'elevations', label: 'Elevations' },
  { id: 'standalone', label: 'Standalone' },
  { id: 'site',       label: 'Site & Defaults' },
];

export default function ExteriorSection({ state, dispatch }) {
  const exterior = state.exterior || createExteriorState();
  const elevations = exterior.elevations || [];
  const activeElevId = state.ui.activeElevationId;
  const activeElev = elevations.find(e => e.id === activeElevId) || elevations[0];
  const [panel, setPanel] = useState('elevations');
  const isRP = exterior.project_type === 'RP';

  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
      {/* Sidebar */}
      <div className="exterior-sidebar">
        {/* NC/RP Toggle */}
        <div style={{ display: 'flex', gap: 0, margin: '0 8px 6px', borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid var(--border)' }}>
          <button
            style={{
              flex: 1, padding: '5px 0', fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer',
              background: !isRP ? 'var(--accent)' : 'var(--bg-card)', color: !isRP ? '#fff' : 'var(--text-secondary)',
            }}
            onClick={() => dispatch({ type: 'SET_EXTERIOR_PROJECT_TYPE', payload: 'NC' })}
          >NC</button>
          <button
            style={{
              flex: 1, padding: '5px 0', fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer',
              background: isRP ? 'var(--accent-warn, #e67e22)' : 'var(--bg-card)', color: isRP ? '#fff' : 'var(--text-secondary)',
            }}
            onClick={() => dispatch({ type: 'SET_EXTERIOR_PROJECT_TYPE', payload: 'RP' })}
          >RP</button>
        </div>

        {/* Panel switcher */}
        <div className="exterior-panel-switcher">
          {PANELS.map(p => (
            <button
              key={p.id}
              className={`exterior-panel-btn ${panel === p.id ? 'active' : ''}`}
              onClick={() => setPanel(p.id)}
            >
              {p.label}
            </button>
          ))}
        </div>

        {panel === 'elevations' && (
          <>
            <div className="sidebar-header" style={{ marginTop: 8 }}>
              <span className="sidebar-title" style={{ fontSize: 11 }}>Elevations</span>
              <button className="btn btn-sm" onClick={() => dispatch({ type: 'ADD_ELEVATION' })}>+ Add</button>
            </div>
            <div className="elevation-list">
              {elevations.map(e => (
                <div
                  key={e.id}
                  className={`room-item ${e.id === activeElevId ? 'active' : ''}`}
                  onClick={() => dispatch({ type: 'SET_ACTIVE_ELEVATION', payload: e.id })}
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
                <div className="no-data-msg" style={{ padding: 16, fontSize: 12 }}>
                  No elevations yet. Click "+ Add" to start.
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Main content */}
      <div className="exterior-main">
        {panel === 'elevations' && (
          activeElev ? (
            <ErrorBoundary label="Elevation Editor">
              <ElevationEditor
                elevation={activeElev}
                dispatch={dispatch}
                exterior={exterior}
                project={state.project}
                isRP={isRP}
              />
            </ErrorBoundary>
          ) : (
            <div className="no-data-msg">Add an elevation to begin.</div>
          )
        )}

        {panel === 'standalone' && (
          <ErrorBoundary label="Standalone Items">
            <div style={{ padding: 12, overflow: 'auto', flex: 1 }}>
              <StandalonePanel exterior={exterior} dispatch={dispatch} isRP={isRP} />
            </div>
          </ErrorBoundary>
        )}

        {panel === 'site' && (
          <ErrorBoundary label="Site Conditions">
            <div style={{ padding: 12, overflow: 'auto', flex: 1 }}>
              <SiteConditionsPanel exterior={exterior} dispatch={dispatch} />
            </div>
          </ErrorBoundary>
        )}
      </div>
    </div>
  );
}
