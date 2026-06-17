# Authoring Archive Plan

**Status:** PROPOSED — execute in fresh session
**Created:** 2026-05-04
**Purpose:** Add an archive/restore workflow for canonical tasks, modules, and scenarios so deprecated entries can be hidden from the active bundle without being deleted. Designed to clean up the canonical catalog before the cascade tooling work in `Authoring_Cascade_Tooling_Plan.md` runs against it.

**Pre-production calibration:** PaintScope is in development only. See `memory/project_paintscope_pre_production.md`. No need for backward-compat aliases when archiving — archived entries are simply gone from the active bundle.

---

## Context

The Authoring tab now has a domain filter (interior / exterior / shared / unused). Surfacing the **unused** filter immediately revealed dead inventory: 38 modules and 127 tasks not referenced by any scenario in the canonical bundle. They're remnants of prior reorganizations and naming-convention shifts. The user wants them out of the active surface but **not deleted** — they need to be retrievable in case a refactor needs to revive a previously-shelved approach.

Hard delete already exists for **drafts** (IndexedDB-only, ephemeral). For **canonical** entries the only safe operation is archive: file moves from `Claude/{kind}/` to `Claude/{kind}/archive/`. Bundle generator excludes the `archive/` subfolder, so archived entries disappear from the active surface but remain on disk and in git history.

### Why filesystem subfolder over alternatives

