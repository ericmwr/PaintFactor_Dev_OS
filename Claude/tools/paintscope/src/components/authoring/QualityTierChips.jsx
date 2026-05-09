// Reusable chip row for the QT filter. Twin of DomainContextChips —
// caller owns the active Set and the pre-computed counts (which
// differ per list because tasks and modules derive their QTs
// transitively from scenarios).

import { useState } from 'react';
import { QT_BUCKETS, QT_BUCKET_LABELS } from '../../data/quality-tier.js';

export default function QualityTierChips({ counts, active, onToggle, onClearAll }) {
  const [expanded, setExpanded] = useState(false);
  const activeSize = active?.size || 0;

  return (
    <div style={{ marginBottom: 6, display: 'flex', gap: 4, alignItems: 'flex-start', flexWrap: 'wrap' }}>
      <span
        onClick={() => setExpanded(v => !v)}
        style={{ fontSize: 9, color: 'var(--text-muted)', cursor: 'pointer', userSelect: 'none', paddingTop: 2, width: 72, flexShrink: 0 }}
      >
        {expanded ? '▾' : '▸'} QT
        {!expanded && activeSize > 0 && (
          <span style={{ color: 'var(--accent, #82aaff)', marginLeft: 4 }}>({activeSize})</span>
        )}
      </span>
      {expanded && (
        <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', flex: 1 }}>
          {QT_BUCKETS.map(qt => {
            const isActive = active?.has(qt);
            const count = counts?.[qt] || 0;
            if (count === 0 && !isActive) return null;
            return (
              <button
                key={qt}
                onClick={() => onToggle(qt)}
                style={{
                  fontSize: 10, padding: '1px 6px', borderRadius: 10,
                  border: `1px solid ${isActive ? 'var(--accent, #82aaff)' : 'var(--border)'}`,
                  background: isActive ? 'rgba(130, 170, 255, 0.2)' : 'var(--bg-input, #222)',
                  color: isActive ? 'var(--accent, #82aaff)' : 'var(--text)',
                  cursor: 'pointer', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap',
                }}
              >
                {QT_BUCKET_LABELS[qt]} <span style={{ opacity: 0.6 }}>{count}</span>
              </button>
            );
          })}
          {activeSize > 0 && (
            <button
              onClick={onClearAll}
              style={{ fontSize: 9, color: '#e74c3c', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginLeft: 4, textDecoration: 'underline' }}
            >clear</button>
          )}
        </div>
      )}
    </div>
  );
}
