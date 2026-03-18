# Interior Stain/Clear Coat Specs — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create 10 interior stain/clear coat spec families, import them into the database, and integrate them into PaintScope's UI and estimation engine.

**Architecture:** SpecFactory 7-stage pipeline generates spec artifacts (research.json through qa_report.json). Artifacts are imported into SQLite via import_spec.py, exported to db-bundle.js, then consumed by PaintScope's React engine. UI gets new coating_type selector and stain/clear-specific controls on wood substrates.

**Tech Stack:** JSON spec artifacts, Python (import_spec.py, export_db_bundle.py), SQLite, React 19 + Vite 7, plain CSS

**Spec Document:** `docs/superpowers/specs/2026-03-18-interior-stain-clear-coat-specs-design.md`

---

## File Structure

### New Files (spec artifacts — 70 files total)
Each of the 10 spec families creates a directory with 7 files:
```
specs/SF_TRIM_NC_STAIN_v1/          (research.json, spec.json, materials.json, sop_modules.json, production.json, resolution.json, qa_report.json)
specs/SF_DOOR_SLAB_INT_NC_STAIN_v1/
specs/SF_DOOR_FRAME_NC_STAIN_v1/
specs/SF_WINDOW_INT_NC_STAIN_v1/
specs/SF_STAIR_RISER_NC_STAIN_v1/
specs/SF_STAIR_RAILING_NC_STAIN_v1/
specs/SF_WOOD_WALL_NC_STAIN_v1/
specs/SF_WOOD_CEILING_NC_STAIN_v1/
specs/SF_WAINSCOT_PANEL_NC_STAIN_v1/
specs/SF_ARCH_ELEMENT_NC_STAIN_v1/
```

### Modified Files (registry, database, PaintScope)
```
specs/_registry/controlled_enums.json   — Add SS_STAINED, SS_CLEAR_COATED, coating_type, wood_species_group, application_method_stain, application_method_clear enums
specs/_registry/id_registry.json        — Add ~400-500 new IDs across all 10 specs
database/paintfactor.db                 — Import all 10 specs
tools/paintscope/src/data/db-bundle.js  — Regenerated from updated database
tools/paintscope/src/data/enums.js      — Add intCoatingTypes, woodSpeciesGroup, clearSheen enums
tools/paintscope/src/data/spec-maps.js  — Add 10 stain spec entries to SPEC_SUBSTRATE_MAP, SPEC_VALID_INPUT_STATES, UI_STATE_TO_SPEC_STATE
tools/paintscope/src/data/substrate-catalog.js — Add coating_type default to wood substrate configs
tools/paintscope/src/state/initial-state.js    — Add coating_type fields to createSubstrateConfig
tools/paintscope/src/state/reducer.js          — Handle stain/clear config fields in SET_SUBSTRATE
tools/paintscope/src/state/migrations.js       — Add migration for existing localStorage state
tools/paintscope/src/engine/spec-resolution.js — Add resolveCoatingType, resolveStainMethod, resolveClearMethod
tools/paintscope/src/engine/run-estimate.js    — Pass coating_type + coat counts through pipeline context
tools/paintscope/src/components/room-editor/SubstrateDetailPanel.jsx — Add coating_type, stain/clear method, coat count, sheen controls
```

---

## Chunk 1: Registry & Controlled Enums Updates

### Task 1: Add new substrate states to controlled_enums.json

**Files:**
- Modify: `specs/_registry/controlled_enums.json` (substrate_state section, ~line 310-375)

- [ ] **Step 1: Read current substrate_state section**

Read `specs/_registry/controlled_enums.json` and locate the `substrate_state.valid_values` array and `substrate_state.definitions` object.

- [ ] **Step 2: Add SS_STAINED and SS_CLEAR_COATED to valid_values**

Add after the existing interior NC states (SS_BARE, SS_PRIMED, etc.):
```json
"SS_STAINED",
"SS_CLEAR_COATED"
```

- [ ] **Step 3: Add definitions for new states**

```json
"SS_STAINED": "Stained wood — stain applied, no clear coat yet (NC stain specs output state)",
"SS_CLEAR_COATED": "Clear-coated wood — stain and/or clear coat present (NC stain/clear specs output state)"
```

- [ ] **Step 4: Commit**

```bash
git add specs/_registry/controlled_enums.json
git commit -m "feat(registry): add SS_STAINED and SS_CLEAR_COATED substrate states"
```

### Task 2: Add new enum dimensions to controlled_enums.json

**Files:**
- Modify: `specs/_registry/controlled_enums.json`

- [ ] **Step 1: Add coating_type enum dimension**

Add a new top-level section after `sheen`:
```json
"coating_type": {
  "valid_values": ["paint", "stain_clear", "stain_only", "clear_only"],
  "definitions": {
    "paint": "Standard paint workflow (prime + finish) — existing specs",
    "stain_clear": "Stain application + sanding sealer + clear topcoat",
    "stain_only": "Penetrating stain only, no topcoat (self-sealing)",
    "clear_only": "Clear coat over bare or stained wood, no stain applied"
  }
}
```

- [ ] **Step 2: Add wood_species_group enum**

```json
"wood_species_group": {
  "valid_values": ["softwood", "hardwood"],
  "definitions": {
    "softwood": "Pine, poplar, cedar, fir — requires wood conditioner before stain",
    "hardwood": "Oak, maple, cherry, walnut, birch — no conditioner needed"
  }
}
```

- [ ] **Step 3: Add clear_sheen enum**

```json
"clear_sheen": {
  "valid_values": ["satin", "semi-gloss", "gloss"],
  "definitions": {
    "satin": "Low-luster clear finish",
    "semi-gloss": "Medium-luster clear finish",
    "gloss": "High-luster clear finish"
  }
}
```

- [ ] **Step 4: Add application_method_stain and application_method_clear enums**

```json
"application_method_stain": {
  "valid_values": ["brush", "roll", "spray"],
  "definitions": {
    "brush": "Brush on and wipe excess",
    "roll": "Roll on and wipe excess (production method for trim)",
    "spray": "Spray on and wipe excess (less common — overspray and agitation concerns)"
  }
},
"application_method_clear": {
  "valid_values": ["brush", "spray"],
  "definitions": {
    "brush": "Brush application with tip-off technique",
    "spray": "Spray application (most common for clear coat)"
  }
}
```

- [ ] **Step 5: Commit**

```bash
git add specs/_registry/controlled_enums.json
git commit -m "feat(registry): add coating_type, wood_species_group, clear_sheen, stain/clear application method enums"
```

---

