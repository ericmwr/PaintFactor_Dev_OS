import { useState, useMemo } from 'react';
import { useProject } from '../../hooks/useProject';
import { useTrackerSnapshot } from '../../hooks/useTrackerSnapshot';
import { useTimeEntries } from '../../hooks/useTimeEntries';

const PHASE_LABELS = {
  setup: 'Setup', prep: 'Prep', prime: 'Prime', apply: 'Apply',
  interstage: 'Interstage', finish: 'Finish', cleanup: 'Cleanup',
};

/**
 * PhaseLogForm — daily log mode at the phase level.
 *
 * Hierarchical disclosure: Phase → (Complete | Partial) → if Partial,
 * pick rooms fully done (check) and per-activity completion in the
 * unchecked rooms.
 *
 * On save: generates N time_entries — one per touched (activity_id) — all
 * tied to the same date/worker. Hours split evenly across generated entries.
 *
 * Props:
 *  - phaseRollup: { phase, estimated_hours, rooms, activities } from buildPhaseRollups
 *  - onClose:     () => void
 *  - onSaved:     () => void (triggers parent refresh)
 */
export default function PhaseLogForm({ phaseRollup, onClose, onSaved }) {
  const { state, dispatch, projectId } = useProject();
  const { snapshot } = useTrackerSnapshot(projectId);
  const { save: saveEntry } = useTimeEntries(projectId);

  const today = new Date().toISOString().slice(0, 10);
  const [worker, setWorker] = useState('');
  const [date, setDate] = useState(today);
  const [hours, setHours] = useState('');
  const [status, setStatus] = useState('partial'); // 'complete' | 'partial'
  // Per-room state: { [room_id]: { done: bool, expanded: bool, activities: { [activity_id]: { complete, pct } } } }
  const [roomState, setRoomState] = useState(() => {
    const init = {};
    for (const room of phaseRollup.rooms) {
      const acts = {};
      for (const act of activitiesInRoom(phaseRollup, room.room_id)) {
        acts[act.activity_id] = { complete: false, pct: '' };
      }
      init[room.room_id] = { done: false, expanded: false, activities: acts };
    }
    return init;
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const roster = state.project?.tracker_roster || [];

  const toggleRoomDone = (roomId, checked) => {
    setRoomState(prev => ({
      ...prev,
      [roomId]: {
        ...prev[roomId],
        done: checked,
        expanded: checked ? false : prev[roomId].expanded,
      },
    }));
  };

  const toggleRoomExpanded = (roomId) => {
    setRoomState(prev => ({
      ...prev,
      [roomId]: { ...prev[roomId], expanded: !prev[roomId].expanded },
    }));
  };

  const toggleActivity = (roomId, activityId, checked) => {
    setRoomState(prev => ({
      ...prev,
      [roomId]: {
        ...prev[roomId],
        activities: {
          ...prev[roomId].activities,
          [activityId]: { complete: checked, pct: checked ? 100 : (prev[roomId].activities[activityId]?.pct ?? '') },
        },
      },
    }));
  };

  const setActivityPct = (roomId, activityId, val) => {
    const num = val === '' ? '' : Math.max(0, Math.min(100, parseInt(val, 10) || 0));
    setRoomState(prev => ({
      ...prev,
      [roomId]: {
        ...prev[roomId],
        activities: {
          ...prev[roomId].activities,
          [activityId]: { complete: num === 100, pct: num },
        },
      },
    }));
  };

  // Build the list of entries to write on save
  const plannedEntries = useMemo(() => {
    if (status === 'complete') {
      // One entry per activity in the phase, all at 100% across all rooms
      return phaseRollup.activities.map(act => ({
        activity_id: act.activity_id,
        mode: 'rooms',
        room_progress: Object.fromEntries(
          act.rooms.map(r => [r.room_id, { complete: true, pct: 100 }])
        ),
      }));
    }
    // Partial: for each room marked done → all activities in that room×phase at 100%
    //          for each room not done → only the activities the user explicitly touched
    const entries = [];
    for (const [roomId, rs] of Object.entries(roomState)) {
      if (rs.done) {
        // Mark all activities in this room × phase as 100% IN THIS ROOM only
        for (const act of activitiesInRoom(phaseRollup, roomId)) {
          entries.push({
            activity_id: act.activity_id,
            mode: 'rooms',
            room_progress: { [roomId]: { complete: true, pct: 100 } },
          });
        }
      } else {
        // Only touched activities
        for (const [activityId, ap] of Object.entries(rs.activities)) {
          if (ap.pct === '' || ap.pct == null) continue;
          entries.push({
            activity_id: activityId,
            mode: 'rooms',
            room_progress: { [roomId]: { complete: !!ap.complete, pct: Number(ap.pct) } },
          });
        }
      }
    }
    return entries;
  }, [status, roomState, phaseRollup]);

  const handleSave = async () => {
    setError(null);
    const h = parseFloat(hours);
    if (!isFinite(h) || h <= 0) { setError('Hours must be a positive number.'); return; }
    if (!worker.trim()) { setError('Worker name required.'); return; }
    if (!snapshot) { setError('Missing snapshot — cannot save entry.'); return; }
    if (plannedEntries.length === 0) {
      setError('Nothing to log — pick a room or activity, or select Complete.');
      return;
    }

    setSaving(true);
    try {
      const hoursPerEntry = Math.round((h / plannedEntries.length) * 100) / 100;
      const created_at = new Date().toISOString();
      let i = 0;
      for (const planned of plannedEntries) {
        const entry = {
          id: `entry_${Date.now()}_${i++}`,
          project_id: projectId,
          snapshot_id: snapshot.snapshot_id,
          activity_id: planned.activity_id,
          worker_name: worker.trim(),
          date,
          hours: hoursPerEntry,
          notes: `phase log: ${PHASE_LABELS[phaseRollup.phase] || phaseRollup.phase}`,
          created_at,
          mode: planned.mode,
          room_progress: planned.room_progress,
          phase_log: true, // marker so future analytics can distinguish phase logs from per-activity logs
        };
        await saveEntry(entry);
      }
      dispatch({ type: 'APPEND_ROSTER_NAME', payload: worker.trim() });
      if (onSaved) await onSaved();
      onClose();
    } catch (err) {
      setError(err?.message || String(err));
      setSaving(false);
    }
  };

  return (
    <div
      onClick={() => !saving && onClose()}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--bg-card, #1f1f1f)', color: 'var(--text)',
          border: '1px solid var(--border, #333)', borderLeft: '2px solid var(--accent)',
          padding: 16, width: 440, height: '100vh', overflowY: 'auto',
          boxShadow: '-8px 0 24px rgba(0,0,0,0.6)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 13, color: 'var(--accent)' }}>
            Log Time — {PHASE_LABELS[phaseRollup.phase] || phaseRollup.phase}
          </h3>
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
            est {phaseRollup.estimated_hours.toFixed(1)}h
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr', gap: 6, fontSize: 11, marginBottom: 12 }}>
          <span style={{ color: 'var(--text-muted)' }}>Worker</span>
          <input value={worker} list="phase-log-roster" onChange={(e) => setWorker(e.target.value)} placeholder="Name" style={inputStyle()} />
          <datalist id="phase-log-roster">
            {roster.map(n => <option key={n} value={n} />)}
          </datalist>
          <span style={{ color: 'var(--text-muted)' }}>Date</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={inputStyle()} />
          <span style={{ color: 'var(--text-muted)' }}>Hours today</span>
          <input type="number" step="0.25" min="0" value={hours} onChange={(e) => setHours(e.target.value)} placeholder="0.0" style={inputStyle()} />
        </div>

        <div style={{ marginBottom: 12, fontSize: 11 }}>
          <span style={{ color: 'var(--text-muted)', marginRight: 8 }}>Phase status:</span>
          <label style={{ marginRight: 12, cursor: 'pointer' }}>
            <input type="radio" checked={status === 'complete'} onChange={() => setStatus('complete')} /> Complete (all rooms)
          </label>
          <label style={{ cursor: 'pointer' }}>
            <input type="radio" checked={status === 'partial'} onChange={() => setStatus('partial')} /> Partial
          </label>
        </div>

        {status === 'partial' && (
          <div style={{ marginBottom: 12, fontSize: 11 }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: 0.5, marginBottom: 6 }}>
              ═══ ROOMS (check fully done, expand for partial activity tracking) ═══
            </div>
            {phaseRollup.rooms.map(room => {
              const rs = roomState[room.room_id];
              const acts = activitiesInRoom(phaseRollup, room.room_id);
              return (
                <div key={room.room_id} style={{ marginBottom: 6, padding: 6, background: rs.done ? 'rgba(95, 213, 95, 0.05)' : 'rgba(255,255,255,0.02)', borderRadius: 3 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input
                      type="checkbox"
                      checked={rs.done}
                      onChange={(e) => toggleRoomDone(room.room_id, e.target.checked)}
                    />
                    <span style={{ flex: 1, fontWeight: 600 }}>{room.room_label}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>{room.estimated_hours.toFixed(1)}h est</span>
                    {!rs.done && (
                      <button
                        onClick={() => toggleRoomExpanded(room.room_id)}
                        style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 12, padding: '0 4px' }}
                      >
                        {rs.expanded ? '▼' : '▶'}
                      </button>
                    )}
                  </div>
                  {!rs.done && rs.expanded && (
                    <div style={{ marginTop: 6, marginLeft: 22, paddingLeft: 8, borderLeft: '1px solid var(--border)' }}>
                      {acts.length === 0 ? (
                        <div style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>(no activities)</div>
                      ) : acts.map(act => {
                        const ap = rs.activities[act.activity_id] || {};
                        return (
                          <div key={act.activity_id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '2px 0', fontSize: 10 }}>
                            <input
                              type="checkbox"
                              checked={!!ap.complete}
                              onChange={(e) => toggleActivity(room.room_id, act.activity_id, e.target.checked)}
                            />
                            <span style={{ flex: 1 }}>{act.activity_name}</span>
                            <input
                              type="number" min="0" max="100"
                              value={ap.pct ?? ''}
                              onChange={(e) => setActivityPct(room.room_id, act.activity_id, e.target.value)}
                              placeholder="—"
                              style={{ ...inputStyle(), width: 52, textAlign: 'right' }}
                            />
                            <span style={{ color: 'var(--text-muted)' }}>%</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {error && (
          <div style={{ color: '#e74c3c', fontSize: 11, marginBottom: 12 }}>❌ {error}</div>
        )}

        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 8 }}>
          Will write {plannedEntries.length} entr{plannedEntries.length === 1 ? 'y' : 'ies'} (hours split evenly).
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={() => !saving && onClose()} disabled={saving} style={cancelBtn(saving)}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={saveBtn(saving)}>
            {saving ? 'Saving...' : `Save ${plannedEntries.length} Entr${plannedEntries.length === 1 ? 'y' : 'ies'}`}
          </button>
        </div>
      </div>
    </div>
  );
}

// Helper: get all activities in a phase that touch a given room
function activitiesInRoom(phaseRollup, roomId) {
  return phaseRollup.activities.filter(act =>
    act.rooms.some(r => r.room_id === roomId)
  );
}

function inputStyle() {
  return {
    background: 'var(--bg-input, #161616)', color: 'var(--text)',
    border: '1px solid var(--border, #333)', padding: '3px 6px',
    borderRadius: 3, fontSize: 11,
  };
}
function cancelBtn(disabled) {
  return {
    background: 'transparent', border: '1px solid var(--border, #333)',
    color: 'var(--text)', padding: '6px 14px', borderRadius: 3,
    cursor: disabled ? 'not-allowed' : 'pointer', fontSize: 11,
  };
}
function saveBtn(disabled) {
  return {
    background: disabled ? 'var(--bg-input)' : 'var(--accent, #82aaff)',
    color: disabled ? 'var(--text-muted)' : 'var(--bg, #0f0f0f)',
    border: 'none', padding: '6px 14px', borderRadius: 3,
    cursor: disabled ? 'not-allowed' : 'pointer', fontSize: 11, fontWeight: 600,
  };
}
