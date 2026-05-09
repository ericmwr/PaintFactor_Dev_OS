// Rename-with-cascade modal. Triggered from TaskEditor; previews the
// blast radius via planRenameCascade, then writes 1 task draft + N
// module drafts on confirm. The user reviews drafts in DraftsView and
// publishes through the smoke gate (Phase 1) which catches any
// rewrite that missed.
//
// The modal does NOT archive the old canonical task — that's a separate
// step the user takes after publishing, via the existing Archive button.

import { useMemo, useState } from 'react';
import canonicalBundle from '../../data/scenario-bundle.gen.js';
import { planRenameCascade, isValidTaskId } from '../../engine/rename-cascade.js';
import { useTaskDrafts } from '../../hooks/useTaskDrafts.js';
import { useModuleDrafts } from '../../hooks/useModuleDrafts.js';

export default function RenameTaskModal({ oldId, onClose, onComplete }) {
  const [newId, setNewId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const taskDrafts = useTaskDrafts();
  const moduleDrafts = useModuleDrafts();

  const plan = useMemo(() => {
    if (!newId) return null;
    return planRenameCascade(oldId, newId, canonicalBundle);
  }, [oldId, newId]);

  const formatValid = isValidTaskId(newId);
  const canSubmit = plan?.ok && !submitting;

  async function handleConfirm() {
    if (!plan?.ok) return;
    setSubmitting(true);
    setError(null);
    try {
      // Write the new task draft (status='new' — newly authored).
      await taskDrafts.save(plan.taskDraft);
      // Write each module draft (status='local_override' — modifies a canonical module).
      for (const md of plan.moduleDrafts) {
        await moduleDrafts.save(md);
      }
      onComplete?.({
        oldId,
        newId,
        taskDraftCreated: true,
        moduleDraftsCreated: plan.moduleDrafts.length,
      });
      onClose?.();
    } catch (e) {
      setError(e.message);
      setSubmitting(false);
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.6)', zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--bg-panel, #1a1a1a)',
          border: '1px solid var(--border)',
          borderRadius: 6,
          padding: 20,
          width: 520,
          maxWidth: '90vw',
          maxHeight: '85vh',
          overflowY: 'auto',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        }}
      >
        <h3 style={{ margin: '0 0 12px', fontSize: 14 }}>Rename task</h3>

        <div style={{ marginBottom: 12, fontSize: 11 }}>
          <div style={{ color: 'var(--text-muted)', fontSize: 10, textTransform: 'uppercase', marginBottom: 2 }}>Current ID</div>
          <code style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{oldId}</code>
        </div>

        <label style={{ display: 'block', marginBottom: 12 }}>
          <div style={{ color: 'var(--text-muted)', fontSize: 10, textTransform: 'uppercase', marginBottom: 2 }}>New ID</div>
          <input
            autoFocus
            placeholder="TSK_..."
            value={newId}
            onChange={e => setNewId(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ''))}
            style={{
              width: '100%',
              padding: '6px 8px',
              fontSize: 12,
              fontFamily: 'var(--font-mono)',
              background: 'var(--bg-input, #222)',
              color: 'var(--text)',
              border: `1px solid ${newId && !formatValid ? '#e74c3c' : 'var(--border)'}`,
              borderRadius: 3,
              boxSizing: 'border-box',
            }}
          />
        </label>

        {/* Validation feedback + cascade preview */}
        {newId && (
          <div style={{ marginBottom: 16, padding: 10, fontSize: 11, borderRadius: 3, background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)' }}>
            {!formatValid && (
              <div style={{ color: '#e74c3c' }}>✗ Format must match TSK_[A-Z0-9_]+</div>
            )}
            {formatValid && plan && !plan.ok && (
              <div style={{ color: '#e74c3c' }}>✗ {plan.error}</div>
            )}
            {plan?.ok && (
              <>
                <div style={{ color: '#5aa85a', marginBottom: 8 }}>✓ Format valid</div>
                <div style={{ color: '#5aa85a', marginBottom: 8 }}>✓ Doesn't collide with existing task</div>
                <div style={{ marginBottom: 6 }}>This rename will:</div>
                <ul style={{ margin: '0 0 8px 16px', padding: 0, fontSize: 11, color: 'var(--text-muted)' }}>
                  <li>Create a new canonical task <code>{newId}</code> (1 draft, status: new)</li>
                  <li>Update <code>task_ref</code> in <strong style={{ color: 'var(--text)' }}>{plan.usageCount} module{plan.usageCount === 1 ? '' : 's'}</strong> ({plan.usageCount} draft{plan.usageCount === 1 ? '' : 's'}, status: local_override)</li>
                  <li>Scenarios update for free via module references — no scenario drafts needed</li>
                </ul>

                {plan.moduleIds.length > 0 && (
                  <details style={{ marginTop: 6 }}>
                    <summary style={{ cursor: 'pointer', color: 'var(--text-muted)', fontSize: 10 }}>
                      Affected modules ({plan.moduleIds.length})
                    </summary>
                    <div style={{ marginTop: 6, maxHeight: 160, overflowY: 'auto', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)' }}>
                      {plan.moduleIds.map(id => (
                        <div key={id} style={{ padding: '1px 0' }}>{id}</div>
                      ))}
                    </div>
                  </details>
                )}

                <div style={{ marginTop: 10, padding: 6, fontSize: 10, color: 'var(--text-muted)', background: 'rgba(224,184,74,0.08)', border: '1px solid rgba(224,184,74,0.3)', borderRadius: 3 }}>
                  ⚠ Old task <code>{oldId}</code> stays canonical until you archive it manually after publishing. The smoke gate will catch any module that still references the old ID.
                </div>
              </>
            )}
          </div>
        )}

        {error && (
          <div style={{ padding: 8, marginBottom: 12, fontSize: 11, color: '#e74c3c', background: 'rgba(231,76,60,0.1)', border: '1px solid #e74c3c', borderRadius: 3 }}>
            Failed: {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            disabled={submitting}
            className="btn"
          >Cancel</button>
          <button
            onClick={handleConfirm}
            disabled={!canSubmit}
            className="btn btn-accent"
            style={{ opacity: canSubmit ? 1 : 0.5 }}
          >
            {submitting ? 'Writing drafts…' : `Confirm rename → ${plan?.usageCount ?? 0} module draft${plan?.usageCount === 1 ? '' : 's'}`}
          </button>
        </div>
      </div>
    </div>
  );
}
