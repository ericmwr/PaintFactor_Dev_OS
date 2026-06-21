# QT3-Baseline Collapse Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Collapse every scenario family (interior + exterior) to a single QT3 baseline — strip `matches.quality_tier` from the QT3-winning scenario, archive the QT2/QT4/QT5 variants — so the QT Builder authors the other tiers fresh from a known-good QT3, with QT3 estimates provably unchanged.

**Architecture:** A self-gating Node migration script operates on the SOURCE files (`Claude/scenarios/SCN_*.json`), grouped by family `(paintable_item, application_method, substrate_state, coating_type)`. Per family it keeps the scenario that `findBestMatch` resolves for QT3 today (stripping its `quality_tier`) and archives every other scenario in the family. It snapshots the QT3 resolution of every family before and after (via the real engine matcher) and **aborts without writing if any QT3 resolution changes**. Then the bundle is regenerated and verified.

**Tech Stack:** Node ESM (`node` / `vite-node`), the existing `build-scenario-bundle.mjs` and `scenario-matcher.js`, Vitest, the archive-by-move convention.

## Global Constraints

- **ZERO engine changes.** The migration only edits/moves scenario data files + runs existing scripts. `scenario-matcher.js` and the estimate engine are imported read-only.
- **QT3 estimates MUST NOT change.** This is a hard, script-enforced invariant (parity self-gate aborts on any QT3 drift). It is the acceptance gate for the whole phase.
- **Archive, never hard-delete.** Move removed scenarios to `Claude/scenarios/archive/` (the bundle generator ignores subdirectories; files stay in git + are restorable). Never `git rm` a scenario.
- **Key off `matches.quality_tier`, never the `scenario_id` string** (211 of 695 non-baseline scenarios have no `_QT` token in their id).
- **Edit in the MAIN checkout**; branch `feature/qt-builder-rebuild`. Don't merge/push without asking.
- **Scope: ALL families, interior + exterior** (per Eric, 2026-06-21).
- Source data shapes: scenarios are one-per-file in `Claude/scenarios/SCN_*.json` with `matches.quality_tier` ∈ {omitted | scalar string | array}. Regen command: `node Claude/scripts/build-scenario-bundle.mjs` run from the worktree root `C:/Eric_AI_Playground/Claude Code Uni/`.

---

## Inventory (from investigation — for sizing/verification)

- 722 live scenarios; 374 families. By tier-kind: baseline 27, scalar QT2 16 / QT3 147 / QT4 140 / QT5 139, array 253.
- All 442 scalars are **interior**; exterior = arrays (174) + baselines (8).
- Migration actions: **strip 253 arrays** + **promote 147 QT3 scalars** → baseline; **archive 295** QT2/QT4/QT5 scalars; **~53 collision families** need keep-one-archive-rest; **1 no-QT3 family** (`window/spray/SS_PRIMED_FACTORY` → `SCN_WINDOW_INT_NC_QT4_SPRAY_FROM_FACTORY_WOOD`).
- 0 `MOD_*_QT` module forks. 19 modules / 34 task entries carry `applies_when.quality_tier` (all exterior) — **out of scope here** (Phase 1c).

---

## Decisions baked into this plan (defaults — override before execution if desired)

1. **Keeper = the scenario `findBestMatch` returns for QT3 today.** Heuristic preference (scalar-QT3 > array-incl-QT3 > baseline > lowest-tier) only PROPOSES the keeper; the parity self-gate is the source of truth and aborts if the proposal would change any QT3 resolution.
2. **No-QT3 family:** promote its lowest-tier scenario to baseline (strip `quality_tier`) and **flag it** in the report for later authoring. (Just the one window family today.)
3. **`scenario_id` strings left as-is** even when they contain `_QT3` (e.g. `SCN_..._QT3_...` becomes a baseline but keeps its id). Renaming ids/files is cosmetic, higher-risk churn, and deferred. Filenames likewise unchanged. (The bundle keys off in-file `scenario_id`, not filename.)
4. **The 33c23daf array-tier guard stays** as a defensive no-op (after collapse no array families remain, but the guard protects against future/edge re-introduction). Not removed.
5. **Archived scenarios** move to `Claude/scenarios/archive/` (matches the vite-plugin convention; an older `_archive/` also exists and is bundle-safe — use `archive/`).

---

