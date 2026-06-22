// Hybrid PS key field: an editable text input (free entry preserved) with an
// inline type-ahead dropdown for quick picks and a "Browse…" button that opens
// the categorized PsKeyPickerModal. Both the inline list and the modal hand
// back a key string; this component resolves it to a catalog Entry (or builds a
// loose one via parsePsKey for a custom key) and forwards it to onSelect.

import { useMemo, useRef, useState } from 'react';
import canonicalBundle from '../../data/scenario-bundle.gen.js';
import { QUANTITY_KEY_LABELS } from '../../data/constants.js';
import { buildPsKeyCatalog, parsePsKey } from '../../data/ps-key-catalog.js';
import PsKeyPickerModal from './PsKeyPickerModal.jsx';

const MAX_INLINE = 8;

const fieldInput = {
  display: 'block', width: '100%', marginTop: 2, padding: '4px 6px', fontSize: 12,
  background: 'var(--bg-input, #222)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 3, boxSizing: 'border-box',
};

function looseEntry(key) {
  const { uom } = parsePsKey(key);
  return { key, uom, catalogued: false };
}

export default function PsKeyField({ value, onChange, onSelect }) {
  const catalog = useMemo(() => buildPsKeyCatalog(canonicalBundle, QUANTITY_KEY_LABELS), []);
  const byKey = useMemo(() => new Map(catalog.map(e => [e.key, e])), [catalog]);

  const [modalOpen, setModalOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const blurTimer = useRef(null);

  const q = (value || '').trim().toLowerCase();
  const matches = useMemo(() => {
    if (!q) return [];
    return catalog
      .filter(e => e.displayTitle.toLowerCase().includes(q) || e.key.toLowerCase().includes(q) || (e.label && e.label.toLowerCase().includes(q)))
      .slice(0, MAX_INLINE);
  }, [catalog, q]);

  const pick = (key) => {
    onSelect?.(byKey.get(key) || looseEntry(key));
    setModalOpen(false);
    setFocused(false);
  };

  const showInline = focused && matches.length > 0 && !(matches.length === 1 && matches[0].key === value);

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ display: 'flex', gap: 4, alignItems: 'stretch' }}>
        <input
          style={{ ...fieldInput, flex: 1 }}
          placeholder="PS_…"
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => { blurTimer.current = setTimeout(() => setFocused(false), 120); }}
        />
        <button
          type="button"
          className="btn btn-sm"
          title="Browse PS keys by category"
          style={{ fontSize: 10, padding: '0 8px', whiteSpace: 'nowrap' }}
          onMouseDown={e => e.preventDefault()}
          onClick={() => setModalOpen(true)}
        >Browse…</button>
      </div>

      {showInline && (
        <div
          onMouseDown={() => { if (blurTimer.current) clearTimeout(blurTimer.current); }}
          style={{ position: 'absolute', zIndex: 50, left: 0, right: 0, marginTop: 2, background: 'var(--bg-panel, #1a1a1a)', border: '1px solid var(--border)', borderRadius: 3, maxHeight: 220, overflowY: 'auto', boxShadow: '0 4px 16px rgba(0,0,0,0.4)' }}
        >
          {matches.map(e => (
            <div
              key={e.key}
              onClick={() => pick(e.key)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px', cursor: 'pointer' }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, color: 'var(--text)' }}>{e.displayTitle}</div>
                <div style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.key}</div>
              </div>
              {!e.catalogued && <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>no label</span>}
              {e.uom && <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{e.uom}</span>}
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <PsKeyPickerModal
          catalog={catalog}
          initialQuery={value || ''}
          value={value}
          onPick={pick}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  );
}
