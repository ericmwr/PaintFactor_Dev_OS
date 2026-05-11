# Next Session Pickup — Universal Keeper Migration (Phase 2 continuing + Phase 1 cleanup)

**Last updated:** 2026-05-11 (end of session, user requested handoff)
**Branch:** `claude/cranky-saha` (pushed to origin at `ac4167d`; head is further ahead — push before merging)
**Resume protocol:** read this doc first, then `Claude/_keeper_migration_plan.md` for the per-keeper worklist, then `Claude/_task_coverage_report.csv` for the broader classification.

---

## What we're doing (one paragraph)

The PaintScope catalog has 60 **Universal Keepers** (`Status: 'Universal Keeper'` in the Notion task catalog). These are intended to be referenced by modules via universal task IDs whose rate is the baseline and whose surface/material/orientation variations come from **modifier_eligibility** flags (`overhead`, `material`, `height`, etc.) on the module — not from baked-in per-surface rates. Many keepers got created during the consolidation but never migrated through to modules; modules kept referencing operation-specific Gen-3 tasks. We're sweeping the keepers one family at a time, rewriting module `task_ref` entries to point at the keeper with the right module-level `ps_key` (via resolveTaskFromRef shallow-merge) and adding `modifier_eligibility.overhead: true` on ceiling modules so `TRADE_OVERHEAD` (1.25× time) applies. Once a family is migrated, the retired Gen-3 tasks move to `Claude/tasks/archive/`.

---

## Notion source of truth

**PaintFactor BOS Roadmap → PaintScope Task Catalog → Tasks** database.

- Database ID: `9f5c79f3-9328-4f02-bbff-a8426d3f428d`
- Data source URL: `collection://16bc0048-1287-4d6a-aa5d-705ee39f1b6f`
- Direct URL: https://www.notion.so/9f5c79f393284f02bbffa8426d3f428d

**Schema columns:** `Task ID` (title), `Name`, `UOM` (LF/SF/EA/EA_SIDE/EA_ROOM/FIXED/EA_SIDE_PER_DOOR), `Skill` (general/experienced/intermediate/certified), `Status` (Active/Universal Keeper/Deferred/Dead), `Notes`, `Rate` (number), `PS Key`, `Family`.

**Pre-built views to use:**
- "Active Universals" — filtered to `Status = 'Universal Keeper'`
- "By Family" — grouped by Family
- "Rate Outliers" — < 50 rate
- "Dead / Deferred"

**Offline snapshot of the catalog** lives at `Claude/_notion_batch_{1-7}_compact.json` (commit `7075bfd`). Parse with:
```js
const all = [];
for (let i = 1; i <= 7; i++) {
  const batch = JSON.parse(fs.readFileSync(`Claude/_notion_batch_${i}_compact.json`, 'utf8'));
  for (const item of batch) if (item.properties) all.push(item.properties);
}
const keepers = all.filter(p => p.Status === 'Universal Keeper'); // 60
```

The Notion MCP `search` tool works for refetching: pass `data_source_url: "collection://16bc0048-1287-4d6a-aa5d-705ee39f1b6f"` and a relevant query.

---

## Status snapshot (Phase 2 progress)

| Family | Keeper(s) | Modules | Status | Commit |
|---|---|---:|---|---|
| Drywall apply backroll | `TSK_BACKROLL_DWL` | 8 | ✓ done (pilot) | `5246211` |
| Drywall apply roll | `TSK_ROLL_DWL` | 4 | ✓ done | `576597d` |
| Drywall apply spray-only | `TSK_SPRAY_DWL` | 4 | ✓ done | `576597d` |
| Drywall apply spray-tethered | `TSK_BACKROLL_SPRAY_DWL` | 8 | ✓ done (fixes inverted ceiling rate too) | `576597d` |
| Cut-in | `TSK_CUTIN_WALL_LF` | 3 (CUTIN_TRIM, CUTIN_CEILING, WALL_PRIME_ROLL straggler) | ✓ done | `bf21702` |
| **Doors** | `TSK_DOOR_BRUSH`, `TSK_DOOR_SPRAY` | TBD | ⏳ **NEXT** | — |
| Door dust wipe | `TSK_DOOR_DUST_WIPE` | TBD | ⏳ pending | — |
| Cleanup keepers | spackle ×3, vacuum, touchup fill, dust wipe interstage, spot prime, floor covering inspect | TBD | ⏳ pending | — |
| Phase 1 cleanup | TSK_TRIM_BRUSH_LF + TSK_TRIM_SPRAY_LF on disk; 5 MISSING tasks in Notion | — | ⏳ deferred | — |

