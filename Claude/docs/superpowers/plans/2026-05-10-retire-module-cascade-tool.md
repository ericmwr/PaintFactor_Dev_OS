# Retire-Module Cascade Tool Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Retire module" cascade button to ModuleEditor that, in one click, writes scenario drafts stripping the module from every `scenario.modules[]` array that references it, archives the module file, and regenerates the bundle. The smoke gate at publish catches any miss. Mirrors the existing rename-with-cascade pattern.

**Architecture:** Three new pieces parallel to the existing rename infrastructure: a pure helper (`retire-module-cascade.js` ↔ `rename-cascade.js`), a modal (`RetireModuleModal.jsx` ↔ `RenameTaskModal.jsx`), and a button wiring in `ModuleEditor.jsx`. No data model changes; state writes go through the existing `useScenarioDrafts` hook + `archiveEntity('module', id)` + `regenBundle()` infrastructure.

**Tech Stack:** React 19 (function components, hooks), `useReducer`-style draft hooks (`useScenarioDrafts`), IndexedDB-backed authoring drafts, plain CSS with custom properties. No tests required — the codebase has no unit tests for `rename-cascade.js`, and the smoke gate at publish is the integration safety net (per project memory).

---

## Reference: existing rename infrastructure

Files this plan parallels:
- [Claude/tools/paintscope/src/engine/rename-cascade.js](Claude/tools/paintscope/src/engine/rename-cascade.js) — `planRenameCascade(oldId, newId, bundle)` returns `{ ok, taskDraft, moduleDrafts, usageCount, moduleIds, error? }`. No tests.
- [Claude/tools/paintscope/src/components/authoring/RenameTaskModal.jsx](Claude/tools/paintscope/src/components/authoring/RenameTaskModal.jsx) — modal with input, preview block, Confirm button. ~170 lines.
- TaskEditor's "Rename..." button is the entry point (not shown here — we mirror the wiring in ModuleEditor).

The helper for finding scenarios that reference a module already exists: `findModuleUsage(moduleId, scenarios)` exported from [ModuleUsagePanel.jsx:14](Claude/tools/paintscope/src/components/authoring/ModuleUsagePanel.jsx).

The archive + regen entry points are imported in ModuleEditor today (line 17) and used by the existing Archive button (lines 440-441):
```js
import { archiveEntity, regenBundle } from '../../authoring/archive-ops.js';
// ...
await archiveEntity('module', payload.module_id);
await regenBundle();
```

The scenario drafts hook is at [hooks/useScenarioDrafts.js](Claude/tools/paintscope/src/hooks/useScenarioDrafts.js) and exposes `save(draft)` matching the shape `{ id, payload, status: 'local_override' }`.

---

## File Structure

| File | Role | Action |
|------|------|--------|
| `Claude/tools/paintscope/src/engine/retire-module-cascade.js` | Pure helper — given `(moduleId, bundle)` returns scenario draft list + summary | **Create** |
| `Claude/tools/paintscope/src/components/authoring/RetireModuleModal.jsx` | Modal with preview + confirm | **Create** |
| `Claude/tools/paintscope/src/components/authoring/ModuleEditor.jsx` | Add Retire button next to existing Archive | **Modify** |

---

## Workflow on confirm (within RetireModuleModal)

1. For each scenario in the bundle that references `moduleId` in its `modules[]` array, save a scenario draft with the module stripped (`status: 'local_override'`).
2. Call `archiveEntity('module', moduleId)` — moves `Claude/modules/<moduleId>.json` → `archive/`.
3. Call `regenBundle()` — rebuilds `scenario-bundle.gen.js` from disk.
4. Drafts continue to exist in IDB until the user publishes them via DraftsView. The overlay-loader applies drafts at estimate time, so estimates immediately reflect the retirement. The smoke gate runs at publish-all and validates every `scenario.modules[]` ref resolves before writing scenario JSON to disk.

---

### Task 1: Create `retire-module-cascade.js` pure helper

**Files:**
- Create: `Claude/tools/paintscope/src/engine/retire-module-cascade.js`

- [ ] **Step 1: Create the helper file**

