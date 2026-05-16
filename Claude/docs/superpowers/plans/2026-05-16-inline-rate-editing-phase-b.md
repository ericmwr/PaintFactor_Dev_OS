# Inline Rate Editing Phase B — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "💾 Save to library" glyph next to Phase A's ↺ revert glyph in `RateCell`. Click opens a confirm modal that publishes the override via existing `publishTask()`, writes `Claude/tasks/TSK_*.json` + regenerates the scenario bundle, then clears the project-level override entry.

**Architecture:** Modal lives inside each `RateCell` (one popup per cell, lazy-mounted on click). Two pure helpers (`findConflictingDraft`, `buildPublishedTaskPayload`) carry the testable logic. The save glyph + modal mount are gated on `import.meta.env.DEV` so production deploys (Netlify) don't surface a button that requires the dev-only authoring endpoint.

**Tech Stack:** React 19, useReducer + Context, Vitest 3 for unit tests, no TypeScript, custom CSS via `variables.css`. PaintScope worktree under `Claude/tools/paintscope/`.

**Spec reference:** `Claude/docs/superpowers/specs/2026-05-16-inline-rate-editing-phase-b-design.md`

---

## Working directory + dev server

All file paths are relative to:
`C:/Eric_AI_Playground/Claude Code Uni/Claude/.claude/worktrees/cranky-saha`

Dev server is running on port 5183 (`paintscope` config in `.claude/launch.json`). Use `preview_list` to grab the live `serverId` — at plan-write time it was `6d8f43bd-bc0f-4fc0-89bb-016c432b610e`, but it may differ if the server restarts.

Vitest commands run from `Claude/tools/paintscope/`:
```
cd Claude/tools/paintscope && npx vitest run <path>
```

## File map

| File | Action |
|---|---|
| `Claude/tools/paintscope/src/components/estimate/RateOverridePublishHelpers.js` | Create — pure helpers (`findConflictingDraft`, `buildPublishedTaskPayload`) |
| `Claude/tools/paintscope/src/components/estimate/__tests__/rate-override-publish-helpers.test.js` | Create — Vitest unit tests for both helpers |
| `Claude/tools/paintscope/src/components/estimate/RateOverridePublishModal.jsx` | Create — confirm/publish modal component |
| `Claude/tools/paintscope/src/components/estimate/RateCell.jsx` | Modify — add 💾 glyph + modal mount; accept `projectId`, `projectName` props; gate on `import.meta.env.DEV` |
| `Claude/tools/paintscope/src/components/estimate/EstimateView.jsx` | Modify — destructure `projectId` from `useProject()` context; pass `projectId` + `state.project.name` through to all 4 `<RateCell>` sites |

---

## Task 1: Helper — `findConflictingDraft` (TDD)

**Files:**
- Create: `Claude/tools/paintscope/src/components/estimate/__tests__/rate-override-publish-helpers.test.js`
- Create: `Claude/tools/paintscope/src/components/estimate/RateOverridePublishHelpers.js`

- [ ] **Step 1: Create the test directory + failing test**

