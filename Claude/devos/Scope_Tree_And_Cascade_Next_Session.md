# Next Session: Scope Tree audit + Cascade Tooling summary

**Created:** 2026-05-08
**Branch:** `cranky-saha` worktree
**Why now:** construction-side data plumbing is settled (NC consolidation done, TRADE_MATERIAL/TRADE_OVERHEAD wired, module templates resolved, specialty tab calibrated). Time to look up at the view-model layer (Scope Tree) and the authoring-side meta-tooling (Cascade) and decide what ships next.

This session is **research + summarize, not build**. Output is two living docs the user can read and decide on. No code changes unless the user asks.

---

## Read first

Required, in order:
1. **`Claude/devos/Task_Consolidation_Next_Session.md`** — current overall state, what just shipped this session.
2. **`memory/project_scope_tree.md`** — Scope Tree framework v1.0, taxonomy, view orientations, audience defaults. The vision document.
3. **`memory/project_scope_tree_phase2_lab.md`** — Phase 2 plan: build in `/lab/scope-tree` sandbox before any production UI change. Lab vs production separation is the user's hard line.
4. **`Claude/devos/Authoring_Cascade_Tooling_Plan.md`** — three-phase cascade plan (smoke-on-publish, rename-with-cascade, bulk transforms). Prerequisites all shipped 2026-05-04.
5. **`Claude/tools/paintscope/src/engine/scope-tree.js`** — Phase 1 implementation (b3c6393, 2026-05-03). `buildScopeTree(estimateResult, project)` + `pivotTree(tree, orientation)`.
6. **`Claude/scripts/smoke-scope-tree.mjs`** — 20/20 passing as of last commit.

Optional context:
- `memory/project_paintscope_pre_production.md` — refactor freely, no migration plumbing.
- `memory/feedback_lab_before_production_ui.md` — why Phase 2 is sandbox-first.

---

## Task 1 — Audit Scope Tree (Phase 1) against current engine output

**Goal:** confirm Phase 1 still works, identify Phase 2 entry conditions.

The data layer shipped 2026-05-03. Since then:
- 5 module templates resolving 70+ extenders (could change the spec→module→task graph the tree consumes)
- TRADE_MATERIAL + TRADE_OVERHEAD modifier wiring (changes how baseRate displays — folded vs in modifier total)
- `wainscot_cap` retired entirely (substrate gone)
- Beams/columns moved EA → LF, mantels EA → SF (uoms changed mid-tree)
- Builtins emit SF instead of opening tier keys
- Universal coat task suffix logic ("— Primer" / "— Finish") on display names

**Audit checklist:**
- [ ] Run `node Claude/scripts/smoke-scope-tree.mjs` — confirm 20/20.
- [ ] Build a kitchen-sink project state (every group has at least one substrate) and call `buildScopeTree` against the live engine output. Spot-check that:
  - Substrate-level totals = sum of phase children
  - Phase totals = sum of task children
  - Project total = sum of room totals + Project Setup
  - Element groups bucket correctly (Trim items in Trim, Specialty items in Specialty, etc.)
- [ ] Verify the three pivots (`pivotTree(tree, 'phase')`, `pivotTree(tree, 'element')`, default `'room'`) preserve totals.
- [ ] Check that retired substrates (e.g., wainscot_cap) don't leave dead nodes.
- [ ] Spot-check the new substrate shapes (mantels SF, beams LF, columns LF) end up at correct levels with correct totals.
- [ ] Check the Coating level (level 4.5, suppressed when only one coating present) — does it surface correctly when a substrate has both paint and stain across rooms?
- [ ] Check the Protection virtual group (special-cased in framework) — does it render at element-group level with the substrate level skipped?

**Deliverable:** add an "Audit results" section to `memory/project_scope_tree_phase2_lab.md` capturing what works, what regressed, what's missing. If nothing regressed, write a one-paragraph "Phase 2 entry: GREEN" callout. If anything regressed, list it under "Phase 1 fixes needed before Phase 2."

---

## Task 2 — Summarize Cascade Tooling status

**Goal:** turn the cascade plan from "future work" into a Phase-1-ready ticket.

Read `Authoring_Cascade_Tooling_Plan.md` end-to-end. Then verify each of the listed prerequisites still exists (the plan was written 2026-05-04; some files may have been refactored):

- [ ] `findTaskUsage(taskId, modules)` in `TaskUsagePanel.jsx` — confirm signature + return shape.
- [ ] `ModuleUsagePanel` mounted inside `ModuleEditor`.
- [ ] Domain / activity-family / spec-family / phase filters on `TaskList` + `ModuleList`.
- [ ] Archive workflow + bundle exclusion.
- [ ] Regenerate-bundle button (Authoring header).
- [ ] Smoke runner currently file-system-bound (`smoke-scope-tree.mjs` uses node `fs`); Phase 1 needs a browser-portable variant.

**Deliverable:** add a "Status as of 2026-05-08" section at the top of `Authoring_Cascade_Tooling_Plan.md` with:
- Prerequisite checklist (✓ / 🟡 / ✗) with one-line notes
- Phase 1 (smoke-on-publish) entry-readiness verdict
- Recommended ordering: confirm or revise the plan's "Phase 1 → Phase 2 → Phase 3" sequence based on what's most useful given the user's current workflow (rate-edit cycles, naming cleanup, bulk pivots)
- Risks / open questions surfaced by the audit

---

## Pause point + decision request

After both audits are written up, surface a recommendation:

- **"Scope Tree Phase 2 next"** — go build the lab sandbox, treat cascade tooling as background work.
- **"Cascade Phase 1 next"** — ship smoke-on-publish first; lab sandbox waits until tooling is in place.
- **"Both in parallel"** — split the workstream (one session lab, one session cascade, alternating).
- **"Neither yet — different priority"** — surface anything else that should jump the queue based on the audit findings.

Each option has a one-line "why" and a "first move" so the user can pick on signal.

---

## Hard rules for this session

- **No code changes** unless the user asks for them after reading the audits. Audits are research output.
- **No new tooling.** Stick to reading existing code, running existing smoke, writing up findings.
- **No refactoring detected issues.** If the audit finds something broken, log it in the audit's "Fixes needed" section — don't fix it inline.
- **Verify against the running app**, not just static reads. If asserting "Phase 1 still works," run the lab route or the smoke script — don't infer from code shape alone.
- **Two short docs**, not one mega-doc. Scope Tree audit lands in `memory/project_scope_tree_phase2_lab.md`; Cascade audit lands in `Authoring_Cascade_Tooling_Plan.md`. Cross-reference between them where it matters.

---

## Background context (carry into the session)

- **PaintScope is pre-production.** Refactor freely. No migration plumbing. Standard reset: clear localStorage if the schema bit-rots.
- **The user verifies in the actual UI** — drive checkbox/tab interactions through preview tooling when something needs visual confirmation, don't rely on `preview_eval` alone.
- **Smoke regression is a publish gate when Cascade Phase 1 ships.** Until then, `node Claude/scripts/smoke-scope-tree.mjs` is the manual gate.
- **Field tracker is "soon."** That's the downstream pull on Scope Tree Phase 2 — field workers can't read flat task lists, so the tree's hierarchy is load-bearing for their UX.
