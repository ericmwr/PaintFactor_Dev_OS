# FAC_MATERIAL Engine Wiring Plan

**Status:** READY — execute in fresh session
**Created:** 2026-05-05
**Purpose:** Wire FAC_MATERIAL into the scenario engine and retire 34 BA_FAC_MATERIAL band-aids across 17 prime-apply modules. Mirrors the FAC_OVERHEAD wiring done 2026-05-05 — same architectural pattern, different modifier.

**Pre-production calibration:** PaintScope is in development. See `memory/project_paintscope_pre_production.md`. Behavioral shifts on prime estimates are expected and have been pre-approved via the "targets when wired" doctrines on each module. No migration plumbing needed.

---

## Context

`FAC_MATERIAL` is declared at `Claude/modifiers/FAC_MATERIAL.json` with this factor table:

| material_type | factor | meaning |
|---|---:|---|
| `WB_FINISH` | 1.00 | Waterbased finish coat (latex/acrylic) — baseline |
| `WB_PRIMER` | 1.25 | Waterbased primer — ~20% slower than finish (careful uniform laydown) |
| `OB_FINISH` | 1.176 | Oil-based finish — ~15% slower than waterbased equivalent |
| `OB_PRIMER` | 1.47 | Oil-based primer — combines both penalties (1.25 × 1.176) |

**Engine wiring is missing.** Currently every `MOD_APPLY_*_PRIME` module carries `modifier_eligibility.material: true` and uses the universal coat tasks (`TSK_BRUSH_COAT_LF/SF`, `TSK_SPRAY_COAT_LF/SF`) but band-aids the rate via per-entry `rate_per_hour` overrides. The band-aids are tagged `_band_aid: "BA_FAC_MATERIAL"` for grep-based reversion.

**The replacement design** (per the FAC_MATERIAL.json description):
- Primer is no longer a distinct task family. It's the same apply task fired with a different `material_type` → `WB_PRIMER` triggers a 1.25× time multiplier.
- `material_type` is auto-derived: prime modules opt in via `eligibility.material === true`, which signals `WB_PRIMER`. Other apply modules default to `WB_FINISH`.
- Oil-based selection is reserved for future use; only waterbased materials are currently wired in active scenarios.

**Band-aid inventory** (audited 2026-05-05): **34 sites across 17 modules**, all `MOD_APPLY_*_PRIME`.

| Module | Brush ovr | Spray ovr | Canonical brush | Canonical spray | Composite? |
|---|---:|---:|---:|---:|---|
| MOD_APPLY_BASEBOARD_PRIME (LF) | 90 | 375 | 80 | 380 | pure |
| MOD_APPLY_CROWN_PRIME (LF) | 90 | 375 | 80 | 380 | pure |
| MOD_APPLY_CHAIR_RAIL_PRIME (LF) | 90 | 375 | 80 | 380 | pure |
| MOD_APPLY_SHOE_MOLD_PRIME (LF) | 90 | 375 | 80 | 380 | pure |
| MOD_APPLY_PICTURE_RAIL_PRIME (LF) | 90 | 375 | 80 | 380 | pure |
| MOD_APPLY_WAINSCOT_CAP_PRIME (LF) | 90 | 375 | 80 | 380 | pure |
| MOD_APPLY_WINDOW_STOOL_PRIME (LF) | 90 | 375 | 80 | 380 | pure |
| MOD_APPLY_WINDOW_APRON_PRIME (LF) | 90 | 375 | 80 | 380 | pure |
| MOD_APPLY_SHADOW_BOX_PRIME (LF) | 90 | 375 | 80 | 380 | pure |
| MOD_APPLY_PANEL_MOLD_PRIME (LF) | 90 | 375 | 80 | 380 | pure |
| MOD_APPLY_DOOR_FRAME_PRIME (LF) | 90 | 375 | 80 | 380 | pure |
| MOD_APPLY_WINDOW_JAMB_PRIME (LF) | 90 | 375 | 80 | 380 | pure |
| MOD_APPLY_WINDOW_CASING_PRIME (LF) | 90 | 375 | 80 | 380 | pure |
| MOD_APPLY_DOOR_CASING_PRIME (LF) | 90 | 375 | 80 | 380 | pure |
| MOD_APPLY_WAINSCOT_PRIME (SF) | 120 | 120 | 70 | 175 | pure |
| MOD_APPLY_WOOD_WALL_PRIME (SF) | 120 | 120 | 70 | 175 | pure |
| MOD_APPLY_WOOD_CEILING_PRIME (SF) | 90 | 90 | 70 | 175 | composite (BA_FAC_OVERHEAD,BA_FAC_MATERIAL) |