## Chunk 2: SpecFactory Pipeline — Tier 1 (Trim Stain Spec)

The trim spec establishes the canonical stain/clear module architecture that all other specs reference. It must be completed first.

### Task 3: Create SF_TRIM_NC_STAIN_v1 spec directory

**Files:**
- Create: `specs/SF_TRIM_NC_STAIN_v1/` directory

- [ ] **Step 1: Create spec directory**

```bash
mkdir -p specs/SF_TRIM_NC_STAIN_v1
```

- [ ] **Step 2: Run SpecFactory Researcher stage**

Invoke the SpecFactory orchestrator agent for the Researcher stage. Provide this brief:

```
Spec Family: SF_TRIM_NC_STAIN_v1
Domain: interior
Scope: NC (new construction)
Surface: Interior trim — 7 profiles (baseboard, crown, chair_rail, wainscot_rail, shadow_box, panel_mold, picture_rail)
UOM: LF
Finish Type: Stain and/or clear coat (NOT paint)
Context Prefix: TRST

Key design requirements (from approved design spec):
- coating_type dimension: stain_clear, stain_only, clear_only
- Three-layer coat stack: stain (0-2) → sanding sealer (0-2) → clear topcoat (1-3)
- All coat counts user-selectable with QT-driven defaults
- QT range: QT3-QT5
- Application methods: brush/roll/spray for stain (all include wipe), brush/spray for clear (no roll)
- Independent application method selection for stain vs clear phases
- Wood conditioner: mandatory for softwood + stain (unless gel stain)
- Grain raise: conditional task for waterborne products
- No chemistry-pairing constraints between layers
- Hard constraints: gel stain QT4+ only, lacquer clear spray-only
- Sheen (clear_sheen): satin/semi-gloss/gloss for clear coat
- Paint counterpart: SF_TRIM_NC_PAINT_v1 (reference for items, PS keys, protection zones)

Reference specs:
- Paint counterpart: specs/SF_TRIM_NC_PAINT_v1/spec.json (7 trim items, 28 tasks, 7 modules)
- Exterior stain precedent: specs/SF_DECK_EXT_RP_v1/spec.json (coating_type config, stain materials)
- Exterior stain precedent: specs/SF_FENCE_EXT_RP_v1/spec.json (stain application methods)

Reference doctrine:
- Design spec: docs/superpowers/specs/2026-03-18-interior-stain-clear-coat-specs-design.md
```

Output: `specs/SF_TRIM_NC_STAIN_v1/research.json`

- [ ] **Step 3: Run Resolver stage**

Verify all IDs use TRST prefix, no collisions with id_registry.json. Register new IDs.

- [ ] **Step 4: Run Materials Manager stage**

Generate `materials.json` with:
- 4 stain systems: SYS_STAIN_OIL, SYS_STAIN_OIL_MOD, SYS_STAIN_WB, SYS_STAIN_GEL (QT4+)
- 2 sealer systems: SYS_SEALER_OIL, SYS_SEALER_WB
- 3 clear systems: SYS_CLEAR_POLY_OIL, SYS_CLEAR_POLY_WB, SYS_CLEAR_LACQUER (spray-only)
- Coverage profiles per method (stain brush/roll/spray, sealer, clear brush/spray)
- Consumables: abrasive progression (120/150/220/320/400), foam rollers, wipe cloths, wood conditioner, tack cloths, straining cones

- [ ] **Step 5: Run SOP Librarian stage**

Generate `sop_modules.json` with up to 14 modules per design spec Section 5.1:
- MOD_TRST_SETUP, MOD_TRST_PREP (with conditional grain-raise task), MOD_TRST_CONDITION (softwood+stain, not gel)
- MOD_TRST_STAIN_APPLY, MOD_TRST_STAIN_COAT_2, MOD_TRST_STAIN_DRY
- MOD_TRST_SEALER_APPLY, MOD_TRST_SEALER_INTERSTAGE, MOD_TRST_SEALER_SAND
- MOD_TRST_CLEAR_APPLY, MOD_TRST_CLEAR_INTERSTAGE, MOD_TRST_CLEAR_COAT_2, MOD_TRST_CLEAR_COAT_3
- MOD_TRST_CLEANUP

Phase assignments: setup, prep, apply (stain+sealer), interstage, finish (clear), cleanup. No prime phase.

- [ ] **Step 6: Run Estimation Engineer stage**

Generate `production.json` with:
- Base rates per task (LF/hr) calibrated against SF_TRIM_NC_PAINT rates
- Stain application rates (brush ~80 LF/hr, roll ~120 LF/hr, spray ~100 LF/hr — includes wipe time)
- Clear application rates (brush ~100 LF/hr, spray ~150 LF/hr)
- Sealer rates (similar to clear)
- Interstage sanding rates (220-grit ~150 LF/hr, 320-grit ~180 LF/hr, 400-grit ~200 LF/hr)
- profile_complexity modifier (simple 0.85x, standard 1.0x, complex 1.20x, ornate 1.40x)

- [ ] **Step 7: Run Critic stage**

Generate `qa_report.json`. Validate against design spec Section 11 validation criteria:
- coating_type gates module activation correctly
- stain_clear has independent stain/clear application methods
- clear_only excludes stain modules, blocks roll
- stain_only excludes sealer and clear modules
- Coat count defaults match Section 4.6
- Gel stain blocked below QT4
- Lacquer clear blocked for non-spray
- All IDs use TRST prefix and are registered

- [ ] **Step 8: Run Assembly stage**

Generate final `spec.json` and `resolution.json`. Verify all 7 artifacts are complete and internally consistent.

- [ ] **Step 9: Commit trim stain spec**

```bash
git add specs/SF_TRIM_NC_STAIN_v1/
git commit -m "feat(specs): add SF_TRIM_NC_STAIN_v1 via SpecFactory pipeline"
```

---

## Chunk 3: SpecFactory Pipeline — Tiers 2-4 (Remaining 9 Specs)

### Task 4: Create Tier 2 specs (doors + stair railing)

**Files:**
- Create: `specs/SF_DOOR_SLAB_INT_NC_STAIN_v1/` (7 artifacts)
- Create: `specs/SF_DOOR_FRAME_NC_STAIN_v1/` (7 artifacts)
- Create: `specs/SF_STAIR_RAILING_NC_STAIN_v1/` (7 artifacts)

Run each spec through the full SpecFactory pipeline using SF_TRIM_NC_STAIN_v1 as the canonical stain reference.

- [ ] **Step 1: Create spec directories**

