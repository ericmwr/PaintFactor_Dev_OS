import { useMemo } from 'react';
import { DB_BUNDLE } from '../../data/db-bundle';

export default function ModifierOverridePanel({ specFamilyId }) {
  const modifiers = useMemo(() => {
    return DB_BUNDLE.factor_modifiers.filter(m => m.spec_family_id === specFamilyId);
  }, [specFamilyId]);

  const qtEffects = useMemo(() => {
    return DB_BUNDLE.quality_tier_effects.filter(q => q.spec_family_id === specFamilyId);
  }, [specFamilyId]);

  return (
    <div>
      <h3 style={{ fontSize: 14, marginBottom: 12 }}>Modifiers for {specFamilyId}</h3>

      {qtEffects.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <h4 style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>Quality Tier Effects</h4>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '4px 8px', textAlign: 'left' }}>Tier</th>
                <th style={{ padding: '4px 8px', textAlign: 'left' }}>Time Modifier</th>
                <th style={{ padding: '4px 8px', textAlign: 'left' }}>Material Modifier</th>
              </tr>
            </thead>
            <tbody>
              {qtEffects.map((qt, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '4px 8px', fontWeight: 600 }}>{qt.quality_tier}</td>
                  <td style={{ padding: '4px 8px', fontFamily: 'monospace' }}>{qt.time_modifier ?? '—'}</td>
                  <td style={{ padding: '4px 8px', fontFamily: 'monospace' }}>{qt.material_modifier ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modifiers.length > 0 && (
        <div>
          <h4 style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>Factor Modifiers</h4>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '4px 8px', textAlign: 'left' }}>Modifier</th>
                <th style={{ padding: '4px 8px', textAlign: 'left' }}>Category</th>
                <th style={{ padding: '4px 8px', textAlign: 'left' }}>Value</th>
              </tr>
            </thead>
            <tbody>
              {modifiers.map((mod, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '4px 8px' }}>
                    <div style={{ fontWeight: 500 }}>{mod.modifier_name || mod.modifier_id}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{mod.modifier_id}</div>
                  </td>
                  <td style={{ padding: '4px 8px', fontSize: 11 }}>{mod.modifier_category || '—'}</td>
                  <td style={{ padding: '4px 8px', fontFamily: 'monospace' }}>
                    {typeof mod.value === 'object' ? JSON.stringify(mod.value) : (mod.time_modifier ?? mod.value ?? '—')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modifiers.length === 0 && qtEffects.length === 0 && (
        <div style={{ color: 'var(--text-muted)', padding: 20, textAlign: 'center' }}>
          No modifiers defined for this spec.
        </div>
      )}
    </div>
  );
}
