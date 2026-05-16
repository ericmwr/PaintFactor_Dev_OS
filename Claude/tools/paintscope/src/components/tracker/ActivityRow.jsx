import { useState, useEffect } from 'react';
import { ELEMENT_PARENT_LABELS } from '../../tracker/element-parents.js';
import { computeActivityCompletion, computeRoomCompletion, sumLoggedHours } from '../../tracker/rollup.js';
import LogTimeForm from './LogTimeForm.jsx';

function capitalize(s) { return s ? s[0].toUpperCase() + s.slice(1) : ''; }

function pctColor(pct) {
  if (pct >= 100) return '#5d5';
  if (pct >= 50)  return '#82aaff';
  if (pct > 0)    return '#f1c40f';
  return 'var(--text-muted)';
}

export default function ActivityRow({ activity, entries, forceExpanded }) {
  const [localExpanded, setLocalExpanded] = useState(false);
  const [logFormOpen, setLogFormOpen] = useState(false);

  useEffect(() => { setLocalExpanded(forceExpanded); }, [forceExpanded]);

  const expanded = localExpanded;
  const isProjectLevel = activity.element_parent.startsWith('project_');
  const phaseSuffix = isProjectLevel ? '' : ` ${capitalize(activity.phase)}`;
  const elementLabel = ELEMENT_PARENT_LABELS[activity.element_parent] || activity.element_parent;
  const rowTitle = isProjectLevel ? elementLabel : `${elementLabel}${phaseSuffix} — ${activity.activity_name}`;

  const loggedHours = sumLoggedHours(entries);
  const activityPct = computeActivityCompletion(activity, entries);

  return (
    <div style={{ margin: '4px 0' }}>
      <div
        onClick={() => setLocalExpanded(!expanded)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px',
          fontSize: 12, fontFamily: 'monospace', cursor: 'pointer',
          background: expanded ? 'rgba(255,255,255,0.02)' : 'transparent',
          borderRadius: 3,
        }}
      >
        <span style={{ color: 'var(--text-muted)', width: 12 }}>{expanded ? '▼' : '▶'}</span>
        <strong style={{ flex: 1 }}>{rowTitle}</strong>
        <span style={{ color: 'var(--text-muted)', minWidth: 80, textAlign: 'right' }}>
          {loggedHours.toFixed(1)}h / {activity.estimated_hours.toFixed(1)}h
        </span>
        <span style={{ color: pctColor(activityPct), minWidth: 50, textAlign: 'right', fontWeight: 600 }}>
          {activityPct.toFixed(0)}%
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); setLogFormOpen(true); }}
          style={{
            background: 'var(--accent, #82aaff)', color: 'var(--bg, #0f0f0f)',
            border: 'none', padding: '2px 8px', borderRadius: 3,
            fontSize: 10, fontWeight: 600, cursor: 'pointer',
          }}
        >+ Log</button>
      </div>

      {expanded && (
        <div style={{ paddingLeft: 32, fontSize: 11, fontFamily: 'monospace', color: 'var(--text-muted)' }}>
          {activity.rooms.length === 0 ? (
            <div style={{ padding: '4px 0', fontStyle: 'italic' }}>
              (project-level activity — no per-room breakdown)
            </div>
          ) : (
            activity.rooms.map(room => {
              const pct = computeRoomCompletion(room.room_id, entries);
              const complete = pct >= 100;
              return (
                <div key={room.room_id} style={{ padding: '2px 0', display: 'flex', gap: 8 }}>
                  <span style={{ color: complete ? '#5d5' : 'var(--text-muted)', width: 12 }}>
                    {complete ? '✓' : '○'}
                  </span>
                  <span style={{ flex: 1, color: complete ? 'var(--text)' : 'var(--text-muted)' }}>
                    {room.room_label}
                  </span>
                  <span style={{ color: pctColor(pct), minWidth: 50, textAlign: 'right' }}>
                    {pct.toFixed(0)}%
                  </span>
                </div>
              );
            })
          )}
        </div>
      )}

      {logFormOpen && (
        <LogTimeForm
          activity={activity}
          entries={entries}
          onClose={() => setLogFormOpen(false)}
        />
      )}
    </div>
  );
}
