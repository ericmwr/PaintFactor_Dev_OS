import { useState } from 'react';
import { useProducts } from '../../hooks/useProducts';
import { useProject } from '../../hooks/useProject';

/**
 * Modal for adding a product from the Product Catalog directly into the
 * current project's material list. Writes to state.project.material_overrides.manual
 * via ADD_MANUAL_MATERIAL. Resolved Products + Material Costs merge these
 * entries alongside engine-emitted estimates so they show on both screens.
 */
export default function ManualMaterialModal({ onClose }) {
  const { products, loading } = useProducts();
  const { dispatch } = useProject();
  const [productId, setProductId] = useState('');
  const [gallons, setGallons] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState(null);

  const selected = products.find(p => p.id === productId);
  const estCost = selected && gallons ? (selected.unit_cost || 0) * Number(gallons) : 0;

  const handleSave = () => {
    setError(null);
    if (!productId) { setError('Pick a product.'); return; }
    const g = parseFloat(gallons);
    if (!isFinite(g) || g <= 0) { setError('Gallons must be a positive number.'); return; }
    dispatch({ type: 'ADD_MANUAL_MATERIAL', payload: { product_id: productId, gallons: g, notes } });
    onClose();
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--bg-card, #1f1f1f)', color: 'var(--text)',
          border: '1px solid var(--border, #333)', borderRadius: 6,
          padding: 20, maxWidth: 480, width: '90%',
          boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Add Product to Estimate</h3>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 16 }}>×</button>
        </div>

        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12 }}>
          Adds a product from your catalog directly to this project. Useful when the engine
          didn't auto-resolve a material you need (e.g., trim paint).
        </div>

        {loading ? (
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Loading products…</div>
        ) : products.length === 0 ? (
          <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic', padding: 8 }}>
            No products in catalog yet. Add one via Materials → Product Entry first.
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr', gap: 8, fontSize: 12, marginBottom: 12 }}>
              <span style={{ color: 'var(--text-muted)' }}>Product</span>
              <select
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                style={selectStyle()}
              >
                <option value="">Select a product…</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.brand ? `${p.brand} — ` : ''}{p.product_name} ({p.product_type})
                  </option>
                ))}
              </select>

              <span style={{ color: 'var(--text-muted)' }}>Gallons</span>
              <input
                type="number" step="0.25" min="0"
                value={gallons}
                onChange={(e) => setGallons(e.target.value)}
                placeholder="0.0"
                style={inputStyle()}
              />

              <span style={{ color: 'var(--text-muted)' }}>Notes</span>
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional"
                style={inputStyle()}
              />
            </div>

            {selected && (
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12, padding: 8, background: 'var(--bg-input, #161616)', borderRadius: 3 }}>
                Coverage: {selected.coverage_sf_per_gal} SF/gal &nbsp;•&nbsp;
                Unit cost: ${(selected.unit_cost || 0).toFixed(2)}/{selected.unit_size || 'GAL'} &nbsp;•&nbsp;
                Est total: <strong style={{ color: 'var(--accent)' }}>${estCost.toFixed(2)}</strong>
              </div>
            )}

            {error && (
              <div style={{ color: '#e74c3c', fontSize: 11, marginBottom: 12 }}>❌ {error}</div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={onClose} style={cancelBtn()}>Cancel</button>
              <button onClick={handleSave} style={saveBtn()}>Add to Estimate</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function inputStyle() {
  return {
    background: 'var(--bg-input, #161616)', color: 'var(--text)',
    border: '1px solid var(--border, #333)', padding: '4px 8px',
    borderRadius: 3, fontSize: 12,
  };
}
function selectStyle() {
  return { ...inputStyle(), cursor: 'pointer' };
}
function cancelBtn() {
  return {
    background: 'transparent', border: '1px solid var(--border, #333)',
    color: 'var(--text)', padding: '6px 14px', borderRadius: 4,
    cursor: 'pointer', fontSize: 12,
  };
}
function saveBtn() {
  return {
    background: 'var(--accent, #82aaff)', color: 'var(--bg, #0f0f0f)',
    border: 'none', padding: '6px 14px', borderRadius: 4,
    cursor: 'pointer', fontSize: 12, fontWeight: 600,
  };
}
