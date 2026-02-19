/**
 * NumField – number input with auto/manual override toggle.
 *
 * Props:
 *   value            – the manually-overridden value
 *   derived          – the auto-calculated value
 *   isOverride       – whether the field is in manual-override mode
 *   onValueChange    – callback receiving the new numeric value
 *   onOverrideToggle – callback receiving the new override boolean
 *   label            – (unused in render, available for external labelling)
 *   uom              – optional unit-of-measure string shown after the input
 */
export default function NumField({ value, derived, isOverride, onValueChange, onOverrideToggle, label, uom }) {
  const displayVal = isOverride ? value : derived;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <input
        type="number"
        value={displayVal || ''}
        className={isOverride ? '' : 'derived'}
        onChange={e => {
          if (!isOverride) onOverrideToggle(true);
          onValueChange(parseFloat(e.target.value) || 0);
        }}
        style={{ width: 90 }}
      />
      {uom && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{uom}</span>}
      <span
        className={`override-toggle ${isOverride ? 'manual' : 'auto'}`}
        onClick={() => onOverrideToggle(!isOverride)}
        title={isOverride ? 'Click to reset to auto' : 'Click to override manually'}
      >
        {isOverride ? 'manual' : 'auto'}
      </span>
    </div>
  );
}
