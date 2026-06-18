# QT Builder — Phase 2a: Scaffold + Read-Only Tier Ladder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the prototype QT Builder with a navigable, **read-only** tier ladder: the user picks Substrate → Method → State → Coating, and the tool shows, per quality tier (QT2–QT5), which tasks fire / are added / are skipped — derived from the live scenario bundle.

**Architecture:** All derivation logic lives in one pure, unit-tested module (`derive-tier-ladder.js`); the component (`QTBuilder.jsx`) is a thin presentational consumer. The derivation resolves the governing scenario **per tier** via the engine's `findBestMatch`, then aligns each tier's concrete task set into rows — which transparently handles both scenario-authoring patterns (one multi-tier scenario serving QT3–5, and separate per-tier scenario files).

**Tech Stack:** React 19 (plain JSX, no TS), Vite, Vitest. Inline style objects + CSS custom properties (no Tailwind).

## Global Constraints

- **No TypeScript** — plain `.js`/`.jsx`.
- **Read-only this sub-phase** — no editing, no draft writes, no engine changes. Just navigation + derived display.
- **Component contract:** `QTBuilder.jsx` keeps `export default function QTBuilder()` taking **no props** (mounted as `{tab === 'qt' && <QTBuilder />}` in `AuthoringView.jsx`).
- **Styling:** inline style objects using CSS vars `--text`, `--text-muted`, `--border`, `--accent` (fallback `#82aaff`), `--bg-input` (fallback `#222`), `--font-mono`. Match existing authoring components.
- **Branch:** `feature/qt-builder` (already checked out). Do NOT create/switch branches.
- **Commit trailer:** end every commit message with `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.
- **Tier set (verbatim):** `QT_BUCKETS = ['QT2','QT3','QT4','QT5']` from `src/data/quality-tier.js`. QT3 is the baseline column.
- **Phase order (verbatim):** `PHASE_ORDER = ['setup','prep','prime','apply','interstage','finish','cleanup']` from `src/data/constants.js`.
- **Cell states (exact vocabulary):** `'fires'` (in this tier AND the baseline), `'added'` (in this tier, NOT the baseline), `'skip'` (not in this tier, but the tier IS served), `'na'` (tier not served by any scenario).

**Scope note — this is Phase 2a of Phase 2 (the builder UI).** Deferred to later sub-phases: 2b structural editing (cell toggles → `applies_when.quality_tier` writes; add-task picker; draft saves); 2c coats + interstage rows (+ lazy `dynamic_coats` conversion); 2d opt-in per-tier rate editor + modifier-override strip; 2e per-tier materials. This sub-phase establishes navigation + the derivation that every editing phase builds on.

---

### Task 1: `derive-tier-ladder.js` — pure derivation + unit tests

**Files:**
- Create: `tools/paintscope/src/components/authoring/qt-builder/derive-tier-ladder.js`
- Test: `tools/paintscope/src/components/authoring/qt-builder/__tests__/derive-tier-ladder.test.js`

**Interfaces:**
- Consumes: `findBestMatch(scenarioBundle, ctx)` from `engine/scenario-matcher.js` → `{ scenario, allMatches, tied, warnings }`; `QT_BUCKETS` from `data/quality-tier.js`; `PHASE_ORDER` from `data/constants.js`. Bundle shape: `{ scenarios: [{ scenario_id, domain, matches:{paintable_item, application_method, substrate_state[], quality_tier(str|str[]), coating_type? }, modules:[modId] }], modules:{ [id]:{ phase, tasks:[{task_ref, applies_when?}] } }, tasks:{ [id]:{ name } } }`.
- Produces:
  - `listSubstrates(bundle, { domain='interior' }={}) → string[]` (sorted distinct `paintable_item`).
  - `listDimensions(bundle, paintable_item) → { methods: string[], states: string[], coatings: string[] }` (sorted distinct values across that substrate's scenarios).
  - `deriveTierLadder(bundle, sel) → { tiers: string[], served: string[], baseline: string|null, rows: Array<{ task_id, name, phase, cells: { [tier]: 'fires'|'added'|'skip'|'na' } }>, warnings: string[] }` where `sel = { paintable_item, application_method, substrate_state, coating_type }`.

- [ ] **Step 1: Write the failing test**

Create `tools/paintscope/src/components/authoring/qt-builder/__tests__/derive-tier-ladder.test.js`:

```javascript
import { describe, it, expect } from 'vitest';
import { listSubstrates, listDimensions, deriveTierLadder } from '../derive-tier-ladder.js';

