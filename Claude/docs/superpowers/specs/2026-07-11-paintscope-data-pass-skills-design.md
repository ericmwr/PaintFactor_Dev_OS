# PaintScope Data-Pass Skills — Design Spec

**Date:** 2026-07-11
**Status:** Approved design, pending implementation plan
**Scope:** Three Claude Code skills + one lint script + one baseline file supporting the current exterior data pass and interior QT rate pass.

## Goal

The recurring failure modes during PaintScope data work are (1) convention drift (wrong prefixes, enums, IDs), (2) silent data regressions (bundle counts dropping unnoticed), and (3) rate-model violations (per-tier tables mixed with QT modifiers, missing anchors). Today the defenses against all three live in memory files and ad-hoc recall. This project turns them into invocable skills backed by deterministic tooling.

## Deliverables

```
.claude/skills/check-conventions/SKILL.md     (repo root: Claude Code Uni/.claude/skills/)
.claude/skills/verify-paintscope/SKILL.md
.claude/skills/rate-pass/SKILL.md
Claude/scripts/lint-conventions.mjs            (new deterministic linter)
Claude/scripts/bundle-baseline.json            (new committed baseline of expected counts)
```

Out of scope for this round: hooks, scheduled/background tasks, `/deploy-paintscope`, `/handoff`, `/author-scenario`, and resolving the missing dev-tracker docs.

## 1. `lint-conventions.mjs` + `/check-conventions`

### Script

- **Location:** `Claude/scripts/lint-conventions.mjs`, run with `node`, no dependencies beyond what `Claude/scripts/package.json` already provides.
- **Inputs scanned:** `Claude/tools/paintscope/src/data/*.js` (excluding `__tests__/`) and the scenario bundle source files consumed by `build-scenario-bundle.mjs`. The file list is defined in the script as a glob constant so new data files are picked up automatically.
- **Rules (each with a stable rule ID):**
  - `CON-PREFIX` — condition IDs use `CON_`, never `CONS_`.
  - `TASK-CLASS` — field name is `task_classification`, never `task_class`.
  - `SEVERITY-ENUM` — severity values are exactly `critical` / `major` / `minor`.
  - `PHASE-ENUM` — phase values are exactly `setup` / `prep` / `prime` / `apply` / `interstage` / `finish` / `cleanup`; `protect` and `protection` are violations.
  - `UNIT-CASE` — units are uppercase from the set `EA, SF, LF, SHEET, ROLL, QT, TUBE`.
  - `CONSUMABLE-ENUM` — `consumable_category` values are exactly `applicator` / `protection` / `abrasive` / `tool` / `prep`.
  - `ZONE-NAME` — zone is `hardware_covers`, never `door_hardware`.
  - `SHEEN-SINGLE` — sheen values are single (no compound values like `satin/semi-gloss`).
  - `INPUT-IDS` — canonical input IDs only: `IN_EA_ROOMS_TOTAL`, `IN_SF_PROTECT_FLOOR_EXPOSED`, `IN_SF_FLOOR_VACUUM_AREA`, `IN_SF_PROTECT_FLOOR_PERIMETER`; known short/alt forms are violations.
- **Output:** one line per violation — `file:line  RULE-ID  found "<text>" expected <rule summary>` — plus a summary count. Exit 0 when clean, exit 1 when violations exist.
- **Suppression:** none in v1. If a legitimate exception is ever needed, the rule itself gets refined rather than adding inline suppression comments.

### Skill

- **Frontmatter description:** triggers when working on PaintScope data files, authoring scenarios/tasks/modules, or when the user asks to check conventions.
- **Body:** run the script, present violations grouped by rule, offer to fix them, re-run to confirm clean. The SKILL.md also carries the full rule table (mirroring the script) with the instruction: *when a new convention is established, add it to the script and this table in the same change — the script is the enforcement, this table is the documentation.*

### Acceptance