**Probe coverage from this session's work:** 86/86 protection tasks still firing through SCN_ROOM_PROTECTION_NC, no legacy task leaks across the bundle, no unresolved module refs.

---

## NEXT: door migration design (user provided 2026-05-11)

User's call on the FAC_MATERIAL collapse for the 8 door per-coating tasks:

**Two keepers:** `TSK_DOOR_BRUSH` (rate 4, EA_SIDE) and `TSK_DOOR_SPRAY` (rate 10, EA_SIDE).

**Material factors to add to `Claude/modifiers/FAC_MATERIAL.json`** (current factors: `WB_PRIMER: 1.25`, baseline finish 1.0):

```json
"WB_PRIMER":  1.25,   // existing (primer slower than finish)
"WB_FINISH":  1.0,    // existing baseline
"WB_CLEAR":   0.9,    // NEW — clear/sealer coats apply ~10% faster than paint (BRUSH only)
"WB_SEALER":  0.9,    // NEW — same as clear
"WIPE_STAIN": 0.8     // NEW — wipe stain ~20% faster
```

**CRITICAL nuance:** the 0.9 clear/sealer modifier applies ONLY to **brush** application. **Spray** clear/sealer does NOT get the 0.9 modifier (spray rate is similar to spray paint). This means:
- Modules using TSK_DOOR_BRUSH need eligibility for WB_CLEAR/WB_SEALER (clear modules + sealer modules) → 0.9 applies via ctx
- Modules using TSK_DOOR_SPRAY for clear/sealer → don't apply 0.9; treat clear/sealer-spray as WB_FINISH (1.0)

Practically: this needs either (a) two FAC_MATERIAL entries that look at `application_method` to choose factor, or (b) two separate material categories (`WB_CLEAR_BRUSH` 0.9, `WB_CLEAR_SPRAY` 1.0). Option (b) is cleaner — let the module declare which material variant via its ctx and the modifier table look it up directly.

**Wipe stain (0.8)** applies to both brush and wipe contexts (stain is rarely sprayed; if it is, the same 0.8 holds — wipe is the brush-equivalent for stain).

### The 8 retired Gen-3 door tasks → 2 keepers

| Retired (rate) | Keeper | FAC_MATERIAL on module |
|---|---|---|
| `TSK_DOOR_FINISH_BRUSH` (4) | `TSK_DOOR_BRUSH` | `WB_FINISH` (1.0, baseline) |
| `TSK_DOOR_CLEAR_BRUSH` (4) | `TSK_DOOR_BRUSH` | `WB_CLEAR_BRUSH` (0.9) |
| `TSK_DOOR_SEALER_BRUSH` (4) | `TSK_DOOR_BRUSH` | `WB_SEALER_BRUSH` (0.9) |
| `TSK_DOOR_STAIN_BRUSH` (3.2) | `TSK_DOOR_BRUSH` | `WIPE_STAIN` (0.8) |
| `TSK_DOOR_FINISH_SPRAY` (10) | `TSK_DOOR_SPRAY` | `WB_FINISH` (1.0) |
| `TSK_DOOR_CLEAR_SPRAY` (6) | `TSK_DOOR_SPRAY` | `WB_CLEAR_SPRAY` (1.0) — but rate is 6 vs 10. Drift accepted. |
| `TSK_DOOR_SEALER_SPRAY` (6) | `TSK_DOOR_SPRAY` | `WB_SEALER_SPRAY` (1.0) |
| `TSK_DOOR_STAIN_SPRAY` (6) | `TSK_DOOR_SPRAY` | `WIPE_STAIN` (0.8 — would give 8 effective, not the canonical 6. Drift accepted. User said rates later.) |

