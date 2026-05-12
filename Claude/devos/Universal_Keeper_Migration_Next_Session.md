# Next Session Pickup — Universal Keeper Migration

**Last updated:** 2026-05-12 (end of marathon session, user requested fresh-context handoff before next session)
**Branch:** `claude/cranky-saha` (14 commits ahead of pre-session `e78e0a7`; head `462c8ea` pushed to origin)
**Resume protocol:** read this doc → check the Notion live page → skim the memory note → start work.

---

## Where we are (one paragraph)

The keeper migration has substantially completed. The **door family** (paint + stain) is fully migrated. The **stain interstage architecture** is in place across LF, SF, and EA_SIDE substrates — a new engine feature (`dynamic_coats.interstage`) interleaves an interstage module between consecutive apply repetitions. Paint-side and stain-side defect/fill task families are properly split (SPACKLE_DEFECT for paint, WOOD_PUTTY for stain). Equipment setup/cleanup tasks were retired system-wide. Of the original 8 cleanup keepers, 3 were migrated (SPACKLE_DEFECT_SF / SPOT_PRIME_SF / VACUUM_WORK_AREA), 4 sit available as orphan keepers waiting for consumers, and TSK_INSPECT_REPAIR_FLOOR_COVERING_SF is parked as a feature TODO. The remaining real work is **Groups D/E/F stain-side legacy cleanup** (AEST/RRST/SRST/TRST/WNST/WINDOW/STAIR) which is blocked on a user architectural decision about whether to handle per-element rate variations via modifiers or separate tasks.

---

## Live status source of truth

