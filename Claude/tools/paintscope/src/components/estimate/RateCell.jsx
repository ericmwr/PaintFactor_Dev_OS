import { useState, useEffect, useRef } from 'react';
import { tasks as bundleTasks } from '../../data/scenario-bundle.gen';

/**
 * Editable rate cell for the Estimate view.
 *
 * Replaces `<td>{t.baseRate}</td>` render sites. Looks up the canonical task
 * from the bundle to determine if this task is editable (flat rate_per_hour only).
 *
 * Props:
 *  - taskId:     string — used to look up canonical and read/write override
 *  - baseRate:   string|number — engine-resolved current rate to display when not eligible/editing
 *  - isFixed:    boolean — fixed-minute task; never editable (engine renders em-dash separately)
 *  - override:   { rate_per_hour, ts } | undefined — current override entry from state
 *  - dispatch:   reducer dispatch function
 */
export default function RateCell({ taskId, baseRate, isFixed, override, dispatch }) {
  const canonical = taskId ? bundleTasks[taskId] : null;
  const isEditable = (
    !isFixed &&
    canonical &&
    typeof canonical.rate_per_hour === 'number' &&
    !canonical.rates &&
    !canonical.rates_by_tier &&
    !canonical.rates_by_coat &&
    canonical.fixed_minutes == null
  );

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  // Fixed-minute or no canonical: render the existing display (em-dash, etc.)
  if (isFixed || !canonical) {
    return (
      <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>{baseRate}</td>
    );
  }

  // Not eligible: render static value with explanatory tooltip
  if (!isEditable) {
    return (
      <td
        style={{ textAlign: 'right', color: 'var(--text-muted)' }}
        title="Tier or coat-keyed task — edit in Authoring → Tasks"
      >
        {baseRate}
      </td>
    );
  }

  const hasOverride = override && override.rate_per_hour != null;
  const displayRate = hasOverride ? override.rate_per_hour : (canonical.rate_per_hour);
  const canonicalRate = canonical.rate_per_hour;

  const commit = (raw) => {
    setEditing(false);
    if (raw === '' || raw == null) {
      // Empty = clear
      if (hasOverride) {
        dispatch({ type: 'CLEAR_RATE_OVERRIDE', payload: { task_id: taskId } });
      }
      return;
    }
    const n = parseFloat(raw);
    if (!isFinite(n) || n <= 0) {
      // Invalid input — treat as clear
      if (hasOverride) {
        dispatch({ type: 'CLEAR_RATE_OVERRIDE', payload: { task_id: taskId } });
      }
      return;
    }
    if (n === canonicalRate) {
      // Matches canonical — clear the override so we don't carry a no-op entry
      if (hasOverride) {
        dispatch({ type: 'CLEAR_RATE_OVERRIDE', payload: { task_id: taskId } });
      }
      return;
    }
    dispatch({ type: 'SET_RATE_OVERRIDE', payload: { task_id: taskId, rate_per_hour: n } });
  };

  const revert = (e) => {
    e.stopPropagation();
    dispatch({ type: 'CLEAR_RATE_OVERRIDE', payload: { task_id: taskId } });
  };

  if (editing) {
    return (
      <td style={{ textAlign: 'right', padding: 0 }}>
        <input
          ref={inputRef}
          type="number"
          step="any"
          min="0"
          defaultValue={displayRate}
          onBlur={e => commit(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') { e.preventDefault(); commit(e.target.value); }
            else if (e.key === 'Escape') { e.preventDefault(); setEditing(false); }
          }}
          onChange={e => setDraft(e.target.value)}
          style={{
            width: '100%',
            textAlign: 'right',
            background: 'var(--bg-input, #1f1f1f)',
            color: 'var(--text)',
            border: '1px solid var(--accent, #82aaff)',
            padding: '2px 4px',
            fontSize: 11,
            fontFamily: 'inherit',
          }}
        />
      </td>
    );
  }

  return (
    <td
      onClick={() => { setDraft(String(displayRate)); setEditing(true); }}
      title={hasOverride ? `Canonical: ${canonicalRate}. Click to edit. Click ↺ to revert.` : `Canonical: ${canonicalRate}. Click to edit.`}
      style={{
        textAlign: 'right',
        cursor: 'pointer',
        color: hasOverride ? 'var(--accent, #82aaff)' : 'var(--text-muted)',
        fontStyle: hasOverride ? 'italic' : 'normal',
        userSelect: 'none',
      }}
    >
      {displayRate}
      {hasOverride && (
        <span
          onClick={revert}
          title="Revert to canonical rate"
          style={{ marginLeft: 4, fontSize: 9, color: 'var(--text-muted)', cursor: 'pointer' }}
        >
          ↺
        </span>
      )}
    </td>
  );
}
