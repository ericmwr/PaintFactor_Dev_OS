import { useMemo } from 'react';

export default function VarianceTable({ estimate, entries, rooms }) {
  const rows = useMemo(() => {
    // Build per-room estimated hours from spec results
    const estByRoom = {};
    if (estimate?.specResults) {
      for (const sr of estimate.specResults) {
        for (const task of (sr.tasks || [])) {
          const roomId = task.roomId || task.room_id;
          if (roomId) {
            estByRoom[roomId] = (estByRoom[roomId] || 0) + (task.hours || 0);
          }
        }
      }
    }

    // Build per-room actual hours
    const actByRoom = {};
    for (const e of entries) {
      if (e.room_id) {
        actByRoom[e.room_id] = (actByRoom[e.room_id] || 0) + (e.hours || 0);
      }
    }

    // Merge
    const allRoomIds = new Set([...Object.keys(estByRoom), ...Object.keys(actByRoom)]);
    return Array.from(allRoomIds).map(roomId => {
      const room = rooms.find(r => r.id === roomId);
      const est = estByRoom[roomId] || 0;
      const act = actByRoom[roomId] || 0;
      const variance = act - est;
      const pct = est > 0 ? ((variance / est) * 100) : 0;
      return { roomId, label: room?.label || roomId, est, act, variance, pct };
    }).sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance));
  }, [estimate, entries, rooms]);

  if (rows.length === 0) {
    return (
      <div style={{ padding: 16, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', textAlign: 'center', color: 'var(--text-muted)' }}>
        No data to compare. Run an estimate and log time entries.
      </div>
    );
  }

  return (
    <div style={{ padding: 16, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
      <h3 style={{ fontSize: 13, marginBottom: 8 }}>Estimated vs Actual by Room</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
            <th style={{ padding: '6px 8px' }}>Room</th>
            <th style={{ padding: '6px 8px', textAlign: 'right' }}>Estimated</th>
            <th style={{ padding: '6px 8px', textAlign: 'right' }}>Actual</th>
            <th style={{ padding: '6px 8px', textAlign: 'right' }}>Variance</th>
            <th style={{ padding: '6px 8px', textAlign: 'right' }}>%</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.roomId} style={{ borderBottom: '1px solid var(--border)' }}>
              <td style={{ padding: '6px 8px' }}>{r.label}</td>
              <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'monospace' }}>{r.est.toFixed(1)}h</td>
              <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'monospace' }}>{r.act.toFixed(1)}h</td>
              <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'monospace', color: r.variance > 0 ? '#e74c3c' : r.variance < 0 ? '#27ae60' : 'inherit' }}>
                {r.variance > 0 ? '+' : ''}{r.variance.toFixed(1)}h
              </td>
              <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'monospace', color: Math.abs(r.pct) > 20 ? '#e74c3c' : 'var(--text-muted)' }}>
                {r.est > 0 ? `${r.pct > 0 ? '+' : ''}${r.pct.toFixed(0)}%` : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
