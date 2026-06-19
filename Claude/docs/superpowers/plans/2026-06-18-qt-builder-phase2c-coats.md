# QT Builder — Phase 2c: Per-Tier Coats Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add per-tier finish-coat counts (and a derived interstage-rounds readout) to the ladder, editable with a stepper that adds/removes a coat unit in the scenario's `modules[]` and saves a scenario draft.

**Architecture:** A new pure, unit-tested `tier-coats.js` holds all coats logic (coat-unit detection, the `setFinishCoats` compile, the scenario-draft merge, and the per-tier derivation). `QTBuilder.jsx` merges scenario drafts alongside module drafts, renders two coats rows at the top of the ladder, and wires the steppers. No engine changes — coats remain module repetitions the engine already counts.

**Tech Stack:** React 19 (plain JSX), Vite, Vitest. Inline styles + CSS vars.

## Global Constraints

- **No TypeScript** — plain `.js`/`.jsx`. **No engine changes.**
- **Coats = module repetition.** A coat-bearing module has `phase ∈ {apply, finish}`. A **coat unit** is a maximal contiguous run of coat-bearing modules in `modules[]`; **finish coats = number of runs.** `prime`-phase modules are NOT coats.
- **+1 coat** = append `[interstageBetween…, lastUnit…]` after the last run (interstage = modules between the last two runs; empty if back-to-back / single coat). **−1** = remove trailing run(s) + each one's leading interstage. **Minimum 1 coat.**
- **Immutable compile:** `setFinishCoats` returns a NEW scenario payload (never mutates); returns the input reference on no-op.
- **Saves:** scenario drafts via `useScenarioDrafts().save({ id: scenario_id, payload, status:'draft' })`; publish stays in the Drafts tab.
- **Per-tier-file substrates** get true per-tier coats; **multi-tier scenarios** (same `scenario_id` resolved for >1 served tier) step uniformly — label those columns "shared."
- **Component contract:** `export default function QTBuilder()`, no props.
- Branch `feature/qt-builder` (already checked out) — do NOT create/switch branches.
- Commit trailer: end every message with `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.

**Scope note — Phase 2c.** In: finish-coat display + stepper editing via module repetition, interstage-rounds readout, scenario drafts. Out (later): prime-coat editing; interstage-module picker; per-tier coat variation on multi-tier scenarios (needs `dynamic_coats`); 2d (rate/modifier UI) and 2e (materials).

---

### Task 1: `tier-coats.js` — coat-unit detection, compile, merge, derivation

**Files:**
- Create: `tools/paintscope/src/components/authoring/qt-builder/tier-coats.js`
- Test: `tools/paintscope/src/components/authoring/qt-builder/__tests__/tier-coats.test.js`

**Interfaces:**
- Consumes: `findBestMatch` from `engine/scenario-matcher.js`; `QT_BUCKETS` from `data/quality-tier.js`. Bundle shape `{ scenarios:[…], modules:{ [id]:{ phase } } }`.
- Produces:
  - `coatUnits(scenario, modulesById) → { runs, count, lastUnit: string[], interstageBetween: string[] }`.
  - `setFinishCoats(scenario, modulesById, targetCount) → scenario` (immutable; no-op when `target===count`, `count===0`, or `target<1`).
  - `mergeScenarioDrafts(canonicalScenarios, drafts) → scenarios[]` (overlay active drafts by `scenario_id`: drop matching canonical, append draft payloads).
  - `deriveTierCoats(bundle, sel) → { [tier]: { scenarioId, finishCoats, interstageRounds } | null }`.

- [ ] **Step 1: Write the failing tests**

Create `tools/paintscope/src/components/authoring/qt-builder/__tests__/tier-coats.test.js`:

```javascript
import { describe, it, expect } from 'vitest';
import { coatUnits, setFinishCoats, mergeScenarioDrafts, deriveTierCoats } from '../tier-coats.js';

