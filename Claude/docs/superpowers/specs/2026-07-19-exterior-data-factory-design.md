# Exterior Data Pass & Data Factory — Design

**Date:** 2026-07-19
**Status:** Approved direction (brainstorm session 7/19); companion to Eric's Notion notes "Notes on exterior 7-18-26"
**Supersedes:** nothing — the elevation/geometry end-state model (confirmed 2026-03-12) and the interim totals-first plan (2026-07-07) both remain valid. This spec defines *how the exterior data gets built*.

---

## 1. Problem

The exterior estimation data on file (166 `SCN_EXT_*` scenarios, their modules, and tasks) is autopilot-era AI output and is not trusted. 334 exterior/stain tasks have no production rate. Stain exists only for decks and fences. The authoring-UI substrate chips don't reflect what's in the data, so Eric cannot reliably browse what exists. The selector taxonomy in the exterior UI (Siding Type × Substrate State × Substrate Material × Texture Profile) conflates concepts and explodes combinations.

The exterior data must effectively be rebuilt — but systematically, with Eric's domain review as the quality gate, without repeating the old spec-factory failure mode (sprawling AI prose reviewed on autopilot).

## 2. Decisions made in this session

### 2.1 Taxonomy reform (conforms exterior to the existing interior dimensional model)

- **Material** (rename from "Siding Type", matching interior) — the substrate itself: cedar lap, T1-11, fiber cement, vinyl, aluminum, stucco, masonry, etc. Material implies physical composition; the separate **Substrate Material dropdown is removed**.
- **Substrate State** — coating level ONLY: bare / (factory-)primed / finished. Never conditions.
- **Substrate Condition** — prep need ONLY: sound / chipping-peeling / weathered / chalking / poor, etc. Distinct identifier from state; drives different estimating decisions.
- **Texture Profile dropdown is removed.** Texture survives only as smooth/rough where a material genuinely varies (cedar smooth vs. rough-sawn — may fold into Material; masonry smooth vs. rough). Most materials have exactly one texture.
- **Application Method is a required axis** (brush/roll, spray, spray-backroll…). The engine already matches on it; the UI currently has no selector for it. Method belongs per-substrate, NOT as an elevation override.
- Full grid for data authoring: **Material × State × Condition × Method** (at Quality Tier 3 baseline).

### 2.2 NC-first; no NC/RP restructure

NC/RP stays a scenario-matching axis (no restructure now — it would force an interior refactor too). But identifiers (materials, states, conditions) are designed once and shared, so the later repaint pass is gap-filling (adding condition-driven scenarios/modules), not re-modeling. Practical consequence: the **NC grid is small** — condition is nearly always new/sound, so NC ≈ Material × State (bare / factory-primed / pre-finished) × Method.

### 2.3 Quality tier baseline

All exterior data authored at **QT3**. No tier distinctions, no rate ranges/anchors (rate-ranges implementation is deferred per 2026-07-13 decision).

### 2.4 Power washing

A real phase-level concern, present on essentially every exterior job. Measurement is simple (footprint-scale surface area, no fine geometry). Production rate keys off **Material × Condition** (state barely matters): chipping/peeling wood slows the wash (removal work), chalking vinyl/aluminum may need hand scrubbing, sound smooth surfaces get a baseline rinse rate.

### 2.5 Repairs scope boundary

A **minor exterior repairs module** — fastener holes, small rot fill — triggered by condition poor/failing, with a heuristic production rate. Hard exclusion: no siding replacement, no true carpentry. (Repaint-side only; not in the NC pass.)

### 2.6 Trim

- **Trim is a category, not an item.** It's a descriptor spanning many distinct items — fascia, rake board, frieze board, corner boards/caps, soffit, window casing, door casing, water table, belly band — and these routinely differ from one another in substrate, state, condition, and desired finish on the same house. There is NO universal "trim LF + substrate/state/condition" selector. Each trim type gets its own substrate/state/condition (and finish) identity, and modules/scenarios are authored **per trim type**, mirroring how the interior trim category was structured (use interior trim's module/scenario organization as the reference pattern).
- Trim keeps substrate / state / condition selectors per type, but with reformed (much shorter) lists.
- **Profile is a universal modifier** on the trim type (ornate = slower: more caulk, more repairs, harder cutting), NOT new modules/scenarios per profile. Modifier values TBD during the data pass.
- **Under-12″ rule:** user enters actual width; engine rounds anything <12″ up to 1 LF-equivalent; real width is recorded for tracking.

