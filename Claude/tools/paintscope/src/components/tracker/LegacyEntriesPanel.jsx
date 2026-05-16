import { useState } from 'react';

export default function LegacyEntriesPanel({ entries }) {
  const [expanded, setExpanded] = useState(false);
  const total = (entries || []).reduce((s, e) => s + (e.hours || 0), 0);

  if (!entries || entries.length === 0) return null;

  return (
    <div style={{
      border: '1px dashed var(--border)', borderRadius: 4,
      padding: 12, background: 'rgba(255,255,255,0.02)',
    }}>
      <div
        onClick={() => setExpanded(!expanded)}
        style={{ cursor: 'pointer', fontSize: 11, color: 'var(--text-muted)', userSelect: 'none' }}
      >
        {expanded ? '▼' : '▶'} Legacy entries ({entries.length}) — pre-snapshot time logs &nbsp;
        <span style={{ color: 'var(--text)' }}>{total.toFixed(1)}h total</span>
      </div>

      {expanded && (
        <table style={{ width: '100%', marginTop: 8, fontSize: 11, borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
              <th style={cellStyle()}>Date</th>
              <th style={cellStyle()}>Room</th>
              <th style={cellStyle()}>Substrate</th>
              <th style={cellStyle()}>Phase</th>
              <th style={cellStyle()}>Hours</th>
              <th style={cellStyle()}>%</th>
              <th style={cellStyle()}>Worker</th>
              <th style={cellStyle()}>Notes</th>
            </tr>
          </thead>
          <tbody>
            {entries
              .slice()
              .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
              .map(e => (
                <tr key={e.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={cellStyle()}>{e.date || '—'}</td>
                  <td style={cellStyle()}>{e.room_id || '—'}</td>
                  <td style={cellStyle()}>{e.substrate_type || '—'}</td>
                  <td style={cellStyle()}>{e.task_category || '—'}</td>
                  <td style={{ ...cellStyle(), fontFamily: 'monospace' }}>{e.hours}</td>
                  <td style={{ ...cellStyle(), fontFamily: 'monospace' }}>{e.completion_pct ?? '—'}%</td>
                  <td style={cellStyle()}>{e.worker_name || '—'}</td>
                  <td style={cellStyle()}>{e.notes || ''}</td>
                </tr>
              ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function cellStyle() {
  return { padding: '4px 8px', textAlign: 'left' };
}
