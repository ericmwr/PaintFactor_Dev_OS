import { useState, useMemo } from 'react';
import { tasks as bundleTasks } from '../../data/scenario-bundle.gen';

/**
 * Modal — confirms publishing a rate override to the canonical library.
 *
 * Mounted by RateCell when the user clicks the 💾 save glyph. Performs:
 *   - canonical lookup from the bundle
 *   - rate-delta display
 *   - conflict detection (Task 6 wires useTaskDrafts)
 *   - publish via publishTask() (Task 7)
 *
 * Props:
 *  - taskId:      string
 *  - override:    { rate_per_hour, ts }
 *  - projectId:   string | null
 *  - projectName: string
 *  - dispatch:    reducer dispatch (for CLEAR_RATE_OVERRIDE on success)
 *  - onClose:     () => void
 */
export default function RateOverridePublishModal({
  taskId,
  override,
  projectId,
  projectName,
  dispatch,
  onClose,
}) {
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState(null);

  const canonical = useMemo(() => bundleTasks[taskId], [taskId]);
  const newRate = override?.rate_per_hour;
  const canonicalRate = canonical?.rate_per_hour;
  const uom = canonical?.uom || '';

  const deltaPct = useMemo(() => {
    if (typeof canonicalRate !== 'number' || canonicalRate === 0) return null;
    const pct = ((newRate - canonicalRate) / canonicalRate) * 100;
    return Math.round(pct * 100) / 100; // 2 decimals
  }, [canonicalRate, newRate]);

  const missingCanonical = !canonical;
  const noOpOverride = canonical && newRate === canonicalRate;
  const publishDisabled = publishing || missingCanonical || noOpOverride;

  const handlePublish = () => {
    // Task 7 wires this. Stub for now so the button is testable.
    setError('Publish not yet wired — implementation pending Task 7.');
  };

  const handleCancel = () => {
    if (publishing) return;
    onClose();
  };

  // Conflict block — Task 6 wires real detection. Hard-coded null for Task 3.
  const conflict = null;

  return (
    <div
      onClick={handleCancel}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === 'Escape') { e.preventDefault(); handleCancel(); }
          else if (e.key === 'Enter' && !publishDisabled) { e.preventDefault(); handlePublish(); }
        }}
        style={{
          background: 'var(--bg-card, #1f1f1f)',
          color: 'var(--text)',
          border: '1px solid var(--border, #333)',
          borderRadius: 6,
          padding: 20,
          maxWidth: 480,
          width: '90%',
          boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Publish rate to library</h3>
          <button
            onClick={handleCancel}
            disabled={publishing}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: publishing ? 'not-allowed' : 'pointer',
              fontSize: 16,
              padding: 0,
              lineHeight: 1,
            }}
            title="Close"
          >
            ×
          </button>
        </div>

        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12 }}>
          <code style={{ background: 'var(--bg-input, #161616)', padding: '2px 6px', borderRadius: 3 }}>{taskId}</code>
          {canonical?.name && <span style={{ marginLeft: 8 }}>— {canonical.name}</span>}
        </div>

        {missingCanonical ? (
          <div style={{ color: 'var(--warning, #f1c40f)', fontSize: 12, marginBottom: 12 }}>
            This task is no longer in the bundle. Revert the override or contact authoring.
          </div>
        ) : noOpOverride ? (
          <div style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 12 }}>
            New rate matches canonical — nothing to publish.
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 12px', fontSize: 12, marginBottom: 12 }}>
              <div style={{ color: 'var(--text-muted)' }}>Previous rate:</div>
              <div>{canonicalRate} {uom}/hr</div>
              <div style={{ color: 'var(--text-muted)' }}>New rate:</div>
              <div>
                {newRate} {uom}/hr
                {deltaPct != null && (
                  <span style={{ marginLeft: 8, color: 'var(--text-muted)' }}>
                    ({deltaPct > 0 ? '+' : ''}{deltaPct}%)
                  </span>
                )}
              </div>
            </div>

            {conflict && (
              <div style={{
                background: 'var(--warning-bg, rgba(241, 196, 15, 0.1))',
                border: '1px solid var(--warning, #f1c40f)',
                borderRadius: 4,
                padding: 10,
                fontSize: 11,
                marginBottom: 12,
                color: 'var(--text-secondary)',
              }}>
                ⚠️ A pending draft for this task already exists with rate {conflict.rate_per_hour}. Publishing will overwrite it.
              </div>
            )}

            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12 }}>
              This writes <code>Claude/tasks/{taskId}.json</code> and regenerates the scenario bundle.
            </div>
          </>
        )}

        {error && (
          <div style={{ color: '#e74c3c', fontSize: 11, marginBottom: 12 }}>
            ❌ Publish failed: {error}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button
            onClick={handleCancel}
            disabled={publishing}
            style={{
              background: 'transparent',
              border: '1px solid var(--border, #333)',
              color: 'var(--text)',
              padding: '6px 14px',
              borderRadius: 4,
              cursor: publishing ? 'not-allowed' : 'pointer',
              fontSize: 12,
            }}
          >
            Cancel
          </button>
          <button
            onClick={handlePublish}
            disabled={publishDisabled}
            style={{
              background: publishDisabled ? 'var(--bg-input, #161616)' : 'var(--accent, #82aaff)',
              color: publishDisabled ? 'var(--text-muted)' : 'var(--bg, #0f0f0f)',
              border: 'none',
              padding: '6px 14px',
              borderRadius: 4,
              cursor: publishDisabled ? 'not-allowed' : 'pointer',
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            {publishing ? 'Publishing...' : 'Publish'}
          </button>
        </div>
      </div>
    </div>
  );
}
