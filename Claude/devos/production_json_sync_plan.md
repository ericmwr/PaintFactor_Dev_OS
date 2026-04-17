# production.json ↔ Bundle Sync Plan

Status: draft
Owner: Eric / Claude
Depends on: commit `a6ea958` (surgical revert restoring engine rates)

## Problem

The PaintScope engine reads rates from `Claude/tools/paintscope/src/data/db-bundle.js`. The bundle is a compiled snapshot of `Claude/database/paintfactor.db`, which is itself imported from the spec `production.json` files via `database/scripts/import_spec.py`.

Over time, three independent write paths have drifted apart:

1. **Spec Editor UI** — `components/rates/TaskEditRow.jsx` writes rate edits to in-memory state via `useSpecData`. Those edits feed the engine for the current session, and can be exported to `db-bundle.js`, but nothing writes them back to `production.json`.
2. **Direct `production.json` edits** — some commits authored rate changes in `production.json` without running `import_spec.py` + `export_db_bundle.py` afterward.
3. **`import_spec.py --reimport`** — deletes and re-inserts a spec's rows from the current `production.json`, silently overwriting anything the Spec Editor may have calibrated in the DB.

Net effect, observed on 2026-04-17: running `import_spec.py` on two specs plus a single bundle regeneration activated ~70 dormant rate changes that had been sitting in `production.json` for months. Total project hours jumped ~100h and bid price ~$4k with no visible code change. Commit `a6ea958` restored the bundle to the pre-session state and reapplied only the 19 intentional rate bumps.

## Goal

Make `production.json` the durable source of truth for every rate currently firing in the engine, so any future `import_spec.py` run is safe and reversible.

Non-goals (intentionally deferred):

- Auditing whether every bundle rate is _correct_. Scope is sync, not re-tuning.
- Rewriting the Spec Editor UI. That's a separate follow-on.
- Touching spec fields other than `task_production_rates` entries (rates, ranges, `applies_when`) unless needed to keep a rate referenced.

## Scope

17 spec families have known drift between bundle and `production.json` rates (from the 2026-04-17 diff):

| Spec family | Estimated changed rates | Priority |
|---|---:|---|
| SF_DRYWALL_WALL_NC_FINISH | 16 | high |
| SF_DRYWALL_CEILING_NC_PRIME | 12 | high |
| SF_DRYWALL_WALL_NC_PRIME | 10 | high |
| SF_DRYWALL_CEILING_NC_FINISH | 10 | high |
| SF_TRIM_NC_PAINT | 3 | high |
| SF_TRIM_NC_PRIME | 2 | high |
| SF_ARCH_ELEMENT_NC | 1 | low (suppressed clean-tool) |
| SF_BUILTIN_NC | 1 | low (suppressed clean-tool) |
| SF_CABINET_NC_PAINT | 1 | low (suppressed clean-tool) |
| SF_DOOR_FRAME_NC_FINISH | 1 | low (suppressed clean-tool) |
| SF_DOOR_SLAB_INT_NC | 1 | low (suppressed clean-tool) |
| SF_STAIR_RAILING_NC | 1 | low (suppressed clean-tool) |
| SF_STAIR_RISER_NC | 1 | low (suppressed clean-tool) |
| SF_WAINSCOT_PANEL_NC | 1 | low (suppressed clean-tool) |
| SF_WINDOW_INT_NC | 1 | low (suppressed clean-tool) |
| SF_WOOD_CEILING_NC | 1 | low (suppressed clean-tool) |
| SF_WOOD_WALL_NC | 1 | low (suppressed clean-tool) |

"Low priority" = rate change is on a task that's in `SUPPRESSED_TASKS` in `run-estimate.js`; the value doesn't affect any estimate today, but we still want the files consistent.

## Guiding rules

1. **Bundle wins.** `db-bundle.js` currently carries the rates the user intentionally calibrated. `production.json` must match the bundle, not the other way around.
2. **Per spec, atomic commit.** One commit per spec family. Commit message records what changed and why.
3. **Zero-delta invariant.** After each sync, re-importing the spec and re-exporting the bundle must produce a byte-identical `db-bundle.js` to what's on `main` now. Any deviation = the sync is wrong, back out.
4. **No opportunistic edits.** Don't "improve" rates, rename tasks, or reorder keys during a sync commit. Pure mirror.

## Phases

### Phase 1 — Build the diff report (half hour)

Produce a single-file audit that for every spec lists every rate where bundle != production.json.

Deliverable: `Claude/devos/reports/production_json_drift_2026-04-17.md` with one table per spec. Columns: `task_id`, `applies_when`, `bundle_rate`, `production_json_rate`, `bundle_fixed_minutes`, `production_json_fixed_minutes`, `notes`.

