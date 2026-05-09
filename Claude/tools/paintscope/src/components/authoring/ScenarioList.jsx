// Scenario manager — parallel to ModuleList but for SCN_* records.

import { useMemo, useState, useEffect } from 'react';
import { useScenarioDrafts } from '../../hooks/useScenarioDrafts.js';
import canonicalBundle from '../../data/scenario-bundle.gen.js';
import ScenarioEditor from './ScenarioEditor.jsx';
import { publishScenario } from '../../authoring/publish.js';
import TagFilterBar from './TagFilterBar.jsx';
import DomainContextChips from './DomainContextChips.jsx';
import QualityTierChips from './QualityTierChips.jsx';
import { deriveScenarioTags, computeChipCounts, rowPassesFilters } from './tag-derivation.js';
import { deriveDomainContextBuckets, countScenarioBuckets } from '../../data/domain-context.js';
import { deriveQualityTiers, countScenarioQTs } from '../../data/quality-tier.js';

export default function ScenarioList({ pendingSelection, onNavigateToModule } = {}) {
  const { drafts, loading, save, remove } = useScenarioDrafts();
  const [selected, setSelected] = useState(null);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState('');
  const [domainFilter, setDomainFilter] = useState('all');
  const [activeBuckets, setActiveBuckets] = useState(() => new Set());
  const [activeQTs, setActiveQTs] = useState(() => new Set());
  // Sketch mode: visual only.
  const [activeTags, setActiveTags] = useState({});

  const bucketCounts = useMemo(
    () => countScenarioBuckets(canonicalBundle.scenarios || []),
    []
  );

  const qtCounts = useMemo(
    () => countScenarioQTs(canonicalBundle.scenarios || []),
    []
  );

  const toggleBucket = (b) => {
    setActiveBuckets(prev => {
      const next = new Set(prev);
      next.has(b) ? next.delete(b) : next.add(b);
      return next;
    });
  };

  const toggleQT = (qt) => {
    setActiveQTs(prev => {
      const next = new Set(prev);
      next.has(qt) ? next.delete(qt) : next.add(qt);
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
    const canon = canonicalBundle.scenarios || [];
    const merged = canon.map(s => {
      const d = draftById.get(s.scenario_id);
      return d
        ? { id: s.scenario_id, payload: d.payload || d, name: (d.payload || d).name, domain: (d.payload || d).domain, source: 'draft', status: d.status }
        : { id: s.scenario_id, payload: s, name: s.name, domain: s.domain, source: 'canonical', status: 'canonical' };
    });
    const canonIds = new Set(canon.map(c => c.scenario_id));
    for (const d of drafts) {
      if (!canonIds.has(d.id)) {
        const p = d.payload || d;
        merged.push({ id: d.id, payload: p, name: p.name, domain: p.domain, source: 'new', status: d.status });
      }
    }
    return merged
      .filter(r => domainFilter === 'all' || r.domain === domainFilter)
      .filter(r => !search || r.id.toLowerCase().includes(search.toLowerCase()) || (r.name || '').toLowerCase().includes(search.toLowerCase()))
      .filter(r => {
        if (activeBuckets.size === 0) return true;
        const buckets = deriveDomainContextBuckets(r.payload);
        for (const b of activeBuckets) if (buckets.has(b)) return true;
        return false;
      })
      .filter(r => {
        if (activeQTs.size === 0) return true;
        const qts = deriveQualityTiers(r.payload);
        for (const qt of activeQTs) if (qts.has(qt)) return true;
        return false;
      })
      .map(r => ({ ...r, tags: deriveScenarioTags(r.payload) }))
      .sort((a, b) => a.id.localeCompare(b.id));
  }, [drafts, search, domainFilter, activeBuckets, activeQTs]);

  const chipCounts = useMemo(() => computeChipCounts(rows, activeTags), [rows, activeTags]);
  const filteredRows = useMemo(() => rows.filter(r => rowPassesFilters(r, activeTags)), [rows, activeTags]);

  // Cross-tab navigation from DraftsView. Inline select logic to avoid TDZ
  // crash when `if (loading) return` short-circuits first render before
  // handleSelect is initialized.
  useEffect(() => {
    if (!pendingSelection) return;
    const row = rows.find(r => r.id === pendingSelection.id);
    if (row) {
      setSelected({ id: row.id, payload: row.payload, status: row.status === 'canonical' ? 'local_override' : row.status });
      setCreating(false);
    }
  }, [pendingSelection?.nonce]);  // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <div style={{ padding: 16, color: 'var(--text-muted)' }}>Loading scenarios...</div>;

  const handleSelect = (row) => {
    setSelected({ id: row.id, payload: row.payload, status: row.status === 'canonical' ? 'local_override' : row.status });
    setCreating(false);
  };

  const handleSave = async (rec) => {
    const saved = await save(rec);
    setSelected(saved);
    setCreating(false);
  };

  const handleDelete = async (id) => {
    if (!confirm(`Delete draft for ${id}?`)) return;
    await remove(id);
    if (selected?.id === id) setSelected(null);
  };

  const handlePublish = async (rec) => {
    if (!confirm(`Publish ${rec.id} to Claude/scenarios/${rec.id}.json?`)) return;
    try {
      const r = await publishScenario(rec);
      alert(`Published to ${r.path}`);
      setSelected({ ...rec, status: 'published' });
    } catch (e) {
      alert(`Publish failed: ${e.message}`);
    }
  };

  const handleClone = (row) => {
    // Open the editor pre-filled with a deep copy of the source scenario.
    // Clear the scenario_id so the user must type a new unique id, and
    // prefix the name with "Copy of ". Status is 'draft' (never 'canonical').
    // _clonedAt forces editor remount for successive clones.
    const copy = JSON.parse(JSON.stringify(row.payload || {}));
    copy.scenario_id = '';
    copy.name = copy.name ? `Copy of ${copy.name}` : 'Copy of scenario';
    setSelected({ id: '', payload: copy, status: 'draft', _clonedAt: Date.now() });
    setCreating(false);
  };

  return (
    <div style={{ display: 'flex', gap: 12, height: '100%' }}>
      <div style={{ width: 320, flexShrink: 0, display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border)', paddingRight: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <h3 style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>Scenarios ({filteredRows.length}{filteredRows.length !== rows.length ? ` / ${rows.length}` : ''})</h3>
          <button className="btn btn-sm btn-accent" onClick={() => { setCreating(true); setSelected(null); }} style={{ fontSize: 11 }}>+ New</button>
        </div>
        <input
          placeholder="Search id / name..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ marginBottom: 6, padding: '4px 6px', fontSize: 11, background: 'var(--bg-input, #222)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 3 }}
        />
        <select
          value={domainFilter}
          onChange={e => setDomainFilter(e.target.value)}
          style={{ marginBottom: 6, padding: '4px 6px', fontSize: 11, background: 'var(--bg-input, #222)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 3 }}
        >
          <option value="all">All domains</option>
          <option value="interior">interior</option>
          <option value="exterior">exterior</option>
          <option value="both">both</option>
        </select>
        <DomainContextChips
          counts={bucketCounts}
          active={activeBuckets}
          onToggle={toggleBucket}
          onClearAll={() => setActiveBuckets(new Set())}
        />
        <QualityTierChips
          counts={qtCounts}
          active={activeQTs}
          onToggle={toggleQT}
          onClearAll={() => setActiveQTs(new Set())}
        />
        <TagFilterBar
          kind="scenario"
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
                  padding: '5px 8px', fontSize: 11, cursor: 'pointer', borderRadius: 3,
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
                  {r.name} — <em>{r.domain}</em>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
                  <button
                    onClick={e => { e.stopPropagation(); handleClone(r); }}
                    style={{ fontSize: 9, color: 'var(--accent, #82aaff)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                    title="Create a draft copy of this scenario"
                  >clone</button>
                  {r.source === 'draft' && (
                    <button onClick={e => { e.stopPropagation(); handleDelete(r.id); }} style={{ fontSize: 9, color: '#e74c3c', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>delete draft</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'hidden' }}>
        {(creating || selected) ? (
          <ScenarioEditor
            key={selected?.id || selected?._clonedAt || 'new'}
            draft={selected}
            onSave={handleSave}
            onCancel={() => { setCreating(false); setSelected(null); }}
            onPublish={handlePublish}
            onNavigateToModule={onNavigateToModule}
          />
        ) : (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
            Select a scenario to edit, or click <strong>+ New</strong>.
          </div>
        )}
      </div>
    </div>
  );
}
