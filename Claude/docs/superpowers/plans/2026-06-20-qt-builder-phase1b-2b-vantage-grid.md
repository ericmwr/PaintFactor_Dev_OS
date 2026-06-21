# QT Builder Phase 1b-2b — Vantage Grid Component Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the gating-era tier-ladder `QTBuilder.jsx` with the file-naming **vantage grid** (Phase→Module→Task × tier columns) that renders `deriveVantage` and edits via the `vantage-edits` `plan*` fns through implicit fork-on-edit, then delete the dead gating-era modules.

**Architecture:** The logic layer is DONE and tested (1a `tier-files.js`, 1b-1 `derive-vantage.js`, 1b-2a `vantage-edits.js`). This phase is the React component layer only: a read-and-edit grid that (a) overlays the hook's in-memory module + scenario drafts onto the canonical bundle, (b) calls `deriveVantage(mergedBundle, sel)` for the view-model, (c) wires every edit affordance to a `plan*` fn and persists the returned draft writes/deletes via `useScenarioDrafts`/`useModuleDrafts`. Two pure draft-overlay helpers (`mergeModuleDrafts`, `mergeScenarioDrafts`) currently living in doomed files are relocated to a new `qt-builder/merge-drafts.js` so the rewrite can keep using them after the deletes.

**Tech Stack:** React 19 (hooks, function components), plain JSX (no TS), inline-style objects with CSS custom properties, Vite 7, Vitest. IndexedDB drafts via `useModuleDrafts`/`useScenarioDrafts` → `authoring-db.js`.

## Global Constraints

Copied verbatim from the task brief — every task implicitly includes these:

- **ZERO engine changes.** Do not touch anything under `engine/`. `deriveVantage`/`vantage-edits` only *read* the engine (`findBestMatch`); they are not modified here.
- **NEVER write `applies_when.quality_tier`.** Tier = file identity. Forks add `matches.quality_tier` (handled inside `tier-files.js`); tasks are added as plain `{ task_ref }` entries.
- **Edit in the MAIN checkout** at `C:\Eric_AI_Playground\Claude Code Uni\Claude\tools\paintscope\` — ignore `tools/paintscope/CLAUDE.md`'s "use the elastic-galileo worktree" rule (stale; see memory `feedback_paintscope_main_checkout`).
- **Branch:** `feature/qt-builder-rebuild` @ `67be4085`. **Do NOT push to origin or merge to main** without asking.
- **No component unit tests** (codebase convention — the component has no test; logic is covered by the relocated/existing pure-module tests). The user instruction overrides the TDD skill's default for the *component*; pure modules (`merge-drafts.js`) still get their relocated tests. Verification for the component = `npx vite build` + live-verify.
- **Dev server port = 5173** (Vite default; `tools/paintscope/CLAUDE.md`'s "5177" is stale — `vite.config.js` sets no port). Use whatever URL Vite prints.

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `tools/paintscope/src/components/authoring/qt-builder/merge-drafts.js` | **Create** | Synchronous draft-overlay helpers `mergeModuleDrafts` / `mergeScenarioDrafts` (relocated verbatim). |
| `tools/paintscope/src/components/authoring/qt-builder/__tests__/merge-drafts.test.js` | **Create** | The two relocated merge tests. |
| `tools/paintscope/src/components/authoring/QTBuilder.jsx` | **Rewrite** | The vantage grid component. |
| `tools/paintscope/src/components/authoring/qt-builder/derive-tier-ladder.js` | **Trim** | Keep only `listSubstrates`/`listDimensions`; remove `deriveTierLadder` + its helpers/imports. |
| `tools/paintscope/src/components/authoring/qt-builder/__tests__/derive-tier-ladder.test.js` | **Trim** | Keep only the `listSubstrates / listDimensions` describe (+ its two bundle builders); drop the `deriveTierLadder` describes. |
| `tools/paintscope/src/components/authoring/qt-builder/edit-tier-ladder.js` (+ its `__tests__`) | **Delete** | Gating-era task-toggle compile. |
| `tools/paintscope/src/components/authoring/qt-builder/tier-coats.js` (+ its `__tests__`) | **Delete** | Gating-era per-tier coats. |
| `tools/paintscope/src/components/authoring/qt-builder/tier-rates.js` (+ its `__tests__`) | **Delete** | Gating-era per-tier rates. |
| `tools/paintscope/src/components/authoring/qt-builder/tier-qt-factor.js` (+ its `__tests__`) | **Delete** | Gating-era FAC_QT override. |

**Untouched (kept):** `tier-files.js`, `derive-vantage.js`, `vantage-edits.js` (+ their tests); `ModulePicker.jsx`, `TaskPicker.jsx`; `useModuleDrafts.js`, `useScenarioDrafts.js`; `AuthoringView.jsx` (the `qt` tab id/label and `<QTBuilder />` mount stay exactly as-is — no props).

**Test accounting (hard gate = 0 failures):** baseline 281. Task 1: +2 → 283. Task 3 deletes: edit-tier-ladder −9, tier-coats −12, tier-rates −13, tier-qt-factor −6, derive-tier-ladder trim −11 = −51 → **232**. (Numbers may differ by a few if upstream counts shifted; the gate is **0 failed**, and no test references a deleted module.)

---

## Task 1: Relocate the draft-overlay helpers to `merge-drafts.js`

**Files:**
- Create: `tools/paintscope/src/components/authoring/qt-builder/merge-drafts.js`
- Create test: `tools/paintscope/src/components/authoring/qt-builder/__tests__/merge-drafts.test.js`

**Interfaces:**
- Produces: `mergeModuleDrafts(canonicalModules: object, drafts: Array<{id,status,payload}>) → object` and `mergeScenarioDrafts(canonicalScenarios: array, drafts) → array`. Active statuses: `draft`, `local_override`. Drafts win on id; module merge deep-copies `tasks`; scenario merge replaces canonical by `scenario_id` and appends new ids. (Behavior identical to the doomed copies and to `engine/overlay-loader.js`, but synchronous.)
- Consumed by: Task 2's `QTBuilder.jsx`.

- [ ] **Step 1: Write the relocated test first**

Create `tools/paintscope/src/components/authoring/qt-builder/__tests__/merge-drafts.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { mergeModuleDrafts, mergeScenarioDrafts } from '../merge-drafts.js';