```bash
mkdir -p specs/SF_DOOR_SLAB_INT_NC_STAIN_v1 specs/SF_DOOR_FRAME_NC_STAIN_v1 specs/SF_STAIR_RAILING_NC_STAIN_v1
```

- [ ] **Step 2: Run SF_DOOR_SLAB_INT_NC_STAIN through pipeline**

Brief additions beyond trim pattern:
- Context prefix: DSST
- UOM: EA (per door slab)
- Items: ITM_DOOR_SLAB
- Paint counterpart: specs/SF_DOOR_SLAB_INT_NC_v1/spec.json
- Door-specific: door_style modifier (slab/shaker/raised_panel/glass_frame), sides dimension (1 or 2)
- Stain reference: Use SF_TRIM_NC_STAIN_v1 module architecture as canonical pattern

- [ ] **Step 3: Run SF_DOOR_FRAME_NC_STAIN through pipeline**

Brief additions:
- Context prefix: DFST
- UOM: EA (per frame)
- Items: ITM_DOOR_FRAME, ITM_DOOR_JAMB
- Paint counterpart: specs/SF_DOOR_FRAME_NC_FINISH_v1/spec.json

- [ ] **Step 4: Run SF_STAIR_RAILING_NC_STAIN through pipeline**

Brief additions:
- Context prefix: RLST
- UOM: Per-item (railing=LF, balusters=EA, newels=EA)
- Items: ITM_RAILING, ITM_BALUSTER, ITM_NEWEL
- Paint counterpart: specs/SF_STAIR_RAILING_NC_v1/spec.json
- Railing-specific: baluster count drives significant time; spray is more practical than brush for spindle work

- [ ] **Step 5: Commit Tier 2 specs**

```bash
git add specs/SF_DOOR_SLAB_INT_NC_STAIN_v1/ specs/SF_DOOR_FRAME_NC_STAIN_v1/ specs/SF_STAIR_RAILING_NC_STAIN_v1/
git commit -m "feat(specs): add Tier 2 stain specs (door slab, door frame, stair railing)"
```

### Task 5: Create Tier 3 specs (windows + stair risers)

**Files:**
- Create: `specs/SF_WINDOW_INT_NC_STAIN_v1/` (7 artifacts)
- Create: `specs/SF_STAIR_RISER_NC_STAIN_v1/` (7 artifacts)

- [ ] **Step 1: Create spec directories**

```bash
mkdir -p specs/SF_WINDOW_INT_NC_STAIN_v1 specs/SF_STAIR_RISER_NC_STAIN_v1
```

- [ ] **Step 2: Run SF_WINDOW_INT_NC_STAIN through pipeline**

Brief additions:
- Context prefix: WIST
- UOM: EA (per window)
- Items: ITM_WINDOW_SASH, ITM_WINDOW_JAMB
- Paint counterpart: specs/SF_WINDOW_INT_NC_v1/spec.json
- Window-specific: glass masking protection, window_type modifier (double_hung/casement/fixed/awning)

- [ ] **Step 3: Run SF_STAIR_RISER_NC_STAIN through pipeline**

Brief additions:
- Context prefix: SRST
- UOM: EA (per riser)
- Items: ITM_STAIR_RISER, ITM_STAIR_TREAD
- Paint counterpart: specs/SF_STAIR_RISER_NC_v1/spec.json
- Stair-specific: tread nosing detail, anti-slip concerns with clear coat (may need additive note)

- [ ] **Step 4: Commit Tier 3 specs**

```bash
git add specs/SF_WINDOW_INT_NC_STAIN_v1/ specs/SF_STAIR_RISER_NC_STAIN_v1/
git commit -m "feat(specs): add Tier 3 stain specs (window, stair riser)"
```

### Task 6: Create Tier 4 specs (wood surfaces + arch elements)

**Files:**
- Create: `specs/SF_WOOD_WALL_NC_STAIN_v1/` (7 artifacts)
- Create: `specs/SF_WOOD_CEILING_NC_STAIN_v1/` (7 artifacts)
- Create: `specs/SF_WAINSCOT_PANEL_NC_STAIN_v1/` (7 artifacts)
- Create: `specs/SF_ARCH_ELEMENT_NC_STAIN_v1/` (7 artifacts)

- [ ] **Step 1: Create spec directories**

```bash
mkdir -p specs/SF_WOOD_WALL_NC_STAIN_v1 specs/SF_WOOD_CEILING_NC_STAIN_v1 specs/SF_WAINSCOT_PANEL_NC_STAIN_v1 specs/SF_ARCH_ELEMENT_NC_STAIN_v1
```

- [ ] **Step 2: Run SF_WOOD_WALL_NC_STAIN through pipeline**

Brief additions:
- Context prefix: WWST
- UOM: SF
- QT range: QT3-QT4 only
- Items: ITM_WOOD_WALL
- Paint counterpart: specs/SF_WOOD_WALL_NC_v1/spec.json
- Wall-specific: wall_style (shiplap/tongue_groove/panel), spray is common production method for large field surfaces

- [ ] **Step 3: Run SF_WOOD_CEILING_NC_STAIN through pipeline**

Brief additions:
- Context prefix: WCST
- UOM: SF
- QT range: QT3-QT4 only
- Items: ITM_WOOD_CEILING
- Paint counterpart: specs/SF_WOOD_CEILING_NC_v1/spec.json
- Ceiling-specific: overhead penalty modifier, height_band modifier

- [ ] **Step 4: Run SF_WAINSCOT_PANEL_NC_STAIN through pipeline**

Brief additions:
- Context prefix: WPST
- UOM: SF
- QT range: QT3-QT4 only
- Items: ITM_WAINSCOT_PANEL
- Paint counterpart: specs/SF_WAINSCOT_PANEL_NC_v1/spec.json

- [ ] **Step 5: Run SF_ARCH_ELEMENT_NC_STAIN through pipeline**

Brief additions:
- Context prefix: AEST
- UOM: Per-item (beams=LF, columns=EA, mantels=EA)
- QT range: QT3-QT5
- Items: ITM_BEAM, ITM_COLUMN, ITM_MANTEL
- Paint counterpart: specs/SF_ARCH_ELEMENT_NC_v1/spec.json
- Element-specific: element_type config, height_band modifier, mantels are focal-point surfaces (QT5 common)

- [ ] **Step 6: Commit Tier 4 specs**

```bash
git add specs/SF_WOOD_WALL_NC_STAIN_v1/ specs/SF_WOOD_CEILING_NC_STAIN_v1/ specs/SF_WAINSCOT_PANEL_NC_STAIN_v1/ specs/SF_ARCH_ELEMENT_NC_STAIN_v1/
git commit -m "feat(specs): add Tier 4 stain specs (wood wall, ceiling, wainscot, arch element)"
```

