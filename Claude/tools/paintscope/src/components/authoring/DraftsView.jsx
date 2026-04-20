// Unified drafts view across all kinds (module, scenario, assembly, modifier).
// Lists every pending draft in IndexedDB plus a single "Publish All" button
// that loops over them and fires each kind's publish endpoint in turn.
//
// "Pending" = status !== 'published'. Published drafts are already on disk
// (their IDB record is the dormant receipt); they can still be shown for
// awareness with a secondary "Clean up published" button.

import { useMemo, useState } from 'react';
import { useModuleDrafts } from '../../hooks/useModuleDrafts.js';
import { useScenarioDrafts } from '../../hooks/useScenarioDrafts.js';
import { useAssemblyDrafts } from '../../hooks/useAssemblyDrafts.js';
import { useModifierDrafts } from '../../hooks/useModifierDrafts.js';
import { publishModule, publishScenario, publishAssembly, publishModifier } from '../../authoring/publish.js';

const PUBLISH_FN = {
  module: publishModule,
  scenario: publishScenario,
  assembly: publishAssembly,
  modifier: publishModifier,
};

const KIND_COLORS = {
  module: '#82aaff',
  scenario: '#c792ea',
  assembly: '#f78c6c',
  modifier: '#89ddff',
};

export default function DraftsView({ onNavigate }) {
  const mods = useModuleDrafts();
  const scns = useScenarioDrafts();
  const asms = useAssemblyDrafts();
  const mfrs = useModifierDrafts();

  const [publishing, setPublishing] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [lastRun, setLastRun] = useState(null); // { ok: number, failed: [{kind, id, error}] }

  const loading = mods.loading || scns.loading || asms.loading || mfrs.loading;

  const allDrafts = useMemo(() => {
    const rows = [];
    mods.drafts.forEach(d => rows.push({ kind: 'module', record: d, hook: mods }));
    scns.drafts.forEach(d => rows.push({ kind: 'scenario', record: d, hook: scns }));
    asms.drafts.forEach(d => rows.push({ kind: 'assembly', record: d, hook: asms }));
    mfrs.drafts.forEach(d => rows.push({ kind: 'modifier', record: d, hook: mfrs }));
    return rows;
  }, [mods.drafts, scns.drafts, asms.drafts, mfrs.drafts]);

  const pending = useMemo(() => allDrafts.filter(r => r.record.status !== 'published'), [allDrafts]);
  const published = useMemo(() => allDrafts.filter(r => r.record.status === 'published'), [allDrafts]);

  async function handlePublishAll() {
    if (pending.length === 0) return;
    const msg = `Publish ${pending.length} draft${pending.length === 1 ? '' : 's'} to disk?\n\nThis writes JSON files under Claude/modules, scenarios, modifiers. Commit + push manually to deploy.`;
    if (!confirm(msg)) return;

    setPublishing(true);
    setProgress({ done: 0, total: pending.length });
    const failed = [];
    let ok = 0;

    for (const row of pending) {
      try {
        const fn = PUBLISH_FN[row.kind];
        await fn(row.record);
        ok++;
      } catch (e) {
        failed.push({ kind: row.kind, id: row.record.id, error: e.message });
      }
      setProgress(p => ({ ...p, done: p.done + 1 }));
    }

    // Refresh all four hook lists so status flips from 'draft' → 'published'
    await Promise.all([mods.refresh(), scns.refresh(), asms.refresh(), mfrs.refresh()]);
    setLastRun({ ok, failed });
    setPublishing(false);
  }

  async function handleDelete(row) {
    if (!confirm(`Delete ${row.kind} draft ${row.record.id}? Canonical (if any) remains untouched.`)) return;
    await row.hook.remove(row.record.id);
  }

  async function handleCleanupPublished() {
    if (published.length === 0) return;
    if (!confirm(`Remove ${published.length} already-published draft record${published.length === 1 ? '' : 's'} from IndexedDB? Disk JSON files are untouched.`)) return;
    for (const row of published) {
      try { await row.hook.remove(row.record.id); } catch (e) { console.error(e); }
    }
  }

  if (loading) return <div style={{ padding: 16, color: 'var(--text-muted)' }}>Loading drafts...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 12 }}>
      {/* Header with Publish All */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 14 }}>Pending drafts ({pending.length})</h3>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
            Publish writes each JSON to disk. After, commit + push to ship via Netlify.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {published.length > 0 && (
            <button
              onClick={handleCleanupPublished}
              disabled={publishing}
              style={{ padding: '6px 12px', fontSize: 11, background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: 3, cursor: publishing ? 'not-allowed' : 'pointer' }}
              title="Remove already-published draft records from IDB. Disk JSONs untouched."
            >
              Clean up {published.length} published
            </button>
          )}
          <button
            onClick={handlePublishAll}
            disabled={publishing || pending.length === 0}
            className="btn btn-accent"
            style={{
              padding: '6px 16px',
              fontSize: 12,
              fontWeight: 600,
              opacity: (publishing || pending.length === 0) ? 0.5 : 1,
              cursor: (publishing || pending.length === 0) ? 'not-allowed' : 'pointer',
            }}
          >
            {publishing
              ? `Publishing ${progress.done}/${progress.total}...`
              : `Publish All (${pending.length})`}
          </button>
        </div>
      </div>

      {/* Last-run result banner */}
      {lastRun && !publishing && (
        <div style={{
          padding: 8,
          fontSize: 11,
          borderRadius: 3,
          background: lastRun.failed.length === 0 ? 'rgba(90, 168, 90, 0.15)' : 'rgba(231, 76, 60, 0.15)',
          border: `1px solid ${lastRun.failed.length === 0 ? '#5aa85a' : '#e74c3c'}`,
        }}>
          <strong>{lastRun.ok} published</strong>{lastRun.failed.length > 0 && <>, <strong>{lastRun.failed.length} failed</strong>:<ul style={{ margin: '4px 0 0 16px', padding: 0 }}>{lastRun.failed.map((f, i) => <li key={i}>{f.kind}/{f.id}: {f.error}</li>)}</ul></>}
          <button
            onClick={() => setLastRun(null)}
            style={{ float: 'right', fontSize: 10, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >dismiss</button>
        </div>
      )}

      {/* Table */}
      <div style={{ flex: 1, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 3 }}>
        {pending.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
            No pending drafts. Anything you save in the Modules / Scenarios / Assemblies / Modifiers tabs will show up here.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr style={{ background: 'rgba(0,0,0,0.2)', fontSize: 10, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                <th style={{ textAlign: 'left', padding: '6px 8px' }}>Kind</th>
                <th style={{ textAlign: 'left', padding: '6px 8px' }}>ID</th>
                <th style={{ textAlign: 'left', padding: '6px 8px' }}>Name</th>
                <th style={{ textAlign: 'left', padding: '6px 8px' }}>Status</th>
                <th style={{ textAlign: 'left', padding: '6px 8px', width: 60 }}></th>
              </tr>
            </thead>
            <tbody>
              {pending.map((row, i) => {
                const rec = row.record;
                const payload = rec.payload || rec;
                const name = payload.name || '(unnamed)';
                const canNavigate = !!onNavigate && !publishing;
                const handleRowClick = () => { if (canNavigate) onNavigate(row.kind, rec.id); };
                return (
                  <tr
                    key={`${row.kind}::${rec.id}`}
                    onClick={handleRowClick}
                    style={{
                      borderTop: i === 0 ? 'none' : '1px solid var(--border)',
                      cursor: canNavigate ? 'pointer' : 'default',
                    }}
                    onMouseEnter={e => { if (canNavigate) e.currentTarget.style.background = 'rgba(130, 170, 255, 0.08)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = ''; }}
                    title={canNavigate ? 'Click to open in editor' : ''}
                  >
                    <td style={{ padding: '6px 8px' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '1px 6px',
                        fontSize: 9,
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        borderRadius: 2,
                        background: KIND_COLORS[row.kind] || '#555',
                        color: '#000',
                      }}>{row.kind}</span>
                    </td>
                    <td style={{ padding: '6px 8px', fontFamily: 'var(--font-mono)', fontSize: 10 }}>{rec.id}</td>
                    <td style={{ padding: '6px 8px', color: 'var(--text-muted)' }}>{name}</td>
                    <td style={{ padding: '6px 8px' }}>
                      <span style={{
                        fontSize: 9,
                        padding: '1px 5px',
                        borderRadius: 2,
                        background: rec.status === 'new' ? '#5aa85a' : '#e0b84a',
                        color: '#000',
                      }}>{rec.status || 'draft'}</span>
                    </td>
                    <td style={{ padding: '6px 8px' }}>
                      <button
                        onClick={e => { e.stopPropagation(); handleDelete(row); }}
                        disabled={publishing}
                        style={{ fontSize: 9, color: '#e74c3c', background: 'none', border: 'none', cursor: publishing ? 'not-allowed' : 'pointer', padding: 0 }}
                      >delete</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