Create `Claude/tools/paintscope/src/components/estimate/__tests__/rate-override-publish-helpers.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { findConflictingDraft } from '../RateOverridePublishHelpers.js';

describe('findConflictingDraft', () => {
  it('returns the draft when one exists with status "draft"', () => {
    const drafts = [
      { id: 'TSK_A', task_id: 'TSK_A', rate_per_hour: 88, status: 'draft' },
      { id: 'TSK_B', task_id: 'TSK_B', rate_per_hour: 50, status: 'draft' },
    ];
    const result = findConflictingDraft('TSK_A', drafts);
    expect(result).toEqual(drafts[0]);
  });

  it('returns null when matching draft has status "published"', () => {
    const drafts = [
      { id: 'TSK_A', task_id: 'TSK_A', rate_per_hour: 88, status: 'published' },
    ];
    expect(findConflictingDraft('TSK_A', drafts)).toBeNull();
  });

  it('returns null when no draft matches the task_id', () => {
    const drafts = [
      { id: 'TSK_B', task_id: 'TSK_B', rate_per_hour: 50, status: 'draft' },
    ];
    expect(findConflictingDraft('TSK_A', drafts)).toBeNull();
  });

  it('returns null when drafts array is empty', () => {
    expect(findConflictingDraft('TSK_A', [])).toBeNull();
  });

  it('handles undefined/null drafts argument', () => {
    expect(findConflictingDraft('TSK_A', null)).toBeNull();
    expect(findConflictingDraft('TSK_A', undefined)).toBeNull();
  });

  it('matches on task_id, not id (drafts may have id == task_id or different)', () => {
    const drafts = [
      { id: 'TSK_A', task_id: 'TSK_A', rate_per_hour: 88, status: 'draft' },
    ];
    expect(findConflictingDraft('TSK_A', drafts)).toEqual(drafts[0]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd Claude/tools/paintscope && npx vitest run src/components/estimate/__tests__/rate-override-publish-helpers.test.js`
Expected: 6 tests FAIL with "findConflictingDraft is not a function" / import error.

- [ ] **Step 3: Create the helpers file with `findConflictingDraft`**

Create `Claude/tools/paintscope/src/components/estimate/RateOverridePublishHelpers.js`:

```js
/**
 * Find a non-published draft for a task in the drafts list, or null.
 * Used by RateOverridePublishModal to detect conflicts before publishing.
 *
 * @param {string} taskId
 * @param {Array} drafts  — list of task-draft records from useTaskDrafts()
 * @returns {object|null} the matching draft with status !== 'published', else null
 */
export function findConflictingDraft(taskId, drafts) {
  if (!Array.isArray(drafts)) return null;
  return drafts.find(d => d.task_id === taskId && d.status !== 'published') || null;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd Claude/tools/paintscope && npx vitest run src/components/estimate/__tests__/rate-override-publish-helpers.test.js`
Expected: 6 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add Claude/tools/paintscope/src/components/estimate/RateOverridePublishHelpers.js Claude/tools/paintscope/src/components/estimate/__tests__/rate-override-publish-helpers.test.js
git commit -m "feat(paintscope): add findConflictingDraft helper + tests (Phase B rate publish)"
```

---

## Task 2: Helper — `buildPublishedTaskPayload` (TDD)

**Files:**
- Modify: `Claude/tools/paintscope/src/components/estimate/__tests__/rate-override-publish-helpers.test.js` (append)
- Modify: `Claude/tools/paintscope/src/components/estimate/RateOverridePublishHelpers.js` (append)

- [ ] **Step 1: Append failing tests**

Append to `rate-override-publish-helpers.test.js` (after the `findConflictingDraft` describe block):

```js
import { buildPublishedTaskPayload } from '../RateOverridePublishHelpers.js';