**Behavioral shifts to expect on band-aid removal** (post-FAC_MATERIAL retirement, with FAC_OVERHEAD already wired for the composite):

| Class | Pre-strip rate | Post-strip rate | Δ |
|---|---:|---:|---:|
| LF prime brush (14 modules) | 90 LF/hr | 64 LF/hr (= 80/1.25) | -29% (slower) |
| LF prime spray (14 modules) | 375 LF/hr | 304 LF/hr (= 380/1.25) | -19% (slower) |
| Wainscot panel + Wood wall brush (SF) | 120 SF/hr | 56 SF/hr (= 70/1.25) | -53% (slower) |
| Wainscot panel + Wood wall spray (SF) | 120 SF/hr | 140 SF/hr (= 175/1.25) | +17% (faster) |
| Wood ceiling brush (composite) | 90 SF/hr | 44.8 SF/hr (= 70/1.25/1.25) | -50% (slower) |
| Wood ceiling spray (composite) | 90 SF/hr | 112 SF/hr (= 175/1.25/1.25) | +24% (faster) |

These shifts are explicit by-design — every affected module's doctrine names the post-wiring target rate (e.g., "Targets when wired: brush=80/1.25=64, spray=380/1.25=304"). Pre-production calibration permits.

**Architectural assumption to verify before coding:**

| Assumption | Why it matters |
|---|---|
| `engine/run-estimate-scenario.js` `computeScenarioModifierStack` is the single point where modifier factors get folded into `total` | FAC_MATERIAL wiring is one explicit branch alongside the existing qt/height/texture/condition/overhead branches |
| `engine/modifier-registry.js` FALLBACK table is the source for modifier factor lookups when bundle is missing | Need to add FAC_MATERIAL fallback for safety |
| All affected `_band_aid` strings are exact matches `"BA_FAC_MATERIAL"` (pure) or `"BA_FAC_OVERHEAD,BA_FAC_MATERIAL"` (composite) | Strip script discriminates by exact string match — composite becomes pure-FAC_OVERHEAD-marker after FAC_MATERIAL is wired and stripped |
| 20/20 scope-tree smoke must pass before AND after wiring | Same regression check used for FAC_OVERHEAD |

---

## Phase 1: Engine wiring

**File touches:**
- Modified: `Claude/tools/paintscope/src/engine/modifier-registry.js` — add FAC_MATERIAL to FALLBACK table.
- Modified: `Claude/tools/paintscope/src/engine/run-estimate-scenario.js` — add `deriveMaterialType` helper + explicit FAC_MATERIAL branch in `computeScenarioModifierStack`. Fold result into `total`. Add `material` and `materialType` to the returned object (mirrors `overhead` and `surfaceOrientation` from FAC_OVERHEAD wiring).

**Implementation:**

```js
// modifier-registry.js — add to FALLBACK
FAC_MATERIAL: {
  factors: { WB_FINISH: 1.00, WB_PRIMER: 1.25, OB_FINISH: 1.176, OB_PRIMER: 1.47 },
  default: 'WB_FINISH'
},
```

```js
// run-estimate-scenario.js — derivation helper
function deriveMaterialType(eligibility, ctx) {
  // Future: honor explicit ctx.material_type when set (allows OB_* selection
  // from scenarios). Today only WB_* are wired in active scenarios.
  if (ctx && ctx.material_type) return ctx.material_type;
  if (eligibility && eligibility.material === true) return 'WB_PRIMER';
  return 'WB_FINISH';
}

// In computeScenarioModifierStack — add branch alongside existing modifiers:
const material_type = deriveMaterialType(eligibility, ctx);
const material = eligibility.material === true
  ? (bundle ? getFactor(bundle, 'FAC_MATERIAL', material_type)
            : (FALLBACK_TABLE.FAC_MATERIAL.factors[material_type] ?? 1.0))
  : 1.0;

// Fold into total:
const total = Math.round(qt * height * texture * condition * overhead * material * dynamic.dyn * 1000) / 1000;

// Return object adds:
return { ..., material, materialType: material_type, ... };
```

