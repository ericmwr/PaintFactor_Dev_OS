// Reusable chip row for the NC/RP × interior/exterior bucket filter.
// Used in TaskList, ModuleList, and ScenarioList — same UX in all three.
//
// Stateless: caller owns the Set<bucket> of active selections, plus the
// pre-computed counts (which differ per list because tasks and modules
// derive their buckets transitively from scenarios).

import { useState } from 'react';
import { DC_BUCKETS, DC_BUCKET_LABELS } from '../../data/domain-context.js';

export default function DomainContextChips({ counts, active, onToggle, onClearAll }) {
  const [expanded, setExpanded] = useState(false);
  const activeSize = active?.size || 0;

  return (
    <div style={{ marginBottom: 6, display: 'flex', gap: 4, alignItems: 'flex-start', flexWrap: 'wrap' }}>
      <span
        onClick={() => setExpanded(v => !v)}
        style={{ fontSize: 9, color: 'var(--text-muted)', cursor: 'pointer', userSelect: 'none', paddingTop: 2, width: 72, flexShrink: 0 }}
      >
        {expanded ? '▾' : '▸'} Context
        {!expanded && activeSize > 0 && (
          <span style={{ color: 'var(--accent, #82aaff)', marginLeft: 4 }}>({activeSize})</span>
        )}
      </span>
      {expanded && (
        <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', flex: 1 }}>
          {DC_BUCKETS.map(bucket => {
            const isActive = active?.has(bucket);
            const count = counts?.[bucket] || 0;
            if (count === 0 && !isActive) return null;
            return (
              <button
                key={bucket}
                onClick={() => onToggle(bucket)}
                style={{
                  fontSize: 10, padding: '1px 6px', borderRadius: 10,
                  border: `1px solid ${isActive ? 'var(--accent, #82aaff)' : 'var(--border)'}`,
                  background: isActive ? 'rgba(130, 170, 255, 0.2)' : 'var(--bg-input, #222)',
                  color: isActive ? 'var(--accent, #82aaff)' : 'var(--text)',
                  cursor: 'pointer', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap',
                }}
              >
                {DC_BUCKET_LABELS[bucket]} <span style={{ opacity: 0.6 }}>{count}</span>
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
