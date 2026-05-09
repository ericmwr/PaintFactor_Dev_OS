// Module list / manager. Two sources:
//   1. Canonical modules from scenario-bundle.gen.js
//   2. IndexedDB drafts (module_drafts)
// Drafts win on id collision and are badged.

import { useMemo, useState, useEffect } from 'react';
import { useModuleDrafts } from '../../hooks/useModuleDrafts.js';
import canonicalBundle from '../../data/scenario-bundle.gen.js';
import ModuleEditor from './ModuleEditor.jsx';
import { publishModule } from '../../authoring/publish.js';
import TagFilterBar from './TagFilterBar.jsx';
import DomainContextChips from './DomainContextChips.jsx';
import { deriveModuleTags, computeChipCounts, rowPassesFilters } from './tag-derivation.js';
import { bucketsByModuleId } from '../../data/domain-context.js';

const PHASE_FILTERS = ['all', 'setup', 'prep', 'prime', 'apply', 'finish', 'interstage', 'cleanup'];

export default function ModuleList({ pendingSelection, onNavigateToScenario, onNavigateToTask } = {}) {
  const { drafts, loading, save, remove } = useModuleDrafts();
  const [selected, setSelected] = useState(null); // draft record OR canonical module shaped as a draft
  const [creating, setCreating] = useState(false);
  const [phaseFilter, setPhaseFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [activeBuckets, setActiveBuckets] = useState(() => new Set());
  // Sketch mode: activeTags are visual-only for now (no filter pipeline integration).
  const [activeTags, setActiveTags] = useState({});

  // moduleId → Set<bucket>, derived once from canonical bundle
  const moduleBuckets = useMemo(
    () => bucketsByModuleId(canonicalBundle.scenarios || []),
    []
  );

  const bucketCounts = useMemo(() => {
    const c = { nc_interior: 0, nc_exterior: 0, rp_interior: 0, rp_exterior: 0 };
    for (const buckets of moduleBuckets.values()) {
      for (const b of buckets) c[b] = (c[b] || 0) + 1;
    }
    return c;
  }, [moduleBuckets]);

  const toggleBucket = (b) => {
    setActiveBuckets(prev => {
      const next = new Set(prev);
      next.has(b) ? next.delete(b) : next.add(b);
      return next;
    });
  };
  const toggleTag = (cat, val) => {
    setActiveTags(prev => {
      const next = { ...prev };
      const cur = new Set(next[cat] || []);
      if (cur.has(val)) cur.delete(val); else cur.add(val);
      next[cat] = cur;
      return next;
    });
  };
  const clearAllTags = () => setActiveTags({});

  const rows = useMemo(() => {
    const draftById = new Map(drafts.map(d => [d.id, d]));
    const canon = Object.values(canonicalBundle.modules || {});
    const merged = canon.map(m => {
      const d = draftById.get(m.module_id);
      return d
        ? { id: m.module_id, payload: d.payload || d, name: m.name, phase: d.payload?.phase || m.phase, source: 'draft', status: d.status }
        : { id: m.module_id, payload: m, name: m.name, phase: m.phase, source: 'canonical', status: 'canonical' };
    });
    // Add draft-only (new) modules not in the canonical bundle.
    const canonIds = new Set(canon.map(c => c.module_id));
    for (const d of drafts) {
      if (!canonIds.has(d.id)) {
        merged.push({ id: d.id, payload: d.payload || d, name: (d.payload || d).name, phase: (d.payload || d).phase, source: 'new', status: d.status });
      }
    }
    return merged
      .filter(r => phaseFilter === 'all' || r.phase === phaseFilter)
      .filter(r => !search || r.id.toLowerCase().includes(search.toLowerCase()) || (r.name || '').toLowerCase().includes(search.toLowerCase()))
      .filter(r => {
        if (activeBuckets.size === 0) return true;
        const buckets = moduleBuckets.get(r.id);
        if (!buckets) return false;
        for (const b of activeBuckets) if (buckets.has(b)) return true;
        return false;
      })
      .map(r => ({ ...r, tags: deriveModuleTags(r.payload) }))
      .sort((a, b) => a.id.localeCompare(b.id));
  }, [drafts, phaseFilter, search, activeBuckets, moduleBuckets]);

  // Chip counts are computed from the search/phase-filtered rows so the numbers
  // reflect the current context. The active-tag filter is applied on top.
  const chipCounts = useMemo(() => computeChipCounts(rows, activeTags), [rows, activeTags]);
  const filteredRows = useMemo(() => rows.filter(r => rowPassesFilters(r, activeTags)), [rows, activeTags]);

  // Cross-tab navigation from DraftsView — open the target row in the editor.
  // Keyed on nonce so the same id can be re-opened after being dismissed.
  // Select logic is inlined here (rather than calling handleSelect) to avoid
  // a TDZ crash: the `if (loading) return` below can short-circuit the initial
  // render before handleSelect's const binding is initialized.
  useEffect(() => {
    if (!pendingSelection) return;
    const row = rows.find(r => r.id === pendingSelection.id);
    if (row) {
      setSelected({ id: row.id, payload: row.payload, status: row.status === 'canonical' ? 'local_override' : row.status });
      setCreating(false);
    }
  }, [pendingSelection?.nonce]);  // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <div style={{ padding: 16, color: 'var(--text-muted)' }}>Loading modules...</div>;

  const handleSelect = (row) => {
    // Shape into a draft record for the editor
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
    if (!confirm(`Delete draft for ${id}? Canonical module remains untouched.`)) return;
    await remove(id);
    if (selected?.id === id) setSelected(null);
  };

  const handlePublish = async (rec) => {
    if (!confirm(`Publish ${rec.id} to Claude/modules/${rec.id}.json? (Writes to disk — commit manually.)`)) return;
    try {
      const r = await publishModule(rec);
      alert(`Published to ${r.path}`);
      setSelected({ ...rec, status: 'published' });
    } catch (e) {
      alert(`Publish failed: ${e.message}`);
    }
  };

  const handleClone = (row) => {
    // Open the editor pre-filled with a deep copy. Clear module_id so user types
    // a new unique id, prefix the name with "Copy of ". _clonedAt forces editor
    // remount on successive clones.
    const copy = JSON.parse(JSON.stringify(row.payload || {}));
    copy.module_id = '';
    copy.name = copy.name ? `Copy of ${copy.name}` : 'Copy of module';
    setSelected({ id: '', payload: copy, status: 'draft', _clonedAt: Date.now() });
    setCreating(false);
  };

  return (
    <div style={{ display: 'flex', gap: 12, height: '100%' }}>
      {/* Left: list */}
      <div style={{ width: 320, flexShrink: 0, display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border)', paddingRight: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <h3 style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>Modules ({filteredRows.length}{filteredRows.length !== rows.length ? ` / ${rows.length}` : ''})</h3>
          <button className="btn btn-sm btn-accent" onClick={handleCreate} style={{ fontSize: 11 }}>+ New</button>
        </div>
        <input
          placeholder="Search id / name..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ marginBottom: 6, padding: '4px 6px', fontSize: 11, background: 'var(--bg-input, #222)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 3 }}
        />
        <select
          value={phaseFilter}
          onChange={e => setPhaseFilter(e.target.value)}
          style={{ marginBottom: 6, padding: '4px 6px', fontSize: 11, background: 'var(--bg-input, #222)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 3 }}
        >
          {PHASE_FILTERS.map(p => <option key={p} value={p}>{p === 'all' ? 'All phases' : p}</option>)}
        </select>
        <DomainContextChips
          counts={bucketCounts}
          active={activeBuckets}
          onToggle={toggleBucket}
          onClearAll={() => setActiveBuckets(new Set())}
        />
        <TagFilterBar
          kind="module"
          chipCounts={chipCounts}
          activeTags={activeTags}
          onToggleTag={toggleTag}
          onClearAll={clearAllTags}
        />
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filteredRows.map(r => {
            const isSel = selected?.id === r.id;
            const badgeColor = r.source === 'draft' ? '#e0b84a' : r.source === 'new' ? '#5aa85a' : '#555';
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
                  {r.name} — <em>{r.phase}</em>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
                  <button
                    onClick={e => { e.stopPropagation(); handleClone(r); }}
                    style={{ fontSize: 9, color: 'var(--accent, #82aaff)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                    title="Create a draft copy of this module"
                  >clone</button>
                  {r.source === 'draft' && (
                    <button
                      onClick={e => { e.stopPropagation(); handleDelete(r.id); }}
                      style={{ fontSize: 9, color: '#e74c3c', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                    >delete draft</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right: editor */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {(creating || selected) ? (
          <ModuleEditor
            key={selected?.id || selected?._clonedAt || 'new'}
            draft={selected}
            onSave={handleSave}
            onCancel={() => { setCreating(false); setSelected(null); }}
            onPublish={handlePublish}
            onNavigateToScenario={onNavigateToScenario}
            onNavigateToTask={onNavigateToTask}
          />
        ) : (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
            Select a module to edit, or click <strong>+ New</strong> to create one.
          </div>
        )}
      </div>
    </div>
  );
}
