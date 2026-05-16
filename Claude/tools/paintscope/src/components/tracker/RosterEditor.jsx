import { useState } from 'react';
import { useProject } from '../../hooks/useProject';

export default function RosterEditor({ onClose }) {
  const { state, dispatch } = useProject();
  const roster = state.project?.tracker_roster || [];
  const [newName, setNewName] = useState('');

  const handleAdd = () => {
    if (!newName.trim()) return;
    dispatch({ type: 'APPEND_ROSTER_NAME', payload: newName.trim() });
    setNewName('');
  };

  const handleRemove = (name) => {
    dispatch({ type: 'REMOVE_ROSTER_NAME', payload: name });
  };

  return (
    <div
      onClick={onClose}
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
          padding: 20, maxWidth: 360, width: '90%',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 14 }}>Worker Roster</h3>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14 }}>×</button>
        </div>

        <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
            placeholder="New worker name"
            style={{ flex: 1, background: 'var(--bg-input, #161616)', color: 'var(--text)', border: '1px solid var(--border)', padding: '4px 8px', borderRadius: 3, fontSize: 12 }}
          />
          <button onClick={handleAdd} style={{ background: 'var(--accent)', color: 'var(--bg)', border: 'none', padding: '4px 12px', borderRadius: 3, fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>Add</button>
        </div>

        {roster.length === 0 ? (
          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic', padding: 8 }}>
            No workers yet. Add names here or they'll auto-append when you save time entries.
          </div>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {roster.map(name => (
              <li key={name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 8px', fontSize: 12, borderBottom: '1px solid var(--border)' }}>
                <span>{name}</span>
                <button
                  onClick={() => handleRemove(name)}
                  style={{ background: 'transparent', border: 'none', color: '#e74c3c', cursor: 'pointer', fontSize: 11 }}
                >Remove</button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
