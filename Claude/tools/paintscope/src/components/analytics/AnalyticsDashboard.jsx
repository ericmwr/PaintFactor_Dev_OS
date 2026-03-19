import { useProject } from '../../hooks/useProject';
import { useTimeEntries } from '../../hooks/useTimeEntries';
import { useCompanyProfile } from '../../hooks/useCompanyProfile';
import VarianceTable from './VarianceTable';
import P4PCalculator from './P4PCalculator';
import RateConfidencePanel from './RateConfidencePanel';

export default function AnalyticsDashboard({ estimate }) {
  const { state, projectId } = useProject();
  const { entries, loading: entriesLoading } = useTimeEntries(projectId);
  const { profile, loading: profileLoading } = useCompanyProfile();

  if (entriesLoading || profileLoading) {
    return <div style={{ padding: 16, color: 'var(--text-muted)' }}>Loading...</div>;
  }

  const rooms = state.rooms || [];
  const totalEstimatedHours = estimate?.totalHours || 0;
  const totalActualHours = entries.reduce((sum, e) => sum + (e.hours || 0), 0);

  return (
    <div style={{ padding: 16, maxWidth: 1000 }}>
      <h2 style={{ fontSize: 18, color: 'var(--accent)', marginBottom: 16 }}>Analytics</h2>

      {/* Top-level stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Estimated Hours', value: totalEstimatedHours.toFixed(1), color: 'var(--accent)' },
          { label: 'Actual Hours', value: totalActualHours.toFixed(1), color: totalActualHours > totalEstimatedHours ? '#e74c3c' : '#27ae60' },
          { label: 'Variance', value: `${(totalActualHours - totalEstimatedHours).toFixed(1)}h`, color: totalActualHours > totalEstimatedHours ? '#e74c3c' : '#27ae60' },
          { label: 'Efficiency', value: totalActualHours > 0 ? `${((totalEstimatedHours / totalActualHours) * 100).toFixed(0)}%` : '—', color: 'var(--text-secondary)' },
        ].map(s => (
          <div key={s.label} style={{ padding: 16, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 24, fontWeight: 700, fontFamily: 'monospace', color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Variance Table */}
      <div style={{ marginBottom: 24 }}>
        <VarianceTable estimate={estimate} entries={entries} rooms={rooms} />
      </div>

      {/* P4P Calculator */}
      <div style={{ marginBottom: 24 }}>
        <P4PCalculator
          estimatedHours={totalEstimatedHours}
          actualHours={totalActualHours}
          profile={profile}
        />
      </div>

      {/* Rate Confidence */}
      <div style={{ marginBottom: 24 }}>
        <RateConfidencePanel estimate={estimate} entries={entries} rooms={rooms} />
      </div>
    </div>
  );
}
