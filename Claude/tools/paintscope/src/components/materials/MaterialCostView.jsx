import { useMemo } from 'react';
import { useEstimate } from '../../hooks/useEstimate';
import { useProducts } from '../../hooks/useProducts';

export default function MaterialCostView() {
  const estimate = useEstimate();
  const { products, loading } = useProducts();

  const materialCosts = useMemo(() => {
    if (!estimate?.materialEstimates) return [];

    return estimate.materialEstimates.map(mat => {
      // Try to find a matching product
      const matchingProduct = products.find(p =>
        (mat.material_system_id && p.material_system_ids?.includes(mat.material_system_id)) ||
        (p.product_type === mat.product_type)
      );

      const gallons = mat.gallons_needed || 0;
      const unitCost = matchingProduct?.unit_cost || 0;
      const totalCost = gallons * unitCost;

      return {
        ...mat,
        product: matchingProduct,
        unitCost,
        totalCost,
      };
    });
  }, [estimate, products]);

  if (loading) return <div style={{ color: 'var(--text-muted)' }}>Loading...</div>;

  const totalMaterialCost = materialCosts.reduce((sum, m) => sum + m.totalCost, 0);

  return (
    <div>
      <h3 style={{ fontSize: 14, marginBottom: 12 }}>Material Cost Estimate</h3>

      {materialCosts.length === 0 ? (
        <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>
          Run an estimate first to see material costs. Add products to the catalog to calculate pricing.
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
                <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '6px 8px' }}>{m.product_name || m.material_system_id || 'Unknown'}</td>
                  <td style={{ padding: '6px 8px', fontFamily: 'monospace' }}>{(m.gallons_needed || 0).toFixed(1)} gal</td>
                  <td style={{ padding: '6px 8px', fontSize: 11 }}>
                    {m.product ? `${m.product.brand} ${m.product.product_name}` : <span style={{ color: 'var(--text-muted)' }}>No product linked</span>}
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