---

## Chunk 4: Database Import & Bundle Regeneration

### Task 7: Update id_registry.json with all stain spec IDs

**Files:**
- Modify: `specs/_registry/id_registry.json`

- [ ] **Step 1: Collect all new IDs from 10 spec artifacts**

For each spec, extract all MOD_*, TSK_*, SYS_*, ROUND_*, COV_*, FAC_* IDs from spec.json, materials.json, sop_modules.json, and production.json. Verify no collisions with existing IDs.

- [ ] **Step 2: Add shared material system IDs**

Add once (shared across all 10 specs):
- SYS_STAIN_OIL, SYS_STAIN_OIL_MOD, SYS_STAIN_WB, SYS_STAIN_GEL
- SYS_SEALER_OIL, SYS_SEALER_WB
- SYS_CLEAR_POLY_OIL, SYS_CLEAR_POLY_WB, SYS_CLEAR_LACQUER

- [ ] **Step 3: Add per-spec IDs (modules, tasks, rounds, coverage, modifiers)**

Add IDs grouped by spec family, using context prefixes: TRST, DSST, DFST, WIST, SRST, RLST, WWST, WCST, WPST, AEST.

- [ ] **Step 4: Commit registry update**

```bash
git add specs/_registry/id_registry.json
git commit -m "feat(registry): register ~400-500 stain/clear coat spec IDs"
```

### Task 8: Import all 10 specs into database

**Files:**
- Modify: `database/paintfactor.db`

- [ ] **Step 1: Import Tier 1 (trim)**

```bash
cd "C:/Eric_AI_Playground/Claude Code Uni/Claude"
python database/scripts/import_spec.py specs/SF_TRIM_NC_STAIN_v1/ --db database/paintfactor.db
```

Verify import_report.json shows status: "success" and check row counts.

- [ ] **Step 2: Import Tier 2 (doors + railing)**

```bash
python database/scripts/import_spec.py specs/SF_DOOR_SLAB_INT_NC_STAIN_v1/ --db database/paintfactor.db
python database/scripts/import_spec.py specs/SF_DOOR_FRAME_NC_STAIN_v1/ --db database/paintfactor.db
python database/scripts/import_spec.py specs/SF_STAIR_RAILING_NC_STAIN_v1/ --db database/paintfactor.db
```

- [ ] **Step 3: Import Tier 3 (windows + risers)**

```bash
python database/scripts/import_spec.py specs/SF_WINDOW_INT_NC_STAIN_v1/ --db database/paintfactor.db
python database/scripts/import_spec.py specs/SF_STAIR_RISER_NC_STAIN_v1/ --db database/paintfactor.db
```

- [ ] **Step 4: Import Tier 4 (wood surfaces + arch)**

```bash
python database/scripts/import_spec.py specs/SF_WOOD_WALL_NC_STAIN_v1/ --db database/paintfactor.db
python database/scripts/import_spec.py specs/SF_WOOD_CEILING_NC_STAIN_v1/ --db database/paintfactor.db
python database/scripts/import_spec.py specs/SF_WAINSCOT_PANEL_NC_STAIN_v1/ --db database/paintfactor.db
python database/scripts/import_spec.py specs/SF_ARCH_ELEMENT_NC_STAIN_v1/ --db database/paintfactor.db
```

- [ ] **Step 5: Verify all 10 imports succeeded**

Check each `import_report.json` for status: "success". Verify total row counts (expect ~300-500 new rows across tasks, modules, rates, materials tables).

- [ ] **Step 6: Regenerate db-bundle.js**

```bash
python database/scripts/export_db_bundle.py --db database/paintfactor.db > tools/paintscope/src/data/db-bundle.js
```

Verify the file is valid JS and includes the new spec families.

- [ ] **Step 7: Commit database and bundle**

```bash
git add database/paintfactor.db database/imports/ tools/paintscope/src/data/db-bundle.js
git commit -m "feat(db): import 10 stain/clear coat specs into database and regenerate bundle"
```

---

## Chunk 5: PaintScope Data Layer Updates

### Task 9: Add stain/clear enums to enums.js

**Files:**
- Modify: `tools/paintscope/src/data/enums.js` (~line 123-172)

- [ ] **Step 1: Read current enums.js**

Read `tools/paintscope/src/data/enums.js` to find exact insertion points.

- [ ] **Step 2: Add interior coating type enum**

After the existing `extCoatingTypes` block (~line 128), add:

```js
intCoatingTypes: [
  { value: 'paint', label: 'Paint' },
  { value: 'stain_clear', label: 'Stain + Clear Coat' },
  { value: 'stain_only', label: 'Stain Only (Penetrating)' },
  { value: 'clear_only', label: 'Clear Coat Only' },
],
```

- [ ] **Step 3: Add wood species group enum**

```js
woodSpeciesGroup: [
  { value: 'softwood', label: 'Softwood (Pine, Poplar, Cedar)' },
  { value: 'hardwood', label: 'Hardwood (Oak, Maple, Cherry, Walnut)' },
],
```

- [ ] **Step 4: Add clear sheen enum**

```js
clearSheen: [
  { value: 'satin', label: 'Satin' },
  { value: 'semi-gloss', label: 'Semi-Gloss' },
  { value: 'gloss', label: 'Gloss' },
],
```

- [ ] **Step 5: Add stain/clear application method enums**

```js
stainApplicationMethods: [
  { value: 'brush', label: 'Brush + Wipe' },
  { value: 'roll', label: 'Roll + Wipe' },
  { value: 'spray', label: 'Spray + Wipe' },
],
clearApplicationMethods: [
  { value: 'brush', label: 'Brush' },
  { value: 'spray', label: 'Spray' },
],
```

- [ ] **Step 6: Add stain coat count and sealer/clear coat count enums**

```js
stainCoatCounts: [
  { value: 1, label: '1 Coat' },
  { value: 2, label: '2 Coats' },
],
sealerCoatCounts: [
  { value: 0, label: 'None' },
  { value: 1, label: '1 Coat' },
  { value: 2, label: '2 Coats' },
],
clearCoatCounts: [
  { value: 1, label: '1 Coat' },
  { value: 2, label: '2 Coats' },
  { value: 3, label: '3 Coats' },
],
```

- [ ] **Step 7: Add clear_coated to interior substrate states**

In the `substrateStates` array (~line 162), add after the `stained` entry:

