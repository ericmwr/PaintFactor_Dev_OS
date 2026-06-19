# QT Builder — Phase 2b: Ladder Editing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the QT Builder ladder editable — click a cell to set which tiers a task fires at, and add tasks from the canonical library — with each edit compiling to `applies_when.quality_tier` on the task's module entry and saving as a module draft (live via overlay).

**Architecture:** All editing logic is pure and unit-tested (`edit-tier-ladder.js`); the derivation is extended to expose each row's home module(s) and phase-grouped rows; `QTBuilder.jsx` wires clicks to the pure functions and re-derives from a draft-merged bundle so edits show instantly. No engine changes.

**Tech Stack:** React 19 (plain JSX), Vite, Vitest. Inline styles + CSS vars.

## Global Constraints

- **No TypeScript** — plain `.js`/`.jsx`.
- **No engine changes** — editing rides on the existing `applies_when.quality_tier` mechanics + Phase 1.
- **Compile rule (verbatim):** a task's `applies_when.quality_tier` is the set of tiers it fires at. Toggling writes the explicit served-subset; when the set equals **all served tiers**, remove the `quality_tier` key; when the set is **empty**, remove the task entry. Always **preserve** other `applies_when` keys (e.g. `application_method`).
- **Saves:** module drafts via `useModuleDrafts().save({ id: moduleId, payload: <full module>, status: 'draft' })`. Publishing stays in the existing Drafts tab (no publish UI added here).
- **Only served tiers are editable;** `na` columns are read-only.
- **Component contract:** `export default function QTBuilder()`, no props.
- **Styling:** CSS vars `--text`, `--text-muted`, `--border`, `--accent` (fallback `#82aaff`), `--bg-input` (fallback `#222`), `--bg-panel`, `--font-mono`.
- **Branch:** `feature/qt-builder` (already checked out). Do NOT create/switch branches.
- **Commit trailer:** end every commit message with `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.

**Scope note — Phase 2b of the builder UI.** In: cell toggle, add-task-from-library, draft autosave, blast-radius note, the two deferred 2a refactors (phase-grouped derivation; `state`→`fromState` rename). Out (later sub-phases): per-tier coats/interstage (2c), per-tier rate + modifier-override UI (2d), per-tier materials (2e), creating brand-new canonical tasks, adding to a phase that has no rows yet, and a multi-module "which module?" chooser (defaults to the phase group's primary module).

---

### Task 1: Extend `derive-tier-ladder.js` — per-row `moduleIds` + phase-grouped `groups`

**Files:**
- Modify (full rewrite): `tools/paintscope/src/components/authoring/qt-builder/derive-tier-ladder.js`
- Test: `tools/paintscope/src/components/authoring/qt-builder/__tests__/derive-tier-ladder.test.js` (append cases)

**Interfaces:**
- Consumes: same as Phase 2a (`findBestMatch`, `QT_BUCKETS`, `PHASE_ORDER`).
- Produces: `deriveTierLadder` now also returns `groups: Array<{ phase, rows }>` (contiguous, PHASE_ORDER-sorted) and each row gains `moduleIds: string[]` (distinct modules across served tiers whose `tasks[]` reference the task). Existing fields (`tiers, served, baseline, rows, warnings`) unchanged — additive.

- [ ] **Step 1: Append the failing tests**

Add to `derive-tier-ladder.test.js`:

```javascript
describe('deriveTierLadder — moduleIds + groups (Phase 2b extensions)', () => {
  it('records the home module(s) of each task', () => {
    const l = deriveTierLadder(multiTierBundle(), { paintable_item: 'widget', application_method: 'brush', substrate_state: 'SS_BARE', coating_type: 'paint' });
    expect(l.rows.find(r => r.task_id === 'TSK_CLEAN').moduleIds).toEqual(['MOD_PREP_W']);
    expect(l.rows.find(r => r.task_id === 'TSK_COAT').moduleIds).toEqual(['MOD_FIN_W']);
  });
  it('exposes phase-grouped rows in PHASE_ORDER', () => {
    const l = deriveTierLadder(multiTierBundle(), { paintable_item: 'widget', application_method: 'brush', substrate_state: 'SS_BARE', coating_type: 'paint' });
    expect(l.groups.map(g => g.phase)).toEqual(['prep', 'finish']);
    expect(l.groups[0].rows.map(r => r.task_id)).toEqual(['TSK_CLEAN', 'TSK_DETAIL_SAND']);
    expect(l.groups[1].rows.map(r => r.task_id)).toEqual(['TSK_COAT']);
  });
  it('records the per-tier-file extra-module home', () => {
    const l = deriveTierLadder(perTierFilesBundle(), { paintable_item: 'cab', application_method: 'spray', substrate_state: 'SS_BARE', coating_type: 'paint' });
    expect(l.rows.find(r => r.task_id === 'TSK_TOUCHUP').moduleIds).toEqual(['MOD_EXTRA']);
    expect(l.rows.find(r => r.task_id === 'TSK_SPRAY').moduleIds).toEqual(['MOD_BASE']);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run (from `Claude/tools/paintscope/`): `npx vitest run src/components/authoring/qt-builder`
Expected: FAIL — `moduleIds` is `undefined` and `groups` is `undefined`.

- [ ] **Step 3: Rewrite the file**

Replace `tools/paintscope/src/components/authoring/qt-builder/derive-tier-ladder.js` with:

```javascript
// Pure derivation for the QT Builder's tier ladder. Resolves the governing
// scenario PER quality tier (via the engine matcher) and aligns each tier's
// concrete task set into a ladder. Handles both authoring patterns (one
// multi-tier scenario; separate per-tier scenario files). Phase 2b adds
// per-row home module ids and phase-grouped rows for the editor.

import { findBestMatch } from '../../../engine/scenario-matcher.js';
import { QT_BUCKETS } from '../../../data/quality-tier.js';
import { PHASE_ORDER } from '../../../data/constants.js';

const LADDER_GATE_KEYS = ['quality_tier', 'application_method', 'substrate_state'];

function appliesAtTier(appliesWhen, tierCtx) {
  if (!appliesWhen || typeof appliesWhen !== 'object') return true;
  for (const key of LADDER_GATE_KEYS) {
    if (!(key in appliesWhen)) continue;
    const allowed = appliesWhen[key];
    const arr = Array.isArray(allowed) ? allowed : [allowed];
    if (!arr.includes(tierCtx[key])) return false;
  }
  return true;
}

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

// Resolve one tier's concrete task set → Map<task_id, {name, phase, moduleId, order}>.
function tierTaskSet(bundle, ctx) {
  const { scenario, warnings } = findBestMatch(bundle, ctx);
  if (!scenario) return { scenario: null, tasks: new Map(), warnings: warnings || [] };
  const tasks = new Map();
  let order = 0;
  for (const modId of scenario.modules || []) {
    const mod = bundle.modules?.[modId];
    if (!mod || !Array.isArray(mod.tasks)) continue;
    for (const entry of mod.tasks) {
      const ref = entry?.task_ref;
      if (!ref || tasks.has(ref)) continue;
      if (!appliesAtTier(entry.applies_when, ctx)) continue;
      const t = bundle.tasks?.[ref];
      tasks.set(ref, { name: t?.name || ref, phase: mod.phase || 'apply', moduleId: modId, order: order++ });
    }
  }
  return { scenario, tasks, warnings: warnings || [] };
}

export function deriveTierLadder(bundle, sel) {
  const tiers = [...QT_BUCKETS];
  const perTier = {};
  const warnings = [];

  for (const tier of tiers) {
    const ctx = {
      paintable_item: sel.paintable_item,
      application_method: sel.application_method,
      substrate_state: sel.substrate_state,
      coating_type: sel.coating_type,
      quality_tier: tier,
    };
    const { scenario, tasks, warnings: w } = tierTaskSet(bundle, ctx);
    for (const msg of w) warnings.push(`${tier}: ${msg}`);
    perTier[tier] = scenario ? { scenarioId: scenario.scenario_id, tasks } : null;
  }

  const served = tiers.filter(t => perTier[t]);
  const baseline = perTier['QT3'] ? 'QT3' : (served[0] || null);

  const collectOrder = baseline ? [baseline, ...tiers.filter(t => t !== baseline)] : tiers;
  const taskInfo = new Map();
  const moduleIdsByTask = new Map();
  for (const t of collectOrder) {
    const pt = perTier[t];
    if (!pt) continue;
    for (const [id, info] of pt.tasks) {
      if (!taskInfo.has(id)) taskInfo.set(id, info);
      let set = moduleIdsByTask.get(id);
      if (!set) { set = new Set(); moduleIdsByTask.set(id, set); }
      set.add(info.moduleId);
    }
  }

  const rows = [...taskInfo.entries()].map(([id, info]) => {
    const inBaseline = baseline ? perTier[baseline].tasks.has(id) : false;
    const cells = {};
    for (const t of tiers) {
      const pt = perTier[t];
      if (!pt) { cells[t] = 'na'; continue; }
      cells[t] = pt.tasks.has(id) ? (inBaseline ? 'fires' : 'added') : 'skip';
    }
    return { task_id: id, name: info.name, phase: info.phase, moduleIds: [...moduleIdsByTask.get(id)].sort(), cells, _order: info.order };
  });

  rows.sort((a, b) => {
    const pa = PHASE_ORDER.indexOf(a.phase); const pb = PHASE_ORDER.indexOf(b.phase);
    const pai = pa === -1 ? PHASE_ORDER.length : pa;
    const pbi = pb === -1 ? PHASE_ORDER.length : pb;
    if (pai !== pbi) return pai - pbi;
    return a._order - b._order;
  });
  rows.forEach(r => { delete r._order; });

  const groups = [];
  for (const r of rows) {
    const last = groups[groups.length - 1];
    if (last && last.phase === r.phase) last.rows.push(r);
    else groups.push({ phase: r.phase, rows: [r] });
  }

  return { tiers, served, baseline, rows, groups, warnings };
}
```

- [ ] **Step 4: Run to verify pass + Step 5: full suite**

Run: `npx vitest run src/components/authoring/qt-builder` → PASS (new + existing 2a cases).
Then `npx vitest run` → all green (no regression; additive change).

- [ ] **Step 6: Commit**

```bash
git add tools/paintscope/src/components/authoring/qt-builder/derive-tier-ladder.js tools/paintscope/src/components/authoring/qt-builder/__tests__/derive-tier-ladder.test.js
git commit -m "feat(qt-builder): derivation exposes per-row moduleIds + phase groups

Additive: each ladder row now carries moduleIds (its home module(s)), and
deriveTierLadder returns phase-grouped rows. Foundations for ladder editing.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: `edit-tier-ladder.js` — pure compile + draft-merge

**Files:**
- Create: `tools/paintscope/src/components/authoring/qt-builder/edit-tier-ladder.js`
- Test: `tools/paintscope/src/components/authoring/qt-builder/__tests__/edit-tier-ladder.test.js`

**Interfaces:**
- Produces:
  - `mergeModuleDrafts(canonicalModules, drafts) → modules` — overlay active drafts (`status` in `{'draft','local_override'}`) by id over the canonical modules map.
  - `setTierMembership(module, task_ref, desiredTiers, servedTiers) → module` — returns a NEW module payload with the task's entry gated to `desiredTiers` (subset → explicit list; equals all served → remove `quality_tier` key; empty → remove entry; preserve other `applies_when` keys). No-op (returns input) if the task isn't in the module.
  - `addTaskEntry(module, task_ref, tiers) → module` — returns a NEW module payload with a `{ task_ref, applies_when:{ quality_tier:[...tiers] } }` entry appended (no gate if `tiers` empty/falsy). No-op if the task_ref already present.

- [ ] **Step 1: Write the failing tests**

Create `edit-tier-ladder.test.js`:

```javascript
import { describe, it, expect } from 'vitest';
import { mergeModuleDrafts, setTierMembership, addTaskEntry } from '../edit-tier-ladder.js';

const mod = () => ({
  module_id: 'MOD_X', phase: 'prep',
  tasks: [
    { task_ref: 'TSK_A' },
    { task_ref: 'TSK_B', applies_when: { application_method: ['brush'] } },
  ],
});

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

describe('setTierMembership', () => {
  it('writes an explicit subset when not all served tiers fire', () => {
    const out = setTierMembership(mod(), 'TSK_A', ['QT4', 'QT5'], ['QT3', 'QT4', 'QT5']);
    expect(out.tasks[0]).toEqual({ task_ref: 'TSK_A', applies_when: { quality_tier: ['QT4', 'QT5'] } });
  });
  it('removes the quality_tier key when it fires at all served tiers, preserving other keys', () => {
    const out = setTierMembership(mod(), 'TSK_B', ['QT3', 'QT4', 'QT5'], ['QT3', 'QT4', 'QT5']);
    expect(out.tasks[1]).toEqual({ task_ref: 'TSK_B', applies_when: { application_method: ['brush'] } });
  });
  it('removes the entry entirely when no served tier fires', () => {
    const out = setTierMembership(mod(), 'TSK_A', [], ['QT3', 'QT4', 'QT5']);
    expect(out.tasks.find(t => t.task_ref === 'TSK_A')).toBeUndefined();
    expect(out.tasks).toHaveLength(1);
  });
  it('does not mutate the input module', () => {
    const m = mod();
    setTierMembership(m, 'TSK_A', ['QT5'], ['QT3', 'QT4', 'QT5']);
    expect(m.tasks[0]).toEqual({ task_ref: 'TSK_A' });
  });
  it('is a no-op for a task not in the module', () => {
    const m = mod();
    expect(setTierMembership(m, 'TSK_ZZZ', ['QT5'], ['QT3', 'QT4', 'QT5'])).toBe(m);
  });
});

describe('addTaskEntry', () => {
  it('appends a gated entry', () => {
    const out = addTaskEntry(mod(), 'TSK_NEW', ['QT5']);
    expect(out.tasks[out.tasks.length - 1]).toEqual({ task_ref: 'TSK_NEW', applies_when: { quality_tier: ['QT5'] } });
  });
  it('is a no-op when the task is already present', () => {
    const m = mod();
    expect(addTaskEntry(m, 'TSK_A', ['QT5'])).toBe(m);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/components/authoring/qt-builder` → FAIL (module not found).

- [ ] **Step 3: Write the implementation**

Create `tools/paintscope/src/components/authoring/qt-builder/edit-tier-ladder.js`:

```javascript
// Pure compile helpers for the QT Builder editor. Each returns a NEW module
// payload (never mutates) so callers can save it as a module draft. The tier
// membership of a task is expressed via applies_when.quality_tier — the set of
// tiers it fires at.

const ACTIVE_DRAFT = new Set(['draft', 'local_override']);

export function mergeModuleDrafts(canonicalModules, drafts) {
  const out = { ...(canonicalModules || {}) };
  for (const d of drafts || []) {
    if (d && d.payload && ACTIVE_DRAFT.has(d.status)) out[d.id] = d.payload;
  }
  return out;
}

export function setTierMembership(module, task_ref, desiredTiers, servedTiers) {
  const list = module.tasks || [];
  const idx = list.findIndex(e => e && e.task_ref === task_ref);
  if (idx === -1) return module;

  const tasks = list.map(e => ({ ...e }));
  const desired = new Set(desiredTiers);

  if (desired.size === 0) {
    tasks.splice(idx, 1);
    return { ...module, tasks };
  }

  const entry = { ...tasks[idx] };
  const aw = { ...(entry.applies_when || {}) };
  const firesAllServed = (servedTiers || []).every(t => desired.has(t));
  if (firesAllServed) {
    delete aw.quality_tier;
  } else {
    aw.quality_tier = [...desired].sort();
  }
  if (Object.keys(aw).length === 0) delete entry.applies_when;
  else entry.applies_when = aw;
  tasks[idx] = entry;
  return { ...module, tasks };
}

export function addTaskEntry(module, task_ref, tiers) {
  const list = module.tasks || [];
  if (list.some(e => e && e.task_ref === task_ref)) return module;
  const entry = { task_ref };
  if (tiers && tiers.length) entry.applies_when = { quality_tier: [...tiers].sort() };
  return { ...module, tasks: [...list, entry] };
}
```

- [ ] **Step 4: Run to verify pass + Step 5: full suite**

Run: `npx vitest run src/components/authoring/qt-builder` → PASS.
Then `npx vitest run` → all green.

- [ ] **Step 6: Commit**

```bash
git add tools/paintscope/src/components/authoring/qt-builder/edit-tier-ladder.js tools/paintscope/src/components/authoring/qt-builder/__tests__/edit-tier-ladder.test.js
git commit -m "feat(qt-builder): pure compile helpers for ladder editing

mergeModuleDrafts (overlay active module drafts), setTierMembership (toggle a
task's applies_when.quality_tier with subset/full-remove/empty-remove + key
preservation), addTaskEntry (append a gated entry). Immutable, unit-tested.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: `QTBuilder.jsx` — editable cells (toggle), draft-merged re-derive, blast-radius

**Files:**
- Modify (full rewrite): `tools/paintscope/src/components/authoring/QTBuilder.jsx`

**Interfaces:**
- Consumes: `bundle` (default export of `scenario-bundle.gen.js`); `listSubstrates`, `listDimensions`, `deriveTierLadder` (Task 1); `mergeModuleDrafts`, `setTierMembership` (Task 2); `useModuleDrafts` hook.
- Produces: same no-props contract. Clicking a served-tier cell toggles that tier and autosaves the affected module draft(s); the ladder re-derives from the draft-merged bundle.

- [ ] **Step 1: Replace the file contents**

Overwrite `tools/paintscope/src/components/authoring/QTBuilder.jsx` with:

```jsx
// QT Builder — editable tier ladder (Phase 2b). Pick Substrate / Method /
// State / Coating; click a served-tier cell to toggle whether that task fires
// at that tier. Edits compile to applies_when.quality_tier on the task's
// module entry and autosave as module drafts (live via overlay; publish from
// the Drafts tab). Derivation + compile live in ./qt-builder/*.

import { Fragment, useMemo, useState } from 'react';
import bundle from '../../data/scenario-bundle.gen.js';
import { listSubstrates, listDimensions, deriveTierLadder } from './qt-builder/derive-tier-ladder.js';
import { mergeModuleDrafts, setTierMembership } from './qt-builder/edit-tier-ladder.js';
import { useModuleDrafts } from '../../hooks/useModuleDrafts.js';

function humanize(s) {
  if (!s) return '';
  return String(s).replace(/^SS_/, '').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

const CELL = {
  fires: { icon: '✓', color: 'var(--text)' },
  added: { icon: '+', color: 'var(--accent, #82aaff)' },
  skip:  { icon: '·', color: 'var(--text-muted)' },
  na:    { icon: '—', color: 'var(--text-muted)' },
};

export default function QTBuilder() {
  const { drafts: moduleDrafts, save } = useModuleDrafts();

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

  // Merge active module drafts over canonical so edits appear immediately.
  const mergedBundle = useMemo(
    () => ({ ...bundle, modules: mergeModuleDrafts(bundle.modules, moduleDrafts) }),
    [moduleDrafts]
  );

  const ladder = useMemo(() => {
    if (!substrate || !effMethod || !effState) return null;
    return deriveTierLadder(mergedBundle, {
      paintable_item: substrate, application_method: effMethod,
      substrate_state: effState, coating_type: effCoating,
    });
  }, [mergedBundle, substrate, effMethod, effState, effCoating]);

  const tiers = ladder?.tiers || [];
  const served = ladder?.served || [];

  // Blast radius: how many scenarios reference each module (canonical structure).
  const scenarioRefCount = useMemo(() => {
    const counts = new Map();
    for (const s of bundle.scenarios || []) for (const m of s.modules || []) counts.set(m, (counts.get(m) || 0) + 1);
    return counts;
  }, []);

  const activeDraftCount = moduleDrafts.filter(d => d.status === 'draft' || d.status === 'local_override').length;

  async function toggleCell(row, tier) {
    if (!served.includes(tier)) return;
    const firing = new Set(served.filter(t => row.cells[t] === 'fires' || row.cells[t] === 'added'));
    if (firing.has(tier)) firing.delete(tier); else firing.add(tier);
    const desired = [...firing];
    for (const moduleId of row.moduleIds) {
      const mod = mergedBundle.modules[moduleId];
      if (!mod) continue;
      const updated = setTierMembership(mod, row.task_id, desired, served);
      if (updated !== mod) await save({ id: moduleId, payload: updated, status: 'draft' });
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap', alignItems: 'end' }}>
        <label style={labelStyle}>Substrate
          <select value={substrate} onChange={e => setSubstrate(e.target.value)} style={{ ...inputStyle, width: 180 }}>
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
        <div style={{ fontSize: 10, color: 'var(--text-muted)', paddingBottom: 4 }}>click a served-tier cell to toggle</div>
      </div>

      {activeDraftCount > 0 && (
        <div style={bannerStyle}>
          {activeDraftCount} module draft{activeDraftCount === 1 ? '' : 's'} — live in estimates now. Publish from the Drafts tab.
        </div>
      )}

      <div style={{ display: 'flex', gap: 16, marginBottom: 8, fontSize: 11, color: 'var(--text-muted)' }}>
        <span><b style={{ color: 'var(--text)' }}>✓</b> fires</span>
        <span><b style={{ color: 'var(--accent, #82aaff)' }}>+</b> added at tier</span>
        <span><b>·</b> skipped</span>
        <span><b>—</b> tier not served</span>
      </div>

      <div style={{ flex: 1, overflow: 'auto', border: '1px solid var(--border)', borderRadius: 3 }}>
        {!ladder ? (
          <div style={emptyStyle}>Pick a substrate, method, and state.</div>
        ) : ladder.rows.length === 0 ? (
          <div style={emptyStyle}>No scenario matched this combination.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr style={{ background: 'rgba(0,0,0,0.2)', position: 'sticky', top: 0, zIndex: 1 }}>
                <th style={{ ...thStyle, textAlign: 'left', width: 320 }}>Task</th>
                {tiers.map(t => (
                  <th key={t} style={thStyle}>
                    {t}
                    {t === ladder.baseline && <span style={baselineBadge}>baseline</span>}
                    {!served.includes(t) && <div style={{ fontSize: 8, fontWeight: 400 }}>n/a</div>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ladder.groups.map(group => (
                <Fragment key={group.phase}>
                  <tr><td colSpan={tiers.length + 1} style={phaseStyle}>{humanize(group.phase)}</td></tr>
                  {group.rows.map(r => {
                    const shared = Math.max(1, ...r.moduleIds.map(m => scenarioRefCount.get(m) || 1));
                    return (
                      <tr key={r.task_id} style={{ borderTop: '1px solid var(--border)' }}>
                        <td style={{ padding: '6px 10px', textAlign: 'left' }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10 }}>{r.task_id}</span>
                          <span style={{ color: 'var(--text-muted)', marginLeft: 8 }}>{r.name}</span>
                          {shared > 1 && <span style={sharedBadge} title={`This task's module is shared by ${shared} scenarios — edits affect all of them.`}>shared ×{shared}</span>}
                        </td>
                        {tiers.map(t => {
                          const c = CELL[r.cells[t]] || CELL.na;
                          const editable = served.includes(t);
                          return (
                            <td key={t}
                                onClick={editable ? () => toggleCell(r, t) : undefined}
                                title={editable ? 'Click to toggle this tier' : 'Tier not served'}
                                style={{ textAlign: 'center', padding: '6px 8px', color: c.color, fontWeight: r.cells[t] === 'added' ? 600 : 400, cursor: editable ? 'pointer' : 'default', userSelect: 'none' }}>
                              {c.icon}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {ladder?.warnings?.length > 0 && (
        <div style={{ marginTop: 8, fontSize: 10, color: 'var(--text-muted)' }}>
          {ladder.warnings.length} matcher note(s) — first: {ladder.warnings[0]}
        </div>
      )}
    </div>
  );
}

const labelStyle = { display: 'flex', flexDirection: 'column', fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' };
const inputStyle = { padding: '4px 6px', fontSize: 11, background: 'var(--bg-input, #222)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 3 };
const thStyle = { padding: '8px 10px', fontSize: 10, textTransform: 'uppercase', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' };
const phaseStyle = { padding: '6px 10px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)', background: 'rgba(0,0,0,0.15)' };
const baselineBadge = { marginLeft: 6, fontSize: 8, fontWeight: 400, padding: '0 5px', borderRadius: 8, background: 'rgba(130,170,255,0.2)', color: 'var(--accent, #82aaff)', textTransform: 'none' };
const sharedBadge = { marginLeft: 8, fontSize: 9, padding: '0 5px', borderRadius: 8, border: '1px solid var(--border)', color: 'var(--text-muted)' };
const bannerStyle = { marginBottom: 10, padding: '6px 10px', fontSize: 11, color: 'var(--text)', background: 'rgba(130,170,255,0.08)', border: '1px solid var(--border)', borderRadius: 4 };
const emptyStyle = { padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 };
```

- [ ] **Step 2: Verify the build compiles**

Run (from `Claude/tools/paintscope/`): `npx vite build`
Expected: success, no errors, ~244 modules.

- [ ] **Step 3: Manual browser verification**

Start `npx vite --port 5183 --strictPort`. At `localhost:5183` (enable admin: `localStorage.setItem('paintscope.admin','1')`, reload), Authoring → QT Builder:
1. Pick a substrate (e.g. Cabinet). Click a `✓` cell under QT2's neighbor — wait, QT2 is `n/a`; click a served-tier cell (QT3/QT4/QT5) on a row: it should flip to `·` (skip), and a "1 module draft …" banner appears.
2. Click it again → flips back to `✓`. Toggle a task off at QT3 only → the `+`/`·` states update across the row (e.g. it becomes `added` at the tiers still on).
3. Confirm the "shared ×N" badge appears on rows whose module is shared.
4. No console errors. Record what you observed.

- [ ] **Step 4: Commit**

```bash
git add tools/paintscope/src/components/authoring/QTBuilder.jsx
git commit -m "feat(qt-builder): editable ladder cells (toggle tier membership)

Click a served-tier cell to toggle whether a task fires there; compiles to
applies_when.quality_tier and autosaves the module draft, re-deriving from the
draft-merged bundle. Adds a drafts banner + shared-module blast-radius badge.
Adopts phase-grouped rows; renames state->fromState.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: `QTBuilder.jsx` — add task from the canonical library

**Files:**
- Modify: `tools/paintscope/src/components/authoring/QTBuilder.jsx`

**Interfaces:**
- Consumes: `TaskPicker` (`{ open, onClose, onPick, phaseHint }` — `onPick(task_id)`); `addTaskEntry` (Task 2). Adds a per-phase "+ Add task" affordance; the new task is appended to that phase group's primary module (`group.rows[0].moduleIds[0]`), gated to all served tiers, and autosaved.

- [ ] **Step 1: Add the imports**

In `QTBuilder.jsx`, extend the edit-tier-ladder import and add TaskPicker:

```jsx
import { mergeModuleDrafts, setTierMembership, addTaskEntry } from './qt-builder/edit-tier-ladder.js';
import TaskPicker from './TaskPicker.jsx';
```

- [ ] **Step 2: Add picker state + the add handler**

Inside `QTBuilder()`, after the `toggleCell` function, add:

```jsx
  const [picker, setPicker] = useState(null); // { phase, moduleId } | null

  async function addTask(task_id) {
    if (!picker) return;
    const mod = mergedBundle.modules[picker.moduleId];
    if (mod) {
      const updated = addTaskEntry(mod, task_id, served);
      if (updated !== mod) await save({ id: picker.moduleId, payload: updated, status: 'draft' });
    }
    setPicker(null);
  }
```

- [ ] **Step 3: Render the per-phase add affordance + the picker**

In the `ladder.groups.map(...)`, after the `group.rows.map(...)` block (still inside the `<Fragment>`), add an add-row:

```jsx
                  <tr>
                    <td colSpan={tiers.length + 1} style={addRowStyle}
                        onClick={() => setPicker({ phase: group.phase, moduleId: group.rows[0].moduleIds[0] })}>
                      + Add task to {humanize(group.phase)}…
                    </td>
                  </tr>
```

And just before the component's closing `</div>`, mount the picker:

```jsx
      <TaskPicker open={!!picker} phaseHint={picker?.phase} onClose={() => setPicker(null)} onPick={addTask} />
```

Add the style constant alongside the others:

```jsx
const addRowStyle = { padding: '5px 10px', fontSize: 11, color: 'var(--text-muted)', cursor: 'pointer', borderTop: '1px solid var(--border)' };
```

- [ ] **Step 4: Verify the build compiles**

Run: `npx vite build` → success, no errors.

- [ ] **Step 5: Manual browser verification**

At `localhost:5183` (QT Builder): click "+ Add task to <phase>" on a phase group → the Task picker modal opens → pick a task → modal closes and the task appears in that phase's rows, firing across served tiers (a module draft banner shows). Toggle the new task down to a single tier to confirm the full ascending flow. No console errors. Record observations.

- [ ] **Step 6: Commit**

```bash
git add tools/paintscope/src/components/authoring/QTBuilder.jsx
git commit -m "feat(qt-builder): add tasks to a tier from the canonical library

Per-phase '+ Add task' opens the canonical Task picker; the chosen task is
appended to that phase group's module gated to all served tiers (then trim via
toggle). Autosaves the module draft.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Self-Review

**Spec coverage (design §2–§7):**
- Toggle → `applies_when.quality_tier` (subset / full-remove-key / empty-remove-entry / preserve other keys) → Task 2 `setTierMembership` + tests; wired in Task 3 `toggleCell`. ✓
- No separate delete; empty set removes entry → Task 2 + the toggle path. ✓
- Add task from library, gated, to the phase's module → Task 4 (`addTaskEntry` + TaskPicker). ✓
- Edits live via overlay (draft-merged re-derive) → Task 3 `mergedBundle`. ✓
- Blast-radius note → Task 3 shared badge. Save as module drafts; publish via Drafts tab → Task 3/4 `save`, banner. ✓
- 2a refactors (phase-grouped derivation; `state`→`fromState`) → Task 1 `groups`, Task 3 rename. ✓
- Only served tiers editable → Task 3 `editable` guard. ✓

**Placeholder scan:** No TBD/TODO/"similar to" — full code/edits and exact commands throughout. ✓

**Type/name consistency:** `mergeModuleDrafts`, `setTierMembership(module, task_ref, desiredTiers, servedTiers)`, `addTaskEntry(module, task_ref, tiers)`, row `moduleIds`, `ladder.groups[].rows`, draft `{id, payload, status}` (matches `useModuleDrafts().save`) — consistent across Tasks 1–4 and tests. ✓