// modulesById phase map
const PH = {
  MOD_SETUP: { phase: 'setup' }, MOD_PREP: { phase: 'prep' }, MOD_PRIME: { phase: 'prime' },
  MOD_FINISH: { phase: 'finish' }, MOD_INTER: { phase: 'interstage' }, MOD_CLEAN: { phase: 'cleanup' },
  MOD_CUTIN_C: { phase: 'apply' }, MOD_CUTIN_T: { phase: 'apply' }, MOD_ROLL: { phase: 'apply' },
};

// Cabinet-style: 2 finish coats with an interstage between
const cabinet = () => ({ scenario_id: 'SCN_CAB', modules: ['MOD_SETUP', 'MOD_PREP', 'MOD_PRIME', 'MOD_FINISH', 'MOD_INTER', 'MOD_FINISH', 'MOD_CLEAN'] });
// Drywall-style: 2 multi-module coats, back-to-back (no interstage)
const drywall = () => ({ scenario_id: 'SCN_DW', modules: ['MOD_PREP', 'MOD_CUTIN_C', 'MOD_CUTIN_T', 'MOD_ROLL', 'MOD_CUTIN_C', 'MOD_CUTIN_T', 'MOD_ROLL', 'MOD_CLEAN'] });

describe('coatUnits', () => {
  it('counts single-module coat units and the interstage between (prime not counted)', () => {
    const u = coatUnits(cabinet(), PH);
    expect(u.count).toBe(2);
    expect(u.lastUnit).toEqual(['MOD_FINISH']);
    expect(u.interstageBetween).toEqual(['MOD_INTER']);
  });
  it('counts multi-module coat units back-to-back (empty interstage)', () => {
    const u = coatUnits(drywall(), PH);
    expect(u.count).toBe(2);
    expect(u.lastUnit).toEqual(['MOD_CUTIN_C', 'MOD_CUTIN_T', 'MOD_ROLL']);
    expect(u.interstageBetween).toEqual([]);
  });
});

describe('setFinishCoats — cabinet (with interstage)', () => {
  it('+1 appends interstage + finish unit', () => {
    const out = setFinishCoats(cabinet(), PH, 3);
    expect(out.modules).toEqual(['MOD_SETUP', 'MOD_PREP', 'MOD_PRIME', 'MOD_FINISH', 'MOD_INTER', 'MOD_FINISH', 'MOD_INTER', 'MOD_FINISH', 'MOD_CLEAN']);
  });
  it('-1 removes the last interstage + finish', () => {
    const out = setFinishCoats(cabinet(), PH, 1);
    expect(out.modules).toEqual(['MOD_SETUP', 'MOD_PREP', 'MOD_PRIME', 'MOD_FINISH', 'MOD_CLEAN']);
  });
  it('clamps below 1 (no-op) and no-ops on equal count', () => {
    const c = cabinet();
    expect(setFinishCoats(c, PH, 0)).toBe(c);
    expect(setFinishCoats(c, PH, 2)).toBe(c);
  });
  it('does not mutate the input', () => {
    const c = cabinet();
    setFinishCoats(c, PH, 3);
    expect(c.modules).toHaveLength(7);
  });
});