describe('mergeModuleDrafts', () => {
  it('overlays active drafts by id and skips published', () => {
    const canon = { MOD_X: { module_id: 'MOD_X', phase: 'prep', tasks: [] } };
    const drafts = [
      { id: 'MOD_X', status: 'draft', payload: { module_id: 'MOD_X', phase: 'prep', tasks: [{ task_ref: 'TSK_A' }] } },
      { id: 'MOD_Y', status: 'published', payload: { module_id: 'MOD_Y' } },
    ];
    const out = mergeModuleDrafts(canon, drafts);
    expect(out.MOD_X.tasks).toEqual([{ task_ref: 'TSK_A' }]);
    expect(out.MOD_Y).toBeUndefined();
  });
});

describe('mergeScenarioDrafts', () => {
  it('overlays active drafts by scenario_id and appends new; skips published', () => {
    const canon = [{ scenario_id: 'A', v: 1 }, { scenario_id: 'B', v: 1 }];
    const drafts = [
      { id: 'A', status: 'draft', payload: { scenario_id: 'A', v: 2 } },
      { id: 'C', status: 'draft', payload: { scenario_id: 'C', v: 1 } },
      { id: 'B', status: 'published', payload: { scenario_id: 'B', v: 9 } },
    ];
    const out = mergeScenarioDrafts(canon, drafts);
    expect(out.find(s => s.scenario_id === 'A').v).toBe(2);
    expect(out.find(s => s.scenario_id === 'B').v).toBe(1);
    expect(out.find(s => s.scenario_id === 'C').v).toBe(1);
    expect(out).toHaveLength(3);
  });
});
```

- [ ] **Step 2: Run the test, verify it fails (module missing)**

Run: `cd "C:/Eric_AI_Playground/Claude Code Uni/Claude/tools/paintscope" && npx vitest run src/components/authoring/qt-builder/__tests__/merge-drafts.test.js`
Expected: FAIL — `Failed to resolve import '../merge-drafts.js'`.

- [ ] **Step 3: Create the module**

Create `tools/paintscope/src/components/authoring/qt-builder/merge-drafts.js`:

```js
// Synchronous draft-overlay helpers for the QT Builder's live view. The async
// loadOverlayBundle (engine/overlay-loader.js) overlays drafts at estimate
// time; the builder needs the same merge synchronously over the hook's
// in-memory drafts so deriveVantage / vantage-edits see edits immediately.
// Drafts win on id; only 'draft' / 'local_override' are active. Relocated
// verbatim from the retired edit-tier-ladder.js (modules) and tier-coats.js
// (scenarios) when the vantage grid replaced the gating ladder.

const ACTIVE_DRAFT = new Set(['draft', 'local_override']);

export function mergeModuleDrafts(canonicalModules, drafts) {
  const out = { ...(canonicalModules || {}) };
  for (const d of drafts || []) {
    if (d && d.payload && ACTIVE_DRAFT.has(d.status)) out[d.id] = { ...d.payload, tasks: [...(d.payload.tasks || [])] };
  }
  return out;
}