describe('buildPublishedTaskPayload', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-16T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const canonical = {
    task_id: 'TSK_BRUSH_COAT_LF',
    name: 'Brush Coat (LF)',
    uom: 'LF',
    skill_level: 'experienced',
    rate_per_hour: 80,
  };

  it('preserves all canonical fields and replaces rate_per_hour', () => {
    const result = buildPublishedTaskPayload(canonical, 95, { projectId: 'proj_x', projectName: 'McLeod' });
    expect(result.task_id).toBe('TSK_BRUSH_COAT_LF');
    expect(result.name).toBe('Brush Coat (LF)');
    expect(result.uom).toBe('LF');
    expect(result.skill_level).toBe('experienced');
    expect(result.rate_per_hour).toBe(95);
  });

  it('stamps _meta.last_calibrated_at as a valid ISO timestamp', () => {
    const result = buildPublishedTaskPayload(canonical, 95, { projectId: 'proj_x', projectName: 'McLeod' });
    expect(result._meta.last_calibrated_at).toBe('2026-05-16T12:00:00.000Z');
  });

  it('stamps _meta.last_calibrated_from with project context + previous rate from canonical', () => {
    const result = buildPublishedTaskPayload(canonical, 95, { projectId: 'proj_x', projectName: 'McLeod' });
    expect(result._meta.last_calibrated_from).toEqual({
      project_id: 'proj_x',
      project_name: 'McLeod',
      previous_rate: 80,
    });
  });

  it('handles null projectId (fresh state, localStorage-only)', () => {
    const result = buildPublishedTaskPayload(canonical, 95, { projectId: null, projectName: 'Untitled Project' });
    expect(result._meta.last_calibrated_from.project_id).toBeNull();
    expect(result._meta.last_calibrated_from.project_name).toBe('Untitled Project');
  });

  it('merges with existing _meta if canonical already has one', () => {
    const withMeta = {
      ...canonical,
      _meta: {
        custom_note: 'preserved',
        last_calibrated_at: '2020-01-01T00:00:00.000Z',
      },
    };
    const result = buildPublishedTaskPayload(withMeta, 95, { projectId: 'p', projectName: 'n' });
    expect(result._meta.custom_note).toBe('preserved');
    expect(result._meta.last_calibrated_at).toBe('2026-05-16T12:00:00.000Z'); // replaced
    expect(result._meta.last_calibrated_from.previous_rate).toBe(80);
  });

  it('does not mutate the canonical input', () => {
    const original = JSON.stringify(canonical);
    buildPublishedTaskPayload(canonical, 95, { projectId: 'p', projectName: 'n' });
    expect(JSON.stringify(canonical)).toBe(original);
  });
});
```

Also update the top imports of the file to include `vi`, `beforeEach`, `afterEach`:

```js
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd Claude/tools/paintscope && npx vitest run src/components/estimate/__tests__/rate-override-publish-helpers.test.js`
Expected: 6 new tests FAIL ("buildPublishedTaskPayload is not a function"), 6 existing tests still PASS.

- [ ] **Step 3: Implement `buildPublishedTaskPayload`**

Append to `RateOverridePublishHelpers.js`:

```js
/**
 * Build the JSON payload that publishTask() will write to disk.
 * Preserves all canonical fields, replaces rate_per_hour, stamps _meta.
 *
 * @param canonical       The bundleTasks[taskId] record (must have rate_per_hour).
 * @param newRate         The override's rate_per_hour value (number).
 * @param projectContext  { projectId, projectName }. previous_rate is derived
 *                        from canonical.rate_per_hour inside the helper.
 * @returns {object} canonical-shaped task JSON with rate replaced + _meta stamped
 */
