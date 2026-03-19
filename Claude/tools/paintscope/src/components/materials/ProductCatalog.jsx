import { useState } from 'react';
import { useProducts } from '../../hooks/useProducts';

const PRODUCT_TYPES = ['primer', 'paint', 'stain', 'sealer', 'clear', 'caulk'];

const emptyProduct = () => ({
  brand: '',
  product_name: '',
  sku: '',
  unit_size: 'GAL',
  unit_cost: 0,
  coverage_sf_per_gal: 350,
  product_type: 'paint',
  material_system_ids: [],
  sheen: '',
  notes: '',
});

export default function ProductCatalog() {
  const { products, loading, save, remove } = useProducts();
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState(null);
  const [search, setSearch] = useState('');

  if (loading) return <div style={{ color: 'var(--text-muted)' }}>Loading...</div>;

  const filtered = products.filter(p => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (p.product_name || '').toLowerCase().includes(q) || (p.brand || '').toLowerCase().includes(q);
  });

  const startAdd = () => {
    setDraft(emptyProduct());
    setEditingId('new');
  };

  const startEdit = (p) => {
    setDraft({ ...p });
    setEditingId(p.id);
  };

  const handleSave = async () => {
    await save(draft);
    setDraft(null);
    setEditingId(null);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this product?')) return;
    await remove(id);
  };

  const setField = (field, value) => setDraft({ ...draft, [field]: value });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ fontSize: 14, margin: 0 }}>Product Catalog ({products.length})</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." style={{ fontSize: 12, padding: '4px 8px' }} />
          <button className="btn btn-sm btn-accent" onClick={startAdd} style={{ fontSize: 11 }}>+ Add Product</button>
        </div>
      </div>

      {editingId && draft && (
        <div style={{ padding: 12, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', marginBottom: 12 }}>
          <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            <div className="setup-field">
              <label style={{ fontSize: 11 }}>Brand</label>
              <input value={draft.brand} onChange={e => setField('brand', e.target.value)} style={{ fontSize: 12 }} />
            </div>
            <div className="setup-field">
              <label style={{ fontSize: 11 }}>Product Name</label>
              <input value={draft.product_name} onChange={e => setField('product_name', e.target.value)} style={{ fontSize: 12 }} />
            </div>
            <div className="setup-field">
              <label style={{ fontSize: 11 }}>SKU</label>
              <input value={draft.sku} onChange={e => setField('sku', e.target.value)} style={{ fontSize: 12 }} />
            </div>
            <div className="setup-field">
              <label style={{ fontSize: 11 }}>Type</label>
              <select value={draft.product_type} onChange={e => setField('product_type', e.target.value)} style={{ fontSize: 12 }}>
                {PRODUCT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="setup-field">
              <label style={{ fontSize: 11 }}>Unit Cost ($)</label>
              <input type="number" step="0.01" value={draft.unit_cost} onChange={e => setField('unit_cost', parseFloat(e.target.value) || 0)} style={{ fontSize: 12 }} />
            </div>
            <div className="setup-field">
              <label style={{ fontSize: 11 }}>Coverage (SF/gal)</label>
              <input type="number" value={draft.coverage_sf_per_gal} onChange={e => setField('coverage_sf_per_gal', parseInt(e.target.value) || 0)} style={{ fontSize: 12 }} />
            </div>
            <div className="setup-field">
              <label style={{ fontSize: 11 }}>Sheen</label>
              <input value={draft.sheen || ''} onChange={e => setField('sheen', e.target.value)} placeholder="e.g. satin" style={{ fontSize: 12 }} />
            </div>
            <div className="setup-field">
              <label style={{ fontSize: 11 }}>Unit Size</label>
              <input value={draft.unit_size} onChange={e => setField('unit_size', e.target.value)} style={{ fontSize: 12 }} />
            </div>
            <div className="setup-field">
              <label style={{ fontSize: 11 }}>Material System IDs</label>
              <input value={(draft.material_system_ids || []).join(', ')} onChange={e => setField('material_system_ids', e.target.value.split(',').map(s => s.trim()).filter(Boolean))} placeholder="Comma-separated" style={{ fontSize: 12 }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button className="btn btn-accent" onClick={handleSave} style={{ fontSize: 11 }}>Save</button>
            <button className="btn btn-sm" onClick={() => { setDraft(null); setEditingId(null); }} style={{ fontSize: 11 }}>Cancel</button>
          </div>
        </div>
      )}

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
            <th style={{ padding: '6px 8px' }}>Brand</th>
            <th style={{ padding: '6px 8px' }}>Product</th>
            <th style={{ padding: '6px 8px' }}>Type</th>
            <th style={{ padding: '6px 8px' }}>Cost</th>
            <th style={{ padding: '6px 8px' }}>Coverage</th>
            <th style={{ padding: '6px 8px' }}></th>
          </tr>
        </thead>
        <tbody>
          {filtered.map(p => (
            <tr key={p.id} style={{ borderBottom: '1px solid var(--border)' }}>
              <td style={{ padding: '6px 8px' }}>{p.brand}</td>
              <td style={{ padding: '6px 8px', fontWeight: 500 }}>{p.product_name}</td>
              <td style={{ padding: '6px 8px', fontSize: 11 }}>{p.product_type}</td>
              <td style={{ padding: '6px 8px', fontFamily: 'monospace' }}>${p.unit_cost?.toFixed(2)}</td>
              <td style={{ padding: '6px 8px', fontFamily: 'monospace' }}>{p.coverage_sf_per_gal} SF/gal</td>
              <td style={{ padding: '6px 8px' }}>
                <button className="btn btn-sm" onClick={() => startEdit(p)} style={{ fontSize: 10, marginRight: 4 }}>Edit</button>
                <button className="btn btn-sm" onClick={() => handleDelete(p.id)} style={{ fontSize: 10, color: '#e74c3c' }}>Del</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {filtered.length === 0 && (
        <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>
          {products.length === 0 ? 'No products yet. Add one to get started.' : 'No matching products.'}
        </div>
      )}
    </div>
  );
}