```js
{ value:'clear_coated', label:'Clear Coated', applies_to:['doors','door_casing','window_casing','door_frames','windows','window_jamb','baseboard','crown','chair_rail','shoe_mold','wainscoting','wood_feature_wall','wood_ceiling','beams','columns','mantels','builtins','stair_risers','stair_railing'] },
```

- [ ] **Step 8: Commit enums update**

```bash
git add tools/paintscope/src/data/enums.js
git commit -m "feat(paintscope): add stain/clear coat enums (coating types, species, sheen, methods, coat counts)"
```

### Task 10: Add stain specs to spec-maps.js

**Files:**
- Modify: `tools/paintscope/src/data/spec-maps.js` (~lines 1-161)

- [ ] **Step 1: Read current spec-maps.js**

Read `tools/paintscope/src/data/spec-maps.js` to find exact insertion points.

- [ ] **Step 2: Add stain spec entries to SPEC_SUBSTRATE_MAP**

After the interior paint entries (~line 21), add:

Note: `baseboard` is the "primary substrate" for trim specs — used only for QT/application method resolution. The engine picks up all 7 trim profiles through quantity-lookups, same pattern as SF_TRIM_NC_PAINT.

```js
// ── Interior Stain/Clear ──
'SF_TRIM_NC_STAIN':            'baseboard',
'SF_DOOR_SLAB_INT_NC_STAIN':   'doors',
'SF_DOOR_FRAME_NC_STAIN':      'door_frames',
'SF_WINDOW_INT_NC_STAIN':      'windows',
'SF_STAIR_RISER_NC_STAIN':     'stair_risers',
'SF_STAIR_RAILING_NC_STAIN':   'stair_railing',
'SF_WOOD_WALL_NC_STAIN':       'wood_feature_wall',
'SF_WOOD_CEILING_NC_STAIN':    'wood_ceiling',
'SF_WAINSCOT_PANEL_NC_STAIN':  'wainscoting',
'SF_ARCH_ELEMENT_NC_STAIN':    'beams',
```

- [ ] **Step 3: Add stain specs to SPEC_VALID_INPUT_STATES**

After the interior paint entries (~line 98), add:

```js
// ── Interior Stain/Clear ──
'SF_TRIM_NC_STAIN':            ['SS_BARE', 'SS_STAINED'],
'SF_DOOR_SLAB_INT_NC_STAIN':   ['SS_BARE', 'SS_STAINED'],
'SF_DOOR_FRAME_NC_STAIN':      ['SS_BARE', 'SS_STAINED'],
'SF_WINDOW_INT_NC_STAIN':      ['SS_BARE', 'SS_STAINED'],
'SF_STAIR_RISER_NC_STAIN':     ['SS_BARE', 'SS_STAINED'],
'SF_STAIR_RAILING_NC_STAIN':   ['SS_BARE', 'SS_STAINED'],
'SF_WOOD_WALL_NC_STAIN':       ['SS_BARE', 'SS_STAINED'],
'SF_WOOD_CEILING_NC_STAIN':    ['SS_BARE', 'SS_STAINED'],
'SF_WAINSCOT_PANEL_NC_STAIN':  ['SS_BARE', 'SS_STAINED'],
'SF_ARCH_ELEMENT_NC_STAIN':    ['SS_BARE', 'SS_STAINED'],
```

Note: SS_BARE for stain_clear and stain_only; SS_STAINED also valid for clear_only. Engine uses coating_type to further filter.

- [ ] **Step 4: Add clear_coated to UI_STATE_TO_SPEC_STATE**

After the `stained` entry (~line 69), add:

```js
'clear_coated':       'SS_CLEAR_COATED',
```

- [ ] **Step 5: Add dynamic output state resolver for stain specs**

Stain spec output states vary by coating_type (stain_only -> SS_STAINED, others -> SS_CLEAR_COATED). The static `SPEC_OUTPUT_STATES` map cannot express this. Add a resolver function instead:

```js
// Add after SPEC_OUTPUT_STATES
export function resolveStainOutputState(specId, coatingType) {
  if (!STAIN_SPEC_FAMILIES.has(specId)) return SPEC_OUTPUT_STATES[specId] || null;
  if (coatingType === 'stain_only') return 'SS_STAINED';
  return 'SS_CLEAR_COATED'; // stain_clear and clear_only both output clear-coated
}
```

Do NOT add stain specs to the static `SPEC_OUTPUT_STATES` map — the engine should call `resolveStainOutputState()` for stain specs. This keeps the static map for paint chain activation (prime -> finish) unchanged.

- [ ] **Step 6: Add STAIN_SPEC_FAMILIES lookup**

Add a new export to identify which specs are stain specs (for engine routing):

```js
export const STAIN_SPEC_FAMILIES = new Set([
  'SF_TRIM_NC_STAIN',
  'SF_DOOR_SLAB_INT_NC_STAIN',
  'SF_DOOR_FRAME_NC_STAIN',
  'SF_WINDOW_INT_NC_STAIN',
  'SF_STAIR_RISER_NC_STAIN',
  'SF_STAIR_RAILING_NC_STAIN',
  'SF_WOOD_WALL_NC_STAIN',
  'SF_WOOD_CEILING_NC_STAIN',
  'SF_WAINSCOT_PANEL_NC_STAIN',
  'SF_ARCH_ELEMENT_NC_STAIN',
]);
```

- [ ] **Step 7: Add display names for stain specs to constants.js**

In `tools/paintscope/src/data/constants.js`, add entries to `SPEC_DISPLAY_NAMES`:

```js
// Interior Stain/Clear
'SF_TRIM_NC_STAIN':            'Trim — Stain/Clear',
'SF_DOOR_SLAB_INT_NC_STAIN':   'Door Slab — Stain/Clear',
'SF_DOOR_FRAME_NC_STAIN':      'Door Frame — Stain/Clear',
'SF_WINDOW_INT_NC_STAIN':      'Window — Stain/Clear',
'SF_STAIR_RISER_NC_STAIN':     'Stair Riser — Stain/Clear',
'SF_STAIR_RAILING_NC_STAIN':   'Stair Railing — Stain/Clear',
'SF_WOOD_WALL_NC_STAIN':       'Wood Wall — Stain/Clear',
'SF_WOOD_CEILING_NC_STAIN':    'Wood Ceiling — Stain/Clear',
'SF_WAINSCOT_PANEL_NC_STAIN':  'Wainscot — Stain/Clear',
'SF_ARCH_ELEMENT_NC_STAIN':    'Arch Element — Stain/Clear',
```

- [ ] **Step 8: Commit spec-maps and constants update**