### 2.7 Structural UI fixes (ride alongside the data pass; not a geometry build)

1. Access/height band auto-derived from the Height input (dropdown remains, auto-set).
2. Remove Application Method from elevation overrides (it's substrate-level).
3. Siding tab: carry over Identity-tab measurements; "Split into sections" button only when needed (no double entry).
4. Add per-substrate Application Method selectors.
5. Rename Siding Type → Material; remove Substrate Material and Texture Profile dropdowns per §2.1.
6. **Authoring-UI chip/filter gap — investigate history before proposing a fix.** Exterior modules exist (e.g. `MOD_PREP_EXT_SIDING`) but don't surface under siding/wall substrate chips. The authoring UI is Eric's inventory instrument and must reflect the data truthfully — but this has prior history: an earlier interior pass archived modules/scenarios and introduced **universal keepers** (shared production rates across many modules; see the keeper migration worklist at `Claude/_keeper_migration_plan.md` — 19 ORPHAN keepers remain), and there were known technical difficulties fully categorizing the data system for chip filtering. Research that history first; do not design a fresh chip fix from scratch.
7. Sub-elements (bump out, dormer, gable, roofline) inherit elevation-level selections (siding type, trim, soffit, rake, fascia).

## 3. The Data Factory — architecture

The old spec factory stays retired; nothing is revived. The new factory is **a procedure, not an application**:

> For one grid cell (e.g. wood lap siding × bare × spray, QT3), research how professional contractors actually perform the work — wash, prep, prime, caulk, coat sequence, materials, rough production expectations — and compress it into a short **structured brief** written in the scenario engine's own vocabulary (phases, tasks, materials, rates). Eric reviews/corrects/approves the brief. The approved brief is translated into tasks, modules, and scenarios.

Key properties that fix the old failure mode:

- **Structured outputs, not prose.** Briefs are forced into an exact template (phases → tasks → materials → rate expectations). Review is scanning a form, not reading an essay.
- **Human gate per cell.** Eric's domain review happens on compact per-cell briefs, not sprawling documents.
- **Engine vocabulary from day one.** No lossy spec→scenario translation step.

### Doctrine and rules (decided 2026-07-19)

The old factory's three layers — doctrine (researched domain knowledge), rules (generator constraints), specs (generated output) — map onto the new factory as follows:

- **Doctrine is kept, as the research layer briefs draw from.** A slim per-Material reference document ("how does this substrate behave; what does professional practice require"), researched once and reviewed once, gives every brief for that material the same factual foundation and prevents cell-to-cell contradictions at scale. Briefs *cite* doctrine; doctrine answers knowledge questions, briefs make per-cell decisions in engine vocabulary.
- **Safety change vs. the old system: doctrine NEVER feeds the engine directly.** Nothing fires from doctrine. A doctrine error can only reach engine data by surviving Eric's review of a short structured brief. Doctrine is allowed to be imperfect; the human gate sits on briefs.
- **The existing corpus (~45 docs in `docs/Doctrine/`, ~25 exterior, mostly Mar 2026 NotebookLM deep research) is treated as untrusted input, not discarded.** Sampled quality is real (e.g. Exterior_Wood_Siding_Systems_Doctrine: extractive chemistry, mill glaze, weathered-wood prep). The pilot's research step starts by reading and verifying/correcting the relevant doctrine against fresh sources rather than researching from zero — and thereby tests empirically, on one document, whether the corpus is salvageable-with-review.
- **Rules-as-documents are retired.** What rules enforced in prose is now enforced mechanically: the brief template's required fields, the locked taxonomy vocabulary, and the factory skill's checklist. (Living rules content already migrated into the activity-rules dictionary and project conventions.)

### Build phases

1. **Pilot = factory v1 (inline, no machinery).** One substrate run directly in-session: web research + brief template + live review with Eric. The pilot's real product is the **validated brief template and procedure**; the wood-siding data is the bonus. Per established working practice: inline execution when ceremony outweighs value.
2. **Freeze as a Skill.** Once validated, the procedure (brief template, taxonomy vocabulary, review-gate rules, brief→data translation steps) is captured as a Claude skill so every future run behaves identically. *Check the shelved 2026-07-11 data-pass-skills design spec first for reusable thinking — do not rebuild what's already designed.*
3. **Scale with a Workflow.** Remaining NC grid cells run as a scripted agent fan-out: each cell's researcher returns a structured brief; a checker validates each brief against the taxonomy; results queue for Eric's review gate. Deterministic script controls flow.

## 4. Sequence

1. **Taxonomy** — inventory every exterior identifier that exists today (materials, states, conditions, textures, methods, trim types) and reform into clean approved lists per §2.1, designed for repaint reuse. Deliverable: a document Eric reviews and approves.
2. **Pilot** — wood lap siding (chosen because its rich prep story stress-tests the brief template; aluminum would leave the template looking done when it isn't) through research → brief → review → tasks/modules/scenarios, inline.
3. **Freeze** — factory procedure becomes a skill.
4. **Scale** — workflow fan-out across the remaining NC grid; UI structural fixes (§2.7) land alongside so the data can be browsed and exercised as it fills in.
5. **Later (separate pass):** repaint gap-fill reusing the same identifiers; then the stain gap (§5).

## 5. Open threads (parked, to address later)

- **Storm windows** — layered over real windows, wood or metal; handling scenarios (removed? stay in place?) undefined. Repaint-side concern.
- **Trim profile modifier values** — the modifier concept is approved; numbers TBD.
- **Stain gap** — only deck/fence stain scenarios exist (also untrusted autopilot output needing review/replacement); no siding or trim stain (solid/semi-transparent bodies) anywhere in UI or data.
- **Openings model** — noted in Eric's 7-18 notes but NOT yet design-discussed; current exterior openings section is untrusted AI output. Intended shape: mirror the interior NC opening model (windows/doors are made up of openings; size buckets → trim perimeter for casing + siding deductions for materials; some windows/doors painted, some not; door opening accounts for trim and frame). Interior UI concepts are reusable, but exterior needs its own scenarios, modules, tasks, production rates, and material types. Open design questions: size bucket definitions, how deductions work in the interim totals-entry UI, whether sash/grid/muntin complexity needs a dimension, and **storm window handling** (layered over real windows, wood or metal; removed vs. left in place — repaint-side). Scope note: the Step 1 taxonomy inventory covers openings only *lightly* (window/door casing appear as trim types; door/window materials and states appear in identifier lists) — the openings *model* needs its own dedicated design session, sequenced **after the wood lap siding pilot proves the factory and before scaling into window/door grid cells**.
- **Repaint pass** — condition-driven scenarios, minor-repairs module (§2.5), power-wash condition variants beyond baseline.
- **Existing 166 scenarios' disposition** — during taxonomy/pilot, decide per family: reform in place vs. replace. Deck/fence stain flagged for review.
- **Authoring-UI chip audit** — the chip gap may be systemic across the authoring search filters, not just exterior modules.
- **`spray_backbrush` UI default** — currently a default in `IdentityTab.jsx` with zero scenarios behind it for wood siding/trim/door/window/porch floor; resolve during the data pass (author scenarios or change the default).

## 6. Out of scope

- Elevation/geometry generator UI (deferred per 2026-07-07; end-state model unchanged).
- NC/RP scenario-axis restructure (declined 2026-07-19).
- Rate ranges / anchors (deferred 2026-07-13).
- Quality tiers other than QT3.
- True carpentry / siding replacement in repairs.
- Reviving any part of the retired spec factory or SF_* pipeline.
