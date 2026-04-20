// Task list / manager — parallel to ModuleList/ScenarioList/ModifierList.
// Sources:
//   1. Canonical tasks from scenario-bundle.gen.js (bundle.tasks)
//   2. IndexedDB drafts (task_drafts)
// Drafts win on id collision and are badged.

import { useMemo, useState, useEffect } from 'react';
import { useTaskDrafts } from '../../hooks/useTaskDrafts.js';
import canonicalBundle from '../../data/scenario-bundle.gen.js';
import TaskEditor from './TaskEditor.jsx';
import { publishTask } from '../../authoring/publish.js';

export default function TaskList({ pendingSelection, onNavigateToModule } = {}) {
  const { drafts, loading, save, remove } = useTaskDrafts();
  const [selected, setSelected] = useState(null);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState('');

  const rows = useMemo(() => {
    const draftById = new Map(drafts.map(d => [d.id, d]));
    const canon = Object.values(canonicalBundle.tasks || {});
    const merged = canon.map(t => {
      const d = draftById.get(t.task_id);
      return d
        ? { id: t.task_id, payload: d.payload || d, name: t.name, source: 'draft', status: d.status }
        : { id: t.task_id, payload: t, name: t.name, source: 'canonical', status: 'canonical' };
    });
    // Draft-only (newly authored, not yet in bundle)
    const canonIds = new Set(canon.map(c => c.task_id));
    for (const d of drafts) {
      if (!canonIds.has(d.id)) {
        merged.push({ id: d.id, payload: d.payload || d, name: (d.payload || d).name, source: 'new', status: d.status });
      }
    }
    return merged
      .filter(r => !search || r.id.toLowerCase().includes(search.toLowerCase()) || (r.name || '').toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => a.id.localeCompare(b.id));
  }, [drafts, search]);

  useEffect(() => {
    if (!pendingSelection) return;
    const row = rows.find(r => r.id === pendingSelection.id);
    if (row) {
      setSelected({ id: row.id, payload: row.payload, status: row.status === 'canonical' ? 'local_override' : row.status });
      setCreating(false);
    }
  }, [pendingSelection?.nonce]);  // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <div style={{ padding: 16, color: 'var(--text-muted)' }}>Loading tasks...</div>;

  const handleSelect = (row) => {
    setSelected({ id: row.id, payload: row.payload, status: row.status === 'canonical' ? 'local_override' : row.status });
    setCreating(false);
  };

  const handleCreate = () => {
    setSelected(null);
    setCreating(true);
  };

  const handleSave = async (rec) => {
    const saved = await save(rec);
    setSelected(saved);
    setCreating(false);
  };

  const handleDelete = async (id) => {
    if (!confirm(`Delete draft for ${id}? Canonical task remains untouched.`)) return;
    await remove(id);
    if (selected?.id === id) setSelected(null);
  };

  const handlePublish = async (rec) => {
    if (!confirm(`Publish ${rec.id} to Claude/tasks/${rec.id}.json? (Writes to disk — commit manually.)`)) return;
    try {
      const r = await publishTask(rec);
      alert(`Published to ${r.path}`);
      setSelected({ ...rec, status: 'published' });
    } catch (e) {
      alert(`Publish failed: ${e.message}`);
    }
  };

  return (
    <div style={{ display: 'flex', gap: 12, height: '100%' }}>
      {/* Left: list */}
      <div style={{ width: 320, flexShrink: 0, display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border)', paddingRight: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <h3 style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>Tasks ({rows.length})</h3>
          <button className="btn btn-sm btn-accent" onClick={handleCreate} style={{ fontSize: 11 }}>+ New</button>
        </div>
        <input
          placeholder="Search id / name..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ marginBottom: 6, padding: '4px 6px', fontSize: 11, background: 'var(--bg-input, #222)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 3 }}
        />
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {rows.map(r => {
            const isSel = selected?.id === r.id;
            const badgeColor = r.source === 'draft' ? '#e0b84a' : r.source === 'new' ? '#5aa85a' : '#555';
            const rate = r.payload?.rate_per_hour;
            const uom = r.payload?.uom;
            return (
              <div
                key={r.id}
                onClick={() => handleSelect(r)}
                style={{
                  padding: '5px 8px',
                  fontSize: 11,
                  cursor: 'pointer',
                  borderRadius: 3,
                  background: isSel ? 'rgba(130, 170, 255, 0.12)' : 'transparent',
                  borderLeft: isSel ? '2px solid var(--accent, #82aaff)' : '2px solid transparent',
                  marginBottom: 2,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10 }}>{r.id}</span>
                  <span style={{ fontSize: 9, padding: '1px 4px', background: badgeColor, borderRadius: 2, color: '#000' }}>{r.source}</span>
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                  {r.name}{rate ? ` — ${rate} ${uom}/hr` : ''}
                </div>
                {r.source === 'draft' && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
                    <button
                      onClick={e => { e.stopPropagation(); handleDelete(r.id); }}
                      style={{ fontSize: 9, color: '#e74c3c', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                    >delete draft</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Right: editor */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {(creating || selected) ? (
          <TaskEditor
            key={selected?.id || 'new'}
            draft={selected}
            onSave={handleSave}
            onCancel={() => { setCreating(false); setSelected(null); }}
            onPublish={handlePublish}
            onNavigateToModule={onNavigateToModule}
          />
        ) : (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
            Select a task to edit, or click <strong>+ New</strong> to create one.
          </div>
        )}
      </div>
    </div>
  );
}