export function buildPublishedTaskPayload(canonical, newRate, projectContext) {
  const { projectId, projectName } = projectContext || {};
  return {
    ...canonical,
    rate_per_hour: newRate,
    _meta: {
      ...(canonical._meta || {}),
      last_calibrated_at: new Date().toISOString(),
      last_calibrated_from: {
        project_id: projectId ?? null,
        project_name: projectName ?? 'Untitled Project',
        previous_rate: canonical.rate_per_hour,
      },
    },
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd Claude/tools/paintscope && npx vitest run src/components/estimate/__tests__/rate-override-publish-helpers.test.js`
Expected: 12 tests PASS (6 from Task 1 + 6 new).

- [ ] **Step 5: Commit**

```bash
git add Claude/tools/paintscope/src/components/estimate/RateOverridePublishHelpers.js Claude/tools/paintscope/src/components/estimate/__tests__/rate-override-publish-helpers.test.js
git commit -m "feat(paintscope): add buildPublishedTaskPayload helper + tests (Phase B rate publish)"
```

---

## Task 3: Create modal — static render only

Build the modal component with full UI but **no publish logic and no useTaskDrafts wiring yet**. Conflict block always hidden in this task; Cancel calls onClose; Publish is a no-op stub. Wired in Tasks 6 + 7.

**Files:**
- Create: `Claude/tools/paintscope/src/components/estimate/RateOverridePublishModal.jsx`

- [ ] **Step 1: Create the modal file**

Create `Claude/tools/paintscope/src/components/estimate/RateOverridePublishModal.jsx`:

```jsx
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
```

- [ ] **Step 2: Verify file parses cleanly**

Use preview to check Vite reports no parse errors:

```js
// preview_console_logs level=error
```

Expected: no parse errors mentioning `RateOverridePublishModal.jsx`.

- [ ] **Step 3: Commit**

```bash
git add Claude/tools/paintscope/src/components/estimate/RateOverridePublishModal.jsx
git commit -m "feat(paintscope): add RateOverridePublishModal component (static render, Phase B)"
```

---

## Task 4: Wire 💾 glyph + modal mount into `RateCell` (DEV-gated)

**Files:**
- Modify: `Claude/tools/paintscope/src/components/estimate/RateCell.jsx`

- [ ] **Step 1: Read current RateCell.jsx**

Run: `grep -n "import\|hasOverride\|revert" Claude/tools/paintscope/src/components/estimate/RateCell.jsx | head -20`
Expected: see existing imports + the `↺` revert glyph rendered when `hasOverride` is truthy.

- [ ] **Step 2: Add imports and props**

In `RateCell.jsx`, add to the imports near the top:

```jsx
import RateOverridePublishModal from './RateOverridePublishModal.jsx';
```

Update the component signature to accept two new props (`projectId`, `projectName`):

```jsx
export default function RateCell({ taskId, baseRate, isFixed, override, dispatch, projectId, projectName }) {
```

- [ ] **Step 3: Add modal-open state and the 💾 glyph**

Inside `RateCell`, near the existing `editing` state declaration, add:

```jsx
const [publishModalOpen, setPublishModalOpen] = useState(false);
```

In the JSX block where the ↺ revert glyph is rendered (inside the `{hasOverride && (...)}` group near the end of the eligible-cell render), add a 💾 glyph immediately after the ↺. Wrap both in a fragment so they sit side-by-side. Also, gate the 💾 on `import.meta.env.DEV` so production deploys don't show it. The block should look like:

```jsx
{hasOverride && (
  <>
    <span
      onClick={revert}
      title="Revert to canonical rate"
      style={{ marginLeft: 4, fontSize: 9, color: 'var(--text-muted)', cursor: 'pointer' }}
    >
      ↺
    </span>
    {import.meta.env.DEV && (
      <span
        onClick={(e) => { e.stopPropagation(); setPublishModalOpen(true); }}
        title="Save to library"
        style={{ marginLeft: 4, fontSize: 9, color: 'var(--text-muted)', cursor: 'pointer' }}
      >
        💾
      </span>
    )}
  </>
)}
```

(Replace the existing `↺`-only block — search for `title="Revert to canonical rate"` to find it.)

- [ ] **Step 4: Mount the modal conditionally**

At the very end of the eligible-cell branch (immediately before the closing `</td>`), add:

```jsx
{publishModalOpen && (
  <RateOverridePublishModal
    taskId={taskId}
    override={override}
    projectId={projectId}
    projectName={projectName}
    dispatch={dispatch}
    onClose={() => setPublishModalOpen(false)}
  />
)}
```

- [ ] **Step 5: Smoke check via dev server**

Get the live server id (`preview_list`), then verify the cell renders without errors:

```js
// preview_console_logs level=error
```

Expected: no errors. Navigate to the Estimate tab on a project with an override-eligible task that already has an override applied. Visually confirm: ↺ and 💾 both render in the cell.

Click 💾 — modal should pop up. Click Cancel → modal closes. Click Publish → modal shows "Publish not yet wired" error (the stub from Task 3).

- [ ] **Step 6: Commit**

```bash
git add Claude/tools/paintscope/src/components/estimate/RateCell.jsx
git commit -m "feat(paintscope): wire RateOverridePublishModal into RateCell (DEV-gated, Phase B)"
```

---

## Task 5: Pass `projectId` + `projectName` from `EstimateView` to `RateCell`

**Files:**
- Modify: `Claude/tools/paintscope/src/components/estimate/EstimateView.jsx`

- [ ] **Step 1: Destructure `projectId` from `useProject()`**

Run: `grep -n "useProject()" Claude/tools/paintscope/src/components/estimate/EstimateView.jsx | head`
Expected: one match, likely `const { state, dispatch } = useProject();` near the top of the component function.

Update that line to also pull `projectId`:

```jsx
const { state, dispatch, projectId } = useProject();
```

- [ ] **Step 2: Find the 4 `<RateCell>` invocation sites**

Run: `grep -n "<RateCell" Claude/tools/paintscope/src/components/estimate/EstimateView.jsx`
Expected: 4 matches.

- [ ] **Step 3: Add `projectId` + `projectName` props to all 4 sites**

At each `<RateCell ... />` invocation, append two new props:

```jsx
projectId={projectId} projectName={state.project.name || 'Untitled Project'}
```

The full invocation pattern at every site should now read:

```jsx
<RateCell taskId={t.taskId} baseRate={t.baseRate} isFixed={t.isFixed} override={state.project.rate_overrides?.[t.taskId]} dispatch={dispatch} projectId={projectId} projectName={state.project.name || 'Untitled Project'} />
```

- [ ] **Step 4: Smoke check**

Reload the dev server preview. Click 💾 on an overridden cell. Modal should still open (now with real `projectId` + `projectName` baked in — verify via React DevTools or by adding a temporary console.log in the modal if needed; this is implicitly verified end-to-end in Task 8).

- [ ] **Step 5: Commit**

```bash
git add Claude/tools/paintscope/src/components/estimate/EstimateView.jsx
git commit -m "feat(paintscope): pass projectId + projectName to RateCell (Phase B)"
```

---

## Task 6: Wire conflict detection in modal

**Files:**
- Modify: `Claude/tools/paintscope/src/components/estimate/RateOverridePublishModal.jsx`

- [ ] **Step 1: Import dependencies**

At the top of `RateOverridePublishModal.jsx`, alongside the existing imports, add:

```jsx
import { useTaskDrafts } from '../../hooks/useTaskDrafts.js';
import { findConflictingDraft } from './RateOverridePublishHelpers.js';
```

- [ ] **Step 2: Replace the hard-coded `conflict = null` with real detection**

Find the line `const conflict = null;` inside the modal component. Replace it with:

```jsx
const { drafts: taskDrafts } = useTaskDrafts();
const conflict = useMemo(() => findConflictingDraft(taskId, taskDrafts), [taskId, taskDrafts]);
```

- [ ] **Step 3: Smoke check the conflict block renders**

Get the server id via `preview_list`. Inject a fake pending draft for the task you've overridden:

```js
(() => {
  return new Promise((resolve) => {
    const req = indexedDB.open('paintfactor');
    req.onsuccess = (e) => {
      const db = e.target.result;
      const tx = db.transaction(['task_drafts'], 'readwrite');
      const store = tx.objectStore('task_drafts');
      const draft = {
        id: 'TSK_BRUSH_COAT_LF',
        task_id: 'TSK_BRUSH_COAT_LF',
        name: 'Brush Coat (LF)',
        uom: 'LF',
        skill_level: 'experienced',
        rate_per_hour: 88,
        status: 'draft',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: 'admin',
        visibility: 'private',
      };
      const put = store.put(draft);
      put.onsuccess = () => { db.close(); resolve({ status: 'injected', task_id: draft.task_id, rate: draft.rate_per_hour }); };
      put.onerror = (e2) => { db.close(); resolve({ status: 'put-failed', error: String(e2.target.error) }); };
    };
    req.onerror = (e) => resolve({ error: String(e.target.error) });
  });
})()
```

Replace `'TSK_BRUSH_COAT_LF'` with a task ID that you've actually overridden in the running estimate. Then:

1. Click 💾 on that cell's rate
2. Verify the modal shows the yellow conflict block ("⚠️ A pending draft for this task already exists with rate 88…")
3. Click Cancel
4. Clean up the injected draft:

```js
(() => {
  return new Promise((resolve) => {
    const req = indexedDB.open('paintfactor');
    req.onsuccess = (e) => {
      const db = e.target.result;
      const tx = db.transaction(['task_drafts'], 'readwrite');
      const store = tx.objectStore('task_drafts');
      const del = store.delete('TSK_BRUSH_COAT_LF');
      del.onsuccess = () => { db.close(); resolve({ status: 'deleted' }); };
      del.onerror = (e2) => { db.close(); resolve({ status: 'delete-failed', error: String(e2.target.error) }); };
    };
  });
})()
```

- [ ] **Step 4: Commit**

```bash
git add Claude/tools/paintscope/src/components/estimate/RateOverridePublishModal.jsx
git commit -m "feat(paintscope): wire conflict detection via useTaskDrafts (Phase B)"
```

---

## Task 7: Wire `publishTask` + success/error paths

**Files:**
- Modify: `Claude/tools/paintscope/src/components/estimate/RateOverridePublishModal.jsx`

- [ ] **Step 1: Import `publishTask` + `buildPublishedTaskPayload`**

At the top of `RateOverridePublishModal.jsx`, alongside the existing imports, add:

```jsx
import { publishTask } from '../../authoring/publish.js';
import { buildPublishedTaskPayload } from './RateOverridePublishHelpers.js';
```

- [ ] **Step 2: Replace the `handlePublish` stub**

Find the existing `handlePublish` stub (the one with `setError('Publish not yet wired...')`). Replace it with the real implementation:

```jsx
const handlePublish = async () => {
  if (publishDisabled) return;
  setError(null);
  setPublishing(true);
  try {
    const payload = buildPublishedTaskPayload(canonical, newRate, { projectId, projectName });
    const draft = { ...payload, id: taskId, kind: 'task', status: 'draft' };
    await publishTask(draft);
    dispatch({ type: 'CLEAR_RATE_OVERRIDE', payload: { task_id: taskId } });
    onClose();
  } catch (err) {
    setError(err?.message || String(err));
    setPublishing(false);
  }
};
```

- [ ] **Step 3: Smoke verify the happy path**

Open the dev server preview. Override a flat-rate cell (e.g., `TSK_BRUSH_COAT_LF` or `TSK_INSPECT_COATING_LF`). Click 💾. Click Publish.

Expected:
- Button text changes to "Publishing..." briefly
- Modal closes
- Cell returns to muted style (no accent color, no ↺, no 💾)
- The override entry is removed from `state.project.rate_overrides`
- The canonical JSON file at `Claude/tasks/<task_id>.json` now contains the new rate + `_meta` block
- Vite HMR auto-reloads the bundle

Verify the file write via the host shell:
```bash
cat Claude/tasks/TSK_BRUSH_COAT_LF.json
```

Expected: `rate_per_hour` matches the override + `_meta.last_calibrated_at` is a fresh ISO timestamp + `_meta.last_calibrated_from` has the project context.

- [ ] **Step 4: Smoke verify the error path**

To force an error, you can temporarily edit `Claude/tools/paintscope/src/authoring/publish.js`:

```js
// In publishTask, prepend a throw:
export async function publishTask(draft) {
  throw new Error('Test error from smoke check');
  // ... existing code
}
```

Reload, click 💾, click Publish. Expected: modal stays open with red error message "❌ Publish failed: Test error from smoke check". Override is still in state.

Revert the test error in publish.js. Run vitest to confirm nothing else broke:

```bash
cd Claude/tools/paintscope && npx vitest run
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add Claude/tools/paintscope/src/components/estimate/RateOverridePublishModal.jsx
git commit -m "feat(paintscope): wire publishTask + clear override on success (Phase B)"
```

If you accidentally committed the test-error injection into publish.js, revert it immediately:

```bash
# (only if you committed the temporary throw)
git revert HEAD --no-edit
```

---

## Task 8: End-to-end manual smoke (the six scenarios from the spec)

No file changes. Run each scenario in the dev server, document anything that doesn't behave as expected, and only mark this task complete when all six pass.

For each scenario, list the override and the expected post-publish state.

- [ ] **Step 1: Scenario 1 — Happy path**

  - Setup: a project with one room that has an override-eligible rate cell (e.g., baseboard / `TSK_BRUSH_COAT_LF`).
  - Action: override a rate (e.g., 80 → 95), click 💾, see modal, click Publish.
  - Expected: file written, override cleared, cell back to muted.

- [ ] **Step 2: Scenario 2 — Conflict path**

  - Setup: same as Scenario 1, but inject a pending draft into IDB for the same task first (use the IIFE from Task 6 Step 3).
  - Action: override the rate, click 💾.
  - Expected: yellow conflict block appears in modal. Click Publish — proceeds anyway, overwrites the draft + writes the canonical.
  - Cleanup: verify the draft's status is now `'published'` in IDB.

- [ ] **Step 3: Scenario 3 — Cancel path**

  - Setup: override a rate, click 💾.
  - Action: click Cancel (or press Escape).
  - Expected: modal closes, override is still in state, no file written.

- [ ] **Step 4: Scenario 4 — Error path**

  - Setup: same as Scenario 1.
  - Action: inject a temporary throw into `publishTask` (or stop the dev server's authoring endpoint), click Publish.
  - Expected: red error in modal, override preserved, button re-enabled.
  - Cleanup: revert the test injection.

- [ ] **Step 5: Scenario 5 — Missing-canonical path**

  - Setup: override a rate, then archive that task by renaming its JSON file (e.g., `mv Claude/tasks/TSK_X.json Claude/tasks/TSK_X.json.bak`). Trigger a bundle regen (via DraftsView "Regen Bundle" or by editing any other task). Reload.
  - Expected: the prune-report banner shows (Phase A) with the dropped override. The 💾 button is no longer rendered (override was cleared).
  - Cleanup: restore the archived task and regenerate the bundle.

- [ ] **Step 6: Scenario 6 — Multiple cells**

  - Setup: override two different tasks in the same project.
  - Action: click 💾 + Publish on one. Verify the other override is still in place with its own 💾 still showing.
  - Expected: only the published task's override clears. The other cell remains overridden + has its own 💾 glyph.

- [ ] **Step 7: Final test sweep**

After all six scenarios pass, run the full Vitest suite once more:

```bash
cd Claude/tools/paintscope && npx vitest run
```

Expected: all tests pass (12 new from Tasks 1-2 + the existing 73 = 85 total).

- [ ] **Step 8: No final commit needed**

All commits happened incrementally. The branch is ready for either continued work into Phase C, merge, or push to origin.

---

## Self-review checklist (for the implementing engineer)

After all tasks pass:

- [ ] 12 new test cases in `rate-override-publish-helpers.test.js` pass
- [ ] Existing 73 Vitest tests still pass (total 85)
- [ ] No console errors in dev server
- [ ] `import.meta.env.DEV` gate verified — 💾 glyph absent in production build (run `npx vite build` and serve the dist; verify glyph is missing)
- [ ] Audit stamp `_meta.last_calibrated_at` + `_meta.last_calibrated_from` present in published task JSON
- [ ] Override entry cleared from `state.project.rate_overrides` after successful publish
- [ ] Vite HMR reloads bundle automatically post-publish (cell shows new canonical without manual reload)
- [ ] Conflict detection works for status `'draft'` only (not `'published'`)
- [ ] Error path keeps override intact

## Phase C notes

Not in scope here. When picking up Phase C:
- Bulk "Publish all overrides" button on the Estimate header
- Rate-history view consuming `_meta.last_calibrated_at` / `last_calibrated_from`
- Merge-aware draft UX when pending drafts have non-rate field edits
- Multi-user provenance once RBAC exists