## Task 1: Build the self-gating collapse script (TDD on the pure core)

**Files:**
- Create: `Claude/scripts/collapse-to-qt3-baseline.mjs`
- Create: `Claude/scripts/lib/collapse-core.mjs` (pure, testable: grouping + keeper proposal + strip)
- Test: `Claude/tools/paintscope/src/components/authoring/qt-builder/__tests__/collapse-core.test.js` (co-located with the suite vitest already runs)

**Interfaces (produced, exact):**
- `familyKey(scenario) -> string` — JSON of `{pi, am, st, ct}` where each is the matches value normalized: arrays sorted, scalars wrapped to `[v]`, missing → `null`. (quality_tier excluded.)
- `qtKind(scenario) -> 'baseline'|'scalar'|'array'` — by `matches.quality_tier` (omitted→baseline; Array len>1→array; else scalar).
- `groupByFamily(scenarios) -> Map<string, scenario[]>`.
- `proposeKeeper(familyScenarios) -> { keeper, archive: scenario[], reason: string, noQt3: boolean }` — preference: a scalar whose quality_tier==='QT3'; else an array whose quality_tier includes 'QT3'; else a baseline (no quality_tier); else the lowest-tier scenario (QT2<QT3<QT4<QT5; for arrays use their min tier) with `noQt3:true`. Ties within a preference rank broken by ascending `scenario_id` (deterministic). `archive` = all family scenarios except keeper.
- `stripQualityTier(scenario) -> scenario` — returns a deep clone with `matches.quality_tier` removed (and `matches` preserved otherwise). Pure; never mutates input.

- [ ] **Step 1: Write failing tests for the pure core**

Create `collapse-core.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { familyKey, qtKind, groupByFamily, proposeKeeper, stripQualityTier } from '../../../../../../scripts/lib/collapse-core.mjs';

const scn = (id, qt, extra = {}) => ({
  scenario_id: id,
  matches: { paintable_item: 'x', application_method: 'brush', substrate_state: ['SS_BARE'], coating_type: 'paint', ...(qt === undefined ? {} : { quality_tier: qt }), ...extra },
  modules: extra.modules || ['MOD_A'],
});

describe('qtKind', () => {
  it('classifies omitted / scalar / array', () => {
    expect(qtKind(scn('a'))).toBe('baseline');
    expect(qtKind(scn('a', 'QT3'))).toBe('scalar');
    expect(qtKind(scn('a', ['QT3', 'QT4', 'QT5']))).toBe('array');
    expect(qtKind(scn('a', ['QT3']))).toBe('scalar'); // single-element array = scalar-equivalent
  });
});

describe('familyKey', () => {
  it('ignores quality_tier and normalizes arrays', () => {
    expect(familyKey(scn('a', 'QT3'))).toBe(familyKey(scn('b', 'QT5')));
    expect(familyKey(scn('a', ['QT3', 'QT4']))).toBe(familyKey(scn('b')));
  });
});

describe('proposeKeeper', () => {
  it('prefers the QT3 scalar, archives the rest', () => {
    const fam = [scn('S_QT4', 'QT4'), scn('S_QT3', 'QT3'), scn('S_QT5', 'QT5')];
    const r = proposeKeeper(fam);
    expect(r.keeper.scenario_id).toBe('S_QT3');
    expect(r.archive.map(s => s.scenario_id).sort()).toEqual(['S_QT4', 'S_QT5']);
    expect(r.noQt3).toBe(false);
  });
  it('falls back to an array that includes QT3', () => {
    const r = proposeKeeper([scn('S_ARR', ['QT3', 'QT4', 'QT5'])]);
    expect(r.keeper.scenario_id).toBe('S_ARR');
    expect(r.noQt3).toBe(false);
  });
  it('prefers scalar QT3 over an array that also includes QT3', () => {
    const r = proposeKeeper([scn('S_ARR', ['QT3', 'QT4', 'QT5']), scn('S_QT3', 'QT3')]);
    expect(r.keeper.scenario_id).toBe('S_QT3');
  });
  it('uses an existing baseline when no QT3 matcher exists', () => {
    const r = proposeKeeper([scn('S_BASE'), scn('S_QT4', 'QT4')]);
    expect(r.keeper.scenario_id).toBe('S_BASE');
    expect(r.noQt3).toBe(false);
  });
  it('flags noQt3 and promotes the lowest tier when no QT3 anywhere', () => {
    const r = proposeKeeper([scn('S_QT4', 'QT4'), scn('S_QT5', 'QT5')]);
    expect(r.keeper.scenario_id).toBe('S_QT4');
    expect(r.noQt3).toBe(true);
  });
});

describe('stripQualityTier', () => {
  it('removes quality_tier without mutating input or other matches', () => {
    const s = scn('a', 'QT3');
    const out = stripQualityTier(s);
    expect('quality_tier' in out.matches).toBe(false);
    expect(out.matches.paintable_item).toBe('x');
    expect(s.matches.quality_tier).toBe('QT3'); // input untouched
  });
});
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `cd "C:/Eric_AI_Playground/Claude Code Uni/Claude/tools/paintscope" && npx vitest run src/components/authoring/qt-builder/__tests__/collapse-core.test.js`
Expected: FAIL — cannot resolve `collapse-core.mjs`.

- [ ] **Step 3: Implement `collapse-core.mjs`**

Create `Claude/scripts/lib/collapse-core.mjs`:

```js
// Pure core for the QT3-baseline collapse. No fs, no engine — just classify,
// group, and choose the keeper per family. The migration script wires these to
// disk + the parity gate.

