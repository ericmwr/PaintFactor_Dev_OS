import { useState, useMemo } from 'react';
import { useProject } from '../../hooks/useProject';
import { useTrackerSnapshot } from '../../hooks/useTrackerSnapshot';
import { useTimeEntries } from '../../hooks/useTimeEntries';
import { computeRoomCompletion } from '../../tracker/rollup.js';

const VIRTUAL_PARENTS = ['project_setup', 'project_protection', 'project_cleanup'];

export default function LogTimeForm({ activity, entries, onClose, onSaved }) {
  const { state, dispatch, projectId } = useProject();
  const { snapshot } = useTrackerSnapshot(projectId);
  const { save: saveEntry } = useTimeEntries(projectId);

  const isProjectLevel = VIRTUAL_PARENTS.includes(activity.element_parent);
  const defaultMode = isProjectLevel || activity.rooms.length === 0 ? 'project' : 'rooms';

  const today = new Date().toISOString().slice(0, 10);
  const [worker, setWorker] = useState('');
  const [date, setDate] = useState(today);
  const [hours, setHours] = useState('');
  const [mode, setMode] = useState(defaultMode);
  const [notes, setNotes] = useState('');
  const [projectPct, setProjectPct] = useState('');
  const [roomProgress, setRoomProgress] = useState(() => {
    const init = {};
    for (const room of activity.rooms) {
      init[room.room_id] = { complete: false, pct: '' };
    }
    return init;
  });
  const [allRoomsChecked, setAllRoomsChecked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const roster = state.project?.tracker_roster || [];
  const previousRoomPcts = useMemo(() => {
    const map = {};
    for (const room of activity.rooms) {
      map[room.room_id] = computeRoomCompletion(room.room_id, entries);
    }
    return map;
  }, [activity.rooms, entries]);

  const toggleAllRooms = (checked) => {
    setAllRoomsChecked(checked);
    if (checked) {
      const next = {};
      for (const room of activity.rooms) {
        next[room.room_id] = { complete: true, pct: 100 };
      }
      setRoomProgress(next);
    }
  };

  const toggleRoomComplete = (roomId, checked) => {
    setRoomProgress(prev => ({
      ...prev,
      [roomId]: { complete: checked, pct: checked ? 100 : (prev[roomId]?.pct ?? '') },
    }));
    if (!checked) setAllRoomsChecked(false);
  };

  const setRoomPct = (roomId, val) => {
    const num = val === '' ? '' : Math.max(0, Math.min(100, parseInt(val, 10) || 0));
    setRoomProgress(prev => ({
      ...prev,
      [roomId]: { complete: num === 100, pct: num },
    }));
    if (num !== 100) setAllRoomsChecked(false);
  };

  const handleSave = async () => {
    setError(null);
    const h = parseFloat(hours);
    if (!isFinite(h) || h <= 0) { setError('Hours must be a positive number.'); return; }
    if (!worker.trim()) { setError('Worker name required.'); return; }
    if (mode === 'project') {
      const p = parseInt(projectPct, 10);
      if (!isFinite(p) || p < 0 || p > 100) { setError('Project completion % must be 0-100.'); return; }
    }
    if (!snapshot) { setError('Missing snapshot — cannot save entry.'); return; }

    setSaving(true);
    try {
      const base = {
        id: `entry_${Date.now()}`,
        project_id: projectId,
        snapshot_id: snapshot.snapshot_id,
        activity_id: activity.activity_id,
        worker_name: worker.trim(),
        date,
        hours: h,
        notes: notes.trim(),
        created_at: new Date().toISOString(),
        mode,
      };
      const entry = mode === 'project'
        ? { ...base, project_completion_pct: parseInt(projectPct, 10) }
        : (() => {
            const room_progress = {};
            for (const [roomId, val] of Object.entries(roomProgress)) {
              if (val.pct === '' || val.pct == null) continue;
              room_progress[roomId] = { complete: !!val.complete, pct: Number(val.pct) };
            }
            return { ...base, room_progress };
          })();

      await saveEntry(entry);
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
        display: 'flex', alignItems: 'stretch', justifyContent: 'flex-end',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--bg-card, #1f1f1f)', color: 'var(--text)',
          border: '1px solid var(--border, #333)', borderLeft: '2px solid var(--accent)',
          padding: 16, width: 360, maxWidth: '100%', overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          boxShadow: '-8px 0 24px rgba(0,0,0,0.6)',
        }}
      >
        <div
          style={{
            position: 'sticky',
            top: -16,
            margin: '-16px -16px 12px -16px',
            padding: '10px 16px',
            background: 'var(--bg-card, #1f1f1f)',
            borderBottom: '1px solid var(--border, #333)',
            display: 'flex', alignItems: 'center', gap: 10,
            zIndex: 10,
          }}
        >
          <button
            onClick={() => !saving && onClose()}
            disabled={saving}
            style={backBtnStyle(saving)}
            aria-label="Back to Tracker"
          >← Back</button>
          <h3 style={{
            margin: 0, fontSize: 13, color: 'var(--accent)',
            flex: 1, minWidth: 0,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {activity.activity_name}
          </h3>
          <span style={{ fontSize: 10, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
            est {activity.estimated_hours.toFixed(1)}h
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: 6, fontSize: 11, marginBottom: 12 }}>
          <span style={{ color: 'var(--text-muted)' }}>Worker</span>
          <input
            value={worker}
            list="tracker-roster"
            onChange={(e) => setWorker(e.target.value)}
            placeholder="Name"
            style={inputStyle()}
          />
          <datalist id="tracker-roster">
            {roster.map(n => <option key={n} value={n} />)}
          </datalist>
          <span style={{ color: 'var(--text-muted)' }}>Date</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={inputStyle()} />
          <span style={{ color: 'var(--text-muted)' }}>Hours</span>
          <input type="number" step="0.25" min="0" value={hours} onChange={(e) => setHours(e.target.value)} placeholder="0.0" style={inputStyle()} />
        </div>

        <div style={{ marginBottom: 12 }}>
          <span style={{ fontSize: 10, color: 'var(--text-muted)', marginRight: 8 }}>Mode:</span>
          <button onClick={() => setMode('project')} style={modeBtn(mode === 'project')}>Project-wide</button>
          <button
            onClick={() => setMode('rooms')}
            disabled={activity.rooms.length === 0}
            style={modeBtn(mode === 'rooms')}
          >Per-room</button>
        </div>

        {mode === 'project' && (
          <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: 6, fontSize: 11, marginBottom: 12 }}>
            <span style={{ color: 'var(--text-muted)' }}>Completion</span>
            <input type="number" min="0" max="100" value={projectPct} onChange={(e) => setProjectPct(e.target.value)} placeholder="0-100" style={inputStyle()} />
          </div>
        )}

        {mode === 'rooms' && activity.rooms.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: 0.5, marginBottom: 6 }}>
              ═══ ROOM PROGRESS ═══
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, fontSize: 11, fontWeight: 600 }}>
              <input type="checkbox" checked={allRoomsChecked} onChange={(e) => toggleAllRooms(e.target.checked)} />
              All rooms
              <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 6 }}>(bulk-set 100%)</span>
            </label>
            {activity.rooms.map(room => (
              <div key={room.room_id} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, fontSize: 11 }}>
                <input
                  type="checkbox"
                  checked={!!roomProgress[room.room_id]?.complete}
                  onChange={(e) => toggleRoomComplete(room.room_id, e.target.checked)}
                />
                <span style={{ flex: 1 }}>
                  {room.room_label}
                  <span style={{ color: 'var(--text-muted)', fontSize: 10, marginLeft: 6 }}>
                    (was {previousRoomPcts[room.room_id]}%)
                  </span>
                </span>
                <input
                  type="number" min="0" max="100"
                  value={roomProgress[room.room_id]?.pct ?? ''}
                  onChange={(e) => setRoomPct(room.room_id, e.target.value)}
                  placeholder="—"
                  style={{ ...inputStyle(), width: 56, textAlign: 'right' }}
                />
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: 6, fontSize: 11, marginBottom: 16 }}>
          <span style={{ color: 'var(--text-muted)' }}>Notes</span>
          <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" style={inputStyle()} />
        </div>

        {error && (
          <div style={{ color: '#e74c3c', fontSize: 11, marginBottom: 12 }}>❌ {error}</div>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={() => !saving && onClose()} disabled={saving} style={cancelBtn(saving)}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={saveBtn(saving)}>
            {saving ? 'Saving...' : 'Save Entry'}
          </button>
        </div>
      </div>
    </div>
  );
}

function inputStyle() {
  return {
    background: 'var(--bg-input, #161616)', color: 'var(--text)',
    border: '1px solid var(--border, #333)', padding: '3px 6px',
    borderRadius: 3, fontSize: 11,
  };
}

function modeBtn(active) {
  return {
    background: active ? 'var(--accent, #82aaff)' : 'transparent',
    color: active ? 'var(--bg, #0f0f0f)' : 'var(--text)',
    border: '1px solid var(--border, #333)',
    padding: '3px 8px', marginRight: 6, borderRadius: 3,
    fontSize: 11, cursor: 'pointer', fontWeight: active ? 600 : 400,
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
function backBtnStyle(disabled) {
  return {
    background: 'var(--bg-input, #161616)',
    border: '1px solid var(--border, #333)',
    color: 'var(--text)',
    padding: '8px 14px',
    borderRadius: 4,
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: 12,
    fontWeight: 600,
    whiteSpace: 'nowrap',
  };
}
