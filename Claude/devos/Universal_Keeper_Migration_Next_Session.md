# Next Session Pickup — End of 2026-05-13 Session

**Last updated:** 2026-05-13 (end-of-session handoff)
**Branch:** `claude/cranky-saha` (head `7c73255`, all commits pushed to origin)
**Resume protocol:** read this doc → check Notion live page → start work

---

## Where we are (one paragraph)

Universal keeper migration is **substantially complete**. All 8 cleanup keepers are resolved (7 active in target modules; 1 retired as a mistake). Plus this session: door family rename cleanup, cabinet/window keeper wiring, full Notion sync (18 status flips + 6 new keeper pages), KNOT_COUNT sweep, SF_TRIM retirement tail (9 orphan task archives + 488-row db-bundle scrub), floor-covering inspect+repair feature wired into 526 interior scenarios, drywall finish specs gap investigated and resolved as stale-doc-only. The user made a strategic decision to **retire the Specification System entirely** — captured in `memory/project_spec_system_retirement.md`. New work should not re-entrench SF_* indirection.

---

## Live status source of truth

**Notion page:** [PaintScope Universal Keeper Migration — Status & Backlog](https://www.notion.so/35e3ab2c2a5b81bd9629c6068de53be0) — fully synced as of end-of-session.

Update the Notion page as items move, not this doc. This file is a frozen handoff.

---

## Commits this session (chronological)

| Commit | Subject |
|---|---|
| `782314e` | rename TSK_DOOR_PATCH_REPAIR → TSK_WOOD_PUTTY_EA_SIDE |
| `a22867e` | wire TSK_SPACKLE_DEFECT_EA into cabinet prep + window interstage |
| `f00d638` | finish interior knot-prime task retirement (13 modules + 2 archives + db-bundle scrubs) |
| `8b52c00` | SF_TRIM retirement tail cleanup — archive 9 orphan trim tasks |
| `97546ab` | scrub retired SF_TRIM_NC_* rows from db-bundle files (488 rows) |
| `7c73255` | wire floor-covering inspect+repair into interior scenarios (526 scenarios via MOD_INTERSTAGE_FLOOR_PROTECT_CHECK) |

All 6 commits pushed to origin.

---

## Bundle state at end of session

- 1726 tasks
- 723 modules (+1 from MOD_INTERSTAGE_FLOOR_PROTECT_CHECK)
- 709 scenarios
- 45 orphans
- 86/86 protection probe ✓
- 0 legacy task leaks
- 0 unresolved module refs

---

## Strategic direction

**Specification System retirement** — captured 2026-05-13 in `memory/project_spec_system_retirement.md`. The user has decided to retire SF_*, db-bundle.js spec tables, /specs/SF_*_v1/ folders, and the Rates tab entirely. Scenario Engine becomes the exclusive estimation system. Full audit + implementation plan required before code changes begin. **Any new work should be designed to NOT re-entrench the Spec System** — rate tables, modifier eligibility, state transitions should be substrate-or-scenario-keyed, not `spec_family_id`-keyed.

---

## What's next (in priority order)

### Pending on the Notion deferred backlog

**Code / data layer:**
- PaintScope Setup Dropdown Cleanup — Application Method + Surface Texture UI removed 2026-04-08; 6 engine fallback consumers still wired
- Painter-side glass mask — 3 painter-side tasks + 2 protection-side ps_keys engine never emits; placeholder for unbuilt feature (don't archive)
- Per-phase application method (prime vs finish split) — substrate.application_method is shared; need `application_method_prime` + `application_method_finish`
- Wood Wall Substrate — allow walls to be wood with full geometry/deductions
- Multi-Coat Per-Coat Rates — engine plumbing already exists (`rates_by_coat`, `coat_2_rate_multiplier`, `coatNumber` threading). Session 2026-05-13 explored rolling out `coat_2_rate_multiplier: 1.25` across 84 coating-application tasks; reverted because the rate-vs-modifier display semantics created confusion. Pick up with a clearer UX decision first (see "Open design questions" below)
- Protection tape types per surface — material-layer concern (delicate / duct / sealable green-frog)
- Universal Protect Mode — per-substrate protect toggle beyond cabinet+closet

**UI / feature work:**
- Finish Groups + Scope Options
- Spec Editor Materials (note: will be moot once Rates tab is retired per Spec System retirement)
- Color Catalog
- Protection rollout — 5 UI priorities (project setup heuristics panel, detail panel enum cleanup, per-room overrides, estimate visibility, outlier indicator)
- Editable rates in Scope Tree Lab (parked, blocked on QT builder)

**Architecture:**
- QT Builder rewrite (parked)
- Protection tab → summary view (parked, post-protection-on-identity refactor)
- Sequencing Engine concept (parked, not scoped)
- **Spec System retirement** — see strategic memory; audit + implementation plan needed

### Out of scope (don't touch without user direction)

- Equipment setup/cleanup model — 72 tasks retired in `00c9eac` with no replacement. Park until proper "per-job equipment overhead" model is designed.
- Legacy `SF_DOOR_SLAB_INT_NC_STAIN_v1` retirement — queue for formal retirement when other legacy specs get swept.
- Trim apply → coating-neutral keepers — would converge trim's "Stain Brush+Wipe" / "Sealer Brush (LF)" pattern with the door coating-neutral keeper + `displayTaskName` material-suffix pattern.

---

## Open design questions (surface before starting)

### Multi-Coat Per-Coat Rates — UX decision needed

The engine supports per-coat rates via three task-JSON shapes: `rates[]`, `rates_by_coat`, `coat_2_rate_multiplier`. None currently in use. Engine math is `effectiveRate = baseRate / modifier_total` where ALL existing modifiers are slowdowns (> 1 = slower, divided into rate).

A coat-2 speedup (rate × 1.25) doesn't fit the existing modifier semantic cleanly. The 2026-05-13 attempt to roll out `coat_2_rate_multiplier: 1.25` got stuck on this UX question:

- **Option A** — fold coat into baseRate display (TRADE_MATERIAL pattern). Rate column changes per coat; modifier column shows nothing about coat.
- **Option B** — store coat as inverse (0.8) in modifier stack (height/complexity pattern). Rate column stays canonical; modifier total drops below 1.0 for coat 2 (indicates net speedup).
- **Option C** — refactor modifier system to be direction-aware (each modifier has a slowdown vs speedup direction). Coat stored as 1.25 displayed as 1.25 multiplier. Cleanest long-term but requires touching modifier compound logic across the engine.

User did not pick a direction; reverted the rollout. Resume by asking which model to commit to, then propagate.

### Spec System retirement

Audit needs to map every consumer of:
- `Claude/tools/paintscope/src/data/spec-maps.js` (9 engine files import its exports)
- `Claude/tools/paintscope/src/data/db-bundle.js` spec tables (spec_families, sop_modules, sop_tasks, task_production_rates, factor_modifiers, quality_tier_effects, spec_required_inputs, material_systems, material_coverage_profiles, spec_protection_zones, coat_counts)
- `Claude/specs/SF_*_v1/*.json` (~40 folders)

Then propose substrate-or-scenario-keyed replacements for each role.

---

## Tooling cheatsheet

```sh
# Bundle rebuild — required after any module/task/scenario edit
node Claude/scripts/build-scenario-bundle.mjs

# Probe — verifies protection coverage + no leaks + all refs resolve
node Claude/scripts/probe-protection-tasks.mjs

# Task coverage classification (uses ledger of fired tasks)
node Claude/scripts/classify-task-coverage.mjs ~/Downloads/paintscope-fired-tasks-*.json

# Session migration scripts (kept on disk for reference)
node Claude/scripts/retire-knot-prime-tasks.mjs            # f00d638
node Claude/scripts/scrub-retired-trim-from-db-bundles.mjs # 97546ab
node Claude/scripts/inject-floor-protect-check.mjs         # 7c73255
```

---

## Project state

- **Branch:** `claude/cranky-saha` at `7c73255` (pushed)
- **Dev server:** vite on `localhost:5183`, root at `Claude/tools/paintscope/`. `npm run dev -- --port 5183`
- **Engine:** scenario engine is default (`run-estimate-scenario.js`); legacy `run-estimate.js` is deprecated
- **Verification doctrine:** mechanical migration → build + probe; UI-visible → verify on localhost:5183 with McLeod

---

## How to start next session

1. Read this doc (you just did).
2. Skim the Notion live page for any updates since this handoff: https://www.notion.so/35e3ab2c2a5b81bd9629c6068de53be0
3. Skim `memory/project_spec_system_retirement.md` if you're picking up retirement-related work — it sets the direction for HOW new work should be designed.
4. Pick from the deferred backlog OR scope the Spec System retirement audit.
5. For Multi-Coat Per-Coat Rates: surface the UX decision question to the user **before** writing code.

---

## Surprises / gotchas

- **`coat_2_rate_multiplier` is on disk but not in use** — the 84-task rollout was reverted at end of 2026-05-13 session. Engine `resolveTaskRate` still supports the field at priority 4, but no live tasks currently set it. Don't be confused by the engine support.
- **db-bundle.js is consumed live** — by `spec-editor-reducer.js`, `useSpecData.jsx`, and a comment in `run-estimate-scenario.js`. Removing data from it affects the Rates tab. Pre-Spec-retirement work should preserve compatibility.
- **MOD_INTERSTAGE_FLOOR_PROTECT_CHECK fires once per scenario** — uses `PS_PROTECT_SF.FLOOR_AREA` ps_key (NOT the legacy `PS_PROTECT_SF.FLOOR_EXPOSED` which was removed). Gates on `floor_mask_level` ∈ {full, encapsulate, edge_full, edge_encapsulate}. Edge-only / partial / spot DON'T trigger it (LF coverage, not SF).
- **TSK_INSPECT_REPAIR_FLOOR_COVERING_SF wasn't where the memory said it was** — the 6-day-old memory note claimed it was wired into 3 drywall interstage modules. It was actually orphan from creation. Trust git history over old memory notes.
- **The Drywall Finish Specs "gap" was a stale doc artifact** — the engine has full coverage under different module names than the spec files. Don't get baited by stale spec file references.
- **Pre-existing untracked files** — `Claude/_task_coverage_report.csv`, `Claude/scripts/report-consolidation-candidates.mjs`, and 6 `TSK_ROLL_*` / `TSK_SPRAY_*` files in `Claude/tasks/archive/` were untracked at session start and remain so. Don't `git add Claude/` blindly.
