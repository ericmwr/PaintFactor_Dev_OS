// Chip-based tag filter bar. Progressive disclosure: primary categories visible,
// advanced categories behind a "More filters" toggle. Each chip row is
// individually collapsible via a chevron next to its label — collapsed rows
// still show their active-filter count for at-a-glance awareness.
// Chips with count < MIN_COUNT_TO_SHOW hide unless they're currently active.

import { useState } from 'react';

const MIN_COUNT_TO_SHOW = 5;

const PRIMARY_CATEGORIES_MODULE = [
  { key: 'phase', label: 'Phase' },
  { key: 'substrate', label: 'Substrate' },
  { key: 'method', label: 'Method' },
];
const PRIMARY_CATEGORIES_SCENARIO = [
  { key: 'domain', label: 'Domain' },
  { key: 'substrate', label: 'Substrate' },
  { key: 'method', label: 'Method' },
];
const ADVANCED_CATEGORIES = [
  { key: 'qt', label: 'QT' },
  { key: 'state', label: 'State' },
  { key: 'coating', label: 'Coating' },
  { key: 'status', label: 'Status' },
];

export default function TagFilterBar({ kind, chipCounts, activeTags, onToggleTag, onClearAll }) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const primary = kind === 'scenario' ? PRIMARY_CATEGORIES_SCENARIO : PRIMARY_CATEGORIES_MODULE;

  const activeCount = Object.values(activeTags).reduce((sum, s) => sum + (s?.size || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 6 }}>
      {primary.map(cat => (
        <ChipRow
          key={cat.key}
          label={cat.label}
          catKey={cat.key}
          counts={chipCounts[cat.key] || {}}
          active={activeTags[cat.key]}
          onToggle={onToggleTag}
        />
      ))}

      <div
        onClick={() => setShowAdvanced(v => !v)}
        style={{
          fontSize: 10,
          color: 'var(--text-muted)',
          cursor: 'pointer',
          padding: '3px 0',
          userSelect: 'none',
          marginTop: 2,
        }}
      >
        {showAdvanced ? '▾' : '▸'} More filters {activeCount > 0 && <span style={{ color: 'var(--accent, #82aaff)' }}>({activeCount} active)</span>}
        {activeCount > 0 && (
          <button
            onClick={e => { e.stopPropagation(); onClearAll(); }}
            style={{ marginLeft: 8, fontSize: 9, color: '#e74c3c', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
          >Clear all</button>
        )}
      </div>

      {showAdvanced && ADVANCED_CATEGORIES.map(cat => (
        <ChipRow
          key={cat.key}
          label={cat.label}
          catKey={cat.key}
          counts={chipCounts[cat.key] || {}}
          active={activeTags[cat.key]}
          onToggle={onToggleTag}
        />
      ))}
    </div>
  );
}

/**
 * A single chip row. Own collapse state (default expanded).
 * Hides chips with count < MIN_COUNT_TO_SHOW unless active.
 * If all chips in row are hidden, the row hides entirely.
 */
function ChipRow({ label, catKey, counts, active, onToggle }) {
  const [expanded, setExpanded] = useState(false);

  const entries = Object.entries(counts)
    .filter(([val, count]) => count >= MIN_COUNT_TO_SHOW || (active && active.has(val)))
    .sort((a, b) => b[1] - a[1]);

  if (entries.length === 0) return null;

  const activeSize = active?.size || 0;

  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'flex-start', flexWrap: 'wrap' }}>
      <span
        onClick={() => setExpanded(v => !v)}
        style={{
          fontSize: 9,
          color: 'var(--text-muted)',
          width: 72,
          flexShrink: 0,
          cursor: 'pointer',
          userSelect: 'none',
          paddingTop: 2,
        }}
      >
        {expanded ? '▾' : '▸'} {label}
        {!expanded && activeSize > 0 && <span style={{ color: 'var(--accent, #82aaff)', marginLeft: 4 }}>({activeSize})</span>}
      </span>
      {expanded && (
        <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', flex: 1 }}>
          {entries.map(([val, count]) => {
            const isActive = active && active.has(val);
            return (
              <button
                key={val}
                onClick={() => onToggle(catKey, val)}
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
                {val} <span style={{ opacity: 0.6 }}>{count}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
