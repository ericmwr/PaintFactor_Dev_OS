export default function RosterEditor({ onClose }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: 'var(--bg-card)', padding: 20, borderRadius: 6, maxWidth: 360, width: '90%', color: 'var(--text)', fontSize: 12 }}>
        RosterEditor stub — Task 16 wires this.
        <button onClick={onClose} style={{ marginLeft: 12 }}>Close</button>
      </div>
    </div>
  );
}
