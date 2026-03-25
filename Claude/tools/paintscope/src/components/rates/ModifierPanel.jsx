import { useState } from 'react';
import { useSpecData } from '../../hooks/useSpecData';

export default function ModifierPanel({ specId }) {
  const { specData, dispatch } = useSpecData();
  const [expanded, setExpanded] = useState(false);

  const modifiers = specData.factor_modifiers.filter(m => m.spec_family_id === specId);
  const qtEffects = specData.quality_tier_effects.filter(q => q.spec_family_id === specId);

  if (modifiers.length === 0 && qtEffects.length === 0) return null;

  const updateMod = (modId, field, value) => dispatch({ type: 'UPDATE_MODIFIER', payload: { specId, modifierId: modId, field, value } });

  // Summary for collapsed state
  const summary = modifiers.slice(0, 3).map(m => m.name || m.id).join(', ');

  return (
    <div style={{ padding: '4px 8px', marginTop: 4 }}>
      <div onClick={() => setExpanded(!expanded)} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
        <span style={{ color: 'var(--text-muted)', fontSize: 9 }}>{expanded ? '▼' : '▶'}</span>
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Modifiers ({modifiers.length + qtEffects.length})</span>
        {!expanded && summary && <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>— {summary}</span>}
      </div>

      {expanded && (
        <div style={{ marginTop: 6 }}>
          {/* Quality Tier Effects */}
          {qtEffects.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginBottom: 4, fontWeight: 600 }}>Quality Tier Effects</div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle, #1a2a3a)' }}>
                    <th style={{ padding: '2px 6px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 500 }}>Tier</th>
                    <th style={{ padding: '2px 6px', textAlign: 'center', color: 'var(--text-muted)', fontWeight: 500 }}>Time Modifier</th>
                  </tr>
                </thead>
                <tbody>
                  {qtEffects.map((qt, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border-subtle, #1a2a3a)' }}>
                      <td style={{ padding: '2px 6px', fontWeight: 600, fontSize: 11 }}>{qt.quality_tier}</td>
                      <td style={{ padding: '2px 6px', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 11 }}>{qt.time_modifier ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Factor Modifiers */}
          {modifiers.length > 0 && (
            <div>
              <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginBottom: 4, fontWeight: 600 }}>Factor Modifiers</div>
              {modifiers.map((mod, i) => (
                <div key={mod.id || i} style={{ marginBottom: 8, padding: '4px 6px', background: 'var(--bg-input, #0a1018)', borderRadius: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <div>
                      <span style={{ fontWeight: 500, fontSize: 11 }}>{mod.name || mod.id}</span>
                      <span style={{ fontSize: 9, color: 'var(--text-muted)', marginLeft: 6 }}>{mod.modifier_category || ''}</span>
                    </div>
                    <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>{mod.modifier_type || ''}</span>
                  </div>
                  {/* Show condition entries */}
                  {mod.condition && typeof mod.condition === 'object' && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {Object.entries(mod.condition).map(([variant, data]) => (
                        <div key={variant} style={{ fontSize: 10, padding: '1px 6px', background: 'var(--bg-card, #111a28)', borderRadius: 3 }}>
                          <span style={{ color: 'var(--text-muted)' }}>{variant}:</span>{' '}
                          <span style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>
                            {typeof data === 'object' ? (data.value ?? JSON.stringify(data)) : data}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