**Notion page:** [PaintScope Universal Keeper Migration — Status & Backlog](https://www.notion.so/35e3ab2c2a5b81bd9629c6068de53be0)

Update the Notion page as items move between sections — *don't* update this doc. This file is a frozen end-of-session handoff. The Notion page is the live working state.

Also relevant:
- `Claude/_keeper_migration_plan.md` — per-keeper name-prefix scan, 2026-05-11 snapshot. Useful for finding candidates; status is stale.
- `Claude/_notion_batch_{1-7}_compact.json` — offline Notion DB snapshot (commit `7075bfd`).
- Memory file `project_universal_keeper_migration.md` — doctrine + tooling cheatsheet, points at this doc and the Notion page.

---

## Architecture established this session (must-know for next session)

### Engine extensions in `run-estimate-scenario.js`

1. **Per-task `material_type`** (commit `6ec889c`) — `deriveMaterialType()` now checks the resolved task's `material_type` field (carried via task_ref shallow-merge) before falling back to ctx or eligibility default. Lets a single module fire multiple material variants (e.g. one apply module with both sealer and clear passes by per-task_ref material_type). Trigger: `needsTaskStack` includes `task.material_type` so the per-task stack computation actually runs.

2. **Per-item overrides for items-based substrates** (commit `6ec889c`) — `resolveItemField()` precedence reversed: items-level wins over substrate-level for doors/windows. A door item with `coating_type: "stain_clear"` now correctly drives the stain system even when the doors substrate carries a stale `coating_type: "paint"` default.

3. **Display labels via `MATERIAL_LABEL`** (commit `6ec889c`) — `displayTaskName` decorates coating-neutral keepers ("Door Brush") with the material via suffix: "Door Brush — Stain", "Door Brush — Clear — Coat 2". An auxiliary-task skip-list regex (`Sand|Inspect|Patch|Wipe|Tack|Clean|Touchup|Mask|Reinstall|Remove|Fill|Hardware|Setup|Conditioner|Grain`) prevents spurious tags on non-coating tasks.

4. **`dynamic_coats.interstage`** (commit `313e802`) — the dynamic_coats config now accepts an object form `{ field, interstage }` in addition to the existing string form. When the object form is used, the engine interleaves the named interstage module between consecutive apply repetitions — including across phase boundaries (stain → sealer → clear) — but NOT after the final apply rep (detected by the next entry having no interstage). Backward compatible.

### Three-side keeper parity

The paint and stain sides now have parallel architecture:

| Aspect | Paint side | Stain side |
|---|---|---|
| Initial prep template | `MOD_TEMPLATE_TRIM_PRIME_INITIAL` + `MOD_TEMPLATE_TRIM_PAINT` (post-primer) | `MOD_TEMPLATE_TRIM_PREP_STAIN_LF` / `_SF` / `_EA_SIDE` |
| Interstage template | `MOD_TEMPLATE_TRIM_INTERSTAGE` + `MOD_INTERSTAGE_DOOR` | `MOD_INTERSTAGE_TRIM_STAIN_LF` / `_SF` / `_EA_SIDE` |
| Defects task | `TSK_SPACKLE_DEFECT_LF/SF/EA_SIDE/EA` (all 4 UOMs exist) | `TSK_WOOD_PUTTY_LF/SF` + `TSK_DOOR_PATCH_REPAIR` (EA_SIDE — misnamed) |
| Fill task | `TSK_FILL_FASTENERS_LF` (paint-specific, 120/hr) | `TSK_WOOD_PUTTY_FILL_LF/SF` (200/600) |
| Apply coating tasks | per-material LF tasks (TSK_STAIN_BRUSH_LF etc.) + `TSK_DOOR_BRUSH/SPRAY` for doors | per-material LF tasks + `TSK_DOOR_BRUSH/SPRAY` for doors |
| Multi-coat looping | scenario-explicit (paint doors) / dynamic_coats (paint trim) | dynamic_coats with interstage interleaving |

### Display naming convention

Auxiliary keepers follow `[Description] (UOM)`:
- `Sand Bare (LF)` / `(SF)` / `(EA_SIDE)`
- `Between Coat Sand (LF)` / `(SF)` / `(EA_SIDE)`
- `Wood Conditioner (LF)` / `(SF)` / `(EA_SIDE)`
- `Final Inspect (LF)` / `(SF)` / `(EA_SIDE)`
- `Clean Interstage Dust (LF)` / `(SF)` / `(EA_SIDE)`

Apply-side coating-neutral keepers (`TSK_DOOR_BRUSH/SPRAY`, `TSK_BRUSH_COAT_LF`) get the material appended via `displayTaskName` ("Door Brush — Stain").

### Equipment setup/cleanup retired system-wide

Per user direction in commit `00c9eac`: 72 `TSK_*_EQUIPMENT_SETUP_*` + `TSK_*_EQUIP_CLEAN` tasks archived. The doctrine is that **no per-substrate equipment tasks should be re-introduced** until there's a proper "per-job equipment overhead" model that doesn't multiply by substrate count. Don't add equipment tasks back without that model.

---

## Commits this session (in chronological order)

| Commit | Subject |
|---|---|
| `9de7237` | door paint keeper migration — 6 per-coating → TSK_DOOR_BRUSH/SPRAY |
| `8666d56` | door stain keeper migration — 2 per-coating → TSK_DOOR_BRUSH/SPRAY |
| `cd54bed` | unify door slab quantity emission — per-side for paint + stain |
| `5fc5186` | DSST family migration + orphan cascade cleanup |
| `6ec889c` | engine fixes to make keeper task migration actually work end-to-end |
| `00c9eac` | retire equipment setup/cleanup tasks + simplify DSST prep/cleanup |
| `a33eb49` | DSST multi-coat looping + door task display rename for trim consistency |
| `5ceb5af` | Bucket A cleanup keeper migration — spackle / spot prime / vacuum |
| `914276b` | add TSK_WOOD_PUTTY_FILL_LF + wire TSK_TOUCHUP_FILL_LF into painted trim prep |
| `b8e78f9` | stain trim prep template extraction (LF / SF / EA_SIDE) |
| `b40cee5` | retire TSK_TOUCHUP_FILL_LF (mistake) + DOOR_PATCH_REPAIR naming |
| `313e802` | stain interstage architecture — dynamic_coats interleaves an interstage module between coats |
| `cc42725` | SF stain interstage wiring + orphan SAND task archival |
| `462c8ea` | wire SPACKLE_DEFECT keepers into painted trim + door interstage |

Branch is at 14 commits ahead of origin start (`ac4167d`); all pushed.

---

## What's next (in priority order)

### Active queue (next sessions can pick from these)

**1. Groups D/E/F stain-side cleanup** — *blocked on user decision*

The remaining 5-6 stain trim prep modules use legacy per-substrate task IDs:
- AEST (architectural elements)
- RRST, SRST, TRST (stair riser / stringer / tread stain)
- WNST (window stain — uses WIN-prefixed tasks)
- WINDOW (alt)
- STAIR (single composite task)

These have a different shape (grain_raise + tack pattern, no sand_bare/dust_wipe like Groups A/B/C). **User pending decision:** handle the per-element rate variations within those groups via modifiers, or keep separate per-element tasks?

**Don't start this work until the user has decided.** Surface the question, get the answer, then plan.

**2. TSK_DOOR_PATCH_REPAIR → TSK_WOOD_PUTTY_EA_SIDE rename**

The task ID is misnamed — it's the stain-side EA_SIDE wood putty defects task (display name "Wood Putty Defects (EA_SIDE)") but the ID still says "DOOR_PATCH_REPAIR" from before the SPACKLE/PUTTY architecture split. Only consumer left is `MOD_INTERSTAGE_TRIM_STAIN_EA_SIDE` (since the paint-side door interstage switched to TSK_SPACKLE_DEFECT_EA_SIDE in `462c8ea`).

Rename steps: rename file → update the one task_ref → archive old ID. Probably 5 minutes.

**3. TSK_SPACKLE_DEFECT_EA wiring**

The new keeper `TSK_SPACKLE_DEFECT_EA` (15 EA/hr) was created in `462c8ea` but has no active consumer. Wire into window prep / cabinet prep / opening-level defect work when those scopes get attention. **Not urgent — sits as available keeper.**

**4. Notion sync — keeper status flips**

The Notion task catalog still has several tasks marked "Universal Keeper" that this session moved to active or dead. Worth a sync pass:
- Active now: TSK_DOOR_BRUSH/SPRAY, TSK_CONDITIONER_EA_SIDE, TSK_SPACKLE_DEFECT_LF/SF/EA_SIDE/EA, TSK_VACUUM_WORK_AREA, TSK_SPOT_PRIME_SF, TSK_WOOD_PUTTY_FILL_LF/SF, TSK_DUST_WIPE_INTERSTAGE_LF/SF, TSK_TOUCHUP_FILL_LF (wait — this is RETIRED)
- Retired/Dead: TSK_DOOR_DUST_WIPE (duplicate), TSK_TOUCHUP_FILL_LF (mistake, was added then removed), TSK_PATCH_DEFECTS_LF (superseded by TSK_SPACKLE_DEFECT_LF), TSK_PRIME_BRUSH_LF/SF / TSK_PRIME_SPRAY_LF/SF / TSK_SPRAY_FINISH_SF (5 MISSING — never on disk, retire in Notion only)

**5. Deferred backlog items** (from project memory, not keeper-migration specific)

PaintScope Setup Dropdown Cleanup, Painter-side glass mask feature, Drywall Finish Specs gap, Per-phase application method split, Wood Wall Substrate, Multi-coat per-coat rates, Universal Protect Mode, etc. Pick from project memory's deferred list based on what's bothering the user.

### Out of scope (parked, don't touch)

- `TSK_INSPECT_REPAIR_FLOOR_COVERING_SF` — needs encapsulated-floor flag + scenario-level cross-substrate wiring. Feature design needed, not migration.
- Equipment setup/cleanup re-introduction — DO NOT add per-substrate equipment tasks back. Wait for a proper per-job overhead model.
- Painter-side glass mask tasks — placeholder for unbuilt feature, don't archive even though orphan.
- Trim apply → coating-neutral keepers — the door side is migrated, trim isn't. Bigger architectural shift. When it happens, the display naming will fully converge across LF and EA_SIDE.

---

## Tooling cheatsheet

```sh
# Bundle rebuild — required after any module/task/scenario edit
node Claude/scripts/build-scenario-bundle.mjs

# Probe — verifies protection coverage + no leaks + all refs resolve
node Claude/scripts/probe-protection-tasks.mjs

# Task classification — uses a ledger to bucket tasks as ACTIVE / REACHABLE_UNFIRED / ORPHAN
node Claude/scripts/classify-task-coverage.mjs ~/Downloads/paintscope-fired-tasks-*.json

# Migration scripts (this session) — kept on disk for reference and re-runnability
node Claude/scripts/retire-equip-tasks.mjs            # 00c9eac — equip setup/cleanup retirement
node Claude/scripts/rename-door-task-names.mjs        # a33eb49 — door display rename
node Claude/scripts/migrate-cleanup-keepers.mjs       # 5ceb5af — Bucket A keepers (spackle/spot prime/vacuum)
node Claude/scripts/extract-stain-trim-prep-templates.mjs  # b8e78f9 — stain prep template extraction
node Claude/scripts/wire-stain-interstage.mjs         # 313e802 — interstage wiring into 14 scenarios
node Claude/scripts/split-sf-stain-modules.mjs        # cc42725 — SF stain CLEAR split + dynamic_coats add
```

---

## Project state

- **Branch:** `claude/cranky-saha` (worktree at `Claude/.claude/worktrees/cranky-saha/`)
- **Dev server:** vite on `localhost:5183`, root at `Claude/tools/paintscope/`. `npm run dev -- --port 5183` to start.
- **Bundle:** 1739 tasks, 722 modules, 710 scenarios. 56 orphans. 86/86 protection coverage.
- **Engine path:** scenario engine is default (`run-estimate-scenario.js`); legacy `run-estimate.js` is deprecated.

---

## How to start next session

1. Read this doc (you just did).
2. Skim the Notion live page for fresher state if any time has passed: https://www.notion.so/35e3ab2c2a5b81bd9629c6068de53be0
3. Check `Claude/_keeper_migration_plan.md` for the per-keeper worklist (commit `7075bfd`, stale on status).
4. Refresh task coverage if needed:
   ```sh
   node Claude/scripts/classify-task-coverage.mjs ~/Downloads/paintscope-fired-tasks-*.json
   ```
5. Pick from the "What's next" section above. If user wants to start Groups D/E/F, surface the modifier-vs-separate-tasks decision first.

---

## Surprises / gotchas

- **dynamic_coats string vs object form** — engine accepts both. Old scenarios with `"MOD_X": "stain_coats"` still work; new scenarios use `"MOD_X": { "field": "stain_coats", "interstage": "MOD_INTERSTAGE_X" }`. The interstage interleaves between repetitions AND across phase boundaries (stain→sealer→clear all share the same interstage). It does NOT fire after the last apply.

- **TSK_DOOR_PATCH_REPAIR is misnamed** — its display is "Wood Putty Defects (EA_SIDE)" and it's used as the stain-side EA_SIDE defects task. The ID still says DOOR_PATCH_REPAIR. Rename queued.

- **3 SF SEALER modules are new** — `MOD_APPLY_WAINSCOT_SEALER`, `MOD_APPLY_WOOD_CEILING_SEALER`, `MOD_APPLY_WOOD_WALL_SEALER` were created in `cc42725` by splitting the previous combined SEALER+CLEAR modules. They mirror the DSST split done earlier.

- **4 SAND tasks archived this session** — TSK_SAND_SEALER_LF/SF and TSK_SAND_CLEAR_LF/SF (with their grit-specific rates). Replaced uniformly by TSK_BETWEEN_COAT_SAND_LF/SF in the interstage modules. Rate drift accepted per "rates later."

- **TSK_TOUCHUP_FILL_LF was a misstep** — I added it in `914276b`, then `b40cee5` retired it once the user clarified that paint side already has FILL_FASTENERS + PATCH_DEFECTS for that scope. Don't re-introduce it.

- **WOOD_PUTTY defects moved from prep to interstage** in `313e802`. The prep templates no longer contain `TSK_WOOD_PUTTY_LF/SF` or `TSK_DOOR_PATCH_REPAIR`. They live in the interstage modules where they belong (defects show up after a coat dries, not before).

- **User's "QT3 only for right now" stance** — don't worry about per-tier rate calibration. Rates are deferred until the QT builder rewrite is done (parked, blocked by other work).

- **Pre-existing untracked files** — `Claude/_task_coverage_report.csv`, `Claude/scripts/report-consolidation-candidates.mjs`, and 6 `TSK_ROLL_*` / `TSK_SPRAY_*` files in `Claude/tasks/archive/` were already untracked at session start. Leave them alone; don't accidentally `git add Claude/` (use explicit paths).

- **User feedback pattern** — for mechanical migration work, the user is comfortable with inline execution and trusts the probe/build for verification. For UI-visible changes, the user verifies on localhost:5183 with Run probes. Don't start a `preview_start` server for engine-only changes.