Note: the SPRAY rates have more drift than brush because the 0.9 doesn't apply on spray. The actual current spray rates suggest stain/clear/sealer spray is ~40% slower than finish spray (6 vs 10), which doesn't fit any single material factor. **Per user's "rates later" direction, accept the structural collapse and revisit calibration.**

### Migration steps for doors

1. Update `Claude/modifiers/FAC_MATERIAL.json` with the new factors.
2. Find modules referencing each of the 8 retired tasks. Likely candidates by grep:
   - `MOD_APPLY_DOOR_FINISH`, `MOD_APPLY_DOOR_CLEAR`, `MOD_APPLY_DOOR_SEALER`, `MOD_APPLY_DOOR_STAIN`, `MOD_PREP_DOOR_STAIN`, etc.
3. For each module:
   - Replace BRUSH task_ref → `TSK_DOOR_BRUSH` (no ps_key needed — engine fallback in run-estimate-scenario.js:18 handles paintable_item='door' → PS_OPENING_EA_SIDE.DOOR_SLAB or whatever)
   - Replace SPRAY task_ref → `TSK_DOOR_SPRAY`
   - Add `modifier_eligibility.material: true` on the module
   - The module's scenario or ctx provides the material category (WB_FINISH / WB_CLEAR_BRUSH / etc.) — verify ctx threading
4. Archive 8 Gen-3 door tasks.
5. Regen + probe + commit.

**Engine fallback for door ps_key:** check `SUBSTRATE_PS_KEY_BY_PAINTABLE_ITEM` in run-estimate-scenario.js (line 18). Doors may need `door: 'PS_OPENING_EA_SIDE.DOOR_SLAB'` added, or modules can carry the ps_key per-task_ref.

---

## After doors: door dust wipe + cleanup keepers

### `TSK_DOOR_DUST_WIPE` (EA_SIDE @ 30) — investigation needed
Likely superseded by generic `TSK_DUST_WIPE_LF` (300 LF/hr universal) OR `TSK_DUST_WIPE_SF` (1000 SF/hr). But door is EA_SIDE (per-side), different UOM. Could be a real distinct keeper. Check `MOD_PREP_DOOR_*` modules.

### Cleanup keeper batch (8 keepers)
All NOT-FAC_OVERHEAD-applicable per the doctrine note (these aren't labor — they're cleanup/process). HOWEVER, per user clarification 2026-05-11: **if the cleanup happens on a ceiling without its own ceiling-specific rate variant, FAC_OVERHEAD does apply.** Only **inspection** is exempt.

| Keeper | UOM | Rate | Current Gen-3 equivalent? |
|---|---|---:|---|
| `TSK_SPACKLE_DEFECT_LF` | LF | 400 | Find per-substrate spackle tasks |
| `TSK_SPACKLE_DEFECT_SF` | SF | 1000 | Find drywall spackle tasks |
| `TSK_SPACKLE_DEFECT_EA_SIDE` | EA_SIDE | 30 | Find door/window spackle tasks |
| `TSK_DUST_WIPE_INTERSTAGE_LF` | LF | 600 | Interstage variant — different from `TSK_DUST_WIPE_LF` (300) |
| `TSK_VACUUM_WORK_AREA` | SF | 600 | Floor work — NO TRADE_OVERHEAD |
| `TSK_TOUCHUP_FILL_LF` | LF | 200 | Find per-substrate touchup fill tasks |
| `TSK_SPOT_PRIME_SF` | SF | 1500 | Drywall spot prime |
| `TSK_INSPECT_REPAIR_FLOOR_COVERING_SF` | SF | 1200 | Floor process — NO TRADE_OVERHEAD |

Each needs investigation: who currently does the work? Same migration pattern as drywall but per-keeper.

