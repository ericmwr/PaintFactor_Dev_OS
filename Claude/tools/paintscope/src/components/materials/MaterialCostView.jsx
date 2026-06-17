import { useMemo } from 'react';
import { useEstimateScenario } from '../../hooks/useEstimateScenario';
import { useProject } from '../../hooks/useProject';
import { useProducts } from '../../hooks/useProducts';

export default function MaterialCostView() {
  const estimate = useEstimateScenario();
  const { state } = useProject();
  const { products: catalogProducts } = useProducts();
  const manualEntries = state.project?.material_overrides?.manual;
  const manuals = Array.isArray(manualEntries) ? manualEntries : [];

  const materialCosts = useMemo(() => {
    const groups = {};
    (estimate?.materialEstimates || []).forEach(mat => {
      const key = `${mat.productId || mat.systemName || mat.specFamilyId}||${mat.productRole || ''}`;
      if (!groups[key]) {
        groups[key] = {
          systemName: mat.systemName || mat.specFamilyId,
          productName: mat.productName || mat.systemName || mat.specFamilyId,
          brand: mat.brand || null,
          gallons: 0,
          totalSF: 0,
          unitCost: mat.pricePerGallon || 0,
          coverageRate: mat.coverageRate,
          source: 'engine',
        };
      }
      groups[key].gallons += mat.gallons || 0;
      groups[key].totalSF += mat.totalSF || 0;
    });

    // Append manually added products as their own rows
    manuals.forEach(m => {
      const product = catalogProducts.find(p => p.id === m.product_id);
      const productName = product?.product_name || `(deleted product: ${m.product_id})`;
      const brand = product?.brand || null;
      const unitCost = product?.unit_cost || 0;
      const systemName = product ? `Manual: ${product.product_type}` : 'Manual';
      groups[`manual::${m.id}`] = {
        systemName,
        productName,
        brand,
        gallons: m.gallons || 0,
        totalSF: 0,
        unitCost,
        coverageRate: product?.coverage_sf_per_gal,
        source: 'manual',
      };
    });

    return Object.values(groups).map(g => ({
      ...g,
      gallons: Math.round(g.gallons * 10) / 10,
      totalCost: g.unitCost ? Math.round(g.gallons * g.unitCost * 100) / 100 : 0,
    }));
  }, [estimate, manuals, catalogProducts]);

  const totalMaterialCost = materialCosts.reduce((sum, m) => sum + m.totalCost, 0);

  return (
    <div>
      <h3 style={{ fontSize: 14, marginBottom: 12 }}>Material Cost Estimate</h3>

      {materialCosts.length === 0 ? (
        <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>
          Run an estimate first to see material costs. Add rooms with surfaces to generate material estimates.
        </div>
      ) : (
        <>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                <th style={{ padding: '6px 8px' }}>Material</th>
                <th style={{ padding: '6px 8px' }}>Quantity</th>
                <th style={{ padding: '6px 8px' }}>Product</th>
                <th style={{ padding: '6px 8px' }}>Unit Cost</th>
                <th style={{ padding: '6px 8px' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {materialCosts.map((m, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border)', background: m.source === 'manual' ? 'rgba(95,213,95,0.04)' : 'transparent' }}>
                  <td style={{ padding: '6px 8px' }}>
                    {m.source === 'manual' && <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 3, background: 'rgba(95,213,95,0.2)', color: '#5d5', marginRight: 6 }}>manual</span>}
                    {m.systemName || m.specFamilyId || 'Unknown'}
                  </td>
                  <td style={{ padding: '6px 8px', fontFamily: 'monospace' }}>{(m.gallons || 0).toFixed(1)} gal</td>
                  <td style={{ padding: '6px 8px', fontSize: 11 }}>
                    {m.productName && m.brand
                      ? <span>{m.brand} — {m.productName}</span>
                      : <span style={{ color: 'var(--text-muted)' }}>{m.productName || 'No product linked'}</span>
                    }
                  </td>
                  <td style={{ padding: '6px 8px', fontFamily: 'monospace' }}>{m.unitCost ? `$${m.unitCost.toFixed(2)}` : '—'}</td>
                  <td style={{ padding: '6px 8px', fontFamily: 'monospace', fontWeight: 600 }}>{m.totalCost ? `$${m.totalCost.toFixed(2)}` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ textAlign: 'right', marginTop: 8, fontSize: 14, fontWeight: 600 }}>
            Total Material Cost: ${totalMaterialCost.toFixed(2)}
          </div>
        </>
      )}
    </div>
  );
}
