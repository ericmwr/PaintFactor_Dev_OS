// Visual indicator for detection confidence: HIGH / MEDIUM / LOW

const BADGE_STYLES = {
  high:   { background: 'rgba(63, 185, 80, 0.15)', color: '#3fb950', border: '1px solid rgba(63, 185, 80, 0.3)' },
  medium: { background: 'rgba(210, 153, 34, 0.15)', color: '#d29922', border: '1px solid rgba(210, 153, 34, 0.3)' },
  low:    { background: 'rgba(248, 81, 73, 0.15)',  color: '#f85149', border: '1px solid rgba(248, 81, 73, 0.3)' },
};

export default function ConfidenceBadge({ level }) {
  const style = BADGE_STYLES[level] || BADGE_STYLES.low;
  return (
    <span
      className="confidence-badge"
      style={{
        ...style,
        display: 'inline-block',
        padding: '1px 6px',
        borderRadius: '4px',
        fontSize: '10px',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
      }}
    >
      {level}
    </span>
  );
}
