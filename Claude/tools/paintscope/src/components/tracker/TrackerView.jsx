import { useMemo, useState } from 'react';
import { useProject } from '../../hooks/useProject';
import { useTrackerSnapshot } from '../../hooks/useTrackerSnapshot';
import { useTimeEntries } from '../../hooks/useTimeEntries';
import { sumLoggedHours } from '../../tracker/rollup.js';
import TrackerBody from './TrackerBody.jsx';
import LegacyEntriesPanel from './LegacyEntriesPanel.jsx';
import RosterEditor from './RosterEditor.jsx';
import SummaryView from './SummaryView.jsx';

export default function TrackerView() {
  const { state, projectId } = useProject();
  const { snapshot, loading: snapLoading } = useTrackerSnapshot(projectId);
  const { entries, loading: entriesLoading, refresh: refreshEntries, resetAll: resetAllEntries } = useTimeEntries(projectId);
  const [rosterOpen, setRosterOpen] = useState(false);
  const [subTab, setSubTab] = useState('activities'); // 'activities' | 'summary'

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
          <button
            onClick={async () => {
              const count = newEntries.length;
              if (count === 0) { alert('No tracker entries to reset.'); return; }
              if (!confirm(`Delete all ${count} tracker time entries for this project?\n\nLegacy/pre-snapshot entries (if any) are NOT affected. Snapshot stays intact.\n\nThis cannot be undone.`)) return;
              const deleted = await resetAllEntries({ onlyNew: true });
              alert(`Deleted ${deleted} entries.`);
            }}
            style={{
              fontSize: 10, padding: '2px 6px',
              background: 'transparent', border: '1px solid #e74c3c',
              color: '#e74c3c', borderRadius: 3, cursor: 'pointer',
            }}
            title="Delete all tracker time entries for this project"
          >Reset Hours</button>
        </div>
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 16 }}>
        Snapshot: {new Date(snapshot.taken_at).toLocaleString()} &nbsp;•&nbsp;
        Total: {totalLogged.toFixed(1)}h / {totalEstimated.toFixed(1)}h &nbsp;•&nbsp;
        <span style={{ color: 'var(--accent)' }}>{overallPct}%</span>
      </div>

      <div style={{ display: 'flex', gap: 0, marginBottom: 12, borderRadius: 4, overflow: 'hidden', border: '1px solid var(--border)', alignSelf: 'flex-start', width: 'fit-content' }}>
        {[
          { id: 'activities', label: 'Activities' },
          { id: 'summary',    label: 'Summary' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setSubTab(t.id)}
            style={{
              padding: '5px 14px', fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer',
              background: subTab === t.id ? 'var(--accent)' : 'var(--bg-card)',
              color: subTab === t.id ? 'var(--bg, #0f0f0f)' : 'var(--text-secondary)',
            }}
          >{t.label}</button>
        ))}
      </div>

      {subTab === 'activities' && (
        <TrackerBody snapshot={snapshot} entries={newEntries} onEntrySaved={refreshEntries} />
      )}
      {subTab === 'summary' && (
        <SummaryView snapshot={snapshot} entries={newEntries} />
      )}

      {legacyEntries.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <LegacyEntriesPanel entries={legacyEntries} />
        </div>
      )}

      {rosterOpen && <RosterEditor onClose={() => setRosterOpen(false)} />}
    </div>
  );
}
