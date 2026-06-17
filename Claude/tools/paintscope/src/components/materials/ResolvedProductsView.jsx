import { useMemo, useState } from 'react';
import { useEstimateScenario } from '../../hooks/useEstimateScenario';
import { useProject } from '../../hooks/useProject';
import { useProducts } from '../../hooks/useProducts';
import { SYSTEM_INDEX } from '../../data/product-catalog.js';
import ManualMaterialModal from './ManualMaterialModal.jsx';

export default function ResolvedProductsView() {
  const estimate = useEstimateScenario();
  const { state, dispatch } = useProject();
  const { products: catalogProducts } = useProducts();
  const [addOpen, setAddOpen] = useState(false);
  const overrides = state.project.material_overrides || { system: {}, manual: [] };
  const manualEntries = Array.isArray(overrides.manual) ? overrides.manual : [];

  // Consolidate by productId — same product from multiple specs merges into one row
  const materials = useMemo(() => {
    const raw = estimate?.materialEstimates || [];
    const groups = {};
    raw.forEach(m => {
      const key = `${m.productId || m.systemName || m.specFamilyId}||${m.productRole || ''}`;
      if (!groups[key]) {
        groups[key] = { ...m, totalSF: 0, gallons: 0 };
      }
      groups[key].totalSF += m.totalSF || 0;
      groups[key].gallons += m.gallons || 0;
    });
    return Object.values(groups).map(g => ({
      ...g,
      gallons: Math.round(g.gallons * 10) / 10,
    }));
  }, [estimate]);

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

  const removeManual = (id) => {
    if (!confirm('Remove this product from the estimate?')) return;
    dispatch({ type: 'REMOVE_MANUAL_MATERIAL', payload: id });
  };

  const updateManualGallons = (id, val) => {
    const g = parseFloat(val);
    if (!isFinite(g) || g <= 0) return;
    dispatch({ type: 'UPDATE_MANUAL_MATERIAL', payload: { id, gallons: g } });
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
        <h3 style={{ fontSize: 14, margin: 0 }}>Resolved Products</h3>
        <button
          onClick={() => setAddOpen(true)}
          style={{
            background: 'var(--accent, #82aaff)', color: 'var(--bg, #0f0f0f)',
            border: 'none', padding: '4px 12px', borderRadius: 4,
            fontSize: 11, fontWeight: 600, cursor: 'pointer',
          }}
        >+ Add Product to Estimate</button>
      </div>
      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
        Products auto-selected based on project brand preference and quality tier.
        Override any selection with the dropdown. Use <strong>+ Add Product to Estimate</strong> to
        attach catalog products manually (e.g., when the engine didn't fire a material like trim paint).
      </p>
      {materials.length === 0 && manualEntries.length === 0 ? (
        <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          No material estimates available. Add rooms with surfaces to see resolved products,
          or use <strong>+ Add Product to Estimate</strong> above.
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
            {manualEntries.length > 0 && (
              <>
                <tr><td colSpan={6} style={{ padding: '12px 8px 4px', fontSize: 10, color: 'var(--text-muted)', letterSpacing: 0.5, fontWeight: 600 }}>
                  ═══ MANUALLY ADDED ═══
                </td></tr>
                {manualEntries.map(m => {
                  const product = catalogProducts.find(p => p.id === m.product_id);
                  if (!product) {
                    return (
                      <tr key={m.id} style={{ borderBottom: '1px solid var(--bg-hover)', background: 'rgba(241,196,15,0.05)' }}>
                        <td colSpan={5} style={{ padding: 8, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                          (product deleted from catalog — was id {m.product_id}) — {m.gallons} gal {m.notes && `· ${m.notes}`}
                        </td>
                        <td style={{ padding: 8, textAlign: 'center' }}>
                          <button onClick={() => removeManual(m.id)} style={{ background: 'transparent', border: 'none', color: '#e74c3c', cursor: 'pointer', fontSize: 11 }}>Remove</button>
                        </td>
                      </tr>
                    );
                  }
                  const cost = (product.unit_cost || 0) * (m.gallons || 0);
                  return (
                    <tr key={m.id} style={{ borderBottom: '1px solid var(--bg-hover)', background: 'rgba(95,213,95,0.04)' }}>
                      <td style={{ padding: 8, color: 'var(--text-secondary)' }}>
                        <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 3, background: 'rgba(95,213,95,0.2)', color: '#5d5', marginRight: 6 }}>manual</span>
                        {product.product_type}
                      </td>
                      <td style={{ padding: 8, fontWeight: 600 }}>{product.product_name}</td>
                      <td style={{ padding: 8 }}>{product.brand || '—'}</td>
                      <td style={{ padding: 8, textAlign: 'right' }}>
                        <input
                          type="number" step="0.25" min="0"
                          defaultValue={m.gallons}
                          onBlur={(e) => updateManualGallons(m.id, e.target.value)}
                          style={{ width: 64, textAlign: 'right', background: 'var(--bg-input, #161616)', color: 'var(--text)', border: '1px solid var(--border)', padding: '2px 4px', borderRadius: 3, fontSize: 11 }}
                        /> gal
                      </td>
                      <td style={{ padding: 8, textAlign: 'right', color: 'var(--accent)' }}>
                        {product.unit_cost ? `$${(product.unit_cost).toFixed(2)} → $${cost.toFixed(2)}` : '—'}
                      </td>
                      <td style={{ padding: 8, textAlign: 'center' }}>
                        <button onClick={() => removeManual(m.id)} style={{ background: 'transparent', border: 'none', color: '#e74c3c', cursor: 'pointer', fontSize: 11 }}>Remove</button>
                      </td>
                    </tr>
                  );
                })}
              </>
            )}
          </tbody>
        </table>
      )}

      {addOpen && <ManualMaterialModal onClose={() => setAddOpen(false)} />}
    </div>
  );
}
