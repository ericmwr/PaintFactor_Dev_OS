import { useState, useMemo } from 'react';
import { useProject } from '../../hooks/useProject';
import { useTrackerSnapshot } from '../../hooks/useTrackerSnapshot';
import { useTimeEntries } from '../../hooks/useTimeEntries';

const PHASE_LABELS = {
  setup: 'Setup', prep: 'Prep', prime: 'Prime', apply: 'Apply',
  interstage: 'Interstage', finish: 'Finish', cleanup: 'Cleanup',
};

const STAGE_LABELS = { install: 'Install', remove: 'Remove' };

// Each "task" the user can pick is identified by a compound key:
//   `<activity_id>`              — log against the whole activity (unstaged)
//   `<activity_id>::<stage>`     — log against a specific lifecycle stage
const keyFor = (activityId, stage) => stage ? `${activityId}::${stage}` : activityId;
function parseKey(key) {
  const idx = key.indexOf('::');
  if (idx === -1) return { activity_id: key, stage: null };
  return { activity_id: key.slice(0, idx), stage: key.slice(idx + 2) };
}
function activityKeys(act) {
  if (act.stages && act.stages.length >= 2) {
    return act.stages.map(s => keyFor(act.activity_id, s.stage));
  }
  return [act.activity_id];
}

/**
 * PhaseLogForm — daily log mode at the phase level.
 *
 * Layout: Worker / Date / Hours header → "Log Full Phase" quick action →
 * Tasks multi-select shared by two batches: Completed Rooms (logs at 100%)
 * and Partial Rooms (logs at a given %). Each Log button fires an
 * independent save using the current Hours value (split evenly across the
 * entries that batch generates).
 *
 * One entry per selected task, with room_progress carrying every selected
 * room — keeps entry count tight (2 tasks × 3 rooms = 2 entries, not 6).
 *
 * Props:
 *  - phaseRollup: { phase, estimated_hours, rooms, activities }
 *  - onClose:     () => void
 *  - onSaved:     () => void (refresh parent)
 */
