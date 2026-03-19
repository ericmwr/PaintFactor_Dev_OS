import { useState } from 'react';

function extractBaseRate(rate) {
  if (!rate) return { value: null, field: null, label: 'No rate' };
  // Try rates_by_tier first (show QT3 as default display)
  if (rate.rates_by_tier && typeof rate.rates_by_tier === 'object') {
    const qt3 = rate.rates_by_tier.QT3;
    if (qt3 && typeof qt3 === 'object') {
      for (const [k, v] of Object.entries(qt3)) {
        if (k.startsWith('rate_') && typeof v === 'number' && v > 0) {
          return { value: v, field: k, label: `${v} ${rate.unit_of_measure}/hr` };
        }
      }
    }
  }
  if (rate.rate_per_hour) return { value: rate.rate_per_hour, field: 'rate_per_hour', label: `${rate.rate_per_hour} ${rate.unit_of_measure}/hr` };
  if (rate.fixed_minutes) return { value: rate.fixed_minutes, field: 'fixed_minutes', label: `${rate.fixed_minutes} min fixed` };
  if (rate.fixed_minutes_by_tier?.QT3) return { value: rate.fixed_minutes_by_tier.QT3, field: 'fixed_minutes_by_tier', label: `${rate.fixed_minutes_by_tier.QT3} min fixed` };
  return { value: null, field: null, label: 'No rate' };
}

export default function RateRow({ task, specFamilyId, overlayMap, onSetOverride, onResetOverride }) {
  const base = extractBaseRate(task.rate);
  const overlayKey = `${specFamilyId}::${task.task_id}`;
  const overlay = overlayMap[overlayKey];
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState('');

  const hasOverride = !!overlay;

  const handleStartEdit = () => {
    setEditValue(overlay?.override_value ?? base.value ?? '');
    setEditing(true);
  };

  const handleSave = () => {
    const val = parseFloat(editValue);
    if (!isNaN(val) && val > 0 && base.field) {
      onSetOverride(specFamilyId, task.task_id, base.field, base.value, val, '');
    }
    setEditing(false);
  };

  const handleReset = () => {
    onResetOverride(specFamilyId, task.task_id, base.field);
  };

  return (
    <tr style={{ borderBottom: '1px solid var(--border)', background: hasOverride ? 'rgba(255, 180, 50, 0.06)' : 'transparent' }}>
      <td style={{ padding: '6px 8px' }}>
        <div style={{ fontWeight: 500 }}>{task.task_name || task.task_id}</div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{task.task_id}</div>
      </td>
      <td style={{ padding: '6px 8px', fontSize: 11, color: 'var(--text-secondary)' }}>{task.phase}</td>
      <td style={{ padding: '6px 8px', fontSize: 11 }}>{task.rate?.unit_of_measure || '—'}</td>
      <td style={{ padding: '6px 8px', fontFamily: 'var(--font-mono, monospace)' }}>
        <span style={{ textDecoration: hasOverride ? 'line-through' : 'none', opacity: hasOverride ? 0.5 : 1 }}>
          {base.label}
        </span>
      </td>
      <td style={{ padding: '6px 8px' }}>
        {editing ? (
          <div style={{ display: 'flex', gap: 4 }}>
            <input
              autoFocus
              type="number"
              step="0.1"
              value={editValue}
              onChange={e => setEditValue(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false); }}
              style={{ width: 70, fontSize: 12, padding: '2px 4px' }}
            />
            <button className="btn btn-sm" onClick={handleSave} style={{ fontSize: 10, padding: '2px 6px' }}>OK</button>
          </div>
        ) : hasOverride ? (
          <span style={{ color: 'var(--accent-warn, #e67e22)', fontWeight: 600, fontFamily: 'var(--font-mono, monospace)', cursor: 'pointer' }} onClick={handleStartEdit}>
            {overlay.override_value}
          </span>
        ) : (
          <span style={{ color: 'var(--text-muted)', cursor: 'pointer', fontSize: 11 }} onClick={handleStartEdit}>
            click to set
          </span>
        )}
      </td>
      <td style={{ padding: '6px 8px' }}>
        {hasOverride && (
          <button className="btn btn-sm" onClick={handleReset} style={{ fontSize: 10, padding: '2px 6px', color: '#e74c3c' }} title="Reset to base">
            Reset
          </button>
        )}
      </td>
    </tr>
  );
}