```js
// Pure helper for the Retire-module-with-cascade modal. Given a moduleId
// and the canonical bundle, returns the scenario draft writes that, when
// applied, strip every reference to this module from scenario.modules[]
// arrays. The cascade does NOT archive the module here — the modal calls
// archiveEntity('module', id) after saving scenario drafts.
//
// Validation rules:
//   - moduleId must be a current canonical module
//
// Result shape mirrors rename-cascade.js for consistency.

import { findModuleUsage } from '../components/authoring/ModuleUsagePanel.jsx';

/**
 * @param {string} moduleId
 * @param {object} bundle - { modules, scenarios }
 * @returns {{
 *   ok: boolean,
 *   error?: string,
 *   scenarioDrafts?: object[],   // scenario draft records to save
 *   usageCount: number,          // # of scenarios that will be rewritten
 *   scenarioIds: string[],       // scenario IDs being rewritten
 * }}
 */
export function planRetireModuleCascade(moduleId, bundle) {
  if (!moduleId) return { ok: false, error: 'No moduleId provided', usageCount: 0, scenarioIds: [] };

  const modules = bundle?.modules || {};
  const scenarios = Array.isArray(bundle?.scenarios) ? bundle.scenarios : [];

  if (!modules[moduleId]) {
    return { ok: false, error: `Module ${moduleId} not found in canonical bundle`, usageCount: 0, scenarioIds: [] };
  }

  const usages = findModuleUsage(moduleId, scenarios);

  // For each scenario that references the module, build a draft that
  // strips it from scenario.modules[].
  const scenarioDrafts = usages.map(u => {
    const sc = scenarios.find(s => (s.scenario_id || s.id) === u.scenario_id);
    const newModules = (sc.modules || []).filter(m => m !== moduleId);
    return {
      id: sc.scenario_id || sc.id,
      payload: { ...sc, modules: newModules },
      status: 'local_override',
    };
  });

  return {
    ok: true,
    scenarioDrafts,
    usageCount: usages.length,
    scenarioIds: usages.map(u => u.scenario_id),
  };
}
```

- [ ] **Step 2: Build smoke**

Run: `cd "Claude/tools/paintscope" && npx vite build`
Expected: build succeeds (helper is unused but imports resolve)

- [ ] **Step 3: Commit**

```bash
git add Claude/tools/paintscope/src/engine/retire-module-cascade.js
git commit -m "feat(paintscope): retire-module-cascade pure helper"
```

---

### Task 2: Create `RetireModuleModal.jsx` modal component

**Files:**
- Create: `Claude/tools/paintscope/src/components/authoring/RetireModuleModal.jsx`

- [ ] **Step 1: Create the modal file**

```jsx
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
                ⚠ Drafts stay in IDB until you publish them in DraftsView. The smoke gate at publish-all validates every scenario.modules ref resolves. Restorable from the Archive tab.
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
```

- [ ] **Step 2: Build smoke**

Run: `cd "Claude/tools/paintscope" && npx vite build`
Expected: build succeeds

- [ ] **Step 3: Commit**

```bash
git add Claude/tools/paintscope/src/components/authoring/RetireModuleModal.jsx
git commit -m "feat(paintscope): RetireModuleModal cascade UI"
```

---

### Task 3: Wire Retire button into ModuleEditor

**Files:**
- Modify: `Claude/tools/paintscope/src/components/authoring/ModuleEditor.jsx`

- [ ] **Step 1: Add the import**

At the top of `ModuleEditor.jsx`, alongside existing imports (the `archive-ops` import is already there at line 17), add:

```jsx
import RetireModuleModal from './RetireModuleModal.jsx';
```

- [ ] **Step 2: Add state for the modal**

Inside the function body where other `useState` hooks live (find a `const [...]` cluster near the top of the editor function — around the existing `dirty` / `record` state), add:

```jsx
const [retireModalOpen, setRetireModalOpen] = useState(false);
```

If `useState` isn't already imported (it should be — the file uses other hooks), make sure it's in the React import.

- [ ] **Step 3: Add the Retire button next to Archive**

Find the Actions block in the component (around line 423-452 — currently has Save Draft + Publish to JSON + Cancel + Archive buttons). Locate the Archive button:

```jsx
{payload.module_id && record.status !== 'new' && (
  <button
    className="btn"
    style={{ color: '#e74c3c', borderColor: '#e74c3c' }}
    onClick={async () => {
      if (!confirm(`Archive ${payload.module_id}?\n\nMoves Claude/modules/${payload.module_id}.json → Claude/modules/archive/. Bundle regenerates automatically. Restorable from the Archive tab.`)) return;
      try {
        await archiveEntity('module', payload.module_id);
        await regenBundle();
        onCancel?.();
      } catch (e) {
        alert(`Archive failed: ${e.message}`);
      }
    }}
  >Archive</button>
)}
```

Add a new Retire button immediately BEFORE the Archive button (so the order reads: Save Draft, Publish, Cancel, **Retire**, Archive):