**Acceptance:**
- 20/20 smoke passes.
- Synthetic verification: pick `MOD_APPLY_BASEBOARD_PRIME` (with band-aid still in place), compute its modifier stack with QT3/STD ctx — confirm `material === 1.25`, `materialType === 'WB_PRIMER'`, `total === 1.25`.
- Synthetic: pick `MOD_APPLY_BASEBOARD_FINISH` (no `material` eligibility), confirm `material === 1.0`, `total === 1.0`.
- Synthetic: pick `MOD_APPLY_WOOD_CEILING_PRIME` (composite — overhead AND material both true), confirm `total === 1.25 × 1.25 = 1.5625`.

---

## Phase 2: Strip pure FAC_MATERIAL band-aids

**Scope:** the 16 modules with pure `BA_FAC_MATERIAL` (32 entries — 14 LF prime modules × 2 entries each + 2 SF wall/wainscot prime modules × 2 entries each).

**Excluded from this phase:** `MOD_APPLY_WOOD_CEILING_PRIME` (2 composite entries) — handled in Phase 3.

**Strip script logic** (modeled on the FAC_OVERHEAD strip from 2026-05-05):
```js
for (const mod of targetModules) {
  for (const t of mod.tasks) {
    if (t._band_aid === 'BA_FAC_MATERIAL') {
      delete t.rate_per_hour;
      delete t.fixed_minutes;
      delete t._band_aid;
    }
  }
  // Save the module
}
```

After stripping: re-run scope-tree smoke; lab-verify a baseboard prime estimate produces hours that match the post-FAC_MATERIAL math (canonical_rate / 1.25).

**Doctrine update:** for each stripped module, replace the "until FAC_MATERIAL engine wiring lands" verbiage with "FAC_MATERIAL modifier wired 2026-MM-DD — eligibility.material=true triggers WB_PRIMER 1.25× time multiplier. Effective primer rates: brush=N/1.25, spray=M/1.25." Keep the doctrine succinct.

