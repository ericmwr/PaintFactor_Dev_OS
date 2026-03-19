import { useState } from 'react';
import ProjectMetadataForm from './ProjectMetadataForm';

const STATUS_LABELS = {
  draft: 'Draft',
  estimated: 'Estimated',
  in_progress: 'In Progress',
  completed: 'Completed',
};

const STATUS_COLORS = {
  draft: '#888',
  estimated: 'var(--accent)',
  in_progress: '#e67e22',
  completed: '#27ae60',
};

export default function ProjectListView({ projects, activeProjectId, onSelect, onCreate, onDelete, onSave }) {
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState(null);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    await onCreate(newName.trim());
    setNewName('');
    setShowNew(false);
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!confirm('Delete this project? This cannot be undone.')) return;
    await onDelete(id);
  };

  const activeProject = projects.find(p => p.id === editingId);

  return (
    <div style={{ padding: 16, maxWidth: 900 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, color: 'var(--accent)', margin: 0 }}>Projects</h2>
        <button className="btn btn-accent" onClick={() => setShowNew(true)} style={{ fontSize: 13 }}>
          + New Project
        </button>
      </div>

      {showNew && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, padding: 12, background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
          <input
            autoFocus
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
            placeholder="Project name..."
            style={{ flex: 1, padding: '6px 10px', fontSize: 13 }}
          />
          <button className="btn btn-accent" onClick={handleCreate} style={{ fontSize: 12 }}>Create</button>
          <button className="btn btn-sm" onClick={() => { setShowNew(false); setNewName(''); }} style={{ fontSize: 12 }}>Cancel</button>
        </div>
      )}

      {projects.length === 0 && !showNew && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
          No projects yet. Create one to get started.
        </div>
      )}

      <div style={{ display: 'grid', gap: 8 }}>
        {projects.map(p => (
          <div
            key={p.id}
            onClick={() => onSelect(p.id)}
            style={{
              padding: '12px 16px',
              background: p.id === activeProjectId ? 'rgba(130, 170, 255, 0.08)' : 'var(--bg-card)',
              border: `1px solid ${p.id === activeProjectId ? 'var(--accent)' : 'var(--border)'}`,
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              transition: 'border-color 0.15s',
            }}
          >
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>{p.name}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', gap: 12 }}>
                {p.client_name && <span>{p.client_name}</span>}
                <span>{new Date(p.updated_at).toLocaleDateString()}</span>
                <span style={{ color: STATUS_COLORS[p.status] || '#888' }}>
                  {STATUS_LABELS[p.status] || p.status}
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                className="btn btn-sm"
                onClick={e => { e.stopPropagation(); setEditingId(editingId === p.id ? null : p.id); }}
                title="Edit details"
                style={{ fontSize: 11 }}
              >Edit</button>
              <button
                className="btn btn-sm"
                onClick={e => handleDelete(e, p.id)}
                title="Delete project"
                style={{ fontSize: 11, color: '#e74c3c' }}
              >Del</button>
            </div>
          </div>
        ))}
      </div>

      {editingId && activeProject && (
        <div style={{ marginTop: 16, padding: 16, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
          <ProjectMetadataForm
            project={activeProject}
            onSave={async (updates) => {
              await onSave(editingId, updates.name, updates.client_name, updates.address, updates.status, null);
              setEditingId(null);
            }}
            onCancel={() => setEditingId(null)}
          />
        </div>
      )}
    </div>
  );
}
