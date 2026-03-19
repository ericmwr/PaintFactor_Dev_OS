export default function P4PCalculator({ estimatedHours, actualHours, profile }) {
  const p4pRatio = (profile?.p4p_ratio_pct || 0) / 100;
  const painterRate = profile?.labor_rates?.painter || 25;

  const bidHours = estimatedHours;
  const targetHours = bidHours * (1 - p4pRatio); // Target = bid hours minus P4P pool
  const p4pPoolHours = bidHours * p4pRatio;
  const bonusHours = Math.max(0, targetHours - actualHours); // Hours saved under target
  const bonusDollars = bonusHours * painterRate;
  const p4pPoolDollars = p4pPoolHours * painterRate;
  const crewSavings = Math.max(0, estimatedHours - actualHours);

  return (
    <div style={{ padding: 16, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
      <h3 style={{ fontSize: 13, marginBottom: 12 }}>Pay for Performance (P4P)</h3>

      {p4pRatio === 0 ? (
        <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>
          P4P ratio is 0%. Set it in Settings to enable bonus calculations.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Bid Hours</div>
            <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'monospace' }}>{bidHours.toFixed(1)}h</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>P4P Pool ({(p4pRatio * 100).toFixed(0)}%)</div>
            <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'monospace' }}>{p4pPoolHours.toFixed(1)}h</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>${p4pPoolDollars.toFixed(0)}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Target Hours</div>
            <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'monospace' }}>{targetHours.toFixed(1)}h</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Actual Hours</div>
            <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'monospace', color: actualHours > targetHours ? '#e74c3c' : '#27ae60' }}>
              {actualHours.toFixed(1)}h
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Hours Saved</div>
            <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'monospace', color: crewSavings > 0 ? '#27ae60' : '#e74c3c' }}>
              {crewSavings.toFixed(1)}h
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Crew Bonus</div>
            <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'monospace', color: bonusDollars > 0 ? '#27ae60' : 'var(--text-secondary)' }}>
              ${bonusDollars.toFixed(0)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