**Out of scope this phase:**
- The composite `WOOD_CEILING_PRIME` band-aids — Phase 3.
- Wood ceiling math beyond the brush/spray/method gate (the existing `TSK_WDCL_SAND_PRIMER` task entry stays as-is — it's not band-aided).

---

## Phase 3: Retire composite band-aids in MOD_APPLY_WOOD_CEILING_PRIME

**Scope:** 1 module, 2 entries — both currently flagged `BA_FAC_OVERHEAD,BA_FAC_MATERIAL`.

After Phase 1+2 ships, FAC_OVERHEAD is already wired (done 2026-05-05) and FAC_MATERIAL is now wired. Both penalties fire automatically when:
- `eligibility.overhead === true` AND surface orientation is CEILING → 1.25× from FAC_OVERHEAD
- `eligibility.material === true` → 1.25× from FAC_MATERIAL
- Combined: 1.25 × 1.25 = 1.5625× total time multiplier

The composite band-aid override (90 SF/hr both methods) becomes:
- Brush: 70 / 1.5625 = 44.8 SF/hr (-50% rate vs current)
- Spray: 175 / 1.5625 = 112 SF/hr (+24% rate vs current)

These match the doctrine target on `MOD_APPLY_WOOD_CEILING_PRIME` exactly: `"brush=70/(1.25*1.25)=44.8, spray=175/(1.25*1.25)=112"`.

**Strip script for composites:**
```js
for (const t of mod.tasks) {
  if (t._band_aid === 'BA_FAC_OVERHEAD,BA_FAC_MATERIAL') {
    delete t.rate_per_hour;
    delete t._band_aid;
  }
}
```

**Doctrine update on `MOD_APPLY_WOOD_CEILING_PRIME`:** replace the "until FAC_OVERHEAD + FAC_MATERIAL engine wiring lands" verbiage with the post-wiring target — "FAC_OVERHEAD + FAC_MATERIAL both wired. Combined 1.5625× time multiplier. Effective rates: brush=44.8, spray=112 SF/hr."

**Acceptance:**
- 20/20 smoke.
- Bundle regen succeeds.
- Lab estimate against a wood-ceiling prime project produces hours equal to `quantity / 44.8` (brush) or `quantity / 112` (spray).

---

## Phase 4: Merge log entry

Append a single entry covering all three phases:

```json
{
  "date": "2026-MM-DD",
  "group": "FAC_MATERIAL wiring + 34 band-aid retirement",
  "kind": "modifier_wiring",
  "keeper": "FAC_MATERIAL (now firing)",
  "modules_rewritten": 17,
  "reason": "FAC_MATERIAL modifier wired in engine. material_type derived from eligibility.material (true → WB_PRIMER, else WB_FINISH). modifier-registry FALLBACK gained FAC_MATERIAL factor table. computeScenarioModifierStack adds explicit material branch + folds into total. 32 pure BA_FAC_MATERIAL band-aids stripped from 16 modules; 2 composite BA_FAC_OVERHEAD,BA_FAC_MATERIAL band-aids stripped from MOD_APPLY_WOOD_CEILING_PRIME (now uses both modifiers natively).",
  "notes": "Behavioral shifts per module doctrines: LF brush 90→64 (-29%), LF spray 375→304 (-19%), Wainscot/WoodWall SF brush 120→56 (-53%), Wainscot/WoodWall SF spray 120→140 (+17%), WoodCeiling SF brush 90→44.8 (-50%, composite), WoodCeiling SF spray 90→112 (+24%, composite). All shifts pre-approved via 'targets when wired' doctrine on each module. 17 modules: BASEBOARD/CROWN/CHAIR_RAIL/SHOE_MOLD/PICTURE_RAIL/WAINSCOT_CAP/WINDOW_STOOL/WINDOW_APRON/SHADOW_BOX/PANEL_MOLD/DOOR_FRAME/WINDOW_JAMB/WINDOW_CASING/DOOR_CASING (LF, 14) + WAINSCOT/WOOD_WALL (SF, 2) + WOOD_CEILING (composite, 1). Files: engine/modifier-registry.js (FAC_MATERIAL added to FALLBACK), engine/run-estimate-scenario.js (deriveMaterialType helper + material branch + total now includes material). 20/20 smoke before and after."
}
```

---

## Out of Scope (entire plan)

- **Oil-based materials.** OB_FINISH/OB_PRIMER are in the factor table but not used by any active scenario. Wired to fire when ctx.material_type is explicitly set to OB_*; otherwise dormant.
- **RP (repaint) and exterior** module families — not in scope until NC consolidation is finalized per user direction.
- **TSK_TRIM_SPOT_PRIME_KNOTS**-related routing — already retired (round-31 hard retirement). Not a FAC_MATERIAL concern.
- **MOD_APPLY_DOOR_PRIME / MOD_APPLY_DOOR_FINISH** — door slabs use EA_SIDE UOM and have their own per-item compute path. Not part of the universal coat task family. If door prime modules get added in future, they'd follow the same pattern.
- **Modifier interactions beyond FAC_OVERHEAD × FAC_MATERIAL.** No other compositions exist in the canonical bundle today.
- **Engine refactor.** Same code-change shape as FAC_OVERHEAD wiring — incremental branch addition. No structural changes to modifier-stack / scenario-engine.

---

## Recommended Execution Order

1. **Phase 1** — engine wiring (~30 min: register modifier, add helper, add branch, smoke + synthetic verify)
2. **Phase 2** — strip 32 pure band-aids (~15 min: run script, regen, smoke, lab spot-check)
3. **Phase 3** — strip 2 composite band-aids on wood ceiling (~10 min: same pattern, slightly different audit math)
4. **Phase 4** — merge log entry (~5 min: append + regen)

Single session is enough.

---

## First Move on the New Session

1. Read this plan in full.
2. Verify the architectural assumptions table — confirm `computeScenarioModifierStack` signature matches the FAC_OVERHEAD wiring, confirm FALLBACK table location, confirm 17 module band-aid sites still match (run the audit script in the Context section).
3. Phase 1: add FALLBACK row + `deriveMaterialType` helper + `material` branch alongside the FAC_OVERHEAD branch in `computeScenarioModifierStack`. Run `node Claude/scripts/smoke-scope-tree.mjs` — must remain 20/20.
4. Synthetic verification: open the dev server console, fetch `computeScenarioModifierStack` for `MOD_APPLY_BASEBOARD_PRIME` and confirm `material === 1.25`, `materialType === 'WB_PRIMER'`, `total === 1.25`.
5. Phase 2: run the strip script over the 16 pure-FAC_MATERIAL modules. Regen bundle. Smoke must remain 20/20.
6. Phase 3: strip the 2 composite entries in `MOD_APPLY_WOOD_CEILING_PRIME`. Regen. Smoke.
7. Phase 4: append the merge log entry with actual stripped counts and any deviations from the audit math.
8. Browser-verify: load a project with at least one bare-substrate baseboard or wood-ceiling. Confirm prime hours match the FAC_MATERIAL-adjusted math.

After this lands, all 25 modifier wiring band-aids from the consolidation pass will be retired. The bundle becomes fully modifier-driven for orientation + material — no rate-side overrides remaining for these axes.
