import { useState } from 'react';

const PHASES = ['setup', 'prep', 'prime', 'apply', 'interstage', 'finish', 'cleanup'];

export default function TimeEntryForm({ entry, rooms, onSave, onCancel }) {
  const today = new Date().toISOString().slice(0, 10);
  const [roomId, setRoomId] = useState(entry?.room_id || '');
  const [substrateType, setSubstrateType] = useState(entry?.substrate_type || '');
  const [taskCategory, setTaskCategory] = useState(entry?.task_category || 'apply');
  const [hours, setHours] = useState(entry?.hours ?? '');
  const [completionPct, setCompletionPct] = useState(entry?.completion_pct ?? '');
  const [date, setDate] = useState(entry?.date || today);
  const [workerName, setWorkerName] = useState(entry?.worker_name || '');
  const [notes, setNotes] = useState(entry?.notes || '');

  const selectedRoom = rooms.find(r => r.id === roomId);
  const substrates = selectedRoom ? Object.keys(selectedRoom.substrates || {}) : [];

  const handleSave = () => {
    if (!hours) return;
    onSave({
      ...(entry || {}),
      room_id: roomId,
      substrate_type: substrateType,
      task_category: taskCategory,
      hours: parseFloat(hours) || 0,
      completion_pct: completionPct !== '' ? parseInt(completionPct) : null,
      date,
      worker_name: workerName,
      notes,
    });
    if (!entry) {
      // Reset for new entry
      setHours('');
      setCompletionPct('');
      setNotes('');
    }
  };

  return (
    <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8 }}>
      <div className="setup-field">
        <label style={{ fontSize: 11 }}>Date</label>
        <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ fontSize: 12 }} />
      </div>
      <div className="setup-field">
        <label style={{ fontSize: 11 }}>Room</label>
        <select value={roomId} onChange={e => { setRoomId(e.target.value); setSubstrateType(''); }} style={{ fontSize: 12 }}>
          <option value="">Select room</option>
          {rooms.map(r => <option key={r.id} value={r.id}>{r.label || r.id}</option>)}
        </select>
      </div>
      <div className="setup-field">
        <label style={{ fontSize: 11 }}>Substrate</label>
        <select value={substrateType} onChange={e => setSubstrateType(e.target.value)} style={{ fontSize: 12 }}>
          <option value="">All / general</option>
          {substrates.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div className="setup-field">
        <label style={{ fontSize: 11 }}>Phase</label>
        <select value={taskCategory} onChange={e => setTaskCategory(e.target.value)} style={{ fontSize: 12 }}>
          {PHASES.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>
      <div className="setup-field">
        <label style={{ fontSize: 11 }}>Hours</label>
        <input type="number" step="0.25" value={hours} onChange={e => setHours(e.target.value)} placeholder="0.0" style={{ fontSize: 12 }} />
      </div>
      <div className="setup-field">
        <label style={{ fontSize: 11 }}>Completion %</label>
        <input type="number" min="0" max="100" value={completionPct} onChange={e => setCompletionPct(e.target.value)} placeholder="0-100" style={{ fontSize: 12 }} />
      </div>
      <div className="setup-field">
        <label style={{ fontSize: 11 }}>Worker</label>
        <input value={workerName} onChange={e => setWorkerName(e.target.value)} placeholder="Name" style={{ fontSize: 12 }} />
      </div>
      <div className="setup-field">
        <label style={{ fontSize: 11 }}>Notes</label>
        <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional" style={{ fontSize: 12 }} />
      </div>
      <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 8, marginTop: 4 }}>
        <button className="btn btn-accent" onClick={handleSave} style={{ fontSize: 12 }}>
          {entry ? 'Update' : 'Log Entry'}
        </button>
        {onCancel && <button className="btn btn-sm" onClick={onCancel} style={{ fontSize: 12 }}>Cancel</button>}
      </div>
    </div>
  );
}
