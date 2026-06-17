/**
 * Warn-band rendered when pruneStaleRateOverrides drops entries on state load
 * (tasks archived, renamed, or shape-shifted away from flat rate_per_hour).
 *
 * Renders null when there's no fresh report so callers can include it
 * unconditionally in any view (error fallback, empty-spec fallback, main view).
 *
 * Props:
 *  - report:    { dropped: [{ task_id, reason }], ts } | undefined
 *  - onDismiss: () => void — fires when × is clicked
 */
export default function RateOverridePruneBanner({ report, onDismiss }) {
  if (!report || !(report.dropped?.length > 0)) return null;

  const count = report.dropped.length;
  return (
    <div style={{
      background: 'var(--warning-bg, rgba(241, 196, 15, 0.1))',
      border: '1px solid var(--warning, #f1c40f)',
      borderRadius: 4,
      padding: 12,
      margin: '0 0 12px',
      fontSize: 12,
      color: 'var(--text-secondary)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 12,
    }}>
      <div>
        <strong style={{ color: 'var(--warning, #f1c40f)' }}>
          {count} rate override{count === 1 ? '' : 's'} dropped:
        </strong>{' '}
        {report.dropped.map(d => `${d.task_id} (${d.reason})`).join(', ')}
        <div style={{ marginTop: 4, fontSize: 11, color: 'var(--text-muted)' }}>
          These tasks have been archived, renamed, or now use tier-specific rates. Re-tune via Authoring or new task IDs if needed.
        </div>
      </div>
      <button
        onClick={onDismiss}
        style={{
          background: 'transparent', border: 'none', color: 'var(--text-muted)',
          cursor: 'pointer', fontSize: 14, padding: 4,
        }}
        title="Dismiss"
      >
        ×
      </button>
    </div>
  );
}