```bash
git add tools/paintscope/src/data/spec-maps.js tools/paintscope/src/data/constants.js
git commit -m "feat(paintscope): add stain spec mappings and display names (10 families)"
```

---

## Chunk 6: PaintScope State & Engine Updates

### Task 11: Update substrate config state for stain/clear fields

**Files:**
- Modify: `tools/paintscope/src/state/initial-state.js` (~line 45-62)
- Modify: `tools/paintscope/src/data/substrate-catalog.js`

- [ ] **Step 1: Read initial-state.js and substrate-catalog.js**

Read both files to understand current createSubstrateConfig factory and catalog structure.

- [ ] **Step 2: Define WOOD_SUBSTRATES set in substrate-catalog.js**

Many wood substrates default to `factory_primed` (trim) not `bare_wood`, so detection must be by substrate ID, not default state. Add a constant:

```js
// Substrates that support stain/clear coating_type when set to bare_wood
export const WOOD_SUBSTRATES = new Set([
  'doors', 'door_frames', 'door_casing', 'window_casing', 'windows', 'window_jamb',
  'baseboard', 'crown', 'chair_rail', 'shoe_mold', 'wainscoting',
  'wood_feature_wall', 'wood_ceiling', 'beams', 'columns', 'mantels',
  'builtins', 'stair_risers', 'stair_railing',
]);
```

Do NOT modify existing `defaultConfig` in the catalog entries — coating_type is only relevant when the user sets substrate_state to `bare_wood` at runtime, not at catalog default time.

- [ ] **Step 3: Update createSubstrateConfig to include stain defaults**

In `initial-state.js`, import `WOOD_SUBSTRATES` and update the factory. The stain fields are injected only when a wood substrate has `bare_wood` state:

```js
import { SUBSTRATE_MAP, WOOD_SUBSTRATES } from '../data/substrate-catalog';

// Inside createSubstrateConfig, after merging base + overrides:
const config = { ...base, ...overrides };
if (WOOD_SUBSTRATES.has(substrateId)) {
  config.coating_type = config.coating_type || 'paint';
  config.wood_species_group = config.wood_species_group || 'hardwood';
  config.application_method_stain = config.application_method_stain || 'brush';
  config.application_method_clear = config.application_method_clear || 'brush';
  config.stain_coats = config.stain_coats ?? 1;
  config.sealer_coats = config.sealer_coats ?? 0;
  config.clear_coats = config.clear_coats ?? 1;
  config.clear_sheen = config.clear_sheen || 'satin';
}
return config;
```

These fields sit dormant (coating_type defaults to 'paint') until the user changes substrate_state to bare_wood AND selects a stain/clear coating_type.

- [ ] **Step 4: Commit state updates**

```bash
git add tools/paintscope/src/state/initial-state.js tools/paintscope/src/data/substrate-catalog.js
git commit -m "feat(paintscope): add stain/clear config defaults to wood substrate state factory"
```

### Task 12: Update reducer for stain/clear substrate fields

**Files:**
- Modify: `tools/paintscope/src/state/reducer.js` (~line 91 SET_SUBSTRATE handler)

- [ ] **Step 1: Read reducer.js SET_SUBSTRATE handler**

Read the SET_SUBSTRATE case to understand the current field update pattern.

- [ ] **Step 2: Add QT-driven coat count defaults on coating_type change**

The existing SET_SUBSTRATE handler (reducer.js ~line 91) uses a simple single-field-set pattern with `mapRoom`. We need to extend it to conditionally merge extra fields when coating_type or quality_tier changes. The project state uses `state.project.default_quality_tier` (not `state.project.defaults.quality_tier`).

Replace the SET_SUBSTRATE case with:

```js
case 'SET_SUBSTRATE': {
  const { roomId, substrateId, field, value } = payload;
  return mapRoom(roomId, r => {
    if (!r.substrates[substrateId]) return r;
    // Apply the primary field change
    let updated = { ...r.substrates[substrateId], [field]: value };

    // QT-driven coat count defaults helper
    const COAT_DEFAULTS = {
      QT3: { stain_coats: 1, sealer_coats: 0, clear_coats: 1 },
      QT4: { stain_coats: 1, sealer_coats: 1, clear_coats: 2 },
      QT5: { stain_coats: 1, sealer_coats: 2, clear_coats: 3 },
    };

    // When coating_type changes to stain/clear, set coat count defaults from current QT
    if (field === 'coating_type' && value !== 'paint') {
      const qt = updated.quality_tier || state.project.default_quality_tier || 'QT3';
      const d = COAT_DEFAULTS[qt] || COAT_DEFAULTS.QT3;
      updated = { ...updated, ...d };
    }

    // When QT changes and coating_type is stain/clear, reset coat defaults
    // Note: This resets user-customized coat counts. Acceptable UX trade-off —
    // QT change implies a tier shift that warrants resetting to new tier defaults.
    if (field === 'quality_tier' && updated.coating_type && updated.coating_type !== 'paint') {
      const d = COAT_DEFAULTS[value] || COAT_DEFAULTS.QT3;
      updated = { ...updated, ...d };
    }

    return {
      ...r,
      substrates: { ...r.substrates, [substrateId]: updated }
    };
  });
}
```

- [ ] **Step 3: Commit reducer update**

```bash
git add tools/paintscope/src/state/reducer.js
git commit -m "feat(paintscope): reducer handles coating_type and QT-driven coat count defaults"
```

### Task 13: Add state migration for existing localStorage data

**Files:**
- Modify: `tools/paintscope/src/state/migrations.js`

- [ ] **Step 1: Read current migrations.js**

Read to find current schema version and migration pattern.

- [ ] **Step 2: Add migration to inject coating_type defaults**

Add a new migration that adds `coating_type: 'paint'` to all existing wood substrates in saved state so they continue to work as paint specs. Check the current `_schemaVersion` in migrations.js and increment by 1:

```js
// Migration: Add coating_type to wood substrates
// Replace NEW_VERSION with current version + 1 (check migrations.js for current value)
if (state._schemaVersion < NEW_VERSION) {
  const woodSubstrates = ['doors', 'door_frames', 'door_casing', 'window_casing', 'windows', 'window_jamb',
    'baseboard', 'crown', 'chair_rail', 'shoe_mold', 'wainscoting', 'wood_feature_wall', 'wood_ceiling',
    'beams', 'columns', 'mantels', 'builtins', 'stair_risers', 'stair_railing'];
  for (const room of state.rooms || []) {
    for (const [id, sub] of Object.entries(room.substrates || {})) {
      if (woodSubstrates.includes(id) && sub.substrate_state === 'bare_wood' && !sub.coating_type) {
        sub.coating_type = 'paint';
      }
    }
  }
  state._schemaVersion = NEW_VERSION;
}
```

