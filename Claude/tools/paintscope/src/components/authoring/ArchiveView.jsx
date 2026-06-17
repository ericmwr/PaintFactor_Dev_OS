// Archive tab — read-only listing of every entity that's been archived
// (moved to Claude/{kind}/archive/). Each entry has a Restore button that
// moves the file back. Bundle regen is a separate manual step (matches
// the existing publish workflow's deferred-regen model).

import { useEffect, useState, useCallback } from 'react';
import { listArchive, restoreEntity } from '../../authoring/archive-ops.js';

const KINDS = [
  { kind: 'task',     label: 'Tasks',     dir: 'Claude/tasks/archive' },
  { kind: 'module',   label: 'Modules',   dir: 'Claude/modules/archive' },
  { kind: 'scenario', label: 'Scenarios', dir: 'Claude/scenarios/archive' },
];

export default function ArchiveView() {
  const [byKind, setByKind] = useState({ task: null, module: null, scenario: null });
  const [errors, setErrors] = useState({});
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(null); // `${kind}|${id}` while restoring

  const refresh = useCallback(async () => {
    const next = { task: null, module: null, scenario: null };
    const errs = {};
    await Promise.all(KINDS.map(async ({ kind }) => {
      try {
        next[kind] = await listArchive(kind);
      } catch (e) {
        next[kind] = [];
        errs[kind] = e.message;
      }
    }));
    setByKind(next);
    setErrors(errs);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const handleRestore = async (kind, id) => {
    if (!confirm(`Restore ${id}? Moves Claude/${kind}s/archive/${id}.json → Claude/${kind}s/. Bundle regen needed to surface in the active list.`)) return;
    setBusy(`${kind}|${id}`);
    try {
      await restoreEntity(kind, id);
      await refresh();
      alert(`Restored ${id}. Run \`node Claude/scripts/build-scenario-bundle.mjs\` to refresh the bundle.`);
    } catch (e) {
      alert(`Restore failed: ${e.message}`);
    } finally {
      setBusy(null);
    }
  };

  const total = Object.values(byKind).reduce((s, list) => s + (list?.length || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <h3 style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>
          Archived entities ({total})
        </h3>
        <button className="btn btn-sm" onClick={refresh} style={{ fontSize: 11 }}>Refresh</button>
        <input
          placeholder="Search id / name..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, maxWidth: 280, padding: '4px 6px', fontSize: 11, background: 'var(--bg-input, #222)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 3 }}
        />
      </div>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.5 }}>
        Files live in <code>Claude/{'{tasks,modules,scenarios}'}/archive/</code> — git-tracked, restorable. Bundle generator excludes the archive folder automatically. After restoring, run
        {' '}<code>node Claude/scripts/build-scenario-bundle.mjs</code>{' '}to surface the entity in the active list.
      </div>

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {KINDS.map(({ kind, label, dir }) => (
          <ArchiveSection
            key={kind}
            kind={kind}
            label={label}
            dir={dir}
            entries={byKind[kind]}
            error={errors[kind]}
            search={search}
            busy={busy}
            onRestore={handleRestore}
          />
        ))}
      </div>
    </div>
  );
}

function ArchiveSection({ kind, label, dir, entries, error, search, busy, onRestore }) {
  if (entries === null) return <SectionFrame label={label} dir={dir}><span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Loading…</span></SectionFrame>;
  if (error) return <SectionFrame label={label} dir={dir}><span style={{ fontSize: 11, color: '#e74c3c' }}>Error: {error}</span></SectionFrame>;

  const filtered = !search ? entries : entries.filter(e =>
    e.id.toLowerCase().includes(search.toLowerCase()) ||
    (e.name || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <SectionFrame label={`${label} (${filtered.length}${filtered.length !== entries.length ? ` / ${entries.length}` : ''})`} dir={dir}>
      {entries.length === 0 ? (
        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>No archived {label.toLowerCase()}.</span>
      ) : filtered.length === 0 ? (
        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>No matches.</span>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {filtered.map(entry => (
            <div
              key={entry.id}
              style={{
                padding: '6px 8px',
                fontSize: 11,
                borderRadius: 3,
                display: 'flex',
                gap: 8,
                alignItems: 'center',
                background: 'rgba(0,0,0,0.15)',
              }}
            >
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, flex: 1 }}>{entry.id}</span>
              {entry.phase && <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>{entry.phase}</span>}
              {entry.name && <span style={{ fontSize: 10, color: 'var(--text-muted)', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.name}</span>}
              <span style={{ fontSize: 9, color: 'var(--text-muted)' }} title={`Archived ${new Date(entry.mtimeMs).toLocaleString()}`}>
                {formatRelative(entry.mtimeMs)}
              </span>
              <button
                className="btn btn-sm"
                onClick={() => onRestore(kind, entry.id)}
                disabled={busy === `${kind}|${entry.id}`}
                style={{ fontSize: 10 }}
              >
                {busy === `${kind}|${entry.id}` ? 'Restoring…' : 'Restore'}
              </button>
            </div>
          ))}
        </div>
      )}
    </SectionFrame>
  );
}

function SectionFrame({ label, dir, children }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6, paddingBottom: 4, borderBottom: '1px solid var(--border)' }}>
        <h4 style={{ margin: 0, fontSize: 12, color: 'var(--accent, #82aaff)' }}>{label}</h4>
        <code style={{ fontSize: 9, color: 'var(--text-muted)' }}>{dir}</code>
      </div>
      {children}
    </div>
  );
}

function formatRelative(ms) {
  const diffSec = Math.floor((Date.now() - ms) / 1000);
  if (diffSec < 60)        return `${diffSec}s ago`;
  if (diffSec < 3600)      return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400)     return `${Math.floor(diffSec / 3600)}h ago`;
  if (diffSec < 86400 * 7) return `${Math.floor(diffSec / 86400)}d ago`;
  return new Date(ms).toLocaleDateString();
}
