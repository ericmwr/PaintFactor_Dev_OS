// Renders a ctx object as a key/value table. Missing / undefined / null
// values are muted red so the dev can spot wiring gaps at a glance.

export default function CtxSnapshot({ ctx, highlightKeys = [] }) {
  if (!ctx || typeof ctx !== 'object') {
    return <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>(empty ctx)</div>;
  }
  const entries = Object.entries(ctx).sort(([a], [b]) => a.localeCompare(b));
  const hi = new Set(highlightKeys);

  return (
    <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
      <tbody>
        {entries.map(([k, v]) => {
          const isMissing = v == null || v === '';
          const isHi = hi.has(k);
          const bg = isHi ? 'rgba(130,170,255,0.12)' : 'transparent';
          const valColor = isMissing ? '#c87' : 'var(--text)';
          return (
            <tr key={k} style={{ borderTop: '1px dotted var(--border)', background: bg }}>
              <td style={{ padding: '2px 6px', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', width: '45%' }}>
                {k}
              </td>
              <td style={{ padding: '2px 6px', fontFamily: 'var(--font-mono)', fontSize: 10, color: valColor }}>
                {isMissing ? 'undefined' : formatValue(v)}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function formatValue(v) {
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'number') return String(v);
  if (typeof v === 'string') return `"${v}"`;
  if (Array.isArray(v)) return JSON.stringify(v);
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}