export default function PhaseLogForm({ phaseRollup, onClose, onSaved }) {
  const { state, dispatch, projectId } = useProject();
  const { snapshot } = useTrackerSnapshot(projectId);
  const { save: saveEntry } = useTimeEntries(projectId);

  const today = new Date().toISOString().slice(0, 10);
  const [worker, setWorker] = useState('');
  const [date, setDate] = useState(today);
  const [hours, setHours] = useState('');
  const [selectedTasks, setSelectedTasks] = useState(() => new Set());
  const [completedRooms, setCompletedRooms] = useState(() => new Set());
  const [partialRooms, setPartialRooms] = useState(() => new Set());
  const [partialPct, setPartialPct] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [recentBatch, setRecentBatch] = useState(null); // { label, count } shown after save

  const roster = state.project?.tracker_roster || [];

  // Flat list of every checkbox key in the tasks section — staged activities
  // contribute one key per stage, unstaged contribute one key.
  const allTaskKeys = useMemo(
    () => phaseRollup.activities.flatMap(activityKeys),
    [phaseRollup],
  );
  const allRoomIds = useMemo(() => phaseRollup.rooms.map(r => r.room_id), [phaseRollup]);

  const allTasksChecked = selectedTasks.size === allTaskKeys.length && allTaskKeys.length > 0;
  const allCompletedChecked = completedRooms.size === allRoomIds.length && allRoomIds.length > 0;
  const allPartialChecked = partialRooms.size === allRoomIds.length && allRoomIds.length > 0;

  const toggleSet = (setter) => (id) => setter(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const toggleTask = toggleSet(setSelectedTasks);
  const toggleCompleted = toggleSet(setCompletedRooms);
  const togglePartial = toggleSet(setPartialRooms);

  const toggleAllTasks = () => {
    setSelectedTasks(allTasksChecked ? new Set() : new Set(allTaskKeys));
  };
  const toggleAllCompleted = () => {
    setCompletedRooms(allCompletedChecked ? new Set() : new Set(allRoomIds));
  };
  const toggleAllPartial = () => {
    setPartialRooms(allPartialChecked ? new Set() : new Set(allRoomIds));
  };

  const validateCommon = () => {
    setError(null);
    const h = parseFloat(hours);
    if (!isFinite(h) || h <= 0) { setError('Hours must be a positive number.'); return null; }
    if (!worker.trim()) { setError('Worker name required.'); return null; }
    if (!snapshot) { setError('Missing snapshot.'); return null; }
    return h;
  };

  // Write N entries (one per task key) with the given room_progress shape.
  // Hours split evenly across the N entries. A compound key like
  // `<activity_id>::install` stamps the entry with stage='install' so the
  // tracker rolls those hours up under the right stage.
  const writeBatch = async (taskKeys, roomProgress, batchLabel) => {
    const h = validateCommon();
    if (h == null) return;
    if (taskKeys.length === 0) { setError('Pick at least one task.'); return; }
    if (Object.keys(roomProgress).length === 0) { setError('Pick at least one room.'); return; }

    setSaving(true);
    try {
      const hoursPerEntry = Math.round((h / taskKeys.length) * 100) / 100;
      const created_at = new Date().toISOString();
      let i = 0;
      for (const key of taskKeys) {
        const { activity_id, stage } = parseKey(key);
        const entry = {
          id: `entry_${Date.now()}_${i++}`,
          project_id: projectId,
          snapshot_id: snapshot.snapshot_id,
          activity_id,
          ...(stage ? { stage } : {}),
          worker_name: worker.trim(),
          date,
          hours: hoursPerEntry,
          notes: `phase log: ${phaseRollup.label || PHASE_LABELS[phaseRollup.phase] || phaseRollup.phase} — ${batchLabel}`,
          created_at,
          mode: 'rooms',
          room_progress: roomProgress,
          phase_log: true,
        };
        await saveEntry(entry);
      }
      dispatch({ type: 'APPEND_ROSTER_NAME', payload: worker.trim() });
      if (onSaved) await onSaved();
      setRecentBatch({ label: batchLabel, count: taskKeys.length });
      setHours(''); // clear hours so the next batch needs a fresh allocation
    } catch (err) {
      setError(err?.message || String(err));
    } finally {
      setSaving(false);
    }
  };

  const handleLogFullPhase = async () => {
    const allRoomProgress = Object.fromEntries(
      allRoomIds.map(rid => [rid, { complete: true, pct: 100 }])
    );
    await writeBatch(allTaskKeys, allRoomProgress, 'full phase');
    setCompletedRooms(new Set()); setPartialRooms(new Set()); setSelectedTasks(new Set());
  };

  const handleLogCompleted = async () => {
    const roomProgress = Object.fromEntries(
      [...completedRooms].map(rid => [rid, { complete: true, pct: 100 }])
    );
    await writeBatch([...selectedTasks], roomProgress, 'completed rooms');
    setCompletedRooms(new Set());
  };

  const handleLogPartial = async () => {
    const pct = parseInt(partialPct, 10);
    if (!isFinite(pct) || pct < 0 || pct > 100) {
      setError('Partial % must be 0-100.');
      return;
    }
    const roomProgress = Object.fromEntries(
      [...partialRooms].map(rid => [rid, { complete: pct === 100, pct }])
    );
    await writeBatch([...selectedTasks], roomProgress, `partial rooms @ ${pct}%`);
    setPartialRooms(new Set());
    setPartialPct('');
  };

  const completedCount = selectedTasks.size * completedRooms.size;
  const partialCount = selectedTasks.size * partialRooms.size;

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
          padding: 16, width: 440, maxWidth: '100%', overflowY: 'auto',
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
            Log Time — {phaseRollup.label || PHASE_LABELS[phaseRollup.phase] || phaseRollup.phase}
          </h3>
          <span style={{ fontSize: 10, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
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
          <span style={{ color: 'var(--text-muted)' }}>Hours</span>
          <input type="number" step="0.25" min="0" value={hours} onChange={(e) => setHours(e.target.value)} placeholder="0.0" style={inputStyle()} />
        </div>

        {/* Quick: full phase done */}
        <div style={{ marginBottom: 14, padding: 8, background: 'rgba(95, 213, 95, 0.05)', border: '1px solid rgba(95, 213, 95, 0.2)', borderRadius: 3 }}>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 6 }}>Quick action — entire phase done across the whole project:</div>
          <button onClick={handleLogFullPhase} disabled={saving} style={primaryBtn(saving)}>
            Log Full Phase Complete ({allTaskKeys.length} tasks × {allRoomIds.length} rooms)
          </button>
        </div>

        <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: 0.5, marginBottom: 6, marginTop: 6 }}>
          ═══ OR PICK TASKS + ROOMS ═══
        </div>

        {/* Tasks */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>TASKS ({selectedTasks.size} of {allTaskKeys.length} selected)</div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, fontSize: 11, fontWeight: 600 }}>
            <input type="checkbox" checked={allTasksChecked} onChange={toggleAllTasks} /> All tasks
          </label>
          {phaseRollup.activities.map(act => {
            const staged = act.stages && act.stages.length >= 2;
            if (!staged) {
              return (
                <div key={act.activity_id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '2px 0', fontSize: 11 }}>
                  <input
                    type="checkbox"
                    checked={selectedTasks.has(act.activity_id)}
                    onChange={() => toggleTask(act.activity_id)}
                  />
                  <span style={{ flex: 1 }}>{act.activity_name}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>{act.estimated_hours.toFixed(1)}h</span>
                </div>
              );
            }
            return (
              <div key={act.activity_id} style={{ padding: '2px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontStyle: 'italic', color: 'var(--text-muted)' }}>
                  <span style={{ width: 13 }} />
                  <span style={{ flex: 1 }}>{act.activity_name}</span>
                  <span style={{ fontSize: 10 }}>{act.estimated_hours.toFixed(1)}h total</span>
                </div>
                {act.stages.map(s => {
                  const k = keyFor(act.activity_id, s.stage);
                  return (
                    <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '2px 0 2px 18px', fontSize: 11 }}>
                      <input
                        type="checkbox"
                        checked={selectedTasks.has(k)}
                        onChange={() => toggleTask(k)}
                      />
                      <span style={{ flex: 1 }}>{STAGE_LABELS[s.stage] || s.stage}</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>{s.estimated_hours.toFixed(1)}h</span>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Completed rooms */}
        <div style={{ marginBottom: 12, padding: 8, background: 'rgba(130, 170, 255, 0.04)', borderRadius: 3 }}>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>
            COMPLETED ROOMS — selected tasks finished 100% in these rooms
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, fontSize: 11, fontWeight: 600 }}>
            <input type="checkbox" checked={allCompletedChecked} onChange={toggleAllCompleted} /> All rooms
          </label>
          {phaseRollup.rooms.map(room => (
            <div key={room.room_id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '2px 0', fontSize: 11 }}>
              <input type="checkbox" checked={completedRooms.has(room.room_id)} onChange={() => toggleCompleted(room.room_id)} />
              <span style={{ flex: 1 }}>{room.room_label}</span>
              <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>{room.estimated_hours.toFixed(1)}h est</span>
            </div>
          ))}
          <button
            onClick={handleLogCompleted}
            disabled={saving || selectedTasks.size === 0 || completedRooms.size === 0}
            style={secondaryBtn(saving || selectedTasks.size === 0 || completedRooms.size === 0)}
          >
            Log {completedCount} Completed{completedCount === 1 ? ' entry' : ' entries'}
            {selectedTasks.size > 0 && completedRooms.size > 0 && ` (${selectedTasks.size} task${selectedTasks.size === 1 ? '' : 's'} × ${completedRooms.size} room${completedRooms.size === 1 ? '' : 's'})`}
          </button>
        </div>

        {/* Partial rooms */}
        <div style={{ marginBottom: 12, padding: 8, background: 'rgba(241, 196, 15, 0.04)', borderRadius: 3 }}>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>PARTIAL ROOMS — selected tasks at</span>
            <input
              type="number" min="0" max="100"
              value={partialPct}
              onChange={(e) => setPartialPct(e.target.value)}
              placeholder="—"
              style={{ ...inputStyle(), width: 50, padding: '2px 4px' }}
            />
            <span>%</span>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, fontSize: 11, fontWeight: 600 }}>
            <input type="checkbox" checked={allPartialChecked} onChange={toggleAllPartial} /> All rooms
          </label>
          {phaseRollup.rooms.map(room => (
            <div key={room.room_id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '2px 0', fontSize: 11 }}>
              <input type="checkbox" checked={partialRooms.has(room.room_id)} onChange={() => togglePartial(room.room_id)} />
              <span style={{ flex: 1 }}>{room.room_label}</span>
              <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>{room.estimated_hours.toFixed(1)}h est</span>
            </div>
          ))}
          <button
            onClick={handleLogPartial}
            disabled={saving || selectedTasks.size === 0 || partialRooms.size === 0 || !partialPct}
            style={secondaryBtn(saving || selectedTasks.size === 0 || partialRooms.size === 0 || !partialPct)}
          >
            Log {partialCount} Partial{partialCount === 1 ? ' entry' : ' entries'}
            {selectedTasks.size > 0 && partialRooms.size > 0 && partialPct && ` (${selectedTasks.size} task${selectedTasks.size === 1 ? '' : 's'} × ${partialRooms.size} room${partialRooms.size === 1 ? '' : 's'} @ ${partialPct}%)`}
          </button>
        </div>

        {error && (
          <div style={{ color: '#e74c3c', fontSize: 11, marginBottom: 8 }}>❌ {error}</div>
        )}
        {recentBatch && (
          <div style={{ color: '#5d5', fontSize: 11, marginBottom: 8 }}>
            ✓ Logged {recentBatch.count} {recentBatch.label} entr{recentBatch.count === 1 ? 'y' : 'ies'}. Update Hours + select again to log more.
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={() => !saving && onClose()} disabled={saving} style={cancelBtn(saving)}>Done</button>
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
function primaryBtn(disabled) {
  return {
    background: disabled ? 'var(--bg-input)' : '#5d5',
    color: disabled ? 'var(--text-muted)' : 'var(--bg, #0f0f0f)',
    border: 'none', padding: '6px 14px', borderRadius: 3,
    cursor: disabled ? 'not-allowed' : 'pointer', fontSize: 11, fontWeight: 600, width: '100%',
  };
}
function secondaryBtn(disabled) {
  return {
    background: disabled ? 'var(--bg-input)' : 'var(--accent, #82aaff)',
    color: disabled ? 'var(--text-muted)' : 'var(--bg, #0f0f0f)',
    border: 'none', padding: '6px 14px', borderRadius: 3,
    cursor: disabled ? 'not-allowed' : 'pointer', fontSize: 11, fontWeight: 600, width: '100%', marginTop: 4,
  };
}
function cancelBtn(disabled) {
  return {
    background: 'transparent', border: '1px solid var(--border, #333)',
    color: 'var(--text)', padding: '6px 14px', borderRadius: 3,
    cursor: disabled ? 'not-allowed' : 'pointer', fontSize: 11,
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