describe('setFinishCoats — drywall (multi-module, back-to-back)', () => {
  it('+1 appends the whole coat unit, no interstage', () => {
    const out = setFinishCoats(drywall(), PH, 3);
    expect(out.modules).toEqual(['MOD_PREP', 'MOD_CUTIN_C', 'MOD_CUTIN_T', 'MOD_ROLL', 'MOD_CUTIN_C', 'MOD_CUTIN_T', 'MOD_ROLL', 'MOD_CUTIN_C', 'MOD_CUTIN_T', 'MOD_ROLL', 'MOD_CLEAN']);
  });
  it('-1 removes the last coat unit', () => {
    const out = setFinishCoats(drywall(), PH, 1);
    expect(out.modules).toEqual(['MOD_PREP', 'MOD_CUTIN_C', 'MOD_CUTIN_T', 'MOD_ROLL', 'MOD_CLEAN']);
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

describe('deriveTierCoats', () => {
  it('returns per-tier coat counts; null for unserved tiers', () => {
    const bundle = {
      modules: PH,
      scenarios: [{ scenario_id: 'SCN_CAB', matches: { paintable_item: 'cab', application_method: 'brush', substrate_state: ['SS_BARE'], quality_tier: ['QT3', 'QT4', 'QT5'], coating_type: 'paint' }, modules: cabinet().modules }],
    };
    const tc = deriveTierCoats(bundle, { paintable_item: 'cab', application_method: 'brush', substrate_state: 'SS_BARE', coating_type: 'paint' });
    expect(tc.QT2).toBeNull();
    expect(tc.QT3).toEqual({ scenarioId: 'SCN_CAB', finishCoats: 2, interstageRounds: 1 });
    expect(tc.QT5.finishCoats).toBe(2);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run (from `Claude/tools/paintscope/`): `npx vitest run src/components/authoring/qt-builder` → FAIL (module not found).

- [ ] **Step 3: Write the implementation**

Create `tools/paintscope/src/components/authoring/qt-builder/tier-coats.js`:

```javascript
// Per-tier coats for the QT Builder. Coats are module repetitions: the engine
// counts apply/finish-phase module invocations in scenario.modules[]. A coat
// unit is a maximal contiguous run of coat-bearing modules; finish coats =
// number of runs. Editing adds/removes the last coat unit (+ its interstage).
// All immutable; no engine changes.

import { findBestMatch } from '../../../engine/scenario-matcher.js';
import { QT_BUCKETS } from '../../../data/quality-tier.js';

const ACTIVE_DRAFT = new Set(['draft', 'local_override']);
const isCoatPhase = (p) => p === 'apply' || p === 'finish';

export function coatUnits(scenario, modulesById) {
  const mods = (scenario && scenario.modules) || [];
  const runs = [];
  let cur = null;
  for (let i = 0; i < mods.length; i++) {
    const phase = modulesById?.[mods[i]]?.phase;
    if (isCoatPhase(phase)) {
      if (!cur) cur = { start: i, end: i, ids: [mods[i]] };
      else { cur.end = i; cur.ids.push(mods[i]); }
    } else if (cur) { runs.push(cur); cur = null; }
  }
  if (cur) runs.push(cur);
  const lastUnit = runs.length ? runs[runs.length - 1].ids.slice() : [];
  let interstageBetween = [];
  if (runs.length >= 2) {
    const a = runs[runs.length - 2], b = runs[runs.length - 1];
    interstageBetween = mods.slice(a.end + 1, b.start);
  }
  return { runs, count: runs.length, lastUnit, interstageBetween };
}

export function setFinishCoats(scenario, modulesById, targetCount) {
  if (!Number.isFinite(targetCount) || targetCount < 1) return scenario;
  const { runs, count, lastUnit, interstageBetween } = coatUnits(scenario, modulesById);
  if (count === 0 || targetCount === count) return scenario;
  const mods = scenario.modules.slice();
  const last = runs[runs.length - 1];
  if (targetCount > count) {
    const add = [];
    for (let k = 0; k < targetCount - count; k++) add.push(...interstageBetween, ...lastUnit);
    return { ...scenario, modules: [...mods.slice(0, last.end + 1), ...add, ...mods.slice(last.end + 1)] };
  }
  const removeCount = count - targetCount;
  const firstRemoved = runs[count - removeCount];
  const prev = runs[count - removeCount - 1];
  const cutStart = prev ? prev.end + 1 : firstRemoved.start;
  return { ...scenario, modules: [...mods.slice(0, cutStart), ...mods.slice(last.end + 1)] };
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

export function deriveTierCoats(bundle, sel) {
  const out = {};
  for (const tier of QT_BUCKETS) {
    const ctx = {
      paintable_item: sel.paintable_item, application_method: sel.application_method,
      substrate_state: sel.substrate_state, coating_type: sel.coating_type, quality_tier: tier,
    };
    const { scenario } = findBestMatch(bundle, ctx);
    if (!scenario) { out[tier] = null; continue; }
    const { count, interstageBetween } = coatUnits(scenario, bundle.modules);
    out[tier] = {
      scenarioId: scenario.scenario_id,
      finishCoats: count,
      interstageRounds: interstageBetween.length ? count - 1 : 0,
    };
  }
  return out;
}
```

- [ ] **Step 4: Run to verify pass + Step 5: full suite**

Run: `npx vitest run src/components/authoring/qt-builder` → PASS.
Then `npx vitest run` → all green.

- [ ] **Step 6: Commit**

```bash
git add tools/paintscope/src/components/authoring/qt-builder/tier-coats.js tools/paintscope/src/components/authoring/qt-builder/__tests__/tier-coats.test.js
git commit -m "feat(qt-builder): per-tier coats logic (coat units, setFinishCoats, scenario merge)

Pure, immutable: coatUnits detects contiguous apply/finish runs; setFinishCoats
adds/removes the last coat unit (+ interstage); mergeScenarioDrafts overlays
scenario drafts; deriveTierCoats gives per-tier counts. No engine change.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: `QTBuilder.jsx` — coats rows + steppers + scenario drafts

**Files:**
- Modify (full rewrite): `tools/paintscope/src/components/authoring/QTBuilder.jsx`

**Interfaces:**
- Consumes Task 1's `tier-coats.js` (`mergeScenarioDrafts`, `setFinishCoats`, `deriveTierCoats`); `useScenarioDrafts`. Keeps the no-props contract.
- Produces: two coats rows atop the ladder (Finish coats with per-tier `– N +` steppers; Interstage rounds readout); merges scenario drafts into the bundle so coats + task edits both show live; "shared" hint when a scenario serves >1 tier; combined drafts banner.

- [ ] **Step 1: Replace the file contents**

Overwrite `tools/paintscope/src/components/authoring/QTBuilder.jsx` with:

```jsx
// QT Builder — editable tier ladder (Phase 2a–2c). Pick Substrate / Method /
// State / Coating. Click a served-tier cell to toggle whether a task fires at
// that tier (module drafts); step finish coats per tier (scenario drafts). All
// edits autosave and go live via the overlay; publish from the Drafts tab.
// Derivation + compile live in ./qt-builder/*.

import { Fragment, useMemo, useState, useRef } from 'react';
import bundle from '../../data/scenario-bundle.gen.js';
import { listSubstrates, listDimensions, deriveTierLadder } from './qt-builder/derive-tier-ladder.js';
import { mergeModuleDrafts, setTierMembership, addTaskEntry } from './qt-builder/edit-tier-ladder.js';
import { mergeScenarioDrafts, setFinishCoats, deriveTierCoats } from './qt-builder/tier-coats.js';
import TaskPicker from './TaskPicker.jsx';
import { useModuleDrafts } from '../../hooks/useModuleDrafts.js';
import { useScenarioDrafts } from '../../hooks/useScenarioDrafts.js';

function humanize(s) {
  if (!s) return '';
  return String(s).replace(/^SS_/, '').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

const isActive = (d) => d.status === 'draft' || d.status === 'local_override';

const CELL = {
  fires: { icon: '✓', color: 'var(--text)' },
  added: { icon: '+', color: 'var(--accent, #82aaff)' },
  skip:  { icon: '·', color: 'var(--text-muted)' },
  na:    { icon: '—', color: 'var(--text-muted)' },
};

export default function QTBuilder() {
  const { drafts: moduleDrafts, save: saveModule } = useModuleDrafts();
  const { drafts: scenarioDrafts, save: saveScenario } = useScenarioDrafts();

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

  const ladder = useMemo(() => {
    if (!substrate || !effMethod || !effState) return null;
    return deriveTierLadder(mergedBundle, sel);
  }, [mergedBundle, substrate, effMethod, effState, effCoating]);

  const tierCoats = useMemo(() => {
    if (!ladder) return {};
    return deriveTierCoats(mergedBundle, sel);
  }, [mergedBundle, ladder, substrate, effMethod, effState, effCoating]);

  const tiers = ladder?.tiers || [];
  const served = ladder?.served || [];

  const scenarioRefCount = useMemo(() => {
    const counts = new Map();
    for (const s of bundle.scenarios || []) for (const m of s.modules || []) counts.set(m, (counts.get(m) || 0) + 1);
    return counts;
  }, []);

  const activeDraftCount = moduleDrafts.filter(isActive).length + scenarioDrafts.filter(isActive).length;
  const busyRef = useRef(false);

  function coatsShared(tier) {
    const id = tierCoats[tier]?.scenarioId;
    return id && served.some(t => t !== tier && tierCoats[t]?.scenarioId === id);
  }

  async function toggleCell(row, tier) {
    if (!served.includes(tier) || busyRef.current) return;
    busyRef.current = true;
    try {
      const firing = new Set(served.filter(t => row.cells[t] === 'fires' || row.cells[t] === 'added'));
      if (firing.has(tier)) firing.delete(tier); else firing.add(tier);
      const desired = [...firing];
      for (const moduleId of row.moduleIds) {
        const mod = mergedBundle.modules[moduleId];
        if (!mod) continue;
        const updated = setTierMembership(mod, row.task_id, desired, served);
        if (updated !== mod) await saveModule({ id: moduleId, payload: updated, status: 'draft' });
      }
    } catch (e) { console.error('QT Builder: toggle failed', e); }
    finally { busyRef.current = false; }
  }

  async function changeCoats(tier, newCount) {
    if (busyRef.current || newCount < 1) return;
    const tc = tierCoats[tier];
    if (!tc) return;
    const scn = mergedBundle.scenarios.find(s => s.scenario_id === tc.scenarioId);
    if (!scn) return;
    busyRef.current = true;
    try {
      const updated = setFinishCoats(scn, mergedBundle.modules, newCount);
      if (updated !== scn) await saveScenario({ id: scn.scenario_id, payload: updated, status: 'draft' });
    } catch (e) { console.error('QT Builder: coats change failed', e); }
    finally { busyRef.current = false; }
  }

  const [picker, setPicker] = useState(null);

  async function addTask(task_id) {
    if (!picker || busyRef.current) return;
    busyRef.current = true;
    try {
      const mod = mergedBundle.modules[picker.moduleId];
      if (mod) {
        const updated = addTaskEntry(mod, task_id, served);
        if (updated !== mod) await saveModule({ id: picker.moduleId, payload: updated, status: 'draft' });
      }
    } catch (e) { console.error('QT Builder: add failed', e); }
    finally { busyRef.current = false; setPicker(null); }
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
        <div style={{ fontSize: 10, color: 'var(--text-muted)', paddingBottom: 4 }}>toggle cells · step coats</div>
      </div>

      {activeDraftCount > 0 && (
        <div style={bannerStyle}>
          {activeDraftCount} draft{activeDraftCount === 1 ? '' : 's'} — live in estimates now. Publish from the Drafts tab.
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
        ) : ladder.groups.length === 0 ? (
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
              <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                <td style={{ padding: '6px 10px', fontWeight: 500, color: 'var(--text-muted)' }}>Finish coats</td>
                {tiers.map(t => {
                  const tc = tierCoats[t];
                  if (!tc) return <td key={t} style={coatsCellStyle}><span style={{ color: 'var(--text-muted)' }}>—</span></td>;
                  return (
                    <td key={t} style={coatsCellStyle}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <button style={stepBtn} disabled={tc.finishCoats <= 1} onClick={() => changeCoats(t, tc.finishCoats - 1)}>−</button>
                        <b>{tc.finishCoats}</b>
                        <button style={stepBtn} onClick={() => changeCoats(t, tc.finishCoats + 1)}>+</button>
                      </span>
                      {coatsShared(t) && <div style={{ fontSize: 8, color: 'var(--text-muted)' }}>shared</div>}
                    </td>
                  );
                })}
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '6px 10px', color: 'var(--text-muted)' }}>Interstage rounds</td>
                {tiers.map(t => <td key={t} style={coatsCellStyle}>{tierCoats[t] ? tierCoats[t].interstageRounds : '—'}</td>)}
              </tr>
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
                          {shared > 1 && <span style={sharedBadge} title={`Edits to this task's module affect ${shared} scenario(s) that reference it, including this view.`}>shared ×{shared}</span>}
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
                  <tr>
                    <td colSpan={tiers.length + 1} style={addRowStyle}
                        onClick={() => setPicker({ phase: group.phase, moduleId: group.rows[0].moduleIds[0] })}>
                      + Add task to {humanize(group.phase)}…
                    </td>
                  </tr>
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
      <TaskPicker open={!!picker} phaseHint={picker?.phase} onClose={() => setPicker(null)} onPick={addTask} />
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
const addRowStyle = { padding: '5px 10px', fontSize: 11, color: 'var(--text-muted)', cursor: 'pointer', borderTop: '1px solid var(--border)' };
const coatsCellStyle = { textAlign: 'center', padding: '6px 8px' };
const stepBtn = { fontSize: 12, lineHeight: 1, padding: '0 6px', cursor: 'pointer', background: 'var(--bg-input, #222)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 3 };
```

- [ ] **Step 2: Verify the build compiles**

Run (from `Claude/tools/paintscope/`): `npx vite build`
Expected: success, no errors, ~245+ modules.

- [ ] **Step 3: Manual browser verification**

SKIP — the controller performs the live browser check (do NOT start a dev server; one runs on 5183).

- [ ] **Step 4: Commit**

```bash
git add tools/paintscope/src/components/authoring/QTBuilder.jsx
git commit -m "feat(qt-builder): per-tier finish-coat steppers + interstage readout

Two coats rows atop the ladder: Finish coats (per-tier - N + steppers writing
scenario drafts via setFinishCoats) and Interstage rounds (derived). Merges
scenario drafts alongside module drafts; 'shared' hint for multi-tier
scenarios; combined drafts banner.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Self-Review

**Spec coverage (design §4–§8):**
- Read per-tier coats + interstage → Task 1 `deriveTierCoats` + Task 2 coats rows. ✓
- Stepper edit via module repetition (+1/−1 last coat unit + interstage) → Task 1 `setFinishCoats` (tested cabinet + drywall) + Task 2 `changeCoats`. ✓
- Min 1 coat; immutable; no-op refs → Task 1 + tests. ✓
- Scenario drafts → Task 1 `mergeScenarioDrafts` + Task 2 `useScenarioDrafts`/`saveScenario`; live re-derive via merged bundle. ✓
- Per-tier-file true per-tier vs multi-tier uniform + "shared" label → Task 2 `coatsShared`. ✓
- No engine changes. ✓

**Placeholder scan:** No TBD/TODO/"similar to" — full code + exact commands. ✓

**Type/name consistency:** `coatUnits`/`setFinishCoats(scenario, modulesById, targetCount)`/`mergeScenarioDrafts(scenarios, drafts)`/`deriveTierCoats(bundle, sel) → {[tier]:{scenarioId,finishCoats,interstageRounds}}`; draft `{id, payload, status}` (matches `useScenarioDrafts().save`) — consistent across Task 1, its tests, and Task 2. ✓