```jsx
{payload.module_id && record.status !== 'new' && (
  <button
    className="btn"
    style={{ color: '#e74c3c', borderColor: '#e74c3c' }}
    onClick={() => setRetireModalOpen(true)}
    title="Strip module from all scenarios that reference it, then archive"
  >Retire</button>
)}
```

- [ ] **Step 4: Mount the modal**

At the end of the component's returned JSX (just before the outermost closing tag — find where `</div>` closes the top-level container, after the Right panel JSON preview block at line 462), add the modal mount conditional:

```jsx
{retireModalOpen && (
  <RetireModuleModal
    moduleId={payload.module_id}
    onClose={() => setRetireModalOpen(false)}
    onComplete={() => {
      setRetireModalOpen(false);
      onCancel?.();
    }}
  />
)}
```

(Mounting it as a sibling rather than inside the editor body avoids the modal getting clipped by the editor's overflow rules.)

- [ ] **Step 5: Build smoke**

Run: `cd "Claude/tools/paintscope" && npx vite build`
Expected: build succeeds, no new warnings

- [ ] **Step 6: Commit**

```bash
git add Claude/tools/paintscope/src/components/authoring/ModuleEditor.jsx
git commit -m "feat(paintscope): wire Retire button into ModuleEditor"
```

---

### Task 4: Browser smoke verification

This task is for the user to run after Task 3 lands. Subagents should NOT attempt browser interaction — instead, they should verify the build is clean and report so the user can test on their dev server.

**User verification checklist (for after Task 3):**

1. Start dev server: `cd "Claude/tools/paintscope" && npm run dev`
2. Open `localhost:5173`, navigate to the Authoring tab
3. Open ModuleEditor for any non-'new' module (e.g. one of the retirement candidates from `Claude/_protection_module_retirement_audit.md`)
4. Confirm a red **Retire** button appears next to the existing **Archive** button
5. Click Retire → modal opens with:
   - Module ID displayed
   - Preview list: "Strip MOD_X from N scenarios", archive note, regen note
   - Affected scenarios collapsible with N entries
   - Disclaimer about drafts + smoke gate
6. Click Cancel → modal closes, no state changes
7. Reopen the modal on a retirement candidate and click **Confirm**:
   - Submitting label appears briefly
   - Modal closes when done
   - Open DraftsView → confirm N scenario drafts appear with status `local_override`
   - Open Archive tab → confirm the archived module is listed with a Restore button
8. (Optional) Restore the archived module and one or two scenario drafts to revert if you don't want to publish the retirement yet

**No commit for this task** — it's verification only.

---

## Out of scope (deferred)

- **Bulk retire UI** — retiring multiple modules in a single click. The audit has 36 candidates; one-by-one with this tool is fine for the first pass. If pace becomes an issue, a "select N modules and retire all" follow-up tool can mirror the existing Bulk Edit pattern.
- **Auto-archive of orphan tasks** — when a module is retired, its tasks may become orphan (no other module references them). The audit would catch this on re-run. A "find orphan tasks" follow-up tool could surface them; out of scope here.
- **Engine emit cleanup** — for retirements like `MOD_SETUP_TRIM_FLOOR_PROTECT`, the legacy PS-key emit at `quantity-lookups.js:336-345` should also go. That's a separate edit, not part of this tool. Each retirement may have a follow-up engine cleanup; the user does those by hand.
- **Mixed-module splitting** — the 105 mixed modules need a different tool (per-task strip, not whole-module retire). Future work.

---

## Self-review notes

- **Spec coverage:** The next-session doc's spec for the cascade tool is "Click Retire → modal shows 'this module is in N scenarios' → confirm writes N scenario drafts (each removing the module from its modules[] array) + archives the module + regen bundle." All four behaviors are in Task 2 Step 1 (lines 44-50 of the modal's `handleConfirm`). Preview is in Task 2 Step 1 (lines 87-117).
- **Placeholders:** None. Every code block is the actual code to write.
- **Type consistency:** `planRetireModuleCascade` returns `{ ok, scenarioDrafts, usageCount, scenarioIds, error? }` and the modal consumes those exact fields (lines 30, 60, 91-93, 100-101). Imports verified: `findModuleUsage` exported at [ModuleUsagePanel.jsx:14](Claude/tools/paintscope/src/components/authoring/ModuleUsagePanel.jsx); `archiveEntity` and `regenBundle` already imported in `ModuleEditor.jsx:17`; `useScenarioDrafts` exported at [useScenarioDrafts.js:11](Claude/tools/paintscope/src/hooks/useScenarioDrafts.js).
- **Mirrors rename pattern:** Helper signature, modal layout, draft-save loop, archive-then-regen — all parallel to the rename infrastructure that's already shipped and proven in production use.