### Phase 1 cleanup (deferred)

After Phase 2 finishes:
1. **Archive on disk** (canonical task files): `TSK_TRIM_BRUSH_LF`, `TSK_TRIM_SPRAY_LF` — Gen-2 keepers superseded by Gen-3 `TSK_BRUSH_COAT_LF` / `TSK_SPRAY_COAT_LF`. User confirmed: keep Gen-3.
2. **Mark Dead in Notion** for the 5 MISSING keepers (never created on disk because FAC_MATERIAL paint↔prime collapse made them unnecessary):
   - `TSK_PRIME_BRUSH_LF`, `TSK_PRIME_BRUSH_SF`, `TSK_PRIME_SPRAY_LF`, `TSK_PRIME_SPRAY_SF`, `TSK_SPRAY_FINISH_SF`
3. **Mark Dead in Notion** for `TSK_TRIM_BRUSH_LF` + `TSK_TRIM_SPRAY_LF` after on-disk archive.
4. **Mark Active in Notion** for the keepers we've now wired up (BACKROLL_DWL, ROLL_DWL, SPRAY_DWL, BACKROLL_SPRAY_DWL, CUTIN_WALL_LF). They should still show as "Universal Keeper" status, OR change them to "Active" since they're now actively firing. User to decide Notion taxonomy.

---

## Key tooling

| Tool | Purpose |
|---|---|
| `Claude/scripts/classify-task-coverage.mjs <ledger.json>` | Generates `_task_coverage_report.csv` with ACTIVE/REACHABLE_UNFIRED/ORPHAN/ARCHIVED per task. Re-run after any migration to refresh. |
| `Claude/scripts/probe-protection-tasks.mjs` | Verifies 86/86 protection task coverage + 0 legacy leaks. Run after every migration. |
| `Claude/scripts/build-scenario-bundle.mjs` | Regen the bundle. Required after any module/task edit. |
| `Claude/scripts/migrate-backroll-dwl-keeper.mjs` | Pilot pattern (single-keeper). |
| `Claude/scripts/migrate-drywall-keepers-batch.mjs` | Multi-keeper parameterized batch. Use this as a template for door + cleanup keepers. |
| `Claude/scripts/migrate-cutin-keeper.mjs` | Many-to-one collapse (11 tasks → 1 keeper) with per-target ps_keys. |
| Authoring tab `Ledger (N)` button | Downloads `paintscope-fired-tasks-<ts>.json` for the classifier. |
| Authoring tab `Run probes` button | Re-fires the 13 NC interior baseline probes for ledger seeding. |

---

## Project state to know

- **Dev server:** vite on `localhost:5183`, root at `Claude/tools/paintscope/`. Start with `npm run dev -- --port 5183`.
- **IDB ledger** at `paintfactor.fired_tasks_seen` (v10 schema). Drives the elimination-by-absence workflow.
- **Fired-tasks logger** auto-records on every estimate via `useEstimateScenario.js`. Source: 'organic' for user estimates, 'probe' for the Run probes button output.
- **TRADE_OVERHEAD modifier** at `Claude/modifiers/TRADE_OVERHEAD.json` — 1.25× time for ceilings. Eligibility key: `overhead`. **Applies to all labor + cleanup on ceilings, except inspection.**
- **FAC_MATERIAL modifier** at `Claude/modifiers/FAC_MATERIAL.json` — current factors: `WB_PRIMER: 1.25`. **Door migration adds `WB_CLEAR_BRUSH/SEALER_BRUSH: 0.9`, `WIPE_STAIN: 0.8`.**

---

## Commit log this session (in reverse chronological order)