export function mergeScenarioDrafts(canonicalScenarios, drafts) {
  const active = (drafts || []).filter(d => d && d.payload && ACTIVE_DRAFT.has(d.status));
  const draftIds = new Set(active.map(d => d.id));
  const out = [];
  for (const s of canonicalScenarios || []) {
    if (!draftIds.has(s.scenario_id)) out.push(s);
  }
  for (const d of active) out.push(d.payload);
  return out;
}
```

- [ ] **Step 4: Run the test, verify it passes**

Run: `cd "C:/Eric_AI_Playground/Claude Code Uni/Claude/tools/paintscope" && npx vitest run src/components/authoring/qt-builder/__tests__/merge-drafts.test.js`
Expected: PASS — 2 passed.

- [ ] **Step 5: Run the full suite (confirm nothing broke; count is now +2)**

Run: `cd "C:/Eric_AI_Playground/Claude Code Uni/Claude/tools/paintscope" && npx vitest run`
Expected: all pass, 0 failed (≈283; the originals in `edit-tier-ladder.js`/`tier-coats.js` still exist — duplication is intentional and temporary).

- [ ] **Step 6: Commit**

```bash
git add tools/paintscope/src/components/authoring/qt-builder/merge-drafts.js tools/paintscope/src/components/authoring/qt-builder/__tests__/merge-drafts.test.js
git commit -m "refactor(qt-builder): relocate draft-overlay helpers to merge-drafts.js"
```

---

## Task 2: Rewrite `QTBuilder.jsx` as the vantage grid

**Files:**
- Rewrite (full replace): `tools/paintscope/src/components/authoring/QTBuilder.jsx`

**Interfaces:**
- Consumes: `deriveVantage(bundle, sel)` (returns `{ tiers, served, scenarioByTier, isForkByTier, phaseGroups }` — see `derive-vantage.js`); `planAddTask/planRemoveTask/planAddModule/planRemoveModule/planSetCoats/planRevertTier(mergedBundle, sel, …)` (each returns `{ scenario?, module? }`, `{ deleteScenarioId, deleteModuleIds }`, or `{}`); `mergeModuleDrafts`/`mergeScenarioDrafts` (Task 1); `listSubstrates`/`listDimensions`; hooks `useModuleDrafts`/`useScenarioDrafts` (expose `{ drafts, save, remove }`); `ModulePicker` (inline; `{ drafts, value, onChange, height }`, calls `onChange([...value, id])`); `TaskPicker` (modal; `{ open, onClose, onPick, phaseHint }`).
- Produces: same default export `QTBuilder` (no props) mounted by `AuthoringView.jsx` on the `qt` tab — signature unchanged.

**View-model → grid mapping (reference while reading the code):**
- Columns: `vm.tiers` (QT2–QT5). Header per tier: `n/a` if not served, else `forked` + a `revert` link if `vm.isForkByTier[t]`, else `baseline`.
- Module cell `vm.phaseGroups[].modules[].cells[t]` = `{ moduleId, count, state }`, `state ∈ shared|forked|added|absent|na`.
- Task cell `…modules[].tasks[].cells[t]` = `present|added|absent|na`.
- Edit affordances are **tier-column-targeted** (every `plan*` op takes a tier `T`): present module cells carry the coats `×N` stepper (apply/finish phases) + a `×` remove; absent module cells carry a `+` (add that base module at the tier); task cells toggle (present/added → remove, absent → add); a `+ task` sub-row per module and a `+ module` sub-row per phase open the pickers with the clicked tier column as `T`. *(This realizes the spec's "per-module + task / per-phase + module / per-cell ×" — the column you click is the tier, removing all ambiguity about which tier an add targets.)*

- [ ] **Step 1: Replace the file contents**

Overwrite `tools/paintscope/src/components/authoring/QTBuilder.jsx` with exactly:

```jsx
// QT Builder — vantage grid (file-naming tier model). Pick Substrate / Method /
// From-state / Coating; the grid lays out Phase → Module → Task with the
// quality tiers as columns. Editing a tier still served by the baseline
// implicitly forks that tier's scenario (and a module, for task edits), then
// applies the change — so a genuinely shared file is never mutated in place.
// All edits autosave as scenario/module drafts and go live via the overlay;
// publish from the Drafts tab. View-model in ./qt-builder/derive-vantage.js;
// edit orchestration in ./qt-builder/vantage-edits.js (both pure, tested).

import { Fragment, useMemo, useState, useRef } from 'react';
import bundle from '../../data/scenario-bundle.gen.js';
import { listSubstrates, listDimensions } from './qt-builder/derive-tier-ladder.js';
import { deriveVantage } from './qt-builder/derive-vantage.js';
import {
  planAddTask, planRemoveTask, planAddModule,
  planRemoveModule, planSetCoats, planRevertTier,
} from './qt-builder/vantage-edits.js';
import { mergeModuleDrafts, mergeScenarioDrafts } from './qt-builder/merge-drafts.js';
import TaskPicker from './TaskPicker.jsx';
import ModulePicker from './ModulePicker.jsx';
import { useModuleDrafts } from '../../hooks/useModuleDrafts.js';
import { useScenarioDrafts } from '../../hooks/useScenarioDrafts.js';

