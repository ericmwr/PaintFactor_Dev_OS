import { useState } from 'react';
import { useAssemblies } from '../../hooks/useAssemblies';
import AssemblyEditor from './AssemblyEditor';

export default function AssemblyManagerView() {
  const { assemblies, loading, save, remove } = useAssemblies();
  const [selectedId, setSelectedId] = useState(null);
  const [creating, setCreating] = useState(false);

  if (loading) return <div style={{ padding: 16, color: 'var(--text-muted)' }}>Loading...</div>;

  const selected = assemblies.find(a => a.id === selectedId);

  const handleCreate = () => {
    setCreating(true);
    setSelectedId(null);
  };

  const handleSave = async (assembly) => {
    const saved = await save(assembly);
    setSelectedId(saved.id);
    setCreating(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this assembly?')) return;
    await remove(id);
    if (selectedId === id) setSelectedId(null);
  };

  return (
    <div style={{ padding: 16, display: 'flex', gap: 16, height: '100%' }}>
      {/* Assembly List */}
      <div style={{ width: 240, flexShrink: 0, overflowY: 'auto', borderRight: '1px solid var(--border)', paddingRight: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <h3 style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>Assemblies ({assemblies.length})</h3>
          <button className="btn btn-sm btn-accent" onClick={handleCreate} style={{ fontSize: 11 }}>+ New</button>
        </div>
        {assemblies.map(a => (
          <div
            key={a.id}
            onClick={() => { setSelectedId(a.id); setCreating(false); }}
            style={{
              padding: '6px 8px',
              fontSize: 12,
              cursor: 'pointer',
              borderRadius: 'var(--radius-sm)',
              background: a.id === selectedId ? 'rgba(130, 170, 255, 0.12)' : 'transparent',
              borderLeft: a.id === selectedId ? '2px solid var(--accent)' : '2px solid transparent',
              marginBottom: 2,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <div style={{ fontWeight: a.id === selectedId ? 600 : 400 }}>{a.name}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{a.category || 'uncategorized'} — {(a.tasks || []).length} tasks</div>
            </div>
            <button
              className="btn btn-sm"
              onClick={e => { e.stopPropagation(); handleDelete(a.id); }}
              style={{ fontSize: 10, color: '#e74c3c', padding: '2px 6px' }}
            >X</button>
          </div>
        ))}
        {assemblies.length === 0 && !creating && (
          <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
            No assemblies yet. Click "+ New" to create one.
          </div>
        )}
      </div>

      {/* Editor */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {(creating || selected) ? (
          <AssemblyEditor
            key={selected?.id || 'new'}
            assembly={selected || null}
            onSave={handleSave}
            onCancel={() => { setCreating(false); setSelectedId(null); }}
          />
        ) : (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
            Select an assembly or create a new one
          </div>
        )}
      </div>
    </div>
  );
}
