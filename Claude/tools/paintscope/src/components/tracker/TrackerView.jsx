import { useMemo, useState } from 'react';
import { useProject } from '../../hooks/useProject';
import { useTrackerSnapshot } from '../../hooks/useTrackerSnapshot';
import { useTimeEntries } from '../../hooks/useTimeEntries';
import { sumLoggedHours } from '../../tracker/rollup.js';
import TrackerBody from './TrackerBody.jsx';
import LegacyEntriesPanel from './LegacyEntriesPanel.jsx';
import RosterEditor from './RosterEditor.jsx';

export default function TrackerView() {
  const { state, projectId } = useProject();
  const { snapshot, loading: snapLoading } = useTrackerSnapshot(projectId);
  const { entries, loading: entriesLoading, refresh: refreshEntries } = useTimeEntries(projectId);
  const [rosterOpen, setRosterOpen] = useState(false);

  const status = state.project?.status || 'draft';
  const newEntries = useMemo(() => (entries || []).filter(e => !e._legacy), [entries]);
  const legacyEntries = useMemo(() => (entries || []).filter(e => e._legacy), [entries]);

  const totalLogged = sumLoggedHours(newEntries);
  const totalEstimated = snapshot?.total_estimated_hours || 0;
  const overallPct = totalEstimated > 0 ? Math.round((totalLogged / totalEstimated) * 100) : 0;

  if (snapLoading || entriesLoading) {
    return <div style={{ padding: 16, color: 'var(--text-muted)' }}>Loading tracker...</div>;
  }

  if (!projectId) {
    return (
      <div style={{ padding: 20, color: 'var(--text-muted)' }}>
        Save the project to enable tracking.
      </div>
    );
  }

  if (!snapshot) {
    return (
      <div style={{ padding: 20 }}>
        <div style={{
          padding: 16, background: 'rgba(255,190,100,0.06)',
          border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
          color: 'var(--text-secondary)', fontSize: 12,
        }}>
          This project doesn't have a tracker snapshot yet.
          {' '}Set status to <strong>in-progress</strong> on the Setup tab to create one.
          {' '}<span style={{ color: 'var(--text-muted)' }}>(current status: <strong>{status.replace('_', '-')}</strong>)</span>
        </div>
        {legacyEntries.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <LegacyEntriesPanel entries={legacyEntries} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ padding: 16, maxWidth: 1100 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
        <h2 style={{ fontSize: 18, color: 'var(--accent)', margin: 0 }}>
          Tracker — {state.project?.name || 'Untitled'}
        </h2>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>status: <strong style={{ color: 'var(--accent)' }}>{status.replace('_', '-')}</strong></span>
          <button
            onClick={() => setRosterOpen(true)}
            style={{
              fontSize: 10, padding: '2px 6px',
              background: 'transparent', border: '1px solid var(--border)',
              color: 'var(--text-muted)', borderRadius: 3, cursor: 'pointer',
            }}
          >Edit Roster</button>
        </div>
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 16 }}>
        Snapshot: {new Date(snapshot.taken_at).toLocaleString()} &nbsp;•&nbsp;
        Total: {totalLogged.toFixed(1)}h / {totalEstimated.toFixed(1)}h &nbsp;•&nbsp;
        <span style={{ color: 'var(--accent)' }}>{overallPct}%</span>
      </div>

      <TrackerBody snapshot={snapshot} entries={newEntries} onEntrySaved={refreshEntries} />

      {legacyEntries.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <LegacyEntriesPanel entries={legacyEntries} />
        </div>
      )}

      {rosterOpen && <RosterEditor onClose={() => setRosterOpen(false)} />}
    </div>
  );
}
