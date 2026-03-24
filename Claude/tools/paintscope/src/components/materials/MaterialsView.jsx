import { useState } from 'react';
import ProductCatalog from './ProductCatalog';
import MaterialCostView from './MaterialCostView';
import ResolvedProductsView from './ResolvedProductsView';

export default function MaterialsView() {
  const [tab, setTab] = useState('resolved');

  return (
    <div style={{ padding: 16, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', gap: 0, marginBottom: 16, borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid var(--border)', alignSelf: 'flex-start' }}>
        {[
          { id: 'resolved', label: 'Resolved Products' },
          { id: 'costs', label: 'Material Costs' },
          { id: 'catalog', label: 'Product Entry' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: '6px 16px', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer',
              background: tab === t.id ? 'var(--accent)' : 'var(--bg-card)',
              color: tab === t.id ? '#fff' : 'var(--text-secondary)',
            }}
          >{t.label}</button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {tab === 'catalog' && <ProductCatalog />}
        {tab === 'costs' && <MaterialCostView />}
        {tab === 'resolved' && <ResolvedProductsView />}
      </div>
    </div>
  );
}