function humanize(s) {
  if (!s) return '';
  return String(s).replace(/^SS_/, '').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

const isActive = (d) => d.status === 'draft' || d.status === 'local_override';
const COAT_PHASES = new Set(['apply', 'finish']);

export default function QTBuilder() {
  const { drafts: moduleDrafts, save: saveModule, remove: removeModule } = useModuleDrafts();
  const { drafts: scenarioDrafts, save: saveScenario, remove: removeScenario } = useScenarioDrafts();

  const substrates = useMemo(() => listSubstrates(bundle), []);
  const [substrate, setSubstrate] = useState(substrates[0] || '');
  const dims = useMemo(() => listDimensions(bundle, substrate), [substrate]);
  const [method, setMethod] = useState('');
  const [fromState, setFromState] = useState('');
  const [coating, setCoating] = useState('');

  const effMethod = dims.methods.includes(method) ? method : (dims.methods[0] || '');
  const effState = dims.states.includes(fromState) ? fromState : (dims.states[0] || '');
  const effCoating = dims.coatings.includes(coating)
    ? coating
    : (dims.coatings.includes('paint') ? 'paint' : (dims.coatings[0] || ''));

  // Merge active module + scenario drafts over canonical so edits show live.
  const mergedBundle = useMemo(
    () => ({
      ...bundle,
      modules: mergeModuleDrafts(bundle.modules, moduleDrafts),
      scenarios: mergeScenarioDrafts(bundle.scenarios, scenarioDrafts),
    }),
    [moduleDrafts, scenarioDrafts]
  );

  const sel = { paintable_item: substrate, application_method: effMethod, substrate_state: effState, coating_type: effCoating };

  const vm = useMemo(() => {
    if (!substrate || !effMethod || !effState) return null;
    return deriveVantage(mergedBundle, sel);
  }, [mergedBundle, substrate, effMethod, effState, effCoating]);

  const activeDraftCount = moduleDrafts.filter(isActive).length + scenarioDrafts.filter(isActive).length;
  const busyRef = useRef(false);
  const [busy, setBusy] = useState(false);
  const [taskPicker, setTaskPicker] = useState(null);     // { tier, baseModuleId, phase }
  const [modulePicker, setModulePicker] = useState(null); // { tier }

  // Persist a vantage-edits plan: save its scenario/module drafts, or delete on revert.
  async function persist(plan) {
    if (!plan) return;
    if (plan.module) await saveModule({ id: plan.module.module_id, payload: plan.module, status: 'draft' });
    if (plan.scenario) await saveScenario({ id: plan.scenario.scenario_id, payload: plan.scenario, status: 'draft' });
    if (plan.deleteScenarioId) {
      await removeScenario(plan.deleteScenarioId);
      for (const mid of plan.deleteModuleIds || []) await removeModule(mid);
    }
  }

  async function run(makePlan) {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true);
    try { await persist(makePlan()); }
    catch (e) { console.error('QT Builder: edit failed', e); }
    finally { busyRef.current = false; setBusy(false); }
  }

  const tiers = vm?.tiers || [];
  const isServed = (t) => (vm?.served || []).includes(t);

  function pickTask(task_id) {
    if (!taskPicker) return;
    const { tier, baseModuleId } = taskPicker;
    run(() => planAddTask(mergedBundle, sel, tier, baseModuleId, task_id));
    setTaskPicker(null);
  }

  function pickModule(moduleId) {
    if (!modulePicker) return;
    const { tier } = modulePicker;
    run(() => planAddModule(mergedBundle, sel, tier, moduleId));
    setModulePicker(null);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Finder */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap', alignItems: 'end' }}>
        <label style={labelStyle}>Substrate
          <select value={substrate} onChange={e => setSubstrate(e.target.value)} style={{ ...inputStyle, width: 200 }}>
            {substrates.map(s => <option key={s} value={s}>{humanize(s)}</option>)}
          </select>
        </label>
        <label style={labelStyle}>Method
          <select value={effMethod} onChange={e => setMethod(e.target.value)} style={{ ...inputStyle, width: 150 }}>
            {dims.methods.map(m => <option key={m} value={m}>{humanize(m)}</option>)}
          </select>
        </label>
        <label style={labelStyle}>From state
          <select value={effState} onChange={e => setFromState(e.target.value)} style={{ ...inputStyle, width: 150 }}>
            {dims.states.map(s => <option key={s} value={s}>{humanize(s)}</option>)}
          </select>
        </label>
        {dims.coatings.length > 1 && (
          <label style={labelStyle}>Coating
            <select value={effCoating} onChange={e => setCoating(e.target.value)} style={{ ...inputStyle, width: 130 }}>
              {dims.coatings.map(c => <option key={c} value={c}>{humanize(c)}</option>)}
            </select>
          </label>
        )}
      </div>

      {activeDraftCount > 0 && (
        <div style={bannerStyle}>
          {activeDraftCount} draft{activeDraftCount === 1 ? '' : 's'} — live in estimates now. Publish from the Drafts tab.
        </div>
      )}

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 8, fontSize: 11, color: 'var(--text-muted)', flexWrap: 'wrap' }}>
        <span><b style={{ color: 'var(--text)' }}>✓</b> shared (baseline)</span>
        <span><b style={{ color: 'var(--accent, #82aaff)' }}>✓</b> forked / added at tier</span>
        <span><b style={{ color: 'var(--accent, #82aaff)' }}>+</b> add here</span>
        <span><b>·</b> absent</span>
        <span><b>—</b> tier not served</span>
        <span style={{ marginLeft: 'auto', fontStyle: 'italic' }}>editing a baseline tier forks it automatically</span>
      </div>

      <div style={{ flex: 1, overflow: 'auto', border: '1px solid var(--border)', borderRadius: 3 }}>
        {!vm ? (
          <div style={emptyStyle}>Pick a substrate, method, and state.</div>
        ) : vm.phaseGroups.length === 0 ? (
          <div style={emptyStyle}>No scenario matched this combination.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr style={{ background: 'rgba(0,0,0,0.2)', position: 'sticky', top: 0, zIndex: 1 }}>
                <th style={{ ...thStyle, textAlign: 'left', width: 340 }}>Phase · Module · Task</th>
                {tiers.map(t => (
                  <th key={t} style={thStyle}>
                    {t}
                    {!isServed(t)
                      ? <div style={tierTagNa}>n/a</div>
                      : vm.isForkByTier[t]
                        ? <div style={tierTagFork}>forked&nbsp;
                            <span onClick={() => !busy && run(() => planRevertTier(mergedBundle, sel, t))}
                                  title="Delete this tier's fork, revert to baseline" style={revertLink}>revert</span>
                          </div>
                        : <div style={tierTagBase}>baseline</div>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {vm.phaseGroups.map(group => (
                <Fragment key={group.phase}>
                  <tr><td colSpan={tiers.length + 1} style={phaseStyle}>{humanize(group.phase)}</td></tr>
                  {group.modules.map(row => (
                    <Fragment key={row.baseModuleId}>
                      {/* Module row */}
                      <tr style={{ borderTop: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)' }}>
                        <td style={{ padding: '6px 10px', textAlign: 'left' }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10 }}>{row.baseModuleId}</span>
                          <span style={{ color: 'var(--text-muted)', marginLeft: 8 }}>{row.name}</span>
                        </td>
                        {tiers.map(t => {
                          const c = row.cells[t];
                          if (c.state === 'na') return <td key={t} style={cellStyle}><span style={mutedGlyph}>—</span></td>;
                          if (c.state === 'absent') return (
                            <td key={t} style={cellStyle}>
                              <button title="Add this module at this tier" disabled={busy}
                                onClick={() => run(() => planAddModule(mergedBundle, sel, t, row.baseModuleId))}
                                style={addCellBtn}>+</button>
                            </td>
                          );
                          const accent = c.state === 'forked' || c.state === 'added';
                          const color = accent ? 'var(--accent, #82aaff)' : 'var(--text)';
                          const repeatable = COAT_PHASES.has(row.phase);
                          return (
                            <td key={t} style={cellStyle}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}>
                                {repeatable ? (
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                                    <button style={{ ...stepBtn, opacity: busy || c.count <= 1 ? 0.4 : 1 }} disabled={busy || c.count <= 1} title="Fewer coats"
                                      onClick={() => run(() => planSetCoats(mergedBundle, sel, t, row.baseModuleId, c.count - 1))}>−</button>
                                    <b style={{ color }} title={c.state}>×{c.count}</b>
                                    <button style={{ ...stepBtn, opacity: busy ? 0.4 : 1 }} disabled={busy} title="More coats"
                                      onClick={() => run(() => planSetCoats(mergedBundle, sel, t, row.baseModuleId, c.count + 1))}>+</button>
                                  </span>
                                ) : (
                                  <b style={{ color }} title={c.state}>✓{c.count > 1 ? `×${c.count}` : ''}</b>
                                )}
                                <button title={repeatable && c.count > 1 ? 'Remove one coat at this tier' : 'Remove this module at this tier'}
                                  disabled={busy}
                                  onClick={() => run(() => planRemoveModule(mergedBundle, sel, t, row.baseModuleId))}
                                  style={removeBtn}>×</button>
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                      {/* Task rows */}
                      {row.tasks.map(task => (
                        <tr key={task.task_ref}>
                          <td style={{ padding: '3px 10px 3px 26px', textAlign: 'left' }}>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)' }}>{task.task_ref}</span>
                            <span style={{ color: 'var(--text-muted)', marginLeft: 6 }}>{task.name}</span>
                          </td>
                          {tiers.map(t => {
                            const state = task.cells[t];
                            if (state === 'na') return <td key={t} style={cellStyle}><span style={mutedGlyph}>—</span></td>;
                            if (state === 'absent') return (
                              <td key={t} style={cellStyle}>
                                <button title="Add this task at this tier" disabled={busy}
                                  onClick={() => run(() => planAddTask(mergedBundle, sel, t, row.baseModuleId, task.task_ref))}
                                  style={addCellBtn}>+</button>
                              </td>
                            );
                            const added = state === 'added';
                            return (
                              <td key={t} style={cellStyle}>
                                <button title="Remove this task at this tier" disabled={busy}
                                  onClick={() => run(() => planRemoveTask(mergedBundle, sel, t, row.baseModuleId, task.task_ref))}
                                  style={{ ...cellToggle, color: added ? 'var(--accent, #82aaff)' : 'var(--text)', fontWeight: added ? 600 : 400 }}>✓</button>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                      {/* + task sub-row (tier-column targeted) */}
                      <tr>
                        <td style={addSubRowLabel}>+ task</td>
                        {tiers.map(t => (
                          <td key={t} style={cellStyle}>
                            {isServed(t)
                              ? <button title={`Add a library task to ${row.baseModuleId} at ${t}`} disabled={busy}
                                  onClick={() => setTaskPicker({ tier: t, baseModuleId: row.baseModuleId, phase: row.phase })}
                                  style={addCellBtn}>+</button>
                              : <span style={mutedGlyph}>—</span>}
                          </td>
                        ))}
                      </tr>
                    </Fragment>
                  ))}
                  {/* + module sub-row (tier-column targeted) */}
                  <tr style={{ borderTop: '1px solid var(--border)' }}>
                    <td style={addSubRowLabel}>+ module ({humanize(group.phase)})</td>
                    {tiers.map(t => (
                      <td key={t} style={cellStyle}>
                        {isServed(t)
                          ? <button title={`Add a library module at ${t}`} disabled={busy}
                              onClick={() => setModulePicker({ tier: t })}
                              style={addCellBtn}>+</button>
                          : <span style={mutedGlyph}>—</span>}
                      </td>
                    ))}
                  </tr>
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <TaskPicker open={!!taskPicker} phaseHint={taskPicker?.phase} onClose={() => setTaskPicker(null)} onPick={pickTask} />

      {modulePicker && (
        <div onClick={() => setModulePicker(null)} style={modalBackdrop}>
          <div onClick={e => e.stopPropagation()} style={modalPanel}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <h3 style={{ margin: 0, fontSize: 14 }}>Add a module at {modulePicker.tier}</h3>
              <button className="btn btn-sm" onClick={() => setModulePicker(null)} style={{ fontSize: 11 }}>Close</button>
            </div>
            <ModulePicker drafts={moduleDrafts} value={[]} height={360}
              onChange={arr => { const id = arr[arr.length - 1]; if (id) pickModule(id); }} />
          </div>
        </div>
      )}
    </div>
  );
}

const labelStyle = { display: 'flex', flexDirection: 'column', fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' };
const inputStyle = { padding: '4px 6px', fontSize: 11, background: 'var(--bg-input, #222)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 3 };
const thStyle = { padding: '8px 10px', fontSize: 10, textTransform: 'uppercase', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' };
const phaseStyle = { padding: '6px 10px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)', background: 'rgba(0,0,0,0.15)' };
const bannerStyle = { marginBottom: 10, padding: '6px 10px', fontSize: 11, color: 'var(--text)', background: 'rgba(130,170,255,0.08)', border: '1px solid var(--border)', borderRadius: 4 };
const emptyStyle = { padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 };
const cellStyle = { textAlign: 'center', padding: '4px 6px', userSelect: 'none' };
const mutedGlyph = { color: 'var(--text-muted)' };
const stepBtn = { fontSize: 12, lineHeight: 1, padding: '0 6px', cursor: 'pointer', background: 'var(--bg-input, #222)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 3 };
const addCellBtn = { fontSize: 12, lineHeight: 1, padding: '0 7px', cursor: 'pointer', background: 'transparent', color: 'var(--accent, #82aaff)', border: '1px dashed var(--border)', borderRadius: 3 };
const removeBtn = { fontSize: 11, lineHeight: 1, marginLeft: 2, padding: '0 4px', cursor: 'pointer', background: 'transparent', color: 'var(--text-muted)', border: 'none' };
const cellToggle = { fontSize: 12, lineHeight: 1, padding: '0 7px', cursor: 'pointer', background: 'transparent', border: 'none' };
const addSubRowLabel = { padding: '2px 10px 4px 26px', textAlign: 'left', fontSize: 10, color: 'var(--text-muted)' };
const tierTagNa = { fontSize: 8, fontWeight: 400, color: 'var(--text-muted)', textTransform: 'none' };
const tierTagBase = { fontSize: 8, fontWeight: 400, color: 'var(--text-muted)', textTransform: 'none' };
const tierTagFork = { fontSize: 8, fontWeight: 400, color: 'var(--accent, #82aaff)', textTransform: 'none' };
const revertLink = { cursor: 'pointer', textDecoration: 'underline' };
const modalBackdrop = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' };
const modalPanel = { width: 560, maxWidth: '92vw', maxHeight: '80vh', overflow: 'auto', background: 'var(--bg-panel, #1a1a1a)', border: '1px solid var(--border)', borderRadius: 6, padding: 16 };
```

- [ ] **Step 2: Build (the component gate — no unit test by design)**

Run: `cd "C:/Eric_AI_Playground/Claude Code Uni/Claude/tools/paintscope" && npx vite build`
Expected: build succeeds, 0 errors. (Module count in the log is informational — it should be in the ~250+ range, NOT ~167.) Dead modules still exist (deleted in Task 3); they're simply no longer imported by `QTBuilder.jsx`.

- [ ] **Step 3: Full suite still green**

Run: `cd "C:/Eric_AI_Playground/Claude Code Uni/Claude/tools/paintscope" && npx vitest run`
Expected: all pass, 0 failed (still ≈283 — no tests changed this task).

- [ ] **Step 4: Commit**

```bash
git add tools/paintscope/src/components/authoring/QTBuilder.jsx
git commit -m "feat(qt-builder): vantage-grid rewrite — deriveVantage render + vantage-edits wiring"
```

---

## Task 3: Delete the dead gating-era modules + trim the finder module

**Files:**
- Trim: `tools/paintscope/src/components/authoring/qt-builder/derive-tier-ladder.js`
- Trim: `tools/paintscope/src/components/authoring/qt-builder/__tests__/derive-tier-ladder.test.js`
- Delete: `qt-builder/edit-tier-ladder.js`, `qt-builder/tier-coats.js`, `qt-builder/tier-rates.js`, `qt-builder/tier-qt-factor.js`
- Delete: `qt-builder/__tests__/edit-tier-ladder.test.js`, `…/tier-coats.test.js`, `…/tier-rates.test.js`, `…/tier-qt-factor.test.js`

**Interfaces:**
- After this task, `derive-tier-ladder.js` exports ONLY `listSubstrates`/`listDimensions` (signatures unchanged). No other module references the deleted files (verified: grep showed only `QTBuilder.jsx` + the deleted-modules' own tests imported them, and `QTBuilder.jsx` was rewritten in Task 2).

- [ ] **Step 1: Trim `derive-tier-ladder.js` to the finder helpers**

Overwrite `tools/paintscope/src/components/authoring/qt-builder/derive-tier-ladder.js` with exactly:

```js
// Finder helpers for the QT Builder: the substrate list and the
// method / state / coating dimensions for a chosen substrate. (The former
// per-tier ladder view-model that lived here was removed in Phase 1b-2b when
// the vantage grid replaced it; see derive-vantage.js for the current model.)

function uniqSorted(set) { return [...set].sort(); }

export function listSubstrates(bundle, { domain = 'interior' } = {}) {
  const set = new Set();
  for (const s of bundle.scenarios || []) {
    if (domain && s.domain && s.domain !== domain) continue;
    const pi = s.matches?.paintable_item;
    if (pi) set.add(pi);
  }
  return uniqSorted(set);
}

export function listDimensions(bundle, paintable_item) {
  const methods = new Set();
  const states = new Set();
  const coatings = new Set();
  for (const s of bundle.scenarios || []) {
    if (s.matches?.paintable_item !== paintable_item) continue;
    const m = s.matches?.application_method;
    if (Array.isArray(m)) m.forEach(x => x && methods.add(x)); else if (m) methods.add(m);
    const st = s.matches?.substrate_state;
    if (Array.isArray(st)) st.forEach(x => x && states.add(x)); else if (st) states.add(st);
    const ct = s.matches?.coating_type;
    if (Array.isArray(ct)) ct.forEach(x => x && coatings.add(x)); else if (ct) coatings.add(ct);
  }
  return { methods: uniqSorted(methods), states: uniqSorted(states), coatings: uniqSorted(coatings) };
}
```

- [ ] **Step 2: Trim `derive-tier-ladder.test.js` to the finder describe**

Overwrite `tools/paintscope/src/components/authoring/qt-builder/__tests__/derive-tier-ladder.test.js` with exactly:

```js
import { describe, it, expect } from 'vitest';
import { listSubstrates, listDimensions } from '../derive-tier-ladder.js';

// One multi-tier scenario.
function multiTierBundle() {
  return {
    scenarios: [{
      scenario_id: 'SCN_MULTI', domain: 'interior',
      matches: { paintable_item: 'widget', application_method: 'brush', substrate_state: ['SS_BARE'], quality_tier: ['QT3', 'QT4', 'QT5'], coating_type: 'paint' },
      modules: ['MOD_PREP_W', 'MOD_FIN_W'],
    }],
    modules: {},
    tasks: {},
    modifiers: {},
  };
}

// Separate per-tier scenario files for one substrate.
function perTierFilesBundle() {
  return {
    scenarios: [
      { scenario_id: 'SCN_CAB_QT3', domain: 'interior', matches: { paintable_item: 'cab', application_method: 'spray', substrate_state: ['SS_BARE'], quality_tier: 'QT3', coating_type: 'paint' }, modules: ['MOD_BASE'] },
      { scenario_id: 'SCN_CAB_QT5', domain: 'interior', matches: { paintable_item: 'cab', application_method: 'spray', substrate_state: ['SS_BARE'], quality_tier: 'QT5', coating_type: 'paint' }, modules: ['MOD_BASE', 'MOD_EXTRA'] },
    ],
    modules: {},
    tasks: {},
    modifiers: {},
  };
}

describe('listSubstrates / listDimensions', () => {
  it('lists distinct interior substrates', () => {
    expect(listSubstrates(multiTierBundle())).toEqual(['widget']);
  });
  it('lists distinct methods, states, coatings for a substrate', () => {
    const d = listDimensions(perTierFilesBundle(), 'cab');
    expect(d.methods).toEqual(['spray']);
    expect(d.states).toEqual(['SS_BARE']);
    expect(d.coatings).toEqual(['paint']);
  });
});
```

- [ ] **Step 3: Delete the four dead modules + their four tests**

```bash
cd "C:/Eric_AI_Playground/Claude Code Uni/Claude"
git rm tools/paintscope/src/components/authoring/qt-builder/edit-tier-ladder.js \
       tools/paintscope/src/components/authoring/qt-builder/tier-coats.js \
       tools/paintscope/src/components/authoring/qt-builder/tier-rates.js \
       tools/paintscope/src/components/authoring/qt-builder/tier-qt-factor.js \
       tools/paintscope/src/components/authoring/qt-builder/__tests__/edit-tier-ladder.test.js \
       tools/paintscope/src/components/authoring/qt-builder/__tests__/tier-coats.test.js \
       tools/paintscope/src/components/authoring/qt-builder/__tests__/tier-rates.test.js \
       tools/paintscope/src/components/authoring/qt-builder/__tests__/tier-qt-factor.test.js
```

- [ ] **Step 4: Confirm no dangling references**

Run: `cd "C:/Eric_AI_Playground/Claude Code Uni/Claude" && git grep -nE "edit-tier-ladder|tier-coats|tier-rates|tier-qt-factor|deriveTierLadder" -- tools/paintscope/src`
Expected: **no output** (zero matches). If anything prints, fix it before continuing.

- [ ] **Step 5: Full suite green at the new count**

Run: `cd "C:/Eric_AI_Playground/Claude Code Uni/Claude/tools/paintscope" && npx vitest run`
Expected: all pass, **0 failed** (≈232; the qt-builder suite is now `tier-files` + `derive-vantage` + `vantage-edits` + `merge-drafts` + the trimmed `derive-tier-ladder`).

- [ ] **Step 6: Build green**

Run: `cd "C:/Eric_AI_Playground/Claude Code Uni/Claude/tools/paintscope" && npx vite build`
Expected: build succeeds, 0 errors.

- [ ] **Step 7: Commit**

```bash
git add -A tools/paintscope/src/components/authoring/qt-builder
git commit -m "chore(qt-builder): delete dead gating-era modules; trim derive-tier-ladder to finder helpers"
```

---

## Task 4: Live-verify

No code; manual verification per the task brief. Use the Playwright MCP (`mcp__plugin_playwright_playwright__*`) against the dev server, as in prior phases.

- [ ] **Step 1: Start the dev server (background)**

Run (background): `cd "C:/Eric_AI_Playground/Claude Code Uni/Claude/tools/paintscope" && npm run dev`
Note the URL Vite prints (expected `http://localhost:5173`).

- [ ] **Step 2: Open the app, enable admin, reload**

Navigate to the printed URL. In the page context run `localStorage.setItem('paintscope.admin','1')`, then reload so `AuthoringView` mounts.

- [ ] **Step 3: Load the McLeod test project**

Load the **McLeod** project (from the project list / setup screen) so the estimate has real substrates to price.

- [ ] **Step 4: Open QT Builder and verify the grid renders**

Go to Authoring → **QT Builder**. Pick a substrate that has a meaningful structure (e.g. `arch_element`, method `brush`, from `bare`). Confirm:
  - The grid shows **Phase → Module → Task** rows with **QT2–QT5** columns.
  - Tier headers show `baseline` / `forked` / `n/a` correctly; cells show ✓ (shared), `·` (absent), `—` (na), `+` (add), and `×N` steppers on apply/finish module cells.
  - Console: **0 errors**.

- [ ] **Step 5: Verify fork-on-edit creates a draft and the grid reflects it**

On a **baseline** tier (e.g. QT5), click a `+ task` cell → pick a library task (or toggle an absent task/module cell, or bump a coats `×N`). Confirm:
  - The **draft banner** appears ("N drafts — live in estimates now").
  - The edited tier's header flips to **`forked`** with a **`revert`** link; the edited cell turns accent-colored / reflects the change.
  - Other tiers are unchanged (the shared file was not mutated in place).

- [ ] **Step 6: Verify the estimate changes for that tier**

With the project quality tier set to the forked tier, confirm the estimate (hours/$) for that substrate **changes** vs. before the edit (the overlay feeds `loadOverlayBundle` → the real estimate path). Switching the project to a still-baseline tier shows the unchanged estimate.

- [ ] **Step 7: Verify revert reclaims baseline**

Click **`revert`** on the forked tier. Confirm the fork's scenario draft (and any `_QT<n>` module drafts) are deleted, the header returns to `baseline`, the cell returns to its shared state, and the estimate returns to baseline. Console: **0 errors**.

- [ ] **Step 8: Stop the dev server.** Report results (what was exercised, the before/after estimate numbers, console state). No commit.

---

## Self-Review (completed during planning)

- **Spec coverage:** §3 view-model — rendered as the grid (Task 2). §4 cell states — all five module states + four task states rendered. §5.1 finder — `listSubstrates`/`listDimensions` selects. §5.2 legend + draft banner — present. §5.3 grid (phase bands, module rows, nested task rows, forked-column header tag) — present (table form; the spec's `grid-template-columns` is illustrative, table matches the existing component pattern). §5.4 affordances — `+ task` (per-module sub-row), `+ module` (per-phase sub-row), per-cell `×`, coats `×N` stepper, per-forked-tier `revert` link — all present. §6 edit flow — every handler routes through a `plan*` fn via `run`/`persist` (fork-on-edit lives in `vantage-edits.js`). §7 reuse + dead-code cleanup — pickers/hooks/finder/merge-helpers reused; four modules + `deriveTierLadder` deleted (Task 3). §8 testing — merge-drafts unit tests relocated; engine/parity untouched; manual live-verify (Task 4). §9 files — matches the File Structure table.
- **Placeholder scan:** none — every code step is a complete file or exact command.
- **Type consistency:** `plan*` fns return `{ scenario?, module? }` / `{ deleteScenarioId, deleteModuleIds }` / `{}` → `persist` handles all three; `saveModule`/`saveScenario` take `{ id, payload, status }`, `remove*` take an id — matches the hooks. `deriveVantage` field names (`tiers`, `served`, `isForkByTier`, `phaseGroups[].modules[].cells[t].{moduleId,count,state}`, `…tasks[].cells[t]`) match `derive-vantage.js` exactly.
- **Judgment calls flagged for the user:** (1) merge helpers relocated to a NEW `merge-drafts.js` (keeps `tier-files.js` pure; `loadOverlayBundle` is async so it can't substitute in the sync memo). (2) Add affordances are tier-column-targeted sub-rows (`+ task` per module, `+ module` per phase, each with a `+` per served-tier column) — this resolves the "which tier does a library-add target" ambiguity the spec leaves open.
