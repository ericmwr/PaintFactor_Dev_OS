export default function TrackerBody({ snapshot, entries }) {
  return (
    <div style={{ padding: 16, color: 'var(--text-muted)', fontSize: 12 }}>
      TrackerBody stub — {snapshot?.activities?.length || 0} activities, {entries?.length || 0} entries.
    </div>
  );
}
