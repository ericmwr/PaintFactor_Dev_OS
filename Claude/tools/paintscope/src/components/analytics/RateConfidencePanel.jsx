import { useMemo } from 'react';

export default function RateConfidencePanel({ estimate, entries, rooms }) {
  const flags = useMemo(() => {
    if (!estimate?.specResults || entries.length === 0) return [];

    // Aggregate actual hours by phase
    const actualByPhase = {};
    for (const e of entries) {
      const phase = e.task_category || 'other';
      actualByPhase[phase] = (actualByPhase[phase] || 0) + (e.hours || 0);
    }

    // Aggregate estimated hours by phase
    const estByPhase = {};
    if (estimate.specResults) {
      for (const sr of estimate.specResults) {
        for (const task of (sr.tasks || [])) {
          const phase = task.phase || 'other';
          estByPhase[phase] = (estByPhase[phase] || 0) + (task.hours || 0);
        }
      }
    }

    // Build flags for phases with >20% variance
    const allPhases = new Set([...Object.keys(estByPhase), ...Object.keys(actualByPhase)]);
    const result = [];
    for (const phase of allPhases) {
      const est = estByPhase[phase] || 0;
      const act = actualByPhase[phase] || 0;
      if (est === 0 && act === 0) continue;
      const variance = est > 0 ? ((act - est) / est) * 100 : 100;
      if (Math.abs(variance) > 20) {
        result.push({
          phase,
          estimated: est,
          actual: act,
          variance,
          severity: Math.abs(variance) > 50 ? 'high' : 'medium',
        });
      }
    }

    return result.sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance));
  }, [estimate, entries]);

  return (
    <div style={{ padding: 16, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
      <h3 style={{ fontSize: 13, marginBottom: 8 }}>Rate Confidence</h3>

      {entries.length === 0 ? (
        <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>
          Log time entries to see rate confidence analysis.
        </div>
      ) : flags.length === 0 ? (
        <div style={{ color: '#27ae60', fontSize: 12 }}>
          All phase estimates are within 20% of actuals. Rates look good.
        </div>
      ) : (
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>
            Phases with &gt;20% variance between estimated and actual hours:
          </div>
          {flags.map(f => (
            <div
              key={f.phase}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '6px 8px',
                marginBottom: 4,
                borderRadius: 'var(--radius-sm)',
                background: f.severity === 'high' ? 'rgba(231, 76, 60, 0.06)' : 'rgba(255, 190, 100, 0.06)',
                border: `1px solid ${f.severity === 'high' ? 'rgba(231, 76, 60, 0.2)' : 'rgba(255, 190, 100, 0.2)'}`,
              }}
            >
              <div>
                <span style={{ fontWeight: 600, fontSize: 13 }}>{f.phase}</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>
                  Est: {f.estimated.toFixed(1)}h / Act: {f.actual.toFixed(1)}h
                </span>
              </div>
              <span style={{
                fontWeight: 700,
                fontFamily: 'monospace',
                color: f.variance > 0 ? '#e74c3c' : '#27ae60',
              }}>
                {f.variance > 0 ? '+' : ''}{f.variance.toFixed(0)}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
