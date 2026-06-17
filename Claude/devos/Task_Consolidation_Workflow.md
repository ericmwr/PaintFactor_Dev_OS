# Task Consolidation Workflow — Reference

**Status:** EXECUTED — NC side complete 2026-05-05 (35 rounds in `Claude/_merge_log.jsonl`). Reusable playbook for repaint and exterior consolidation when those start.
**Created:** 2026-05-04
**Purpose:** Collaborative manual consolidation of near-duplicate tasks in the canonical bundle. User identifies candidate groups, AI executes the mechanical work for each group one at a time. Goal: shrink the ~2661 task catalog toward a smaller core set differentiated by intrinsic properties (rate, UOM, skill, modifier eligibility), with substrate-only variations collapsed.

**For the next session:** see `_NEXT_SESSION.md` — consolidation is no longer the active work.

---

## Pre-production calibration

Refactor freely. No production data, no live customer numbers, no time tracker history. Renames, archives, and bundle rewrites can be aggressive. See `memory/project_paintscope_pre_production.md`.

---

## Working agreement

- **User finds candidates** by browsing the Authoring tab with the filters (described below). When the user spots tasks that look like near-duplicates, they call the group out by name to the AI.
- **AI runs the consolidation checklist** for that one group, surfacing data, asking judgment-call questions, and executing the mechanical steps once the user confirms.
- **One group per round.** Don't batch. Each consolidation completes (archive + module rewrite + regen + smoke) before moving on. This keeps the merge log clean and the rollback story simple.
- **AI does NOT propose groups unprompted.** Pattern-matching what to consolidate is the user's judgment call — the AI's job is to execute well, not to drive the agenda.

---

## Tools that ship with this workflow (already built)

| Tool | Purpose | How to access |
|---|---|---|
| **Domain filter** | Interior / Exterior / Shared / Unused | Authoring → Tasks or Modules → top dropdown |
| **Activity-family filter** (Tasks only) | Show tasks of one painter activity (Caulk, Fill Fasteners, Vacuum Dust, etc.) — uses ACTIVITY_RULES dictionary | Authoring → Tasks |
| **Spec-family filter** | Tasks/Modules transitively reachable from a given SF_* | Authoring → Tasks or Modules |
| **Phase filter** | Engine phase — Modules native, Tasks transitive | Authoring → Tasks or Modules |
| **Search box** | Substring match on id and name | Authoring → all lists |
| **Unused filter value** | Entities with zero scenario coverage — first audit target | Domain filter dropdown |
| **TaskUsagePanel** | Single task → all modules referencing it (with override badge) | Inside TaskEditor, auto-shown |
| **ModuleUsagePanel** | Single module → all scenarios referencing it (with position chip) | Inside ModuleEditor, auto-shown |
| **Archive button** | Soft-delete; moves file to `Claude/{kind}/archive/` | TaskEditor / ModuleEditor / ScenarioEditor |
| **Archive tab** | Restore archived entries | Authoring → Archive |
| **Regenerate bundle** | Rebuild `scenario-bundle.gen.js` and HMR-reload the page | Top-right of Authoring header |

---

## Per-group consolidation checklist

When the user calls out a candidate group (e.g., "consolidate all Fill Fasteners tasks for trim"), the AI runs this sequence. Each step is gated by user confirmation if the call is ambiguous.

### 1. Surface the candidate set
- Apply filters to surface the group: activity, phase, spec-family, or search.
- Capture the list of candidate task IDs the user is targeting.
- Confirm count with user: "I see N candidate tasks. Are these the ones you mean?"

