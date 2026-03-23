import { useMemo } from 'react';
import { useEstimate } from '../../hooks/useEstimate';
import { useProject } from '../../hooks/useProject';
import { SYSTEM_INDEX } from '../../data/product-catalog.js';

export default function ResolvedProductsView() {
  const estimate = useEstimate();
  const { state, dispatch } = useProject();
  const overrides = state.project.material_overrides || { system: {}, manual: {} };

  const materials = estimate?.materialEstimates || [];

  const setSystemOverride = (systemId, productId) => {
    const newOverrides = { ...state.project.material_overrides };
    newOverrides.system = { ...newOverrides.system };
    if (productId) {
      newOverrides.system[systemId] = productId;
    } else {
      delete newOverrides.system[systemId];
    }
    dispatch({ type: 'SET_PROJECT', payload: { field: 'material_overrides', value: newOverrides } });
  };

  const getAlternatives = (systemId) => {
    return SYSTEM_INDEX.get(systemId) || [];
  };

  const isOverridden = (systemId) =>
    overrides.system && overrides.system[systemId];

  return (
    <div>
      <h3 style={{ fontSize: 14, marginBottom: 12 }}>Resolved Products</h3>
      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
        Products auto-selected based on project brand preference and quality tier.
        Override any selection with the dropdown.
      </p>
      {materials.length === 0 ? (
        <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          No material estimates available. Add rooms with surfaces to see resolved products.
        </p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: 10 }}>
              <th style={{ padding: 8, textAlign: 'left' }}>System</th>
              <th style={{ padding: 8, textAlign: 'left' }}>Product</th>
              <th style={{ padding: 8, textAlign: 'left' }}>Brand</th>
              <th style={{ padding: 8, textAlign: 'right' }}>Coverage</th>
              <th style={{ padding: 8, textAlign: 'right' }}>Price</th>
              <th style={{ padding: 8, textAlign: 'center' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {materials.map((m, i) => {
              const alts = m.systemId ? getAlternatives(m.systemId) : [];
              const pinned = isOverridden(m.systemId);
              return (
                <tr key={i} style={{
                  borderBottom: '1px solid var(--bg-hover)',
                  background: pinned ? 'rgba(59,130,246,0.05)' : 'transparent'
                }}>
                  <td style={{ padding: 8, color: 'var(--text-secondary)' }}>{m.systemName}</td>
                  <td style={{ padding: 8 }}>
                    {alts.length > 1 ? (
                      <select
                        value={pinned || m.productId || ''}
                        onChange={e => setSystemOverride(m.systemId, e.target.value || null)}
                        style={{ fontSize: 12, padding: '4px 8px', background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 4, maxWidth: 280 }}
                      >
                        <option value="">Auto-resolve</option>
                        {alts.map(p => (
                          <option key={p.product_id} value={p.product_id}>
                            {p.brand} — {p.product_name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span style={{ fontWeight: 600 }}>{m.productName || '(unresolved)'}</span>
                    )}
                  </td>
                  <td style={{ padding: 8 }}>{m.brand || '—'}</td>
                  <td style={{ padding: 8, textAlign: 'right' }}>{m.coverageRate} SF/gal</td>
                  <td style={{ padding: 8, textAlign: 'right', color: 'var(--accent)' }}>
                    {m.pricePerGallon ? `$${m.pricePerGallon}` : '—'}
                  </td>
                  <td style={{ padding: 8, textAlign: 'center' }}>
                    {pinned ? (
                      <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'rgba(59,130,246,0.2)', color: '#60a5fa' }}>pinned</span>
                    ) : (
                      <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{m.resolvedBy || 'auto'}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