```
bf21702 refactor(paintscope): cut-in keeper migration — 11 per-target → TSK_CUTIN_WALL_LF
576597d refactor(paintscope): drywall keeper migration batch (ROLL + SPRAY + BACKROLL_SPRAY)
5246211 refactor(paintscope): migrate TSK_BACKROLL_WALL_FINISH + CEILING_FINISH → TSK_BACKROLL_DWL keeper
7075bfd docs: universal keeper migration plan + Notion task catalog snapshot
678b193 chore(paintscope): three-tier task coverage classifier
54562b3 feat(paintscope): NC interior baseline probes + Run probes button
ad5e4e3 feat(paintscope): fired-tasks ledger for elimination-by-absence cleanup
f4c1a6c chore(paintscope): static probe for protection task coverage
4e806eb refactor(paintscope): strip legacy protection tasks from 87 mixed modules
cf393b2 refactor(paintscope): retire 22 legacy protection modules
…earlier: protection-on-identity refactor + retire-cascade tool…
```

---

## How the next session should start

1. **Read this doc first.**
2. **Read `Claude/_keeper_migration_plan.md`** for the per-keeper worklist (commit 7075bfd).
3. **Read `Claude/_task_coverage_report.csv`** — already on disk from commit 678b193. May be stale; refresh by:
   ```sh
   node Claude/scripts/classify-task-coverage.mjs ~/Downloads/paintscope-fired-tasks-*.json
   ```
   (User runs Authoring → Ledger button to get a fresh ledger JSON first.)
4. **Start dev server** if not running: `cd "Claude/tools/paintscope" && npm run dev -- --port 5183` (in background).
5. **Start with door migration** per the design above. The pattern is the same as the cut-in migration but with FAC_MATERIAL instead of TRADE_OVERHEAD as the modifier.
6. **After each migration:** regen bundle, run probe, commit, hand off to user for browser verification (hard reload localhost:5183 + Run probes from Authoring).

---

## Open design questions for next session

1. **FAC_MATERIAL structure for doors** — option (a) one entry with application_method conditional, or option (b) two entries `WB_CLEAR_BRUSH`/`WB_CLEAR_SPRAY`. User implied (b) by saying "0.9 only to brush, not spray." Verify the modifier engine supports this lookup pattern.
2. **Stain spray context** — TSK_DOOR_STAIN_SPRAY currently at rate 6, not 8 (which WIPE_STAIN 0.8 would imply on baseline 10). Either (a) accept rate drift, (b) add `WIPE_STAIN_SPRAY` at 0.6, or (c) keep stain spray a separate task. User said rates later, so default = (a).
3. **Cleanup keeper coverage gaps** — most cleanup keepers don't have an obvious Gen-3 replacement scanning by name. Need per-keeper investigation against the modules that currently do the work.
4. **Notion sync** — after migrating each keeper, should we flip its Notion Status from "Universal Keeper" to "Active" to track progress? Or keep "Universal Keeper" forever as a category label?

---

## Anything that might surprise next-session Claude

- **TSK_CUTIN_TAPE_LF stayed orphan** in the cut-in migration. It's a Universal Keeper at rate 240 for "cut to tape edge" workflow. No current module uses tape-line cut-in (the tapeline modules just install/remove the tape, no cut-in happens against it). Defer until that workflow gets built.
- **TSK_SPRAY_CEILING_FINISH had an inverted rate (450, should have been < wall's 390).** Auto-resolved when archived in commit 576597d. Ceiling backroll-tethered spray now goes through TSK_BACKROLL_SPRAY_DWL @ 390 × TRADE_OVERHEAD 1.25 = 312 effective.
- **MOD_APPLY_WALL_PRIME_ROLL was a straggler** in the cut-in migration — it had a `TSK_CUTIN_WALL_TO_CEILING` ref from a prior fac_material wiring commit (`cde7abf`). Fixed in commit `bf21702`. **Always grep for orphans after archiving — there may be similar stragglers in upcoming migrations.** Build-scenario-bundle.mjs will catch unresolved refs; trust its error output.
- **User's preferred verification:** hard-reload localhost:5183 → Authoring tab → "Run probes" button. Don't expect user to read estimate values manually; they want structural correctness.
- **User explicitly deferred rate calibration** to a later pass. Don't get stuck calibrating rates during structural migrations — accept 3-8% drift on ceiling effective rates as TRADE_OVERHEAD 1.25 replaces baked rate differences.
