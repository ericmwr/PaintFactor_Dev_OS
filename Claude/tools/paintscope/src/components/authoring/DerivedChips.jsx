// Generic chip-row component for any classification axis sourced from
// task._derived (or any precomputed counts/active-Set pair).
//
// Usage:
//   <DerivedChips label="Phase" counts={{apply: 200, prep: 150, ...}} active={set} onToggle={fn} onClearAll={fn} />
//
// Twin of DomainContextChips / QualityTierChips, parameterized for reuse
// across Phase / Substrate / Method / Coating / etc. Buckets with count 0
// are hidden unless they're in the active set.

import { useState } from 'react';

export default function DerivedChips({ label, counts, active, onToggle, onClearAll, sortBy = 'count' }) {
  const [expanded, setExpanded] = useState(false);
  const activeSize = active?.size || 0;

  const entries = Object.entries(counts || {});
  const sorted = sortBy === 'count'
    ? entries.sort((a, b) => b[1] - a[1])
    : entries.sort((a, b) => a[0].localeCompare(b[0]));

  return (
    <div style={{ marginBottom: 6, display: 'flex', gap: 4, alignItems: 'flex-start', flexWrap: 'wrap' }}>
      <span
        onClick={() => setExpanded(v => !v)}
        style={{ fontSize: 9, color: 'var(--text-muted)', cursor: 'pointer', userSelect: 'none', paddingTop: 2, width: 72, flexShrink: 0 }}
      >
        {expanded ? '▾' : '▸'} {label}
        {!expanded && activeSize > 0 && (
          <span style={{ color: 'var(--accent, #82aaff)', marginLeft: 4 }}>({activeSize})</span>
        )}
      </span>
      {expanded && (
        <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', flex: 1 }}>
          {sorted.map(([key, count]) => {
            const isActive = active?.has(key);
            if (count === 0 && !isActive) return null;
            return (
              <button
                key={key}
                onClick={() => onToggle(key)}
                style={{
                  fontSize: 10, padding: '1px 6px', borderRadius: 10,
                  border: `1px solid ${isActive ? 'var(--accent, #82aaff)' : 'var(--border)'}`,
                  background: isActive ? 'rgba(130, 170, 255, 0.2)' : 'var(--bg-input, #222)',
                  color: isActive ? 'var(--accent, #82aaff)' : 'var(--text)',
                  cursor: 'pointer', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap',
                }}
              >
                {key} <span style={{ opacity: 0.6 }}>{count}</span>
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