- [ ] **Step 3: Commit migration**

```bash
git add tools/paintscope/src/state/migrations.js
git commit -m "feat(paintscope): add migration to inject coating_type defaults for existing saved state"
```

### Task 14: Update spec-resolution.js for stain routing

**Files:**
- Modify: `tools/paintscope/src/engine/spec-resolution.js` (~lines 1-36)

- [ ] **Step 1: Read current spec-resolution.js**

Read the full file to understand current resolution functions.

- [ ] **Step 2: Add resolveCoatingType function**

```js
export function resolveCoatingType(specId, room, project) {
  const primarySub = SPEC_SUBSTRATE_MAP[specId];
  if (!primarySub) return 'paint';
  const config = room.substrates?.[primarySub];
  return config?.coating_type || 'paint';
}
```

- [ ] **Step 3: Add resolveStainMethod and resolveClearMethod functions**

```js
export function resolveStainMethod(specId, room, project) {
  const primarySub = SPEC_SUBSTRATE_MAP[specId];
  const config = room.substrates?.[primarySub];
  return config?.application_method_stain || 'brush';
}

export function resolveClearMethod(specId, room, project) {
  const primarySub = SPEC_SUBSTRATE_MAP[specId];
  const config = room.substrates?.[primarySub];
  return config?.application_method_clear || 'brush';
}

export function resolveCoatCounts(specId, room, project) {
  const primarySub = SPEC_SUBSTRATE_MAP[specId];
  const config = room.substrates?.[primarySub];
  return {
    stain_coats: config?.stain_coats ?? 1,
    sealer_coats: config?.sealer_coats ?? 0,
    clear_coats: config?.clear_coats ?? 1,
  };
}

export function resolveClearSheen(specId, room, project) {
  const primarySub = SPEC_SUBSTRATE_MAP[specId];
  const config = room.substrates?.[primarySub];
  return config?.clear_sheen || 'satin';
}

export function resolveWoodSpecies(specId, room, project) {
  const primarySub = SPEC_SUBSTRATE_MAP[specId];
  const config = room.substrates?.[primarySub];
  return config?.wood_species_group || 'hardwood';
}
```

- [ ] **Step 4: Commit spec-resolution update**

```bash
git add tools/paintscope/src/engine/spec-resolution.js
git commit -m "feat(paintscope): add stain/clear resolution functions (coating type, methods, coats, sheen, species)"
```

### Task 15: Update run-estimate.js to pass stain context

**Files:**
- Modify: `tools/paintscope/src/engine/run-estimate.js` (~line 63+)

- [ ] **Step 1: Read current run-estimate.js**

Read to find where context (ctx) is built for each spec and passed to per-item-compute.

- [ ] **Step 2: Import new resolution functions**

Add to the existing import from `./spec-resolution.js` (do not add a duplicate import line):
```js
import { resolveQualityTier, resolveApplicationMethod, resolveSubstrateStateForSpec,
  resolveCoatingType, resolveStainMethod, resolveClearMethod, resolveCoatCounts, resolveClearSheen, resolveWoodSpecies } from './spec-resolution.js';
```

Add to the existing import from `../data/spec-maps.js`:
```js
import { SPEC_SUBSTRATE_MAP, STAIN_SPEC_FAMILIES } from '../data/spec-maps.js';
```

- [ ] **Step 3: Add stain context to spec resolution loop**

**How spec activation works:** The engine iterates over specs from `db-bundle.js` (all spec families in the database). Both paint and stain specs for the same surface (e.g., SF_TRIM_NC_PAINT and SF_TRIM_NC_STAIN) share the same PS quantity keys. The `coating_type` determines which one activates. When stain specs are imported into the database (Task 8), they automatically enter the iteration loop.

In the spec iteration loop, after existing context building, add the coating_type routing:

```js
const coatingType = resolveCoatingType(specId, room, project);

// Skip stain specs when coating_type is paint (or not set)
if (STAIN_SPEC_FAMILIES.has(specId) && coatingType === 'paint') continue;
// Skip paint specs for this substrate when coating_type is stain/clear
// (only skip the paint counterpart, not unrelated paint specs)
if (!STAIN_SPEC_FAMILIES.has(specId) && coatingType !== 'paint') {
  // Check if this paint spec's primary substrate matches a stain spec's primary substrate
  const primarySub = SPEC_SUBSTRATE_MAP[specId];
  const hasStainCounterpart = [...STAIN_SPEC_FAMILIES].some(
    stainId => SPEC_SUBSTRATE_MAP[stainId] === primarySub
  );
  if (hasStainCounterpart) continue;
}

// Add stain-specific context for stain specs
if (STAIN_SPEC_FAMILIES.has(specId)) {
  ctx.coating_type = coatingType;
  ctx.application_method_stain = resolveStainMethod(specId, room, project);
  ctx.application_method_clear = resolveClearMethod(specId, room, project);
  ctx.wood_species_group = resolveWoodSpecies(specId, room, project);
  ctx.clear_sheen = resolveClearSheen(specId, room, project);
  const coats = resolveCoatCounts(specId, room, project);
  ctx.stain_coats = coats.stain_coats;
  ctx.sealer_coats = coats.sealer_coats;
  ctx.clear_coats = coats.clear_coats;
}
```

- [ ] **Step 4: Commit engine update**

```bash
git add tools/paintscope/src/engine/run-estimate.js
git commit -m "feat(paintscope): engine routes stain vs paint specs based on coating_type context"
```

---

## Chunk 7: PaintScope UI — SubstrateDetailPanel

### Task 16: Add stain/clear controls to SubstrateDetailPanel

**Files:**
- Modify: `tools/paintscope/src/components/room-editor/SubstrateDetailPanel.jsx`

- [ ] **Step 1: Read current SubstrateDetailPanel.jsx**

Read to find the render structure and where to add conditional stain/clear controls.

- [ ] **Step 2: Import new enums**

Add to imports:
```js
import { ENUMS } from '../../data/enums';
// ENUMS already imported — verify intCoatingTypes, woodSpeciesGroup, clearSheen,
// stainApplicationMethods, clearApplicationMethods, stainCoatCounts, sealerCoatCounts, clearCoatCounts are available
```

- [ ] **Step 3: Define helper for wood substrate detection**

