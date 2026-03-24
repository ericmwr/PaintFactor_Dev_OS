import { useMemo } from 'react';
import { useEstimate } from '../../hooks/useEstimate';

export default function MaterialCostView() {
  const estimate = useEstimate();

  const materialCosts = useMemo(() => {
    if (!estimate?.materialEstimates) return [];

    // Consolidate by productId — same product from multiple specs (e.g. wall + ceiling primer) merges
    const groups = {};
    estimate.materialEstimates.forEach(mat => {
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
        };
      }
      groups[key].gallons += mat.gallons || 0;
      groups[key].totalSF += mat.totalSF || 0;
    });
    return Object.values(groups).map(g => ({
      ...g,
      gallons: Math.round(g.gallons * 10) / 10,
      totalCost: g.unitCost ? Math.round(g.gallons * g.unitCost * 100) / 100 : 0,
    }));
  }, [estimate]);

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
                <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '6px 8px' }}>{m.systemName || m.specFamilyId || 'Unknown'}</td>
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