// Pattern A — ONE multi-tier scenario (quality_tier array) with a QT5-only
// task gated by applies_when.quality_tier. No QT2 scenario.
function multiTierBundle() {
  return {
    scenarios: [{
      scenario_id: 'SCN_MULTI', domain: 'interior',
      matches: { paintable_item: 'widget', application_method: 'brush', substrate_state: ['SS_BARE'], quality_tier: ['QT3', 'QT4', 'QT5'], coating_type: 'paint' },
      modules: ['MOD_PREP_W', 'MOD_FIN_W'],
    }],
    modules: {
      MOD_PREP_W: { module_id: 'MOD_PREP_W', phase: 'prep', tasks: [
        { task_ref: 'TSK_CLEAN' },
        { task_ref: 'TSK_DETAIL_SAND', applies_when: { quality_tier: ['QT5'] } },
      ] },
      MOD_FIN_W: { module_id: 'MOD_FIN_W', phase: 'finish', tasks: [{ task_ref: 'TSK_COAT' }] },
    },
    tasks: {
      TSK_CLEAN: { task_id: 'TSK_CLEAN', name: 'Clean' },
      TSK_DETAIL_SAND: { task_id: 'TSK_DETAIL_SAND', name: 'Detail sand' },
      TSK_COAT: { task_id: 'TSK_COAT', name: 'Coat' },
    },
    modifiers: {},
  };
}

