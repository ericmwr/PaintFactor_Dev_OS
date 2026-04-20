// Modal picker for selecting a canonical task from the library. Opens
// when user clicks "+ From Library" in ModuleEditor. Returns a task_id
// via onPick(task_id) + inserts { task_ref: <id> } into the module's
// tasks[] array.

import { useMemo, useState } from 'react';
import canonicalBundle from '../../data/scenario-bundle.gen.js';
import { findTaskUsage } from './TaskUsagePanel.jsx';

/**
 * Derive a rough substrate family from ps_key — e.g.,
 *   'PS_SURFACE_SF.WALL_FIELD'  -> 'WALL'
 *   'PS_EDGE_LF.TO_CEILING'     -> 'EDGE'
 *   'PS_SURFACE_SF.CEILING_...' -> 'CEILING'
 */
function familyFromPsKey(ps_key) {
  if (!ps_key) return 'other';
  const m = ps_key.match(/^PS_[A-Z_]+\.([A-Z]+)/);
  if (!m) return 'other';
  const head = m[1];
  if (head.startsWith('WALL')) return 'WALL';
  if (head.startsWith('CEILING')) return 'CEILING';
  if (head.startsWith('TRIM')) return 'TRIM';
  if (head.startsWith('DOOR')) return 'DOOR';
  if (head.startsWith('WINDOW')) return 'WINDOW';
  if (head.startsWith('CABINET')) return 'CABINET';
  if (head.startsWith('CLOSET') || head.startsWith('SHELF')) return 'CLOSET';
  if (head.startsWith('STAIR')) return 'STAIR';
  if (head.startsWith('TO_')) return 'EDGE';
  return head;
}

export default function TaskPicker({ open, onClose, onPick, phaseHint }) {
  const [search, setSearch] = useState('');
  const [familyFilter, setFamilyFilter] = useState('all');

  const allTasks = useMemo(
    () => Object.values(canonicalBundle.tasks || {}).sort((a, b) => a.task_id.localeCompare(b.task_id)),
    []
  );

  const families = useMemo(() => {
    const set = new Set(allTasks.map(t => familyFromPsKey(t.ps_key)));
    return ['all', ...Array.from(set).sort()];
  }, [allTasks]);

  const rows = useMemo(() => {
    return allTasks
      .filter(t => familyFilter === 'all' || familyFromPsKey(t.ps_key) === familyFilter)
      .filter(t => {
        if (!search) return true;
        const s = search.toLowerCase();
        return (
          t.task_id.toLowerCase().includes(s) ||
          (t.name || '').toLowerCase().includes(s) ||
          (t.ps_key || '').toLowerCase().includes(s)
        );
      })
      .map(t => ({
        ...t,
        family: familyFromPsKey(t.ps_key),
        usageCount: findTaskUsage(t.task_id, canonicalBundle.modules || {}).length,
      }));
  }, [allTasks, search, familyFilter]);

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 720,
          maxWidth: '92vw',
          maxHeight: '80vh',
          background: 'var(--bg-panel, #1a1a1a)',
          border: '1px solid var(--border)',
          borderRadius: 6,
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <h3 style={{ margin: 0, fontSize: 14 }}>Pick a canonical task</h3>
          <button className="btn btn-sm" onClick={onClose} style={{ fontSize: 11 }}>Close</button>
        </div>
        {phaseHint && (
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 6 }}>
            Module phase: <strong>{phaseHint}</strong>. Tasks are not phase-scoped — pick any.
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <input
            placeholder="Search task_id / name / ps_key..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, padding: '4px 6px', fontSize: 11, background: 'var(--bg-input, #222)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 3 }}
            autoFocus
          />
          <select
            value={familyFilter}
            onChange={e => setFamilyFilter(e.target.value)}
            style={{ padding: '4px 6px', fontSize: 11, background: 'var(--bg-input, #222)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 3 }}
          >
            {families.map(f => <option key={f} value={f}>{f === 'all' ? 'All substrates' : f}</option>)}
          </select>
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>
          {rows.length} task{rows.length === 1 ? '' : 's'}
        </div>
        <div style={{ flex: 1, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 3 }}>
          {rows.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
              No tasks match. Try clearing filters or extract inline tasks to the library first.
            </div>
          ) : (
            rows.map(t => (
              <div
                key={t.task_id}
                onClick={() => { onPick(t.task_id); onClose(); }}
                style={{
                  padding: '6px 10px',
                  cursor: 'pointer',
                  borderBottom: '1px solid var(--border)',
                  fontSize: 11,
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(130, 170, 255, 0.1)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 2 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10 }}>{t.task_id}</span>
                  <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>
                    {t.rate_per_hour ? `${t.rate_per_hour} ${t.uom}/hr` : (t.fixed_minutes ? `${t.fixed_minutes}m fixed` : '—')}
                    {' · '}used in {t.usageCount}
                  </span>
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                  {t.name} — <em>{t.ps_key}</em>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
