// Task list / manager — parallel to ModuleList/ScenarioList/ModifierList.
// Sources:
//   1. Canonical tasks from scenario-bundle.gen.js (bundle.tasks)
//   2. IndexedDB drafts (task_drafts)
// Drafts win on id collision and are badged.

import { useMemo, useState, useEffect } from 'react';
import { useTaskDrafts } from '../../hooks/useTaskDrafts.js';
import canonicalBundle from '../../data/scenario-bundle.gen.js';
import TaskEditor from './TaskEditor.jsx';
import BulkRateEditor from './BulkRateEditor.jsx';
import DomainContextChips from './DomainContextChips.jsx';
import QualityTierChips from './QualityTierChips.jsx';
import { publishTask } from '../../authoring/publish.js';
import { matchActivityRule } from '../../data/activity-rules.js';
import { bucketsByTaskId, DC_BUCKETS } from '../../data/domain-context.js';
import { qtsByTaskId } from '../../data/quality-tier.js';

const UNMATCHED_BUCKET = '__unmatched__';

export default function TaskList({ pendingSelection, onNavigateToModule } = {}) {
  const { drafts, loading, save, remove } = useTaskDrafts();
  const [selected, setSelected] = useState(null);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState('');
  const [activeActivities, setActiveActivities] = useState(() => new Set());
  const [activitiesExpanded, setActivitiesExpanded] = useState(false);
  const [activeBuckets, setActiveBuckets] = useState(() => new Set());
  const [activeQTs, setActiveQTs] = useState(() => new Set());
  const [bulkOpen, setBulkOpen] = useState(false);

  // taskId → Set<bucket> derived once per bundle; canonical bundle is import-frozen
  const taskBuckets = useMemo(
    () => bucketsByTaskId(canonicalBundle.scenarios || [], canonicalBundle.modules || {}),
    []
  );

  const taskQTs = useMemo(
    () => qtsByTaskId(canonicalBundle.scenarios || [], canonicalBundle.modules || {}),
    []
  );

  const bucketCounts = useMemo(() => {
    const c = { nc_interior: 0, nc_exterior: 0, rp_interior: 0, rp_exterior: 0 };
    for (const buckets of taskBuckets.values()) {
      for (const b of buckets) c[b] = (c[b] || 0) + 1;
    }
    return c;
  }, [taskBuckets]);

  const qtCounts = useMemo(() => {
    const c = { QT2: 0, QT3: 0, QT4: 0, QT5: 0 };
    for (const qts of taskQTs.values()) {
      for (const qt of qts) c[qt] = (c[qt] || 0) + 1;
    }
    return c;
  }, [taskQTs]);

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

  // Per-row activity classification + per-activity counts. Computed once
  // per draft change so the chip row + filter share the same map.
  const { allRows, activityCounts } = useMemo(() => {
    const draftById = new Map(drafts.map(d => [d.id, d]));
    const canon = Object.values(canonicalBundle.tasks || {});
    const merged = canon.map(t => {
      const d = draftById.get(t.task_id);
      return d
        ? { id: t.task_id, payload: d.payload || d, name: t.name, source: 'draft', status: d.status }
        : { id: t.task_id, payload: t, name: t.name, source: 'canonical', status: 'canonical' };
    });
    const canonIds = new Set(canon.map(c => c.task_id));
    for (const d of drafts) {
      if (!canonIds.has(d.id)) {
        merged.push({ id: d.id, payload: d.payload || d, name: (d.payload || d).name, source: 'new', status: d.status });
      }
    }
    const counts = {};
    for (const r of merged) {
      const activity = matchActivityRule(r.id) || UNMATCHED_BUCKET;
      r.activity = activity;
      counts[activity] = (counts[activity] || 0) + 1;
    }
    return { allRows: merged, activityCounts: counts };
  }, [drafts]);

  const rows = useMemo(() => {
    const term = search.toLowerCase();
    return allRows
      .filter(r => !term || r.id.toLowerCase().includes(term) || (r.name || '').toLowerCase().includes(term))
      .filter(r => activeActivities.size === 0 || activeActivities.has(r.activity))
      .filter(r => {
        if (activeBuckets.size === 0) return true;
        const buckets = taskBuckets.get(r.id);
        if (!buckets) return false; // task referenced by no scenario falls out under any bucket filter
        for (const b of activeBuckets) if (buckets.has(b)) return true;
        return false;
      })
      .filter(r => {
        if (activeQTs.size === 0) return true;
        const qts = taskQTs.get(r.id);
        if (!qts) return false;
        for (const qt of activeQTs) if (qts.has(qt)) return true;
        return false;
      })
      .sort((a, b) => a.id.localeCompare(b.id));
  }, [allRows, search, activeActivities, activeBuckets, taskBuckets, activeQTs, taskQTs]);

  const toggleActivity = (activity) => {
    setActiveActivities(prev => {
      const next = new Set(prev);
      if (next.has(activity)) next.delete(activity); else next.add(activity);
      return next;
    });
  };

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
          <div style={{ display: 'flex', gap: 4 }}>
            <button className="btn btn-sm" onClick={() => setBulkOpen(true)} style={{ fontSize: 11 }} title="Filter, transform, preview, and write a draft per modified task">Bulk Edit…</button>
            <button className="btn btn-sm btn-accent" onClick={handleCreate} style={{ fontSize: 11 }}>+ New</button>
          </div>
        </div>
        <input
          placeholder="Search id / name..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ marginBottom: 6, padding: '4px 6px', fontSize: 11, background: 'var(--bg-input, #222)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 3 }}
        />
        {/* Domain × context bucket filter — derived transitively via scenarios. */}
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
        {/* Activity-family chip filter — pulls from data/activity-rules.js. */}
        <div style={{ marginBottom: 6, display: 'flex', gap: 4, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <span
            onClick={() => setActivitiesExpanded(v => !v)}
            style={{ fontSize: 9, color: 'var(--text-muted)', cursor: 'pointer', userSelect: 'none', paddingTop: 2, width: 72, flexShrink: 0 }}
          >
            {activitiesExpanded ? '▾' : '▸'} Activity
            {!activitiesExpanded && activeActivities.size > 0 && (
              <span style={{ color: 'var(--accent, #82aaff)', marginLeft: 4 }}>({activeActivities.size})</span>
            )}
          </span>
          {activitiesExpanded && (
            <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', flex: 1 }}>
              {Object.entries(activityCounts)
                .sort((a, b) => b[1] - a[1])
                .map(([activity, count]) => {
                  const isActive = activeActivities.has(activity);
                  const label = activity === UNMATCHED_BUCKET ? '(unmatched)' : activity;
                  return (
                    <button
                      key={activity}
                      onClick={() => toggleActivity(activity)}
                      style={{
                        fontSize: 10,
                        padding: '1px 6px',
                        borderRadius: 10,
                        border: `1px solid ${isActive ? 'var(--accent, #82aaff)' : 'var(--border)'}`,
                        background: isActive ? 'rgba(130, 170, 255, 0.2)' : 'var(--bg-input, #222)',
                        color: isActive ? 'var(--accent, #82aaff)' : 'var(--text)',
                        cursor: 'pointer',
                        fontFamily: 'var(--font-mono)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {label} <span style={{ opacity: 0.6 }}>{count}</span>
                    </button>
                  );
                })}
              {activeActivities.size > 0 && (
                <button
                  onClick={() => setActiveActivities(new Set())}
                  style={{ fontSize: 9, color: '#e74c3c', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginLeft: 4, textDecoration: 'underline' }}
                >clear</button>
              )}
            </div>
          )}
        </div>
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

      {bulkOpen && (
        <BulkRateEditor
          onClose={() => setBulkOpen(false)}
          onComplete={(result) => {
            alert(`Bulk transform created ${result.taskDraftsCreated} task draft${result.taskDraftsCreated === 1 ? '' : 's'}.\n\nReview in the Drafts tab and click Publish All to apply. The smoke gate will validate the merged bundle.`);
          }}
        />
      )}
    </div>
  );
}