// Pattern B — SEPARATE per-tier scenario files (quality_tier scalar) with
// different module lists. Only QT3 and QT5 exist (QT2, QT4 unserved).
function perTierFilesBundle() {
  return {
    scenarios: [
      { scenario_id: 'SCN_CAB_QT3', domain: 'interior', matches: { paintable_item: 'cab', application_method: 'spray', substrate_state: ['SS_BARE'], quality_tier: 'QT3', coating_type: 'paint' }, modules: ['MOD_BASE'] },
      { scenario_id: 'SCN_CAB_QT5', domain: 'interior', matches: { paintable_item: 'cab', application_method: 'spray', substrate_state: ['SS_BARE'], quality_tier: 'QT5', coating_type: 'paint' }, modules: ['MOD_BASE', 'MOD_EXTRA'] },
    ],
    modules: {
      MOD_BASE: { module_id: 'MOD_BASE', phase: 'finish', tasks: [{ task_ref: 'TSK_SPRAY' }] },
      MOD_EXTRA: { module_id: 'MOD_EXTRA', phase: 'finish', tasks: [{ task_ref: 'TSK_TOUCHUP' }] },
    },
    tasks: {
      TSK_SPRAY: { task_id: 'TSK_SPRAY', name: 'Spray finish' },
      TSK_TOUCHUP: { task_id: 'TSK_TOUCHUP', name: 'Touch up' },
    },
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

describe('deriveTierLadder — multi-tier scenario (pattern A)', () => {
  const ladder = () => deriveTierLadder(multiTierBundle(), { paintable_item: 'widget', application_method: 'brush', substrate_state: 'SS_BARE', coating_type: 'paint' });

  it('serves QT3-5 but not QT2', () => {
    expect(ladder().served).toEqual(['QT3', 'QT4', 'QT5']);
    expect(ladder().baseline).toBe('QT3');
  });
  it('orders rows by phase then appearance', () => {
    expect(ladder().rows.map(r => r.task_id)).toEqual(['TSK_CLEAN', 'TSK_DETAIL_SAND', 'TSK_COAT']);
  });
  it('marks the QT5-only task added at QT5, skipped at QT3/QT4, na at QT2', () => {
    const sand = ladder().rows.find(r => r.task_id === 'TSK_DETAIL_SAND');
    expect(sand.cells).toEqual({ QT2: 'na', QT3: 'skip', QT4: 'skip', QT5: 'added' });
  });
  it('marks a baseline task fires across served tiers, na at QT2', () => {
    const clean = ladder().rows.find(r => r.task_id === 'TSK_CLEAN');
    expect(clean.cells).toEqual({ QT2: 'na', QT3: 'fires', QT4: 'fires', QT5: 'fires' });
  });
});

describe('deriveTierLadder — per-tier scenario files (pattern B)', () => {
  const ladder = () => deriveTierLadder(perTierFilesBundle(), { paintable_item: 'cab', application_method: 'spray', substrate_state: 'SS_BARE', coating_type: 'paint' });

  it('serves only the tiers that have a scenario file', () => {
    expect(ladder().served).toEqual(['QT3', 'QT5']);
  });
  it('shows the extra QT5-file task as added at QT5, skip at QT3, na where unserved', () => {
    const touch = ladder().rows.find(r => r.task_id === 'TSK_TOUCHUP');
    expect(touch.cells).toEqual({ QT2: 'na', QT3: 'skip', QT4: 'na', QT5: 'added' });
  });
  it('shows the shared task firing in both served tiers', () => {
    const spray = ladder().rows.find(r => r.task_id === 'TSK_SPRAY');
    expect(spray.cells).toEqual({ QT2: 'na', QT3: 'fires', QT4: 'na', QT5: 'fires' });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run (from `Claude/tools/paintscope/`): `npx vitest run src/components/authoring/qt-builder`
Expected: FAIL — module `../derive-tier-ladder.js` does not exist (import error).

- [ ] **Step 3: Write the implementation**

Create `tools/paintscope/src/components/authoring/qt-builder/derive-tier-ladder.js`:

```javascript
// Pure derivation for the QT Builder's read-only tier ladder. Given the
// canonical scenario bundle and a (paintable_item, application_method,
// substrate_state, coating_type) selection, this resolves the governing
// scenario PER quality tier (via the same matcher the engine uses) and aligns
// each tier's concrete task set into a tier ladder. Resolving per tier means
// it handles BOTH authoring patterns transparently: one multi-tier scenario
// (quality_tier: [...]) and separate per-tier scenario files.

import { findBestMatch } from '../../../engine/scenario-matcher.js';
import { QT_BUCKETS } from '../../../data/quality-tier.js';
import { PHASE_ORDER } from '../../../data/constants.js';

// Only these selection dimensions gate a task into a tier's ladder. Other
// applies_when keys (per-instance geometry/coat gates like has_steps, coat)
// are not tier-structural, so they must NOT filter the ladder view.
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

function uniqSorted(set) {
  return [...set].sort();
}

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

// Resolve one tier's concrete task set → Map<task_id, {name, phase, order}>.
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
      tasks.set(ref, { name: t?.name || ref, phase: mod.phase || 'apply', order: order++ });
    }
  }
  return { scenario, tasks, warnings: warnings || [] };
}

export function deriveTierLadder(bundle, sel) {
  const tiers = QT_BUCKETS;
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

  // Collect distinct tasks, baseline tier first so its ordering dominates.
  const collectOrder = baseline ? [baseline, ...tiers.filter(t => t !== baseline)] : tiers;
  const taskInfo = new Map();
  for (const t of collectOrder) {
    const pt = perTier[t];
    if (!pt) continue;
    for (const [id, info] of pt.tasks) {
      if (!taskInfo.has(id)) taskInfo.set(id, info);
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
    return { task_id: id, name: info.name, phase: info.phase, cells, _order: info.order };
  });

  rows.sort((a, b) => {
    const pa = PHASE_ORDER.indexOf(a.phase); const pb = PHASE_ORDER.indexOf(b.phase);
    const pai = pa === -1 ? PHASE_ORDER.length : pa;
    const pbi = pb === -1 ? PHASE_ORDER.length : pb;
    if (pai !== pbi) return pai - pbi;
    return a._order - b._order;
  });
  rows.forEach(r => { delete r._order; });

  return { tiers, served, baseline, rows, warnings };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/components/authoring/qt-builder`
Expected: PASS — all `listSubstrates`/`listDimensions`/`deriveTierLadder` cases green (both pattern A and pattern B).

- [ ] **Step 5: Run the full suite to confirm no regression**

Run: `npx vitest run`
Expected: PASS — previous 175 + the new derive tests, all green.

- [ ] **Step 6: Commit**

```bash
git add tools/paintscope/src/components/authoring/qt-builder/derive-tier-ladder.js tools/paintscope/src/components/authoring/qt-builder/__tests__/derive-tier-ladder.test.js
git commit -m "feat(qt-builder): derive read-only tier ladder from scenario bundle

Pure module that resolves the governing scenario per quality tier (via
findBestMatch) and aligns task sets into fires/added/skip/na cells. Handles
both multi-tier scenarios and separate per-tier scenario files. Plus
listSubstrates / listDimensions for the navigation dropdowns.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Rewrite `QTBuilder.jsx` to render the read-only ladder

**Files:**
- Modify (full rewrite): `tools/paintscope/src/components/authoring/QTBuilder.jsx`

**Interfaces:**
- Consumes: the default bundle export from `data/scenario-bundle.gen.js` (object with `.scenarios/.modules/.tasks/.modifiers`); `listSubstrates`, `listDimensions`, `deriveTierLadder` from `./qt-builder/derive-tier-ladder.js` (Task 1); `PHASE_ORDER` from `data/constants.js`.
- Produces: the same component contract — `export default function QTBuilder()`, no props.

- [ ] **Step 1: Replace the file contents**

Overwrite `tools/paintscope/src/components/authoring/QTBuilder.jsx` with:

```jsx
// QT Builder — read-only tier ladder (Phase 2a). Pick Substrate / Method /
// State / Coating; see, per quality tier (QT2-QT5), which tasks fire, are
// added, or are skipped. Editing arrives in a later sub-phase. All derivation
// lives in ./qt-builder/derive-tier-ladder.js; this file is presentation only.

import { Fragment, useMemo, useState } from 'react';
import bundle from '../../data/scenario-bundle.gen.js';
import { PHASE_ORDER } from '../../data/constants.js';
import { listSubstrates, listDimensions, deriveTierLadder } from './qt-builder/derive-tier-ladder.js';

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
  const substrates = useMemo(() => listSubstrates(bundle), []);
  const [substrate, setSubstrate] = useState(substrates[0] || '');
  const dims = useMemo(() => listDimensions(bundle, substrate), [substrate]);
  const [method, setMethod] = useState('');
  const [state, setState] = useState('');
  const [coating, setCoating] = useState('');

  // Keep each selection valid as the substrate changes (fall back to first).
  const effMethod = dims.methods.includes(method) ? method : (dims.methods[0] || '');
  const effState = dims.states.includes(state) ? state : (dims.states[0] || '');
  const effCoating = dims.coatings.includes(coating)
    ? coating
    : (dims.coatings.includes('paint') ? 'paint' : (dims.coatings[0] || ''));

  const ladder = useMemo(() => {
    if (!substrate || !effMethod || !effState) return null;
    return deriveTierLadder(bundle, {
      paintable_item: substrate, application_method: effMethod,
      substrate_state: effState, coating_type: effCoating,
    });
  }, [substrate, effMethod, effState, effCoating]);

  const grouped = useMemo(() => {
    if (!ladder) return [];
    const byPhase = new Map();
    for (const r of ladder.rows) {
      if (!byPhase.has(r.phase)) byPhase.set(r.phase, []);
      byPhase.get(r.phase).push(r);
    }
    return [...byPhase.entries()].sort((a, b) => {
      const ia = PHASE_ORDER.indexOf(a[0]); const ib = PHASE_ORDER.indexOf(b[0]);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });
  }, [ladder]);

  const tiers = ladder?.tiers || [];

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
          <select value={effState} onChange={e => setState(e.target.value)} style={{ ...inputStyle, width: 150 }}>
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
        <div style={{ fontSize: 10, color: 'var(--text-muted)', paddingBottom: 4 }}>read-only · editing in a later phase</div>
      </div>

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
                <th style={{ ...thStyle, textAlign: 'left', width: 300 }}>Task</th>
                {tiers.map(t => (
                  <th key={t} style={thStyle}>
                    {t}
                    {t === 'QT3' && <span style={baselineBadge}>baseline</span>}
                    {!ladder.served.includes(t) && <div style={{ fontSize: 8, fontWeight: 400 }}>n/a</div>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {grouped.map(([phase, rows]) => (
                <Fragment key={phase}>
                  <tr><td colSpan={tiers.length + 1} style={phaseStyle}>{humanize(phase)}</td></tr>
                  {rows.map(r => (
                    <tr key={r.task_id} style={{ borderTop: '1px solid var(--border)' }}>
                      <td style={{ padding: '6px 10px', textAlign: 'left' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10 }}>{r.task_id}</span>
                        <span style={{ color: 'var(--text-muted)', marginLeft: 8 }}>{r.name}</span>
                      </td>
                      {tiers.map(t => {
                        const c = CELL[r.cells[t]] || CELL.na;
                        return <td key={t} style={{ textAlign: 'center', padding: '6px 8px', color: c.color, fontWeight: r.cells[t] === 'added' ? 600 : 400 }}>{c.icon}</td>;
                      })}
                    </tr>
                  ))}
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
const emptyStyle = { padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 };
```

- [ ] **Step 2: Verify the production build compiles**

Run (from `Claude/tools/paintscope/`): `npx vite build`
Expected: build succeeds (no import/syntax errors); module count in the log is in the normal range (250+).

- [ ] **Step 3: Manual browser verification**

Start the dev server: `npx vite --port 5173` (from `Claude/tools/paintscope/`). In the browser at `localhost:5173`:
1. Enable admin if needed: in the console run `localStorage.setItem('paintscope.admin','1')` then reload — the **Authoring** nav tab appears.
2. Open Authoring → **QT Builder**.
3. Confirm: the Substrate dropdown lists substrates; choosing one populates Method / State (and Coating when >1). The ladder table renders with QT2–QT5 columns, QT3 badged "baseline", rows grouped by phase, and ✓ / + / · / — cells.
4. Pick a per-tier-file substrate (e.g. `cabinet`) and a multi-tier substrate (e.g. `arch_element` / `baseboard`); confirm both render and that unserved tiers show the `n/a` column header + `—` cells.
5. No console errors.

Record what you observed (which substrates you tried, screenshot or description) in the report.

- [ ] **Step 4: Commit**

```bash
git add tools/paintscope/src/components/authoring/QTBuilder.jsx
git commit -m "feat(qt-builder): read-only tier ladder UI (replaces multiplier-grid prototype)

Substrate/method/state/coating selectors derived from the bundle; renders the
per-tier fires/added/skip/na ladder grouped by phase. Presentation only;
derivation lives in qt-builder/derive-tier-ladder.js.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Self-Review

**Spec coverage (Phase 2a scope):**
- Navigation by Substrate → Method → State (+ Coating, added for matcher correctness) → Task 2 selectors, options from Task 1's `listSubstrates`/`listDimensions`. ✓
- Read-only tier ladder, columns = tiers, QT3 baseline, rows by phase, cell states fires/added/skip/na → Task 1 `deriveTierLadder` + Task 2 render. ✓
- Handles both authoring patterns (multi-tier scenario; per-tier files) → Task 1 resolves per tier via `findBestMatch`; both patterns covered by tests. ✓
- Replaces the prototype `QTBuilder.jsx` while honoring the no-props contract → Task 2. ✓
- Editing, coats/interstage, opt-in levers, materials → explicitly deferred in the Scope note. ✓

**Placeholder scan:** No TBD/TODO/"handle edge cases"/"similar to" — full code in every step, exact run commands, exact assertions. ✓

**Type/name consistency:** `listSubstrates`, `listDimensions` (`{methods,states,coatings}`), `deriveTierLadder(bundle, {paintable_item, application_method, substrate_state, coating_type})`, return `{tiers, served, baseline, rows:[{task_id,name,phase,cells}], warnings}`, cell vocabulary `fires|added|skip|na` — identical across the module, its tests, and the component. `findBestMatch`/`QT_BUCKETS`/`PHASE_ORDER` import paths match the real files. ✓

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-18-qt-builder-phase2a-read-only-ladder.md`. Two execution options:

1. **Subagent-Driven (recommended)** — a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** — execute tasks in this session with checkpoints for review.