const TIER_ORDER = { QT2: 2, QT3: 3, QT4: 4, QT5: 5 };

function norm(v) { return Array.isArray(v) ? [...v].sort() : (v == null ? null : [v]); }

export function qtKind(s) {
  const qt = s?.matches?.quality_tier;
  if (qt == null) return 'baseline';
  if (Array.isArray(qt)) return qt.length > 1 ? 'array' : 'scalar';
  return 'scalar';
}

export function familyKey(s) {
  const m = s?.matches || {};
  return JSON.stringify({
    pi: m.paintable_item ?? null,
    am: norm(m.application_method),
    st: norm(m.substrate_state),
    ct: norm(m.coating_type),
  });
}

export function groupByFamily(scenarios) {
  const g = new Map();
  for (const s of scenarios) {
    const k = familyKey(s);
    if (!g.has(k)) g.set(k, []);
    g.get(k).push(s);
  }
  return g;
}

function tiersOf(s) {
  const qt = s?.matches?.quality_tier;
  if (qt == null) return [];
  return Array.isArray(qt) ? qt : [qt];
}
function includesQt3(s) { return tiersOf(s).includes('QT3'); }
function minTier(s) {
  const ts = tiersOf(s).map(t => TIER_ORDER[t] ?? 99);
  return ts.length ? Math.min(...ts) : 0; // baseline (no tiers) sorts first
}
const byId = (a, b) => String(a.scenario_id).localeCompare(String(b.scenario_id));

export function proposeKeeper(familyScenarios) {
  const fam = [...familyScenarios];
  const scalarQt3 = fam.filter(s => qtKind(s) === 'scalar' && tiersOf(s)[0] === 'QT3').sort(byId);
  const arrayQt3 = fam.filter(s => qtKind(s) === 'array' && includesQt3(s)).sort(byId);
  const baselines = fam.filter(s => qtKind(s) === 'baseline').sort(byId);

  let keeper, reason, noQt3 = false;
  if (scalarQt3.length) { keeper = scalarQt3[0]; reason = 'scalar-QT3'; }
  else if (arrayQt3.length) { keeper = arrayQt3[0]; reason = 'array-incl-QT3'; }
  else if (baselines.length) { keeper = baselines[0]; reason = 'existing-baseline'; }
  else { keeper = [...fam].sort((a, b) => minTier(a) - minTier(b) || byId(a, b))[0]; reason = 'promote-lowest'; noQt3 = true; }

  const archive = fam.filter(s => s !== keeper);
  return { keeper, archive, reason, noQt3 };
}

