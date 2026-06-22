// Categorized, searchable PS key picker. Overlay mechanics mirror
// RetireModuleModal. Emits a key string via onPick (catalog rows and the
// "use as-is" custom row both call it); the parent decides what to do with it.

import { useMemo, useState } from 'react';
import { groupPsKeyCatalog } from '../../data/ps-key-catalog.js';

export default function PsKeyPickerModal({ catalog, initialQuery = '', value, onPick, onClose }) {
  const [query, setQuery] = useState(initialQuery);
  const q = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!q) return catalog;
    return catalog.filter(e =>
      e.displayTitle.toLowerCase().includes(q) ||
      e.key.toLowerCase().includes(q) ||
      (e.label && e.label.toLowerCase().includes(q))
    );
  }, [catalog, q]);

  const groups = useMemo(() => groupPsKeyCatalog(filtered), [filtered]);
  const showCustom = q.length > 0 && !filtered.some(e => e.key.toLowerCase() === q);

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: 'var(--bg-panel, #1a1a1a)', border: '1px solid var(--border)', borderRadius: 6, padding: 16, width: 560, maxWidth: '92vw', maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <h3 style={{ margin: 0, fontSize: 14 }}>Select PS key</h3>
          <button className="btn btn-sm" onClick={onClose} style={{ fontSize: 11 }}>Close</button>
        </div>

        <input
          autoFocus
          placeholder="Search by name or key — e.g. baseboard, cabinet, PS_PROTECT"
          value={query}
          onChange={e => setQuery(e.target.value)}
          style={{ width: '100%', padding: '6px 8px', fontSize: 12, background: 'var(--bg-input, #222)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 3, marginBottom: 6, boxSizing: 'border-box' }}
        />
        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 8 }}>
          Not listed? Type any key and use it as a custom entry.
        </div>

        <div style={{ overflowY: 'auto', flex: 1 }}>
          {showCustom && (
            <div
              onClick={() => onPick(query.trim())}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', cursor: 'pointer', borderRadius: 3, border: '1px dashed var(--border)', marginBottom: 8 }}
            >
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Use as-is:</span>
              <code style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text)' }}>{query.trim()}</code>
            </div>
          )}

          {groups.map(g => (
            <div key={g.categoryLabel} style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.04em', padding: '2px 4px' }}>
                {g.categoryLabel}
              </div>
              {g.entries.map(e => {
                const selected = e.key === value;
                return (
                  <div
                    key={e.key}
                    onClick={() => onPick(e.key)}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', cursor: 'pointer', borderRadius: 3, background: selected ? 'rgba(130,170,255,0.15)' : 'transparent' }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, color: 'var(--text)' }}>{e.displayTitle}</div>
                      <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.key}</div>
                    </div>
                    {!e.catalogued && (
                      <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 8, background: 'rgba(224,184,74,0.15)', border: '1px solid rgba(224,184,74,0.4)', color: 'var(--text)', whiteSpace: 'nowrap' }}>no label yet</span>
                    )}
                    {e.uom && (
                      <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', padding: '1px 6px', borderRadius: 3, background: 'rgba(0,0,0,0.25)', color: 'var(--text-muted)' }}>{e.uom}</span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}

          {groups.length === 0 && !showCustom && (
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic', padding: 8 }}>No matches.</div>
          )}
        </div>
      </div>
    </div>
  );
}