```js
const WOOD_SUBSTRATES = new Set([
  'doors', 'door_frames', 'door_casing', 'window_casing', 'windows', 'window_jamb',
  'baseboard', 'crown', 'chair_rail', 'shoe_mold', 'wainscoting',
  'wood_feature_wall', 'wood_ceiling', 'beams', 'columns', 'mantels',
  'builtins', 'stair_risers', 'stair_railing',
]);
const isWood = WOOD_SUBSTRATES.has(substrateId);
const isBareWood = isWood && config.substrate_state === 'bare_wood';
const coatingType = config.coating_type || 'paint';
const includesStain = coatingType === 'stain_clear' || coatingType === 'stain_only';
const includesClear = coatingType === 'stain_clear' || coatingType === 'clear_only';
```

- [ ] **Step 4: Add coating_type selector (shown when bare_wood on wood substrate)**

After the substrate_state select, add:

```jsx
{isBareWood && (
  <div className="form-group">
    <label>Coating Type</label>
    <Select options={ENUMS.intCoatingTypes} value={coatingType}
      onChange={v => setSub('coating_type', v)} />
  </div>
)}
```

- [ ] **Step 5: Add wood species group selector**

```jsx
{isBareWood && coatingType !== 'paint' && (
  <div className="form-group">
    <label>Wood Species</label>
    <Select options={ENUMS.woodSpeciesGroup} value={config.wood_species_group || 'hardwood'}
      onChange={v => setSub('wood_species_group', v)} />
  </div>
)}
```

- [ ] **Step 6: Add stain application method and coat count (when coating includes stain)**

```jsx
{isBareWood && includesStain && (
  <>
    <div className="form-group">
      <label>Stain Method</label>
      <Select options={ENUMS.stainApplicationMethods} value={config.application_method_stain || 'brush'}
        onChange={v => setSub('application_method_stain', v)} />
    </div>
    <div className="form-group">
      <label>Stain Coats</label>
      <Select options={ENUMS.stainCoatCounts} value={config.stain_coats ?? 1}
        onChange={v => setSub('stain_coats', Number(v))} />
    </div>
  </>
)}
```

- [ ] **Step 7: Add clear application method, sheen, and coat counts (when coating includes clear)**

```jsx
{isBareWood && includesClear && (
  <>
    <div className="form-group">
      <label>Clear Method</label>
      <Select options={ENUMS.clearApplicationMethods} value={config.application_method_clear || 'brush'}
        onChange={v => setSub('application_method_clear', v)} />
    </div>
    <div className="form-group">
      <label>Clear Sheen</label>
      <Select options={ENUMS.clearSheen} value={config.clear_sheen || 'satin'}
        onChange={v => setSub('clear_sheen', v)} />
    </div>
    <div className="form-group">
      <label>Sealer Coats</label>
      <Select options={ENUMS.sealerCoatCounts} value={config.sealer_coats ?? 0}
        onChange={v => setSub('sealer_coats', Number(v))} />
    </div>
    <div className="form-group">
      <label>Clear Coats</label>
      <Select options={ENUMS.clearCoatCounts} value={config.clear_coats ?? 1}
        onChange={v => setSub('clear_coats', Number(v))} />
    </div>
  </>
)}
```

- [ ] **Step 8: Verify dev server shows new controls**

Run `npm run dev` in paintscope directory. Open browser to localhost:5173.
1. Add a room
2. Toggle on a wood substrate (e.g., baseboard, doors, stair_railing)
3. Set substrate state to "Bare Wood"
4. Verify coating_type dropdown appears with 4 options
5. Select "Stain + Clear Coat" — verify stain method, stain coats, clear method, clear sheen, sealer coats, clear coats all appear
6. Select "Stain Only" — verify only stain method and stain coats appear
7. Select "Clear Coat Only" — verify only clear method, sheen, sealer coats, clear coats appear (no roll option)
8. Select "Paint" — verify all stain/clear controls disappear

- [ ] **Step 9: Commit UI update**

```bash
git add tools/paintscope/src/components/room-editor/SubstrateDetailPanel.jsx
git commit -m "feat(paintscope): add stain/clear coat controls to SubstrateDetailPanel"
```

---

## Chunk 8: Verification & Final Commit

### Task 17: End-to-end verification

- [ ] **Step 1: Start dev server**

```bash
cd tools/paintscope && npm run dev
```

- [ ] **Step 2: Test stain_clear workflow**

1. Create new project
2. Add room, enable baseboard (trim substrate)
3. Set substrate state → Bare Wood
4. Set coating type → Stain + Clear Coat
5. Set stain method → Roll + Wipe, clear method → Spray
6. Set QT → QT4 (should auto-set sealer: 1, clear: 2)
7. Navigate to Estimate view
8. Verify SF_TRIM_NC_STAIN spec activates (not SF_TRIM_NC_PAINT or SF_TRIM_NC_PRIME)
9. Verify task list shows stain, sealer, clear phase tasks
10. Verify hours are calculated

- [ ] **Step 3: Test stain_only workflow**

1. Same room, change coating type → Stain Only
2. Verify estimate shows only stain tasks (no sealer, no clear)
3. Verify SF_TRIM_NC_STAIN activates with stain_only variant

- [ ] **Step 4: Test clear_only workflow**

1. Same room, change coating type → Clear Coat Only
2. Verify stain controls disappear, roll not available for clear method
3. Verify estimate shows only sealer + clear tasks (no stain)

- [ ] **Step 5: Test paint fallback (no regression)**

1. Same room, change coating type → Paint
2. Verify all stain/clear controls disappear
3. Verify SF_TRIM_NC_PRIME and SF_TRIM_NC_PAINT activate as before
4. Verify original paint estimation works unchanged

- [ ] **Step 6: Test QT-driven coat defaults**

1. Set coating type → Stain + Clear Coat
2. Change QT from QT3 → QT4 → QT5
3. Verify sealer_coats and clear_coats auto-update: QT3(0,1) → QT4(1,2) → QT5(2,3)

- [ ] **Step 7: Test multiple wood substrates**

1. Enable doors, windows, stair_railing in same room
2. Set each to bare_wood with different coating types
3. Verify each activates its own stain spec independently

- [ ] **Step 8: Test non-wood substrates unaffected**

1. Verify walls (bare_drywall) and ceiling do NOT show coating_type selector
2. Verify previously_painted substrates do NOT show coating_type selector

- [ ] **Step 9: Commit verification notes**

If all tests pass, no additional commit needed. If fixes were required, commit them:
```bash
git add -u
git commit -m "fix(paintscope): corrections from end-to-end stain/clear coat verification"
```
