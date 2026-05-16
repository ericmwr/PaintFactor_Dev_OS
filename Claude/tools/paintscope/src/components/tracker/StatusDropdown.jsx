import { useState } from 'react';
import { useProject } from '../../hooks/useProject';
import { useTrackerSnapshot } from '../../hooks/useTrackerSnapshot';
import { useEstimateScenario } from '../../hooks/useEstimateScenario';
import { buildSnapshot } from '../../tracker/build-snapshot.js';

const STATUS_OPTIONS = [
  { value: 'draft',        label: 'draft',        color: '#888' },
  { value: 'estimated',    label: 'estimated',    color: '#f1c40f' },
  { value: 'approved',     label: 'approved',     color: '#82aaff' },
  { value: 'in_progress',  label: 'in-progress',  color: '#5d5' },
  { value: 'completed',    label: 'completed',    color: '#c792ea' },
];

/**
 * Project status dropdown + snapshot-confirm flow. Lives in the Setup tab.
 *
 * Status transitions update state.project.status via SET_PROJECT_STATUS.
 * When the new status is `in_progress`, we open a confirm modal that
 * either takes a fresh snapshot (first time) or re-snapshots (overrides
 * the previous one). All other transitions are direct.
 */
export default function StatusDropdown() {
  const { state, dispatch, projectId } = useProject();
  const { snapshot, save: saveSnapshot } = useTrackerSnapshot(projectId);
  const estimate = useEstimateScenario();
  const [confirmFor, setConfirmFor] = useState(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState(null);

  const current = state.project.status || 'draft';

  const handleChange = (newStatus) => {
    if (newStatus === current) return;
    if (newStatus === 'in_progress') {
      setConfirmFor(newStatus);
      return;
    }
    dispatch({ type: 'SET_PROJECT_STATUS', payload: newStatus });
  };

  const handleConfirm = async () => {
    setError(null);
    setWorking(true);
    try {
      const snap = buildSnapshot(estimate, state.project, projectId);
      snap.snapshot_id = `snap_${projectId}_${Date.now()}`;
      snap.status_at_snapshot = 'in_progress';
      await saveSnapshot(snap);
      dispatch({ type: 'SET_PROJECT_STATUS', payload: 'in_progress' });
      setConfirmFor(null);
    } catch (err) {
      setError(err?.message || String(err));
    } finally {
      setWorking(false);
    }
  };

  const currentColor = STATUS_OPTIONS.find(o => o.value === current)?.color || '#888';

  return (
    <>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
        <span style={{ color: 'var(--text-muted)' }}>Status:</span>
        <select
          value={current}
          onChange={(e) => handleChange(e.target.value)}
          style={{
            background: 'var(--bg-input, #1f1f1f)',
            color: currentColor,
            border: '1px solid var(--border, #333)',
            padding: '3px 6px',
            borderRadius: 4,
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          {STATUS_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </label>

      {confirmFor && (
        <div
          onClick={() => !working && setConfirmFor(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--bg-card, #1f1f1f)', color: 'var(--text)',
              border: '1px solid var(--border, #333)', borderRadius: 6,
              padding: 20, maxWidth: 480, width: '90%',
              boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
            }}
          >
            <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 600 }}>
              {snapshot ? 'Re-snapshot this project?' : 'Snapshot the current estimate?'}
            </h3>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12, lineHeight: 1.5 }}>
              {snapshot ? (
                <>
                  Existing time entries stay tied to their original activities by
                  snapshot_id. New activities appear in the tree. Entries whose
                  activities no longer exist in the new snapshot remain in IDB but
                  won't render in the tree.
                </>
              ) : (
                <>
                  This locks the activity list as the tracker baseline. You can
                  re-snapshot later if scope changes significantly — existing time
                  entries stay tied to their original activities.
                </>
              )}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 16 }}>
              Estimate totals at snapshot:
              <ul style={{ margin: '4px 0 0 16px' }}>
                <li>Total hours: {Math.round((estimate?.totalHours || 0) * 10) / 10}</li>
                <li>Rooms: {state.rooms?.length || 0}</li>
              </ul>
            </div>
            {error && (
              <div style={{ color: '#e74c3c', fontSize: 11, marginBottom: 12 }}>
                ❌ {error}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button
                onClick={() => !working && setConfirmFor(null)}
                disabled={working}
                style={{
                  background: 'transparent', border: '1px solid var(--border, #333)',
                  color: 'var(--text)', padding: '6px 14px', borderRadius: 4,
                  cursor: working ? 'not-allowed' : 'pointer', fontSize: 12,
                }}
              >Cancel</button>
              <button
                onClick={handleConfirm}
                disabled={working}
                style={{
                  background: working ? 'var(--bg-input)' : 'var(--accent, #82aaff)',
                  color: working ? 'var(--text-muted)' : 'var(--bg, #0f0f0f)',
                  border: 'none', padding: '6px 14px', borderRadius: 4,
                  cursor: working ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 600,
                }}
              >
                {working ? 'Snapshotting...' : (snapshot ? 'Re-snapshot' : 'Snapshot & Activate')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