export function stripQualityTier(scenario) {
  const clone = JSON.parse(JSON.stringify(scenario));
  if (clone.matches) delete clone.matches.quality_tier;
  return clone;
}
```

- [ ] **Step 4: Run tests, verify they pass**

Run: `cd "C:/Eric_AI_Playground/Claude Code Uni/Claude/tools/paintscope" && npx vitest run src/components/authoring/qt-builder/__tests__/collapse-core.test.js`
Expected: PASS (all cases).

- [ ] **Step 5: Implement the migration script with parity self-gate**

Create `Claude/scripts/collapse-to-qt3-baseline.mjs`. Requirements (the implementer writes the code; this is the exact behavior):

- Run via `vite-node` (so it can import `scenario-matcher.js` and the bundle the same way `scripts/parity-estimate.mjs` does — read that script first to mirror its import/resolution approach). CLI: `vite-node Claude/scripts/collapse-to-qt3-baseline.mjs -- [--dry-run]` (default is dry-run; require an explicit `--apply` to write).
- **Load** all `Claude/scenarios/SCN_*.json` (root only; skip subdirs) into `{path, json}` records; build the module map from `Claude/modules/MOD_*.json` (root only).
- **BEFORE snapshot:** assemble an in-memory bundle `{ scenarios: [all source scenarios], modules: <map>, tasks, modifiers }` (mirror what the bundle generator assembles — read `build-scenario-bundle.mjs` to match field names). For every family, for **each tier in QT2..QT5**, build a concrete ctx from the family's matches (use the first array element where a matches field is an array; quality_tier = the tier) and call `findBestMatch`. Record `before[familyKey][tier] = { scenario_id, modulesSig: JSON.stringify(resolved.modules || []) }` (null if unmatched).
- **Plan:** `groupByFamily` → `proposeKeeper` per family. Build the post-collapse scenario set: `stripQualityTier(keeper)` for each family; drop the `archive` scenarios.
- **AFTER snapshot:** same per-family per-tier `findBestMatch` over the post-collapse set.
- **GATE:** assert `before[fam].QT3 === after[fam].QT3` (both `scenario_id` and `modulesSig`) for EVERY family. Also assert array-derived families are unchanged at QT2/QT4/QT5 too (bonus losslessness check). Collect every mismatch. **If any QT3 mismatch → print the offending families and EXIT NONZERO without writing**, even under `--apply`.
- **Report (always printed):** counts (families, kept, stripped-array, stripped-QT3-scalar, archived, collisions = families with >1 baseline-candidate, noQt3 families with ids), and the full list of files to be (a) rewritten in place (quality_tier stripped) and (b) moved to `archive/`.
- **Apply (only with `--apply` AND gate passed):** for each keeper, write the stripped JSON back to its file (2-space indent + trailing newline to match existing files — verify by reading one); for each archived scenario, `fs.mkdirSync('Claude/scenarios/archive', {recursive:true})` then `fs.renameSync` the file into it. Do NOT touch modules.
- Idempotent: re-running after apply is a no-op (families already single-baseline; gate still passes).

- [ ] **Step 6: Commit the script + core + tests**

```bash
cd "C:/Eric_AI_Playground/Claude Code Uni"
git add Claude/scripts/collapse-to-qt3-baseline.mjs Claude/scripts/lib/collapse-core.mjs "Claude/tools/paintscope/src/components/authoring/qt-builder/__tests__/collapse-core.test.js"
git commit -m "feat(qt-builder): QT3-baseline collapse migration script + pure core (TDD)"
```

---

## Task 2: Dry-run on real data and review the report (checkpoint)

**Files:** none (read-only run).

- [ ] **Step 1: Run the dry-run**

Run: `cd "C:/Eric_AI_Playground/Claude Code Uni" && npx vite-node Claude/scripts/collapse-to-qt3-baseline.mjs` (from `Claude/tools/paintscope` if `vite-node` resolves there — match `parity-estimate.mjs`'s invocation cwd).
Expected: the parity gate PASSES (no QT3 mismatches); the report shows ≈ 374 families, ≈147 QT3-scalar strips, ≈253 array strips, ≈295 archives, the collision list, and exactly the 1 known `noQt3` family.

- [ ] **Step 2: Sanity-check the report against the inventory**

Confirm: archive count ≈ 295 (16 QT2 + 140 QT4 + 139 QT5); stripped ≈ 400 (147 + 253); every family ends with exactly one baseline; `noQt3` lists only `window/spray/SS_PRIMED_FACTORY`. If the gate reported any QT3 mismatch, STOP — investigate that family's collision and adjust `proposeKeeper` (or special-case) so the keeper matches the pre-collapse QT3 winner; re-run until the gate is clean. Report the dry-run summary; do not proceed to Task 3 until the gate is green and the numbers are sane.

---

## Task 3: Apply the collapse, regenerate, and verify

**Files:** rewrites ~400 `Claude/scenarios/SCN_*.json` (quality_tier stripped); moves ~295 into `Claude/scenarios/archive/`; regenerates `scenario-bundle.gen.js`.

- [ ] **Step 1: Capture the pre-apply parity baseline (engine-level, project-based)**

If a representative exported project state exists (search `Claude/docs/Painting Project Profiles/*.json` and `Claude/tools/paintscope/src/**` fixtures for one covering interior + exterior at QT3), run:
`cd "C:/Eric_AI_Playground/Claude Code Uni/Claude/tools/paintscope" && npx vite-node scripts/parity-estimate.mjs -- <state.json> ../../..//tmp/parity-before.json`
Record `grandTotalHours`. If no suitable project file exists, rely on the script's built-in per-family QT3 self-gate (Task 1) as the parity authority and note that in the report.

- [ ] **Step 2: Apply**

Run: `cd "C:/Eric_AI_Playground/Claude Code Uni" && npx vite-node Claude/scripts/collapse-to-qt3-baseline.mjs -- --apply`
Expected: gate passes, then it writes strips + moves archives; prints the applied summary. Exit 0.

- [ ] **Step 3: Regenerate the bundle**

Run: `cd "C:/Eric_AI_Playground/Claude Code Uni" && node Claude/scripts/build-scenario-bundle.mjs`
Expected: success; `scenario-bundle.gen.js` rewritten. Confirm scenario count dropped by ≈295.

- [ ] **Step 4: Verify — full suite + bundle parity**

Run: `cd "C:/Eric_AI_Playground/Claude Code Uni/Claude/tools/paintscope" && npx vitest run`
Expected: all pass, 0 failed (structural engine tests still green; `derive-vantage`/`collapse-core` green).
Then, if Step 1 captured a baseline: re-run `parity-estimate.mjs` → `/tmp/parity-after.json` and assert `grandTotalHours` and the per-spec breakdown are **identical** to before (QT3 project ⇒ no change). Diff the two JSONs; any delta is a regression — investigate before committing.

- [ ] **Step 5: Build**

Run: `cd "C:/Eric_AI_Playground/Claude Code Uni/Claude/tools/paintscope" && npx vite build`
Expected: 0 errors.

- [ ] **Step 6: Commit (data + regenerated bundle)**

```bash
cd "C:/Eric_AI_Playground/Claude Code Uni"
git add Claude/scenarios Claude/tools/paintscope/src/data/scenario-bundle.gen.js
git commit -m "data(qt-builder): collapse all families to QT3 baseline (strip quality_tier; archive QT2/4/5 variants)"
```

---

## Task 4: Live-verify the payoff

**Files:** none.

- [ ] **Step 1: Start dev server + open QT Builder (admin, McLeod), as in the 1b-2b live-verify.**

- [ ] **Step 2: Confirm a former-array family is now an editable baseline.** Select `door` / `brush` / a served state. Confirm the tier headers now read `baseline` (not `shared · multi-tier`), edit affordances are present, and a `+ task` or coats edit on a tier **forks it** (header → `forked`, draft created, grid reflects, revert works) — the exact flow that was inert before. 0 console errors.

- [ ] **Step 3: Confirm a former-eager family collapsed too.** Select `closet` — tier headers should now read `baseline` (one baseline serving all tiers), not all-`forked`. Edits still fork-on-edit correctly.

- [ ] **Step 4: Stop the dev server. Report results.** No commit.

---

## Self-Review (completed during planning)

- **Spec coverage:** collapse all families (Task 1–3); QT3 invariant enforced by the self-gate (Task 1 Step 5, Task 3 Step 4); archive-not-delete (Task 1 Step 5); array-family losslessness asserted (bonus gate); no-QT3 edge handled + flagged (proposeKeeper `noQt3`); regen + verify + live payoff (Task 3–4).
- **Risk controls:** dry-run default + explicit `--apply`; gate aborts on any QT3 drift even under `--apply`; everything committed (reversible); archive is a move (restorable).
- **Out of scope (stated):** module `applies_when.quality_tier` (Phase 1c); scenario_id/file renames (cosmetic); removing the array-tier guard (kept as defensive).
- **Type/interface consistency:** `collapse-core` exports used identically in tests and the migration script; `findBestMatch` usage mirrors `parity-estimate.mjs` (implementer reads it first).
