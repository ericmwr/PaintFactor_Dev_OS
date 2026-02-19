/**
 * Toggle – labelled toggle switch.
 *
 * Props:
 *   checked  – boolean on/off state
 *   onChange – callback receiving the new boolean value
 *   label   – text shown next to the toggle
 */
export default function Toggle({ checked, onChange, label }) {
  return (
    <label className="toggle" onClick={() => onChange(!checked)}>
      <div className={`toggle-track ${checked ? 'on' : ''}`}>
        <div className="toggle-thumb" />
      </div>
      <span style={{ fontSize: 12 }}>{label}</span>
    </label>
  );
}