First run against current data either passes clean or surfaces genuine latent violations. Any false positives found during the first run are fixed in the script before the skill is considered done.

## 2. `bundle-baseline.json` + `/verify-paintscope`

### Baseline file

- **Location:** `Claude/scripts/bundle-baseline.json` (committed; `Claude/database/scenario.db` itself stays gitignored).
- **Schema:**

```json
{
  "updated": "2026-07-11",
  "modules": 570,
  "scenarios": 519,
  "tasks": 0,
  "by_substrate": { "<substrate>": { "modules": 0, "scenarios": 0 } },
  "note": "one-line description of the last intentional change"
}
```

Actual values are captured from a real build during implementation, not hand-typed.

### Skill workflow

1. Run the PaintScope test suite (`npm test` in `Claude/tools/paintscope`).
2. Rebuild the bundle/db via `Claude/scripts/build-scenario-db.mjs` (which runs the bundle build).
3. Run `lint-conventions.mjs`.
4. Extract current counts (total modules, scenarios, tasks, per-substrate breakdown) and diff against `bundle-baseline.json`. The per-substrate breakdown exists so a loss in one area cannot hide behind growth in another.
5. Report: tests pass/fail with output, lint clean/violations, counts table with deltas.
6. **Baseline update rule:** if counts changed and the session's work explains the change, update the baseline (values + `updated` + `note`) as part of the run and state this in the report. If counts *dropped* without an in-session explanation, do NOT update the baseline — flag it as a probable regression and stop.

### Acceptance

Running `/verify-paintscope` on a healthy checkout produces a green report and makes no changes. Deleting a scenario and re-running produces a flagged count drop without baseline mutation.

## 3. `/rate-pass`

### Shape

Guardrail loader, not a structured walker: it arms the session with the rate-model rules and validation habit, then follows the user's lead on which rates to work.

### On invoke, load into context

- **Rate-ranges model:** rates carry low/high plus an explicit modifier-neutral anchor; for one-sided exterior condition modifiers the anchor is top-of-range; envelope check is a *warning*, never a hard block; the tracker logs category hours disaggregated via estimate-predicted proportions.
- **QT rate model:** a single QT3 baseline rate plus a TIME MODIFIER on `qt_scaled` tasks. Never per-tier rate tables AND a QT modifier together — that double-counts tier effects.
- **Known debt:** ~334 stain/exterior tasks have null `rate_per_hour` (interior paint is done); flag rather than silently skip when editing touches these.
- **File pointers:** `Claude/tools/paintscope/src/data/scenario-rate-data.js` and related rate sources (exact list confirmed during implementation).

These rules are written into the SKILL.md as the canonical copy — the skill is self-contained and does not depend on memory files being loaded.

### Structural steps (the only rigid parts)

1. Before finalizing any batch of rate edits: run a violation check against the two models above (anchor present, anchor within envelope → warn if not, no per-tier+modifier double-dipping, no new nulls introduced).
2. On session close: suggest `/verify-paintscope`.

### Acceptance

Invoking `/rate-pass` and making a compliant edit produces no friction; attempting a per-tier table on a task that already carries a QT modifier gets caught in the pre-finalize check.

## Build order

1. `lint-conventions.mjs` (everything else references it) → first-run cleanup of any real violations it finds.
2. `/check-conventions` SKILL.md.
3. `bundle-baseline.json` captured from a real build → `/verify-paintscope` SKILL.md.
4. `/rate-pass` SKILL.md.

## Risks

- **Skill discovery location:** skills are placed at the repo root `.claude/skills/`. If a session rooted at `Claude Code Uni/Claude` fails to discover them, fall back to duplicating into `Claude/.claude/skills/` — verify discovery as part of implementation.
- **Input-ID rule breadth:** the canonical input ID list is short; the linter only flags *known* alt forms rather than attempting to validate all `IN_*` identifiers, to avoid false positives.
- **Baseline staleness:** mitigated by the update-during-verify rule; the `note` field keeps a one-line audit trail.