| Approach | Pro | Con |
|---|---|---|
| **`Claude/{kind}/archive/` subfolder** ✓ | Persists across browsers + machines (it's git-tracked); easy to grep / `git log --follow`; bundle gen just skips one folder; restore is a file move | Requires Vite plugin endpoint expansion (small) |
| `archived: true` flag on canonical | No new endpoints | Bundle gen needs conditional filtering everywhere; "search archives" requires walking everything; flag-rotting risk (one place forgets the filter) |
| IndexedDB archive store | No filesystem changes | Local-only — archives don't sync between machines or persist across browser data clears |
| Single archive file (e.g. `_archive.json`) | Simple | Lose original filenames; harder to track per-entity history in git |

Folder-per-kind is the only option that gives clean separation, cross-machine persistence, and trivial bundle exclusion.

### Architectural assumptions (verify before coding)

| Assumption | Why it matters |
|---|---|
| `vite-plugin-authoring.mjs` already writes to disk via `fs.writeFile` with prefix-validated path safety | Archive endpoint reuses the same KIND_CONFIG / assertSafePath pattern |
| The bundle generator (the script that produces `scenario-bundle.gen.js`) walks `Claude/{tasks,modules,scenarios,modifiers,assemblies}/` — confirm the exact entry script | Archive folder skip needs to land in that script |
| TaskEditor / ModuleEditor / ScenarioEditor each have an `onSave` / `onCancel` / `onPublish` button row | Archive button slots into the same row |
| `bundle-derivations.js` (just shipped 2026-05-04) walks scenarios + modules to derive domain memberships | Archive doesn't change this; archived entries simply don't appear in the bundle, so they're auto-excluded from the derivation |

---

## Phase 1: Archive/Restore Endpoints (build first)

**File touches:**
- Modified: `Claude/tools/paintscope/vite-plugin-authoring.mjs` — add two endpoints (`/__authoring/archive`, `/__authoring/restore`) and a small helper that performs the file move with the same path-safety checks as the publish endpoint
- Modified: bundle generator script (verify exact path) — skip any path containing `/archive/` segment
- New: `Claude/tools/paintscope/src/authoring/archive-ops.js` — client-side helpers `archiveEntity(kind, id)` and `restoreEntity(kind, id)` that POST to the new endpoints

**Endpoint shape:**

```
POST /__authoring/archive
  body: { kind: 'task'|'module'|'scenario'|'modifier'|'assembly', id: 'TSK_X' }
  effect: rename Claude/{kind}/X.json → Claude/{kind}/archive/X.json
  response: { ok: true, from, to }

POST /__authoring/restore
  body: { kind, id }
  effect: rename Claude/{kind}/archive/X.json → Claude/{kind}/X.json
  response: { ok: true, from, to }
```

Both endpoints reuse `assertSafePath` to refuse traversal, validate the prefix matches the kind, ensure source file exists and target file does not (no clobber).

**Bundle generator skip:** one-line filter — when walking `Claude/{kind}/`, skip any directory entry named `archive`. Confirm this in the actual generator file once located.

**Out of scope this phase:**
- Audit log of archives. Defer to Phase 3.
- UI changes — handled in Phase 2.
- Archiving multiple entities in one call. Single-id only for now; bulk archive is a Phase 3 nicety once the basic workflow is proven.

**Acceptance:**
- `curl -X POST localhost:5183/__authoring/archive -H 'Content-Type: application/json' -d '{"kind":"task","id":"TSK_FOO"}'` moves `Claude/tasks/TSK_FOO.json` → `Claude/tasks/archive/TSK_FOO.json`. Restore inverts it. Bundle regen excludes archived entries.

---

## Phase 2: Archive Button + Archive Tab UI

**File touches:**
- Modified: `Claude/tools/paintscope/src/components/authoring/TaskEditor.jsx` — add Archive button next to Cancel/Publish, with confirmation dialog
- Modified: `Claude/tools/paintscope/src/components/authoring/ModuleEditor.jsx` — same
- Modified: `Claude/tools/paintscope/src/components/authoring/ScenarioEditor.jsx` — same
- Modified: `Claude/tools/paintscope/src/components/authoring/AuthoringView.jsx` — add an "Archive" tab after "Drafts"
- New: `Claude/tools/paintscope/src/components/authoring/ArchiveView.jsx` — three-section panel listing archived tasks / modules / scenarios with Restore button per entry

**Archive button behavior on canonical entries:**
- Sits in the editor action row, styled less prominently than Publish (smaller, muted)
- Confirmation dialog: "Archive {id}? This moves the file to `Claude/{kind}/archive/` and removes it from the bundle. You can restore it from the Archive tab."
- If the entity has dependents (use the existing `findTaskUsage` for tasks, the new `findModuleUsage` for modules), warn but allow:
  > "This task is referenced by 5 modules. Archiving will leave those `task_ref` strings pointing at a missing task until you fix them. Continue?"
- Pre-production calibration: never block, just warn.

**Archive button on drafts:** not shown. Drafts already have Delete; Archive only applies to canonical entries that have been published to disk.

**Archive tab UI:**
- Subhead: "Archived entities — git-tracked, restorable. Bundle generator excludes the archive folder on next regen."
- Three collapsible sections: Tasks, Modules, Scenarios. Each shows the list with id, name, archive date (read from filesystem mtime via a small endpoint if needed; or just show id + name to start).
- Each row: id (mono), name (regular), Restore button.
- Search + domain filter (reuse `bundle-derivations.js` pattern; archived entities won't appear in the active derivation, so we'd derive a separate "archived domains" map by walking the archive folder if needed — or just skip domain filter on archive list since unused entities often have no domain anyway).
- After Restore, the entity reappears in its primary tab on next bundle regen. Show a toast: "Restored {id}. Restart dev server or regenerate bundle to see it in the active list."

**Out of scope this phase:**
- Bulk archive / bulk restore.
- Archive reason / metadata input.
- Diff view between archived and live versions.
- Auto-regen of bundle on archive (manual step for now — keeps it predictable).

**Acceptance:**
- Open a canonical task in TaskEditor. Click Archive. Confirm. File moves to `Claude/tasks/archive/`. Task disappears from TaskList on next bundle regen.
- Open Archive tab. See the archived task. Click Restore. File moves back. On next bundle regen, task reappears in TaskList.
- Archive a module that's still referenced by 5 scenarios: warning shown, archive proceeds, bundle regen excludes the module, scenarios now reference a missing module (visible as a gap in `ModuleUsagePanel` or wherever resolution would normally happen).

---

## Phase 3: Polish (optional, defer until needed)

- **Append-only audit log** at `Claude/_archive_log.jsonl`. One JSON line per archive/restore event: `{kind, id, action: 'archive'|'restore', timestamp, reason?}`. The Vite plugin appends after a successful move.
- **Reason field** on archive — small input in the confirmation dialog, written to the audit log.
- **Bulk archive** — checkbox selection in any list, bulk action via the Vite plugin loop.
- **Last-modified column** on archive list rows so you can sort by recency.
- **Search across active + archive** in the main lists with a pill indicator that shows "(archived)" on archived hits — useful for "did I already archive this thing?"

None of these block the cascade tooling work. Build them when the friction shows up.

---

## Recommended Execution Order

1. **Phase 1: Endpoints + bundle-skip** (smallest, foundational, testable via curl alone)
2. **Phase 2: UI** (Archive button + Archive tab)
3. **Phase 3: Polish** (defer indefinitely, address as friction surfaces)

---

## Out of Scope (entire plan)

- Database/IndexedDB-backed archive (filesystem is the chosen storage)
- Multi-user concurrent edit safety (single user, no contention)
- Archive of drafts (drafts have Delete; archiving an ephemeral workspace makes no sense)
- Archive of modifiers (could mirror the same pattern but address only when the user actually has unused modifiers to clean up — not currently the case)
- Soft-delete with grace period / undo within session (the Restore button IS the undo)
- Cross-references repair on archive (if you archive a referenced task, the dependents stay broken until manually fixed — surfacing the breakage is the point)

---

## First Move on the New Session

1. Read this plan in full.
2. Verify the architectural assumptions table — locate the bundle generator script (likely under `Claude/tools/paintscope/scripts/` or similar; it produces `scenario-bundle.gen.js`), confirm KIND_CONFIG covers all five kinds, confirm the file-move syscalls are available in the Vite plugin's environment.
3. Start Phase 1: add the archive endpoint, write a curl test that archives + restores a known throwaway entity, verify the bundle generator skips the archive folder by regenerating and checking the entity is absent.
4. Phase 2 UI follows the same `archive-ops.js` → editor button pattern as the existing publish flow.
5. Phase 3 only if the user explicitly asks.

After this plan ships, the cascade tooling plan in `Authoring_Cascade_Tooling_Plan.md` operates on a noticeably cleaner canonical bundle (no orphaned tasks/modules), making the consolidation work less noisy.