### 2. Equivalence pass
For each candidate, gather:
- `task_id`
- `name` (display label)
- `uom`
- `rate_per_hour` (or `fixed_minutes`)
- `skill_level`
- `modifier_eligibility` keys (which modifiers apply)
- Any per-module overrides (visible in TaskUsagePanel's "overrides" badge)

Present them to the user as a comparison. Highlight where any pair diverges. Ask:
- **Do all intrinsic properties match?** If yes, candidates are mergeable.
- **If they diverge:** is the divergence fundamental (different operation → keep separate) or orthogonal (could be a modifier → flag for the future, but maybe still merge for now if rates are within 5% and the user agrees)?

### 3. Pick the keeper
Ask user to nominate the canonical task ID. Either:
- Reuse one of the existing candidate IDs, OR
- Create a new normalized ID (e.g., `TSK_FILL_FASTENERS_LF`).

Capture the keeper's `name` (display label) — should be substrate-agnostic since the substrate context lives in the module, not the task.

### 4. Map module references (blast radius)
For each candidate task:
- Click into TaskEditor → TaskUsagePanel shows the modules referencing it.
- Build a list: `(deprecated_task_id, module_id, module_name, override_fields)`.

Present total: "X modules need their `task_ref` rewritten."

### 5. Rewrite module references
For each affected module, in this exact order:
- Open the module in ModuleEditor.
- Find the entry with `task_ref: <deprecated_id>`.
- Change the `task_ref` to the keeper's id.
- If the deprecated task had any module-level overrides, decide whether they still apply to the keeper (usually yes, since the override is on the module's reference, not on the task itself).
- Save as draft.
- Repeat for every affected module.

### 6. Smoke check
- Click "Regenerate bundle" — this runs `validateTaskRefs` automatically and will fail if any `task_ref` is dangling.
- If regen succeeds: bundle is internally consistent.
- If regen fails: there's an orphan reference somewhere. Open the failing module in editor, fix the reference, retry.

### 7. Archive deprecated tasks
For every deprecated task (everything in the candidate set EXCEPT the keeper):
- Open the task in TaskEditor.
- Click Archive button.
- Confirm.

The active TaskList immediately filters them out; the file lives in `Claude/tasks/archive/` for restoration if needed.

### 8. Final regen + smoke
- Click "Regenerate bundle" once more after archiving (the bundle will be smaller, validateTaskRefs runs again).
- If it still passes: consolidation is locked in.
- Run the scope-tree smoke (`node Claude/scripts/smoke-scope-tree.mjs`) to verify totals haven't drifted in the lab estimate.

### 9. Merge log entry
Append a single entry to `Claude/_merge_log.jsonl` (create the file if it doesn't exist). Format:

```json
{"date":"2026-05-04","group":"Fill Fasteners — Trim","keeper":"TSK_FILL_FASTENERS_LF","archived":["TSK_BASEBOARD_FILL_FASTENERS","TSK_WINDOW_CASING_FILL_FASTENERS","TSK_DOOR_CASING_FILL_FASTENERS","TSK_DOOR_FRAME_FILL_FASTENERS","TSK_WINDOW_JAMB_FILL_FASTENERS"],"modules_rewritten":12,"reason":"identical intrinsic properties (rate=120 LF/hr, uom=LF, skill=general); substrate context lives in module reference"}
```

The AI maintains this file by appending the entry after step 8 succeeds. Reading it later answers "did I already consolidate Fill Fasteners?" in seconds.

---

## Phasing strategy (suggested, user can override)

Walk one engine phase at a time. Within each phase, walk one painter activity at a time. The filters make this trivially navigable:

1. Set Phase filter → `prep`
2. Set Activity filter → `Fill Fasteners` → consolidate, log, archive
3. Activity filter → `Caulk Joints` → consolidate, log, archive
4. Activity filter → `Light Sand` → ...
5. Continue through every activity in `prep` until empty
6. Phase filter → `apply` → repeat
7. ... through every phase

Done definition for each phase: when the user has either consolidated or explicitly logged "no merge — these are different operations" for every activity family in that phase. No silent skips.

---

## Resume protocol across sessions

At the start of a new session, the AI should:
1. **Read this doc.**
2. **Read `Claude/_merge_log.jsonl`** if it exists — surfaces what's already been done.
3. **Ask the user where they left off** — by phase / activity / spec family, or "the last group I worked on was X".
4. **Verify state:** check the archive folder for any in-flight archives that didn't complete, and check for module drafts that still reference deprecated task_refs.
5. **Resume:** wait for the user to call out the next candidate group.

---

## What's out of scope for this workflow

- **Module renames.** The cascade tooling plan covers task ID renames. Module/scenario renames can come after the consolidation pass if needed. Don't rename modules during consolidation — just rewrite their `task_ref` strings.
- **Bulk transforms.** Cascade tooling covers "set rate on all X tasks to Y." During consolidation, focus on collapsing duplicates, not editing rates. Rates get tuned later, against the cleaner bundle.
- **Display-name normalization across all tasks.** Edit display names AS YOU GO during consolidation (the keeper gets a substrate-agnostic name) — but don't go back and rename the survivors that aren't being consolidated this round. The cascade tooling will offer bulk display-name editing later.
- **Modifier dictionary changes.** If a consolidation reveals that a modifier needs to grow (e.g., to absorb a substrate-specific variation), log the gap to the merge log entry's `notes` field but don't expand the modifier dictionary in this workflow. That's its own design exercise.

---

## Decision rules for the AI

1. **When candidates have identical intrinsic properties** → merge confidently. Same `(uom, rate, skill, modifier_eligibility)` and only differ in `task_id` / `name` / `ps_key`. The keeper takes the cleanest ID and substrate-agnostic name. Substrate context survives in the modules' references and their own ps_key (if any).

2. **When candidates differ on rate by ≤5%** → ask the user. Could be modifier territory ("apply a height-band modifier instead") or genuinely different work.

3. **When candidates differ on UOM** → DO NOT merge. UOM is fundamental.

4. **When candidates differ on skill_level or modifier_eligibility** → ask the user. Could be a real difference or could be authoring drift.

5. **When candidates differ on `name` only** → still merge (same intrinsic ID-equivalent). The keeper's name wins.

6. **When the user wants to merge despite an apparent fundamental difference** → trust the user, but log the rationale in the merge log entry's `notes`.

---

## First Move on the New Session

1. Read this doc in full.
2. Read `Claude/_merge_log.jsonl` if it exists. Note the last group consolidated.
3. Verify the dev server is running and the Authoring tab is accessible. Confirm the filter dropdowns work and `Regenerate bundle` is in the header.
4. Ask the user: **"Which group do you want to start with?"** Wait for them to call it out.
5. When they do, run the per-group checklist above.

The user will drive pace and selection. The AI's job is to be the disciplined hands.
