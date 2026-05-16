import { ELEMENT_PARENT_LABELS } from '../../tracker/element-parents.js';

function capitalize(s) { return s ? s[0].toUpperCase() + s.slice(1) : ''; }

export default function ActivityRow({ activity, entries }) {
  const phaseSuffix = activity.element_parent.startsWith('project_') ? '' : ` ${capitalize(activity.phase)}`;
  const elementLabel = ELEMENT_PARENT_LABELS[activity.element_parent] || activity.element_parent;
  return (
    <div style={{ padding: '4px 8px', fontSize: 12, fontFamily: 'monospace' }}>
      ▶ <strong>{elementLabel}{phaseSuffix}</strong>: {activity.activity_name} &nbsp;
      <span style={{ color: 'var(--text-muted)' }}>
        {entries.length} entries, est {activity.estimated_hours.toFixed(1)}h
      </span>
    </div>
  );
}
