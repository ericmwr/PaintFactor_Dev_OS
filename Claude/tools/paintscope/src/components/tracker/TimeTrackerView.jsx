import { useState } from 'react';
import { useProject } from '../../hooks/useProject';
import { useTimeEntries } from '../../hooks/useTimeEntries';
import TimeEntryForm from './TimeEntryForm';
import TimeEntrySummary from './TimeEntrySummary';

export default function TimeTrackerView({ estimate }) {
  const { state, projectId } = useProject();
  const { entries, loading, save, remove } = useTimeEntries(projectId);
  const [editingEntry, setEditingEntry] = useState(null);

  if (loading) return <div style={{ padding: 16, color: 'var(--text-muted)' }}>Loading...</div>;

  const rooms = state.rooms || [];

  const handleSave = async (entry) => {
    await save(entry);
    setEditingEntry(null);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this time entry?')) return;
    await remove(id);
  };

  return (
    <div style={{ padding: 16, maxWidth: 1000 }}>
      <h2 style={{ fontSize: 18, color: 'var(--accent)', marginBottom: 16 }}>Time Tracker</h2>

      {!projectId && (
        <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', background: 'rgba(255,190,100,0.06)', borderRadius: 'var(--radius-md)', marginBottom: 16 }}>
          Save this project first to enable time tracking. Go to Projects tab and create a project.
        </div>
      )}

      {/* Entry Form */}
      <div style={{ marginBottom: 24, padding: 16, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
        <h3 style={{ fontSize: 13, marginBottom: 12 }}>{editingEntry ? 'Edit Entry' : 'Log Time'}</h3>
        <TimeEntryForm
          key={editingEntry?.id || 'new'}
          entry={editingEntry}
          rooms={rooms}
          onSave={handleSave}
          onCancel={editingEntry ? () => setEditingEntry(null) : undefined}
        />
      </div>

      {/* Entries Table */}
      {entries.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 13, marginBottom: 8 }}>Recent Entries ({entries.length})</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                <th style={{ padding: '6px 8px' }}>Date</th>
                <th style={{ padding: '6px 8px' }}>Room</th>
                <th style={{ padding: '6px 8px' }}>Substrate</th>
                <th style={{ padding: '6px 8px' }}>Phase</th>
                <th style={{ padding: '6px 8px' }}>Hours</th>
                <th style={{ padding: '6px 8px' }}>Done %</th>
                <th style={{ padding: '6px 8px' }}>Worker</th>
                <th style={{ padding: '6px 8px' }}></th>
              </tr>
            </thead>
            <tbody>
              {entries.sort((a, b) => (b.date || '').localeCompare(a.date || '')).map(e => {
                const room = rooms.find(r => r.id === e.room_id);
                return (
                  <tr key={e.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '6px 8px' }}>{e.date}</td>
                    <td style={{ padding: '6px 8px' }}>{room?.label || e.room_id || '—'}</td>
                    <td style={{ padding: '6px 8px', fontSize: 11 }}>{e.substrate_type || '—'}</td>
                    <td style={{ padding: '6px 8px', fontSize: 11 }}>{e.task_category || '—'}</td>
                    <td style={{ padding: '6px 8px', fontFamily: 'monospace', fontWeight: 600 }}>{e.hours}</td>
                    <td style={{ padding: '6px 8px', fontFamily: 'monospace' }}>{e.completion_pct ?? '—'}%</td>
                    <td style={{ padding: '6px 8px', fontSize: 11 }}>{e.worker_name || '—'}</td>
                    <td style={{ padding: '6px 8px' }}>
                      <button className="btn btn-sm" onClick={() => setEditingEntry(e)} style={{ fontSize: 10, marginRight: 4 }}>Edit</button>
                      <button className="btn btn-sm" onClick={() => handleDelete(e.id)} style={{ fontSize: 10, color: '#e74c3c' }}>Del</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Summary */}
      <TimeEntrySummary entries={entries} rooms={rooms} estimate={estimate} />
    </div>
  );
}
