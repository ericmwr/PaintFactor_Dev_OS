export default function LegacyEntriesPanel({ entries }) {
  return (
    <div style={{ padding: 12, fontSize: 11, color: 'var(--text-muted)', border: '1px dashed var(--border)', borderRadius: 4 }}>
      ▶ Legacy entries ({entries?.length || 0}) — pre-snapshot time logs (stub)
    </div>
  );
}
