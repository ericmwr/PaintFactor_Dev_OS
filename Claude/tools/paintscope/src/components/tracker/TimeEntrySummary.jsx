import { useMemo } from 'react';

export default function TimeEntrySummary({ entries, rooms }) {
  const summary = useMemo(() => {
    const byRoom = {};
    const byPhase = {};
    let total = 0;

    for (const e of entries) {
      const h = e.hours || 0;
      total += h;

      const roomLabel = rooms.find(r => r.id === e.room_id)?.label || e.room_id || 'Unassigned';
      byRoom[roomLabel] = (byRoom[roomLabel] || 0) + h;

      const phase = e.task_category || 'other';
      byPhase[phase] = (byPhase[phase] || 0) + h;
    }

    return { byRoom, byPhase, total };
  }, [entries, rooms]);

  if (entries.length === 0) {
    return (
      <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>
        No time entries logged yet.
      </div>
    );
  }

  return (
    <div>
      <h3 style={{ fontSize: 13, marginBottom: 12 }}>Summary</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* By Room */}
        <div style={{ padding: 12, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
          <h4 style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>Hours by Room</h4>
          {Object.entries(summary.byRoom).sort((a, b) => b[1] - a[1]).map(([room, hours]) => (
            <div key={room} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '2px 0' }}>
              <span>{room}</span>
              <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{hours.toFixed(1)}h</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 700, borderTop: '1px solid var(--border)', marginTop: 6, paddingTop: 6 }}>
            <span>Total</span>
            <span style={{ fontFamily: 'monospace' }}>{summary.total.toFixed(1)}h</span>
          </div>
        </div>

        {/* By Phase */}
        <div style={{ padding: 12, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
          <h4 style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>Hours by Phase</h4>
          {Object.entries(summary.byPhase).sort((a, b) => b[1] - a[1]).map(([phase, hours]) => (
            <div key={phase} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '2px 0' }}>
              <span>{phase}</span>
              <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{hours.toFixed(1)}h</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