Implementation: new script `database/scripts/audit_bundle_vs_production.py` that:

- Loads `db-bundle.js` (strip `export const DB_BUNDLE =` header, parse JSON)
- Walks every spec directory under `Claude/specs/`
- For each `task_production_rates` row, compares bundle and file
- Emits Markdown

This becomes the working document for Phase 3.

### Phase 2 — Triage (15 min, human review)

Walk the report and mark each row as:

- **SYNC** — update `production.json` to bundle value. Default for most rows.
- **REVERT** — update bundle to `production.json` value instead. Use when the bundle rate is clearly wrong (e.g. typo, unit confusion) and the `production.json` value is what you want.
- **INVESTIGATE** — don't commit yet. Flag for a separate review.

This happens on a branch or in the report file itself, not in code.

### Phase 3 — Spec-by-spec sync (1-2 hrs)

Order of operations, highest impact first:

1. SF_DRYWALL_WALL_NC_FINISH
2. SF_DRYWALL_CEILING_NC_FINISH
3. SF_DRYWALL_WALL_NC_PRIME
4. SF_DRYWALL_CEILING_NC_PRIME
5. SF_TRIM_NC_PAINT
6. SF_TRIM_NC_PRIME
7. All remaining specs (batch in one or two commits since they're mostly single-row clean-tool fixed_minutes changes)

For each spec:

1. Apply Phase 2 SYNC decisions to that spec's `production.json` — edit `rate_per_hour`, `rate_range_low`, `rate_range_high`, `fixed_minutes` as needed. Leave `applies_when` alone. If the bundle has a task that isn't in `production.json` (like the SPRAY_R1/R2 cutins we just removed), do not re-add them unless explicitly marked SYNC.
2. Run `python3 database/scripts/import_spec.py specs/<SPEC_DIR>/ --reimport` to refresh the spec's rows in `paintfactor.db`.
3. Run `python3 database/scripts/export_db_bundle.py` to regenerate the bundle to both locations.
4. Diff the new bundle against pre-sync. Only rows for this spec should change, and only the `applies_when`/quality_tier rollup fields (if any) may differ from ordering. Rate values must be identical.
5. If the diff is clean: commit `tune(paintscope): sync <spec_id> production.json to engine rates`. Push.
6. If the diff isn't clean: stash, investigate, adjust Phase 2 decisions, retry.

### Phase 4 — Fix the root cause (separate follow-up)

Not part of this plan, but tracked here so it isn't lost: the Spec Editor UI should offer a **Save to production.json** action that regenerates the spec files from current state. Until that exists, every Spec Editor session is one `import_spec.py` away from being clobbered.

Sub-tasks for Phase 4:

- Add `state/spec-editor-reducer.js` → `exportToProductionJson` helper.
- Either (a) write files via Node-side script launched from the Spec Editor, or (b) expose a "Download patched production.json" button and make it the user's responsibility to commit the file.
- Document the workflow in `tools/paintscope/CLAUDE.md`.

## Safety net

Before starting Phase 3, tag the current tip so reverting is trivial:

```
git tag pre-production-sync-baseline a6ea958
```

If anything goes wrong, `git reset --hard pre-production-sync-baseline` restores the engine to the current-known-good state.

After Phase 3, snapshot the McLeod estimate once more. Expected: byte-identical to the a6ea958 snapshot. Any change means a sync commit carried an unintended edit.

## Done criteria

- Every spec in scope has a commit on `main` syncing its `production.json` to the bundle.
- Running `python3 database/scripts/import_spec.py specs/<each>/ --reimport && python3 database/scripts/export_db_bundle.py` from a clean working tree produces no `db-bundle.js` diff.
- `Claude/devos/reports/production_json_drift_2026-04-17.md` marked complete with all rows either resolved or escalated.
- McLeod project snapshot matches the a6ea958 baseline within rounding.

## Out of scope (name them so nobody does them by mistake)

- Editing `sop_modules.json` except to remove task references that were genuinely dropped (SPRAY_R1/R2 already handled).
- Changing `materials.json`, `spec.json`, `research.json`, `qa_report.json`.
- Re-tuning rates. That's a separate exercise once sync is clean.
- Migrating the schema or adding new spec families.

## Estimated time

- Phase 1: 30 min (script + report)
- Phase 2: 15 min (human review)
- Phase 3: 90 min (6 high-priority specs at ~10-15 min each, plus 15 min batch for low-priority specs)
- Total active work: ~2.5 hrs, spread across however many sessions feels safe.
