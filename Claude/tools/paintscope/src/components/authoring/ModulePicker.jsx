// Reusable module picker. Shows canonical + draft modules, filterable
// by phase and search. Click selects; parent receives the module_id.

import { useMemo, useState } from 'react';
import canonicalBundle from '../../data/scenario-bundle.gen.js';

export default function ModulePicker({ drafts = [], value = [], onChange, height = 240 }) {
  const [search, setSearch] = useState('');
  const [phaseFilter, setPhaseFilter] = useState('all');

  const allModules = useMemo(() => {
    const draftById = new Map(drafts.map(d => [d.id, d.payload || d]));
    const canon = Object.values(canonicalBundle.modules || {});
    const merged = canon.map(m => ({ id: m.module_id, name: m.name, phase: m.phase, source: draftById.has(m.module_id) ? 'draft' : 'canonical' }));
    const canonIds = new Set(canon.map(c => c.module_id));
    for (const d of drafts) {
      if (!canonIds.has(d.id)) {
        const p = d.payload || d;
        merged.push({ id: d.id, name: p.name, phase: p.phase, source: 'new' });
      }
    }
    return merged.sort((a, b) => a.id.localeCompare(b.id));
  }, [drafts]);

  const filtered = allModules.filter(m =>
    (phaseFilter === 'all' || m.phase === phaseFilter) &&
    (!search || m.id.toLowerCase().includes(search.toLowerCase()) || (m.name || '').toLowerCase().includes(search.toLowerCase()))
  );

  const addModule = (id) => {
    onChange([...value, id]);
  };

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 4, padding: 8, background: 'rgba(0,0,0,0.1)' }}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
        <input
          placeholder="Search..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, padding: '3px 6px', fontSize: 11, background: 'var(--bg-input, #222)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 3 }}
        />
        <select
          value={phaseFilter}
          onChange={e => setPhaseFilter(e.target.value)}
          style={{ padding: '3px 6px', fontSize: 11, background: 'var(--bg-input, #222)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 3 }}
        >
          <option value="all">all</option>
          {['setup', 'prep', 'prime', 'apply', 'finish', 'interstage', 'cleanup'].map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>
      <div style={{ maxHeight: height, overflowY: 'auto' }}>
        {filtered.map(m => (
          <div
            key={m.id}
            onClick={() => addModule(m.id)}
            style={{
              padding: '3px 6px', fontSize: 10, cursor: 'pointer', borderBottom: '1px dotted var(--border)',
              display: 'flex', justifyContent: 'space-between', gap: 4,
            }}
          >
            <span style={{ fontFamily: 'var(--font-mono)' }}>{m.id}</span>
            <span style={{ color: 'var(--text-muted)' }}>{m.phase}</span>
          </div>
        ))}
        {filtered.length === 0 && <div style={{ padding: 10, textAlign: 'center', color: 'var(--text-muted)', fontSize: 11 }}>No matches</div>}
      </div>
    </div>
  );
}
