// Retire-with-cascade modal. Triggered from ModuleEditor; previews the
// blast radius via planRetireModuleCascade, then on confirm:
//   1. Saves N scenario drafts (each strips the module from modules[])
//   2. Archives the module file (Claude/modules/<id>.json → archive/)
//   3. Regenerates the bundle
//
// Drafts go through the smoke gate at publish — same safety net as rename.

import { useMemo, useState } from 'react';
import canonicalBundle from '../../data/scenario-bundle.gen.js';
import { planRetireModuleCascade } from '../../engine/retire-module-cascade.js';
import { useScenarioDrafts } from '../../hooks/useScenarioDrafts.js';
import { archiveEntity, regenBundle } from '../../authoring/archive-ops.js';

export default function RetireModuleModal({ moduleId, onClose, onComplete }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const scenarioDrafts = useScenarioDrafts();

  const plan = useMemo(
    () => planRetireModuleCascade(moduleId, canonicalBundle),
    [moduleId]
  );

  const canSubmit = plan?.ok && !submitting;

  async function handleConfirm() {
    if (!plan?.ok) return;
    setSubmitting(true);
    setError(null);
    try {
      // 1. Save N scenario drafts (each strips the module from modules[]).
      for (const sd of plan.scenarioDrafts) {
        await scenarioDrafts.save(sd);
      }
      // 2. Archive the module file (moves to Claude/modules/archive/).
      await archiveEntity('module', moduleId);
      // 3. Regenerate the bundle.
      await regenBundle();

      onComplete?.({
        moduleId,
        scenarioDraftsCreated: plan.scenarioDrafts.length,
        archived: true,
      });
      onClose?.();
    } catch (e) {
      setError(e.message);
      setSubmitting(false);
    }
  }

  return (
    <div
      onClick={submitting ? undefined : onClose}
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
        <h3 style={{ margin: '0 0 12px', fontSize: 14 }}>Retire module</h3>

        <div style={{ marginBottom: 12, fontSize: 11 }}>
          <div style={{ color: 'var(--text-muted)', fontSize: 10, textTransform: 'uppercase', marginBottom: 2 }}>Module</div>
          <code style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{moduleId}</code>
        </div>

        {/* Preview block */}
        <div style={{ marginBottom: 16, padding: 10, fontSize: 11, borderRadius: 3, background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)' }}>
          {!plan?.ok && (
            <div style={{ color: '#e74c3c' }}>✗ {plan?.error || 'Cannot retire this module'}</div>
          )}
          {plan?.ok && (
            <>
              <div style={{ marginBottom: 6 }}>This retirement will:</div>
              <ul style={{ margin: '0 0 8px 16px', padding: 0, fontSize: 11, color: 'var(--text-muted)' }}>
                <li>Strip <code>{moduleId}</code> from <strong style={{ color: 'var(--text)' }}>{plan.usageCount} scenario{plan.usageCount === 1 ? '' : 's'}</strong> ({plan.usageCount} draft{plan.usageCount === 1 ? '' : 's'}, status: local_override)</li>
                <li>Archive <code>Claude/modules/{moduleId}.json</code> → <code>archive/</code></li>
                <li>Regenerate the bundle</li>
              </ul>

              {plan.scenarioIds.length > 0 && (
                <details style={{ marginTop: 6 }}>
                  <summary style={{ cursor: 'pointer', color: 'var(--text-muted)', fontSize: 10 }}>
                    Affected scenarios ({plan.scenarioIds.length})
                  </summary>
                  <div style={{ marginTop: 6, maxHeight: 160, overflowY: 'auto', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)' }}>
                    {plan.scenarioIds.map(id => (
                      <div key={id} style={{ padding: '1px 0' }}>{id}</div>
                    ))}
                  </div>
                </details>
              )}

              <div style={{ marginTop: 10, padding: 6, fontSize: 10, color: 'var(--text-muted)', background: 'rgba(224,184,74,0.08)', border: '1px solid rgba(224,184,74,0.3)', borderRadius: 3 }}>
                ⚠ Drafts stay in IDB until you publish them in DraftsView. The smoke gate at publish-all validates every scenario.modules ref resolves. To undo: restore the module from the Archive tab AND delete the scenario drafts from DraftsView.
              </div>
            </>
          )}
        </div>

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
            className="btn"
            style={{ opacity: canSubmit ? 1 : 0.5, color: '#e74c3c', borderColor: '#e74c3c' }}
          >
            {submitting ? 'Retiring…' : `Confirm retire → ${plan?.usageCount ?? 0} scenario draft${plan?.usageCount === 1 ? '' : 's'} + archive`}
          </button>
        </div>
      </div>
    </div>
  );
}
