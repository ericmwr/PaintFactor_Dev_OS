# Exterior Spec Factory Rollout Plan

**Status:** DRAFT
**Version:** 0.1.0
**Date:** 2026-02-19
**Author:** Orchestrator
**Scope:** Add exterior domain support to the SpecFactory system — doctrine, reference vocabulary, PaintScope keys, agent prompt updates, and first exterior spec families.

---

## Context & Problem Statement

The SpecFactory system is 100% interior-focused. Every doctrine file, every reference vocabulary, every PaintScope key, and every agent prompt is wired to interior painting. The `spec_family.domain` field already accepts `"exterior"` as a value, but nothing backs it — no exterior doctrine, no exterior surface vocabulary, no exterior substrate states, no exterior PaintScope keys, and no exterior protection model.

**Interior artifacts that do NOT transfer cleanly to exterior:**

| Interior Artifact | Why It Breaks for Exterior |
|---|---|
| `Interior_Protection_Doctrine.md` | Zones are room/floor/furniture-based; exterior has landscape, hardscape, windows-as-adjacency |
| `Interior_Protection_Doctrine_Final.md` | Same — all zone IDs are interior |
| `Site_Condition_Vocabulary_Reference.md` | Missing: wind speed, dew point, sun/shade exposure, surface temp |
| `Surface_Vocabulary_Reference.md` | Zero exterior surfaces (siding, fascia, soffit, etc.) |
| `Substrate_State_Reference.md` | Missing exterior failure modes: SS_CHALKING, SS_FAILING_PAINT, SS_PEELING, SS_WEATHERED |
| `PaintScope_Quantity_Key_Catalog.md` | "Planned Additions" note references exterior keys — none exist yet |
| Estimation_Modifiers_Doctrine.md | Height bands are ceiling-height logic; exterior uses access method (ladder/scaffold/lift) |
| Agent prompts (all 6) | Load `Interior_Protection_Doctrine.md` unconditionally; no domain branching |

**What transfers cleanly:**

- `spec.json` template structure (all 10 top-level keys, including `domain` field)
- `materials.json`, `production.json`, `sop_modules.json` template schemas (no domain field — domain is implicit via SF_ID)
- `Doctrine_Format_Standard.md` (heading structure, required sections, metadata block)
- `Conventions.md` ID prefix system (SF_, MOD_, TSK_, SYS_, FAC_, etc.)
- `Quality_Tiers_and_Surface_Condition.md` (QT2–QT6 framework applies; exterior just uses different typical tier assignments)
- `Spec_Completeness_Doctrine.md` (three mandatory declaration layers apply)
- `specfactory-orchestrator.md` pipeline logic (readiness gates, phase sequencing)

---

## Build Order (Dependency Chain)

```
Phase 1: Exterior Reference Vocabulary
    └─ Substrate_State_Reference.md (add EXT states)
    └─ Surface_Vocabulary_Reference.md (add EXT surfaces)
    └─ Site_Condition_Vocabulary_Reference.md (add EXT conditions)

Phase 2: Exterior Doctrine Files (NEW FILES)
    └─ Exterior_Substrates_Doctrine.md
    └─ Exterior_Modifiers_Doctrine.md
    └─ Exterior_Protection_Doctrine.md

Phase 3: PaintScope Exterior Key Catalog (NEW FILE)
    └─ PaintScope_Exterior_Key_Catalog.md

Phase 4: Agent Prompt Updates (EDIT EXISTING — domain dispatch blocks)
    └─ spec-researcher.md
    └─ specfactory-orchestrator.md
    └─ sop-librarian.md
    └─ materials-manager.md
    └─ estimation-engineer.md
    └─ prototype-critic.md

Phase 5: First Exterior Spec Family (VALIDATE THE STACK)
    └─ SF_SIDING_EXT_NC_PAINT (or simplest primary substrate)
```

---

## Phase 0: Documentation Discovery (Reference Baseline)

**Purpose:** Establish the exact current state of every file that will be touched or referenced. Each implementation phase must open this section to know what already exists before writing.

### Allowed APIs (Verified Patterns)

These patterns exist in the codebase and MUST be followed:

| Pattern | Source File | Copy-Ready Location |
|---|---|---|
| Doctrine file heading structure | `docs/Doctrine/Doctrine_Format_Standard.md` | §2 Heading Structure |
| Doctrine metadata block | `docs/Doctrine/Doctrine_Format_Standard.md` | §1 Mandatory Metadata Block |
| SS_ state entry format | `docs/Reference/Substrate_State_Reference.md` | §3.2 Primed Sub-States |
| Surface vocabulary entry format | `docs/Reference/Surface_Vocabulary_Reference.md` | §Wall Surfaces section |
| Site condition vocabulary format | `docs/Reference/Site_Condition_Vocabulary_Reference.md` | §1 occupancy_state |
| PS_ key namespace convention | `docs/PaintScope/PaintScope_Quantity_Key_Catalog.md` | §Namespace Convention |
| Agent domain-conditional load block | *(does not exist yet — Phase 4 creates this pattern)* | — |
| spec.json `domain` field | `specs/_templates/spec.json` | Line 6: `"domain": "interior"` |
| Spec family folder naming | `docs/System/Conventions.md` | §Spec Family Folder Format |

### Anti-Patterns to Avoid

- **Do NOT** create separate exterior agent `.md` files — use domain dispatch blocks inside existing agents
- **Do NOT** modify `Interior_Protection_Doctrine.md` — exterior protection is a new file
- **Do NOT** invent FAC_ or SS_ IDs not registered in reference files — register first, use second
- **Do NOT** write exterior spec families before Phase 3 is complete (PaintScope keys must exist before Gate 0)
- **Do NOT** use interior PS_ keys (e.g., `PS_SURFACE_SF.WALL_FIELD`) in exterior specs — they are semantically interior
- **Do NOT** add parameters to agent prompts not supported by the existing pipeline schema

### Files to Read at Start of Each Phase

Every phase executor MUST read the following before writing anything:

```
docs/System/Conventions.md                          — ID prefixes, naming rules
docs/System/PaintFactor_OS.md                       — Architecture authority
docs/Doctrine/Doctrine_Format_Standard.md           — Doctrine structure rules
docs/Doctrine/Spec_Completeness_Doctrine.md         — Three mandatory declaration layers
docs/Reference/Substrate_State_Reference.md         — Current SS_ states
docs/Reference/Surface_Vocabulary_Reference.md      — Current surface IDs
docs/Reference/Site_Condition_Vocabulary_Reference.md — Current site condition IDs
docs/PaintScope/PaintScope_Quantity_Key_Catalog.md  — Current PS_ keys
```

---

## Phase 1: Extend Reference Vocabulary for Exterior

**Objective:** Add exterior entries to the three reference vocabulary files so that Phase 2 doctrine and Phase 4 agent prompts have IDs to reference.

**What to implement:** Add new sections to existing reference files. Do NOT alter or reorder existing interior sections — append only.

**Documentation references:**
- Copy entry format from: `docs/Reference/Substrate_State_Reference.md` §3.2 (sub-state format)
- Copy entry format from: `docs/Reference/Surface_Vocabulary_Reference.md` §Wall Surfaces (surface ID format)
- Copy entry format from: `docs/Reference/Site_Condition_Vocabulary_Reference.md` §1 occupancy_state (condition/value format)

---

### Task 1.1 — Add Exterior Substrate States to `Substrate_State_Reference.md`

**File:** `docs/Reference/Substrate_State_Reference.md`
**Action:** Append a new section `## 4. Exterior-Specific States` after the existing sections.

**States to add** (minimum viable set for first exterior specs):

```
SS_EXT_BARE_WOOD          — Raw uncoated wood (siding, fascia, soffit)
SS_EXT_BARE_FIBERCEMENT   — Raw fiber cement (HardiePlank, etc.) — factory primer only
SS_EXT_BARE_MASONRY       — Raw CMU, brick, stucco, concrete
SS_EXT_BARE_METAL         — Raw ferrous or non-ferrous metal

SS_EXT_PRIMED_FACTORY     — Factory-applied primer on fiber cement or engineered wood
SS_EXT_PRIMED_FIELD       — Field-applied exterior primer

SS_EXT_SOUND_PAINT        — Existing coating: adhered, no peeling, minimal chalk
SS_EXT_CHALKING           — Existing coating: chalky but adhered; TSP wash required
SS_EXT_FAILING_PAINT      — Existing coating: cracking, peeling; requires scraping/sanding
SS_EXT_PEELING            — Existing coating: active peeling; major prep required
SS_EXT_WEATHERED          — Uncoated substrate exposed and weathered (gray/oxidized)

SS_EXT_STAINED_SOLID      — Existing solid body stain (opaque)
SS_EXT_STAINED_SEMI       — Existing semi-transparent stain
SS_EXT_STAINED_CLEAR      — Existing clear penetrating or film sealer
```

**Production rate modifier table to include** (modeled after §5.1 interior table):

| State | Prep Modifier | Prime Modifier | Finish Modifier |
|---|---|---|---|
| SS_EXT_BARE_WOOD | 1.0 | 1.0 | 1.0 |
| SS_EXT_BARE_FIBERCEMENT | 0.8 | N/A (factory primed) | 1.0 |
| SS_EXT_BARE_MASONRY | 1.3 | 1.2 | 1.0 |
| SS_EXT_BARE_METAL | 1.2 | 1.1 | 1.0 |
| SS_EXT_PRIMED_FACTORY | 0.8 | N/A | 1.0 |
| SS_EXT_PRIMED_FIELD | 0.9 | N/A | 1.0 |
| SS_EXT_SOUND_PAINT | 1.1 | 1.0 | 1.0 |
| SS_EXT_CHALKING | 1.4 | 1.1 | 1.0 |
| SS_EXT_FAILING_PAINT | 1.8 | 1.1 | 1.0 |
| SS_EXT_PEELING | 2.5 | 1.2 | 1.0 |
| SS_EXT_WEATHERED | 1.6 | 1.2 | 1.0 |
| SS_EXT_STAINED_SOLID | 1.2 | 1.0 | 1.0 |
| SS_EXT_STAINED_SEMI | 1.3 | 1.0 | 1.0 |
| SS_EXT_STAINED_CLEAR | 1.1 | 1.0 | 1.0 |

**Verification checklist:**
- [ ] New section heading `## 4. Exterior-Specific States` exists after existing `## 3.x` sections
- [ ] All 14 SS_EXT_ IDs are present with descriptions
- [ ] Production rate modifier table included
- [ ] No existing SS_ entries were modified
- [ ] Grep: `SS_EXT_` — all 14 IDs appear
- [ ] Grep: `SS_BARE` (interior) — still present, unmodified

---

### Task 1.2 — Add Exterior Surfaces to `Surface_Vocabulary_Reference.md`

**File:** `docs/Reference/Surface_Vocabulary_Reference.md`
**Action:** Append a new section `## Exterior Surfaces` after the existing interior sections.

**Surface IDs to add:**

```
SIDING FIELD SURFACES:
siding_field              — Main horizontal/vertical siding field (clapboard, shiplap, T1-11, board & batten)
siding_board_batten       — Board and batten vertical siding (if tracked separately)

FASCIA / SOFFIT / TRIM:
fascia                    — Horizontal fascia board at roofline
soffit                    — Underside of roof overhang
ext_trim_corner           — Corner boards (vertical trim at building corners)
ext_trim_frieze           — Frieze board (horizontal trim below soffit)
ext_trim_band             — Band board (horizontal belt course)
ext_trim_window_casing    — Exterior window casing/trim
ext_trim_door_casing      — Exterior door casing/trim
ext_trim_rake             — Rake board (trim along gable slope)

DOORS / WINDOWS (EXTERIOR FACE):
door_slab_ext             — Exterior face of door slab
door_frame_ext            — Exterior door frame (jamb visible from outside)
window_frame_ext          — Exterior window frame
window_sash_ext           — Exterior window sash

STRUCTURAL / MASONRY:
foundation_wall           — Visible foundation above grade
masonry_wall              — Brick, CMU, or block exterior wall
stucco_field              — Stucco-finished exterior wall

DECKS / PORCHES / ACCESSORY:
deck_field                — Horizontal deck boards (stain/paint)
deck_railing              — Deck railing system
porch_ceiling             — Porch ceiling (often separate from soffit)
porch_floor               — Painted porch floor surface
fence_field               — Fence panel field
garage_door_ext           — Exterior face of garage door
```

**Verification checklist:**
- [ ] New section `## Exterior Surfaces` appended at end of file
- [ ] All surface IDs present in format matching existing interior entries
- [ ] No interior surface IDs modified
- [ ] Grep: `siding_field` — present
- [ ] Grep: `fascia` — present
- [ ] Grep: `wall_field` (interior) — still present, unmodified

---

### Task 1.3 — Add Exterior Site Conditions to `Site_Condition_Vocabulary_Reference.md`

**File:** `docs/Reference/Site_Condition_Vocabulary_Reference.md`
**Action:** Append new condition categories at the end of the file.

**Conditions to add:**

```
9. wind_condition (exterior only)
Values:
  calm          — < 5 mph, ideal for spray application
  light_breeze  — 5-10 mph, manageable; brush/roll preferred
  moderate      — 10-20 mph, spray not recommended; masking may lift
  high          — > 20 mph, exterior work should pause

10. dew_point_risk (exterior only)
Values:
  safe          — Surface temp ≥ 5°F above dew point; apply freely
  marginal      — Surface temp 3-5°F above dew point; monitor closely
  unsafe        — Surface temp < 3°F above dew point; do not apply

11. sun_exposure (exterior only)
Values:
  full_shade    — Surface in shade all day; slower dry, extended recoat window
  partial_shade — Mixed sun/shade; standard planning
  full_sun      — Direct sun all day; accelerated dry, compressed open time, may require early start

12. surface_temperature (exterior only — distinct from ambient temperature_condition)
Values:
  optimal       — 50°F to 85°F surface temp; ideal application window
  cold_surface  — < 50°F surface temp; slow cure, adhesion risk
  hot_surface   — > 85°F surface temp; flash dry risk, blistering on dark surfaces

13. access_type (exterior — replaces interior access_constraint for elevation work)
Values:
  ground        — No equipment needed; standard reach
  ladder        — Extension ladder required (up to ~2 stories)
  scaffold      — Scaffold system required (3+ stories or large continuous area)
  lift          — Aerial lift required (high elevations, irregular access)
  rope_access   — Rope/swing stage (specialty; typically hourly)
```

**Verification checklist:**
- [ ] All 5 new condition categories (9–13) appended after existing categories
- [ ] Each has `Values:` block with all value IDs
- [ ] Interior `access_constraint` unchanged — `access_type` is additive, not a replacement in the reference file
- [ ] Grep: `wind_condition` — present
- [ ] Grep: `access_type` — present
- [ ] Grep: `occupancy_state` (interior) — still present, unmodified

---

### Phase 1 Verification (Full)

Run before proceeding to Phase 2:

```
Grep: SS_EXT_BARE_WOOD       → docs/Reference/Substrate_State_Reference.md
Grep: SS_EXT_PEELING         → docs/Reference/Substrate_State_Reference.md
Grep: siding_field           → docs/Reference/Surface_Vocabulary_Reference.md
Grep: fascia                 → docs/Reference/Surface_Vocabulary_Reference.md
Grep: wind_condition         → docs/Reference/Site_Condition_Vocabulary_Reference.md
Grep: access_type            → docs/Reference/Site_Condition_Vocabulary_Reference.md

Confirm: SS_BARE (interior) still present and unmodified
Confirm: wall_field (interior) still present and unmodified
Confirm: occupancy_state (interior) still present and unmodified
```

---

## Phase 2: Create Exterior Doctrine Files

**Objective:** Write three new doctrine files that serve as the authoritative exterior domain knowledge for all six spec factory agents.

**What to implement:** Three new `.md` files in `docs/Doctrine/`. Each file follows `Doctrine_Format_Standard.md` exactly — same metadata block, same heading structure (##, ###), same required sections (Scope, Domain Content, Cross-References, Change Log).

**Documentation references:**
- Copy heading structure from: `docs/Doctrine/Doctrine_Format_Standard.md` §2
- Copy metadata block from: `docs/Doctrine/Doctrine_Format_Standard.md` §1
- Copy cross-reference section pattern from: `docs/Doctrine/Fine_Finish_Doctrine.md` (final section)
- Copy change log format from: any existing doctrine file's `## Change Log` section

---

### Task 2.1 — Write `Exterior_Substrates_Doctrine.md`

**File:** `docs/Doctrine/Exterior_Substrates_Doctrine.md`
**Status:** NEW FILE

**Required sections (per Doctrine_Format_Standard.md §3):**

```markdown
# Exterior Substrates Doctrine

**Status:** DRAFT
**Version:** 0.1.0
**Effective Date:** [date]
**Source:** Field practice, PDCA exterior standards, manufacturer PDS

## 1. Scope & Definitions
  ### 1.1 What This Doctrine Covers
  ### 1.2 What Is Excluded
  ### 1.3 Key Terminology

## 2. Substrate Classification
  ### 2.1 Wood Substrates (siding, fascia, soffit, trim, decks)
  ### 2.2 Fiber Cement (HardiePlank, HardieSoffit, HardieTrim)
  ### 2.3 Engineered Wood (LP SmartSide, T1-11)
  ### 2.4 Masonry (brick, CMU, stucco, concrete)
  ### 2.5 Metal (ferrous, non-ferrous, galvanized)
  ### 2.6 Composite / PVC Trim

## 3. Substrate State Assessment
  ### 3.1 State Identification Protocol (visual inspection criteria per SS_EXT_* state)
  ### 3.2 Prep Requirements by State (link to SS_EXT_* states from Substrate_State_Reference.md)
  ### 3.3 Special Conditions (peeling, chalking, moisture intrusion)

## 4. Preparation Standards
  ### 4.1 Cleaning (pressure wash, TSP, mildewcide)
  ### 4.2 Scraping and Sanding
  ### 4.3 Caulking (siding joints, trim-to-wall, window perimeter)
  ### 4.4 Priming (bare wood, masonry, bare metal, spot prime)
  ### 4.5 Substrate-Specific Notes

## 5. Quality Tier Behavior (Exterior)
  ### 5.1 QT2 Exterior (Economy — utility structures, quick prep)
  ### 5.2 QT3 Exterior (Standard — typical residential repaint)
  ### 5.3 QT4 Exterior (Premium — high-curb-appeal, scrutiny facades)
  ### 5.4 QT5 Exterior (Superior — showcase home, new construction premium)
  ### 5.5 Sheen/QT Gate (Exterior — flat/satin/semi-gloss applicability)

## 6. Material System Recommendations
  ### 6.1 Wood Siding Systems
  ### 6.2 Fiber Cement Systems
  ### 6.3 Masonry Systems
  ### 6.4 Metal Systems
  ### 6.5 Coat Count by Substrate State and QT

## 7. Production Benchmarks
  ### 7.1 Coverage Rates (SF/gallon by texture/condition)
  ### 7.2 Application Rate Benchmarks (SF/hr by method)
  ### 7.3 Spray vs. Brush/Roll Comparison (exterior conditions)

## 8. Cross-References
  - docs/Reference/Substrate_State_Reference.md (§4 Exterior States)
  - docs/Reference/Surface_Vocabulary_Reference.md (§Exterior Surfaces)
  - docs/Doctrine/Exterior_Modifiers_Doctrine.md
  - docs/Doctrine/Quality_Tiers_and_Surface_Condition.md
  - docs/Doctrine/Materials_and_Consumables_Doctrine.md

## Change Log
  | Version | Date | Author | Summary |
  |---------|------|--------|---------|
  | 0.1.0 | [date] | [author] | Initial draft |
```

**Anti-pattern guards:**
- Do NOT copy interior substrate states (SS_BARE, SS_PRIMED_FACTORY) into this doctrine — reference the EXT_ states from Substrate_State_Reference.md §4
- Do NOT define production rate values here — those belong in production.json per spec; this doctrine provides guidance ranges only
- Do NOT define material system IDs (SYS_*) here — those are generated in materials.json per spec

---

### Task 2.2 — Write `Exterior_Modifiers_Doctrine.md`

**File:** `docs/Doctrine/Exterior_Modifiers_Doctrine.md`
**Status:** NEW FILE

**Required sections:**

```markdown
# Exterior Modifiers Doctrine

**Status:** DRAFT
**Version:** 0.1.0
**Effective Date:** [date]
**Source:** Field practice, PDCA production standards

## 1. Scope & Definitions
  ### 1.1 What This Doctrine Covers
  ### 1.2 What Is Excluded
  ### 1.3 Critical Math Rule (MUST repeat): effective_rate = base_rate ÷ modifier

## 2. Access Type Modifiers (Exterior — replaces interior height bands)
  ### 2.1 Modifier Values by access_type
      ground:      1.00 (baseline)
      ladder:      1.35 (two-story eave work)
      scaffold:    1.60 (three-story or large continuous area)
      lift:        1.50 (aerial lift; efficient but setup overhead)
      rope_access: charge hourly (unpredictable)
  ### 2.2 Applies-To Rules (which tasks are affected)
  ### 2.3 FAC_EXT_ACCESS — canonical modifier ID

## 3. Substrate Condition Modifiers
  ### 3.1 Prep modifier values by SS_EXT_* state (reference Phase 1 table)
  ### 3.2 FAC_EXT_SUBSTRATE_CONDITION — canonical modifier ID

## 4. Wind and Environmental Modifiers
  ### 4.1 wind_condition modifier table
      calm:         1.00
      light_breeze: 1.10 (masking slower, spray restricted)
      moderate:     1.25 (brush/roll only; extra masking, more care)
      high:         production halt (task excluded)
  ### 4.2 sun_exposure modifier table
      full_shade:   1.05 (slower dry; plan longer recoat window)
      partial_shade: 1.00 (baseline)
      full_sun:     1.15 (compressed working window; crew repositions more)
  ### 4.3 FAC_EXT_WIND and FAC_EXT_SUN_EXPOSURE — canonical modifier IDs

## 5. Surface Temperature Modifiers
  ### 5.1 surface_temperature modifier table
      optimal:     1.00
      cold_surface: 1.20 (slower cure; extended recoat window; watch adhesion)
      hot_surface:  1.25 (flash dry risk; early morning crew start; shade preferred)
  ### 5.2 FAC_EXT_SURFACE_TEMP — canonical modifier ID

## 6. Profile Complexity Modifiers (Exterior Trim)
  ### 6.1 Reuse of interior profile_complexity modifier values
      simple:   0.85
      standard: 1.00
      complex:  1.25
      ornate:   1.40
  ### 6.2 Applicable surface types (fascia, trim, door/window casing)
  ### 6.3 FAC_PROFILE_COMPLEXITY — shared modifier ID (same as interior)

## 7. Modifier Stacking Rules
  ### 7.1 Stack formula: total_modifier = access × substrate_condition × wind × sun × surface_temp × profile_complexity
  ### 7.2 Cap: No single combined modifier should exceed 4.0× — escalate to hourly
  ### 7.3 Spray coupling rule applies (exterior spray rate ≤ backroll rate)

## 8. FAC_ Registry Additions Required
  List of new FAC_ IDs this doctrine introduces (for Modifier_Registry.md update):
  - FAC_EXT_ACCESS
  - FAC_EXT_SUBSTRATE_CONDITION
  - FAC_EXT_WIND
  - FAC_EXT_SUN_EXPOSURE
  - FAC_EXT_SURFACE_TEMP

## 9. Cross-References
  - docs/Doctrine/Estimation_Modifiers_Doctrine.md (interior baseline)
  - docs/Doctrine/Modifier_Registry.md (add FAC_EXT_* entries after this phase)
  - docs/Reference/Site_Condition_Vocabulary_Reference.md (§9–13 exterior conditions)
  - docs/Reference/Substrate_State_Reference.md (§4 exterior states)

## Change Log
  | Version | Date | Author | Summary |
  |---------|------|--------|---------|
  | 0.1.0 | [date] | [author] | Initial draft |
```

**After writing this file:** Also add the five FAC_EXT_* entries to `docs/Doctrine/Modifier_Registry.md` following the existing entry format.

---

### Task 2.3 — Write `Exterior_Protection_Doctrine.md`

**File:** `docs/Doctrine/Exterior_Protection_Doctrine.md`
**Status:** NEW FILE

**Required sections:**

```markdown
# Exterior Protection Doctrine

**Status:** DRAFT
**Version:** 0.1.0
**Effective Date:** [date]
**Source:** Field practice, PDCA protection standards

## 1. Scope & Definitions
  ### 1.1 What This Doctrine Covers
    Exterior work protection zones: landscaping, hardscape, decks/patios,
    HVAC equipment, meters/panels, windows (glass), doors (hardware),
    vehicles, and grade-level surfaces.
  ### 1.2 What Is Excluded
    Interior protection — see Interior_Protection_Doctrine.md
    Interior floor/furniture protection does not apply to exterior
  ### 1.3 Key Terminology

## 2. Protection Philosophy (Exterior)
  ### 2.1 Protection is project-level, not spec-level (same principle as interior)
  ### 2.2 Grade-level vs. elevation protection (different logic from interior)
  ### 2.3 Overspray vs. drip protection (exterior spray reaches further than interior)
  ### 2.4 Weather interaction with protection materials (wind lifts masking)

## 3. Exterior Protection Zone Definitions
  Each zone follows format: zone_id, description, typical trigger, protection_level options

  ### 3.1 Landscape Zones
    ext_landscape_adjacent   — Plants, beds, lawn within 4 ft of structure
    ext_landscape_full       — Full-coverage tarps when spray on large elevation

  ### 3.2 Hardscape Zones
    ext_hardscape_patio      — Concrete/brick patio under spray zone
    ext_hardscape_walk       — Sidewalk/walkway at grade
    ext_driveway             — Driveway surface (drip control)

  ### 3.3 Glass / Opening Zones
    ext_glass_window         — Window glass masking (exterior face; windows as adjacency, not interior surface)
    ext_glass_door           — Door glass (french doors, storm doors)
    ext_door_hardware        — Exterior locksets, knockers, kick plates
    ext_light_fixture        — Exterior light fixture covers

  ### 3.4 Mechanical / Utility Zones
    ext_hvac_unit            — Condenser/AC unit cover
    ext_utility_panel        — Electrical panel, gas meter, water shutoff
    ext_hose_bib             — Hose bibs and spigots

  ### 3.5 Vehicle / Moveable Property
    ext_vehicle_adjacent     — Vehicles within overspray range (must be moved)
    ext_stored_property      — Outdoor furniture, grills, equipment

## 4. Protection Level Definitions (Exterior)
  Reuse existing protection_level enum:
    none / edge_only / light_mask / heavy_mask / full_cover / full_mask
  Add exterior guidance:
    edge_only   — drip cloth at grade (canvas runner against foundation)
    light_mask  — tape + paper on window frames, light fixture trim
    heavy_mask  — plastic sheeting on windows, HVAC units
    full_cover  — tarp over landscape, vehicle, patio furniture
    full_mask   — complete tape-out of glass, hardware, meters

## 5. Trigger Conditions by Application Method
  ### 5.1 Brush/Roll Only — minimal overspray protection needed
  ### 5.2 Airless Spray — full landscape tarp, glass mask, ext_vehicle_adjacent must be clear
  ### 5.3 HVLP Spray — moderate protection (less overspray range than airless)

## 6. Protection Material Requirements by Zone
  ext_landscape_adjacent   → canvas drop cloths or plastic tarps (reusable)
  ext_glass_window         → masking tape + pre-taped plastic film (quick deployment)
  ext_door_hardware        → masking tape + plastic bag covers
  ext_hvac_unit            → plastic sheeting (if spray reach)
  ext_utility_panel        → masking tape (do not occlude access; note contractor liability)
  ext_hardscape_patio      → rosin paper or canvas (drip absorption)
  ext_vehicle_adjacent     → move vehicle; if not moveable, full tarp cover

## 7. Sequence Rules
  ### 7.1 Setup sequence: ground cover first → glass mask → fixture covers → overhead tarp
  ### 7.2 Teardown sequence: Remove tape while coat is slightly tacky (clean edge)
  ### 7.3 Wind protocol: Check masking at start of each day; re-secure if lifted

## 8. Cross-References
  - docs/Doctrine/Interior_Protection_Doctrine.md (interior pattern, not for exterior)
  - docs/Reference/Surface_Vocabulary_Reference.md §Exterior Surfaces
  - docs/Reference/Site_Condition_Vocabulary_Reference.md §9 wind_condition
  - docs/Doctrine/Protection_and_Masking_Doctrine.md (shared masking principles)

## Change Log
  | Version | Date | Author | Summary |
  |---------|------|--------|---------|
  | 0.1.0 | [date] | [author] | Initial draft |
```

---

### Phase 2 Verification (Full)

```
Confirm file exists: docs/Doctrine/Exterior_Substrates_Doctrine.md
Confirm file exists: docs/Doctrine/Exterior_Modifiers_Doctrine.md
Confirm file exists: docs/Doctrine/Exterior_Protection_Doctrine.md

Grep: "## 1. Scope" → all three files
Grep: "## Change Log" → all three files
Grep: "SS_EXT_"       → Exterior_Substrates_Doctrine.md (references to states, not definitions)
Grep: "FAC_EXT_ACCESS" → Exterior_Modifiers_Doctrine.md
Grep: "ext_landscape_adjacent" → Exterior_Protection_Doctrine.md
Grep: "FAC_EXT_ACCESS" → docs/Doctrine/Modifier_Registry.md (added in Task 2.2)
Grep: "Interior_Protection_Doctrine" → Exterior_Protection_Doctrine.md (should only appear in Cross-References, not as a model to follow)
```

---

## Phase 3: Create PaintScope Exterior Key Catalog

**Objective:** Write `PaintScope_Exterior_Key_Catalog.md` — the canonical source for all `PS_` keys used in exterior specs. This file is required before any exterior spec can pass Gate 0 (PaintScope Readiness).

**What to implement:** New file in `docs/PaintScope/`. Modeled exactly on `PaintScope_Quantity_Key_Catalog.md` structure (same namespace convention, same key format, same validation rules).

**Documentation references:**
- Copy namespace convention block from: `docs/PaintScope/PaintScope_Quantity_Key_Catalog.md` §Namespace Convention
- Copy key entry format from: `docs/PaintScope/PaintScope_Quantity_Key_Catalog.md` §Core Interior Keys
- Copy validation rules section from: `docs/PaintScope/PaintScope_Quantity_Key_Catalog.md` §Validation & Completeness Rules

**File:** `docs/PaintScope/PaintScope_Exterior_Key_Catalog.md`
**Status:** NEW FILE

---

### Exterior PS_ Keys to Define

**Meta / Project-Level (Exterior):**
```
PS_META.FLAG.EXTERIOR_REPAINT           — true/false; existing coat present
PS_META.FLAG.EXTERIOR_NEW_CONSTRUCTION  — true/false; bare substrate
PS_META.EXT.ACCESS_TYPE                 — ground/ladder/scaffold/lift/rope_access
PS_META.EXT.WIND_CONDITION              — calm/light_breeze/moderate/high
PS_META.EXT.SUN_EXPOSURE                — full_shade/partial_shade/full_sun
PS_META.EXT.SURFACE_TEMP                — optimal/cold_surface/hot_surface
```

**Siding / Field Surfaces (SF):**
```
PS_SURFACE_SF.EXT_SIDING_FIELD          — Main siding area (SF)
PS_SURFACE_SF.EXT_SOFFIT_FIELD          — Soffit underside (SF)
PS_SURFACE_SF.EXT_MASONRY_FIELD         — Masonry wall field (SF)
PS_SURFACE_SF.EXT_STUCCO_FIELD          — Stucco field (SF)
PS_SURFACE_SF.EXT_PORCH_CEILING         — Porch ceiling (SF)
PS_SURFACE_SF.EXT_PORCH_FLOOR           — Porch floor (SF)
PS_SURFACE_SF.EXT_DECK_FIELD            — Deck board field (SF)
PS_SURFACE_SF.EXT_FENCE_FIELD           — Fence field (SF)
PS_SURFACE_SF.EXT_GARAGE_DOOR           — Garage door face (SF)
PS_SURFACE_SF.EXT_FOUNDATION_WALL       — Foundation wall above grade (SF)
```

**Trim / Linear (LF):**
```
PS_SURFACE_LF.EXT_FASCIA                — Fascia board (LF)
PS_SURFACE_LF.EXT_TRIM_CORNER          — Corner boards (LF)
PS_SURFACE_LF.EXT_TRIM_FRIEZE          — Frieze board (LF)
PS_SURFACE_LF.EXT_TRIM_BAND            — Band/belt board (LF)
PS_SURFACE_LF.EXT_TRIM_RAKE            — Rake board (LF)
PS_SURFACE_LF.EXT_TRIM_WINDOW_CASING   — Exterior window casing (LF)
PS_SURFACE_LF.EXT_TRIM_DOOR_CASING     — Exterior door casing (LF)
PS_SURFACE_LF.EXT_DECK_RAILING         — Deck railing (LF)
```

**Openings (Exterior):**
```
PS_OPENING_EA.EXT_WINDOW_S              — Small exterior window (EA)
PS_OPENING_EA.EXT_WINDOW_M              — Medium exterior window (EA)
PS_OPENING_EA.EXT_WINDOW_L              — Large exterior window (EA)
PS_OPENING_EA.EXT_WINDOW_O              — Oversized exterior window (EA, measured)
PS_OPENING_EA.EXT_DOOR                  — Exterior door slab (EA)
PS_OPENING_LF.EXT_TRIM_WINDOW          — Derived: exterior window trim perimeter (LF)
```

**Edge Keys (Exterior):**
```
PS_EDGE_LF.EXT_SIDING_TO_TRIM          — Siding field meeting trim boards (LF)
PS_EDGE_LF.EXT_SIDING_TO_FOUNDATION    — Siding bottom edge above foundation (LF)
PS_EDGE_LF.EXT_TRIM_TO_GLASS          — Window/door casing to glass edge (LF)
PS_EDGE_LF.EXT_SOFFIT_TO_FASCIA        — Soffit-to-fascia junction (LF)
PS_EDGE_LF.EXT_DECK_PERIMETER          — Deck edge/perimeter (LF)
```

**Protection Keys (Exterior):**
```
PS_PROTECT_SF.EXT_LANDSCAPE_ADJACENT    — Landscape area within 4 ft (SF)
PS_PROTECT_SF.EXT_LANDSCAPE_FULL        — Full landscape tarp area (SF)
PS_PROTECT_SF.EXT_HARDSCAPE_PATIO       — Patio/deck under spray (SF)
PS_PROTECT_SF.EXT_HVAC_UNIT             — HVAC unit face (SF)
PS_PROTECT_LF.EXT_GLASS_WINDOW          — Window glass masking perimeter (LF)
PS_PROTECT_LF.EXT_GLASS_DOOR            — Door glass masking perimeter (LF)
PS_PROTECT_EA.EXT_LIGHT_FIXTURE         — Exterior light fixtures (EA)
PS_PROTECT_EA.EXT_DOOR_HARDWARE         — Door hardware sets (EA)
PS_PROTECT_EA.EXT_UTILITY_PANEL         — Utility panels/meters (EA)
```

**Key Derivation Rules to Document:**
- Siding SF typically = elevation gross SF minus window/door openings
- Exterior window perimeter (LF) = S×8 + M×12 + L×17 + O×measured (same formula as interior, exterior bucket)
- Landscape adjacent SF = structure perimeter LF × 4 ft (default buffer, override if measured)

---

### Phase 3 Verification (Full)

```
Confirm file exists: docs/PaintScope/PaintScope_Exterior_Key_Catalog.md
Grep: "PS_SURFACE_SF.EXT_SIDING_FIELD"  → PaintScope_Exterior_Key_Catalog.md
Grep: "PS_SURFACE_LF.EXT_FASCIA"        → PaintScope_Exterior_Key_Catalog.md
Grep: "PS_PROTECT_SF.EXT_LANDSCAPE_ADJACENT" → PaintScope_Exterior_Key_Catalog.md
Grep: "Namespace Convention"            → PaintScope_Exterior_Key_Catalog.md (section present)
Grep: "Validation"                      → PaintScope_Exterior_Key_Catalog.md (section present)
Grep: "PS_SURFACE_SF.WALL_FIELD"        → PaintScope_Exterior_Key_Catalog.md (should NOT appear — interior key)
```

---

## Phase 4: Add Domain Dispatch Blocks to Agent Prompts

**Objective:** Add a `## Domain-Specific Context Loading` section to each of the six agent prompts. This section tells the agent which files to load based on `spec_family.domain`. Interior behavior is unchanged. Exterior adds new doctrine/reference files and explicitly suppresses interior-only doctrine.

**Strategy:** Domain dispatch is a new **section appended** to each agent — it does NOT restructure existing prompt content. Insert after the existing `## Required Reading` section, before the first operational section.

**Documentation references:**
- Existing `## Required Reading` section format: any agent `.md` file, first ~30 lines
- Files to reference in dispatch blocks: confirmed in Phases 1–3

**Anti-pattern guards:**
- Do NOT remove or modify any existing `## Required Reading` entries — exterior adds to them conditionally
- Do NOT create separate `spec-researcher-exterior.md` agent files
- Do NOT reference doctrine files that don't exist yet (Phase 2 must complete before Phase 4)
- Do NOT add `access_type` as a replacement for `access_constraint` in agent prompts — agents should use `access_type` for exterior specs and `access_constraint` for interior (both are now in Site_Condition_Vocabulary_Reference.md)

---

### Task 4.1 — Add Domain Dispatch Block to `spec-researcher.md`

**File:** `agents/spec-researcher.md`
**Action:** Insert the following section after the existing `## Required Reading — Master Doctrine List` section.

```markdown
## Domain-Specific Context Loading

After reading the base Required Reading list above, load the following based on `spec_family.domain`:

### If `domain == "exterior"`:

LOAD — Exterior Doctrine:
- docs/Doctrine/Exterior_Substrates_Doctrine.md
- docs/Doctrine/Exterior_Modifiers_Doctrine.md
- docs/Doctrine/Exterior_Protection_Doctrine.md

LOAD — Exterior Reference Vocabulary:
- docs/Reference/Substrate_State_Reference.md §4 (Exterior-Specific States)
- docs/Reference/Surface_Vocabulary_Reference.md §Exterior Surfaces
- docs/Reference/Site_Condition_Vocabulary_Reference.md §9–13 (Exterior Conditions)

LOAD — Exterior PaintScope Keys:
- docs/PaintScope/PaintScope_Exterior_Key_Catalog.md

DO NOT APPLY to exterior specs:
- docs/Doctrine/Interior_Protection_Doctrine.md (interior zones do not apply)
- docs/Doctrine/Fine_Finish_Doctrine.md (unless scope explicitly includes interior-style trim at QT4+)
- docs/Doctrine/Interior_Protection_Doctrine_Final.md
- PS_ keys from PaintScope_Quantity_Key_Catalog.md §Core Interior Keys (use EXT_ keys instead)

EXTERIOR MODIFIER OVERRIDE:
- Use FAC_EXT_ACCESS (not FAC_HEIGHT) for elevation work
- Use FAC_EXT_SUBSTRATE_CONDITION for prep rate scaling
- Use FAC_EXT_WIND, FAC_EXT_SUN_EXPOSURE, FAC_EXT_SURFACE_TEMP for environmental modifiers
- FAC_PROFILE_COMPLEXITY applies for exterior trim (shared modifier)

### If `domain == "interior"`:
[existing behavior — no changes; read all required reading as currently listed]
```

---

### Task 4.2 — Add Domain Dispatch Block to `specfactory-orchestrator.md`

**File:** `agents/specfactory-orchestrator.md`
**Action:** Insert domain dispatch block after existing `## Required Reading` section.

Same block structure as Task 4.1, with these additions specific to the orchestrator:

```markdown
## Domain-Specific Context Loading

[same block as Task 4.1]

### Exterior Gate 0 Override (PaintScope Readiness):

When spec_family.domain == "exterior", Gate 0 validation MUST check:
- All required PS_ keys are present in docs/PaintScope/PaintScope_Exterior_Key_Catalog.md
- No interior PS_ keys (non-EXT_ prefixed) are used in exterior specs
- docs/PaintScope/Spec_Input_to_PaintScope_Key_Mapping.md must be updated to include exterior key mappings BEFORE proceeding

### Exterior Gate 0.5 Override (Completeness):

When spec_family.domain == "exterior", mandatory declarations MUST reference:
- protection_zones_required: only ext_* zone IDs from Exterior_Protection_Doctrine.md
- adjacency_declarations: only exterior surface IDs from Surface_Vocabulary_Reference.md §Exterior Surfaces
- state_declarations: only SS_EXT_* states from Substrate_State_Reference.md §4
- site_condition_rules: must reference exterior conditions (access_type, wind_condition, etc.) not interior-only conditions
```

---

### Task 4.3 — Add Domain Dispatch Block to `sop-librarian.md`

**File:** `agents/sop-librarian.md`
**Action:** Insert domain dispatch block after existing `## Required Reading` section.

Same block as Task 4.1, with these SOP-specific additions:

```markdown
### Exterior SOP Module Patterns:

When domain == "exterior", standard module sequence is:
  MOD_EXT_SETUP (setup) — staging, protection deployment, equipment
  MOD_EXT_PREP (prep) — pressure wash, scrape, sand, caulk, spot prime
  MOD_EXT_PRIME (prime) — full prime coat (if required by substrate state)
  MOD_EXT_FINISH_COAT (finish) — coat 1
  MOD_EXT_INTERSTAGE (interstage) — inspect, sand, repair (QT4+ only)
  MOD_EXT_FINISH_COAT_2 (finish) — coat 2
  MOD_EXT_FINAL_INSPECT (inspect) — final walkthrough
  MOD_EXT_CLEANUP (cleanup) — teardown protection, clean equipment

DO NOT use interior fine-finish module pattern (MOD_FF_*) for exterior specs
  unless the spec explicitly covers interior-style millwork applied to exterior.
```

---

### Task 4.4 — Add Domain Dispatch Block to `materials-manager.md`

**File:** `agents/materials-manager.md`
**Action:** Insert domain dispatch block after existing `## Required Reading` section.

Same block as Task 4.1, with these materials-specific additions:

```markdown
### Exterior Material System Patterns (domain == "exterior"):

Standard exterior SYS_ naming:
  SYS_EXT_WOOD_STANDARD     — Standard 100% acrylic latex for wood siding
  SYS_EXT_FIBERCEMENT       — Fiber cement system (bonding primer + acrylic topcoat)
  SYS_EXT_MASONRY           — Masonry paint system (masonry primer + elastomeric or acrylic)
  SYS_EXT_METAL             — Metal system (rust-inhibiting primer + direct-to-metal topcoat)
  SYS_EXT_DECK_SOLID        — Solid body deck stain system
  SYS_EXT_DECK_SEMI         — Semi-transparent deck stain system

Coverage rates for exterior (approximate; verify per PDS and substrate state):
  Smooth siding: 250–350 SF/gal
  Rough/weathered siding: 150–250 SF/gal
  Masonry: 100–200 SF/gal (highly porous)
  Fascia/trim: 400–500 SF/gal (smooth; similar to interior trim)

DO NOT use interior SYS_FF_* fine-finish material systems for exterior specs.
DO NOT apply interior roller specs (9" roller, 3/8" nap) to exterior field siding —
  exterior uses 9" or 18" roller with 3/4"–1" nap for rough surfaces.
```

---

### Task 4.5 — Add Domain Dispatch Block to `estimation-engineer.md`

**File:** `agents/estimation-engineer.md`
**Action:** Insert domain dispatch block after existing `## Required Reading` section.

Same block as Task 4.1, with these estimation-specific additions:

```markdown
### Exterior Rate Baseline Differences (domain == "exterior"):

Interior height-band modifier (FAC_HEIGHT) does NOT apply to exterior elevation work.
Use FAC_EXT_ACCESS instead:
  ground:   1.00 (baseline)
  ladder:   1.35
  scaffold: 1.60
  lift:     1.50

Exterior siding spray rates are lower than interior wall spray rates due to:
  - Masking complexity (landscape, glass, fixtures)
  - Environmental setup/teardown
  - Less controlled environment
  Typical exterior spray application: 800–1500 SF/hr (vs. 1500–2500 SF/hr interior)

Exterior brush/roll rates:
  Smooth siding (roll): 200–350 SF/hr
  Rough siding (roll): 100–200 SF/hr
  Fascia/trim (brush): 80–120 LF/hr (similar to interior trim)

Closet shelving modifier (PS_ROOM_FLAG.CLOSET_SHELVING_PRESENT) does NOT apply
  to exterior specs.

Spray/backroll coupling rule still applies: exterior spray_rate MUST be ≤ backroll_rate.
```

---

### Task 4.6 — Add Domain Dispatch Block to `prototype-critic.md`

**File:** `agents/prototype-critic.md`
**Action:** Insert domain dispatch block after existing `## Required Reading` section (before Validation Categories).

Same block as Task 4.1, with these critic-specific additions:

```markdown
### Exterior Validation Overrides (domain == "exterior"):

When validating an exterior spec, the Prototype Critic MUST:

1. Verify NO interior-only SS_ states used (SS_BARE, SS_PRIMED_FACTORY, SS_PAINTED_* are
   interior states; exterior must use SS_EXT_* states)
2. Verify NO interior surface IDs used in adjacency_declarations (wall_field, ceiling_field, etc.)
3. Verify NO interior PS_ keys used in required_paintscope_inputs (WALL_FIELD, etc.)
4. Verify FAC_EXT_ACCESS used instead of FAC_HEIGHT for elevation modifiers
5. Verify ext_* protection zone IDs used (not interior floor_perimeter, wall_adjacent, etc.)
6. Verify all referenced PS_ keys exist in PaintScope_Exterior_Key_Catalog.md
7. Verify docs/Doctrine/Interior_Protection_Doctrine.md was NOT used as protection doctrine source

Exterior-specific smoke test scenario to add:
  EXT_SMOKE_01: siding_field, ladder access, SS_EXT_CHALKING, QT3, spray
    Expected: FAC_EXT_ACCESS=1.35 applied, FAC_EXT_SUBSTRATE_CONDITION=1.4 applied to prep,
              ext_landscape_adjacent protection zone triggered, ext_glass_window masking required
```

---

### Phase 4 Verification (Full)

```
Grep: "Domain-Specific Context Loading"  → all 6 agent files
Grep: "Exterior_Substrates_Doctrine"     → all 6 agent files
Grep: "domain == \"exterior\""           → all 6 agent files
Grep: "FAC_EXT_ACCESS"                   → estimation-engineer.md, specfactory-orchestrator.md
Grep: "Interior_Protection_Doctrine"     → all 6 agents — should appear ONLY in "DO NOT APPLY" block
Grep: "Exterior Gate 0"                  → specfactory-orchestrator.md
Grep: "MOD_EXT_SETUP"                    → sop-librarian.md
Grep: "SYS_EXT_WOOD_STANDARD"           → materials-manager.md

Confirm: No existing Required Reading entries were removed from any agent file
```

---

## Phase 5: First Exterior Spec Family

**Objective:** Run the full SpecFactory pipeline against one exterior spec to validate the entire stack end-to-end. Choose the simplest primary substrate — wood siding, field coat only — to minimize variables on first pass.

**Recommended first spec:** `SF_SIDING_EXT_FIELD_PAINT_v1`
(Scope: paint exterior wood/fiber cement siding field; excludes trim, fascia, soffit, windows)

**Why this one first:**
- Largest-area exterior surface → most impactful to get right
- Simpler adjacency model than trim (fewer surfaces touching)
- Covers most common exterior repaint scenario
- Validates PS_SURFACE_SF.EXT_SIDING_FIELD key end-to-end

---

### Task 5.1 — Write Research Brief

**Agent:** spec-researcher.md (domain = "exterior")
**Output:** `specs/SF_SIDING_EXT_FIELD_PAINT_v1/research.json`

**Brief must specify:**
- domain: exterior
- substrate: wood siding (clapboard, LP SmartSide, HardiePlank)
- scope: field coat only (not trim, not fascia, not soffit — those are separate specs)
- substrate states in scope: SS_EXT_BARE_WOOD, SS_EXT_PRIMED_FIELD, SS_EXT_PRIMED_FACTORY (fiber cement), SS_EXT_SOUND_PAINT, SS_EXT_CHALKING, SS_EXT_FAILING_PAINT
- configuration dimensions: quality_tier (QT2–QT4), application_method (spray, brush_roll), substrate_condition (as above)
- access types in scope: ground, ladder (typical 1–2 story)
- site conditions: wind_condition, sun_exposure, surface_temperature

**Gate check before brief submission:** Verify `PaintScope_Exterior_Key_Catalog.md` exists and `PS_SURFACE_SF.EXT_SIDING_FIELD` is defined. If not, halt — Phase 3 incomplete.

---

### Task 5.2 — Run Full SpecFactory Pipeline

**Agent:** specfactory-orchestrator.md
**Input:** `specs/SF_SIDING_EXT_FIELD_PAINT_v1/research.json`

**Mandatory checks before pipeline starts:**
1. Gate 0: All PS_SURFACE_SF.EXT_SIDING_FIELD and other required PS_EXT_ keys confirmed in PaintScope_Exterior_Key_Catalog.md
2. Gate 0.5: protection_zones_required will use ext_* zone IDs; adjacency_declarations will use exterior surface IDs only

**Expected output artifacts:**
```
specs/SF_SIDING_EXT_FIELD_PAINT_v1/
  spec.json            (domain: "exterior", configuration_dimensions, variants, etc.)
  sop_modules.json     (MOD_EXT_* module pattern)
  materials.json       (SYS_EXT_WOOD_STANDARD, SYS_EXT_FIBERCEMENT)
  production.json      (FAC_EXT_ACCESS, FAC_EXT_SUBSTRATE_CONDITION, FAC_EXT_WIND etc.)
  qa_report.json       (prototype-critic validation)
  CHANGELOG.md
```

---

### Task 5.3 — Prototype Critic Validation

**Agent:** prototype-critic.md
**Input:** All 5 artifacts from Task 5.2

**Exterior-specific checks to confirm PASS:**
- [ ] No interior SS_ states present
- [ ] No interior surface IDs in adjacency_declarations
- [ ] No PS_ non-EXT_ keys in required_paintscope_inputs
- [ ] FAC_EXT_ACCESS used for elevation — not FAC_HEIGHT
- [ ] ext_* protection zones used — not floor_perimeter, wall_adjacent
- [ ] Spray rate ≤ backroll rate (coupling constraint)
- [ ] All referenced SS_EXT_* states exist in Substrate_State_Reference.md §4
- [ ] All referenced ext_* surface IDs exist in Surface_Vocabulary_Reference.md §Exterior Surfaces
- [ ] All PS_EXT_ keys exist in PaintScope_Exterior_Key_Catalog.md
- [ ] effective_rate = base_rate ÷ modifier (not multiplied)
- [ ] QT5 not used for siding field (exterior siding typically QT2–QT4; QT5 reserved for showcase trim)

---

### Phase 5 Verification (Full)

```
Confirm directory exists: specs/SF_SIDING_EXT_FIELD_PAINT_v1/
Confirm 5 artifacts present: spec.json, sop_modules.json, materials.json, production.json, qa_report.json

Grep: "\"domain\": \"exterior\""    → specs/SF_SIDING_EXT_FIELD_PAINT_v1/spec.json
Grep: "SS_EXT_"                     → specs/SF_SIDING_EXT_FIELD_PAINT_v1/spec.json
Grep: "PS_SURFACE_SF.EXT_SIDING"   → specs/SF_SIDING_EXT_FIELD_PAINT_v1/spec.json
Grep: "FAC_EXT_ACCESS"              → specs/SF_SIDING_EXT_FIELD_PAINT_v1/production.json
Grep: "SYS_EXT_"                    → specs/SF_SIDING_EXT_FIELD_PAINT_v1/materials.json
Grep: "MOD_EXT_"                    → specs/SF_SIDING_EXT_FIELD_PAINT_v1/sop_modules.json
Grep: "ext_landscape_adjacent"      → specs/SF_SIDING_EXT_FIELD_PAINT_v1/spec.json

Confirm qa_report.json status == "pass" or "pass_with_warnings"
```

---

## Final Phase: Full Stack Verification

**Objective:** Confirm the exterior system is coherent end-to-end, no interior contamination, no broken references.

### Cross-System Integrity Checks

```
1. Reference integrity:
   All SS_EXT_* IDs in specs/SF_SIDING_EXT_FIELD_PAINT_v1/ → exist in Substrate_State_Reference.md §4
   All surface IDs in adjacency_declarations → exist in Surface_Vocabulary_Reference.md §Exterior Surfaces
   All PS_EXT_ keys → exist in PaintScope_Exterior_Key_Catalog.md
   All FAC_EXT_* IDs → exist in Modifier_Registry.md (added in Phase 2)
   All ext_* zone IDs → exist in Exterior_Protection_Doctrine.md §3

2. Agent prompt integrity:
   All 6 agents have "Domain-Specific Context Loading" section
   All 6 agents reference "Exterior_Substrates_Doctrine.md"
   No agent references a file that doesn't exist

3. Interior system not broken:
   Grep SS_BARE → Substrate_State_Reference.md §2 (still present)
   Grep wall_field → Surface_Vocabulary_Reference.md (still present)
   Grep occupancy_state → Site_Condition_Vocabulary_Reference.md (still present)
   Grep "Interior_Protection_Doctrine" → spec-researcher.md Required Reading (still present for interior)
   Run any existing interior spec through pipeline → must still pass qa_report

4. No orphan references:
   Grep "Exterior_Substrates_Doctrine" → agents/ (all 6 files)
   Grep "PaintScope_Exterior_Key_Catalog" → agents/ (all 6 files)
   Grep "Exterior_Protection_Doctrine" → agents/ (all 6 files)
```

### Anti-Pattern Final Check

```
Grep: "Interior_Protection_Doctrine" → specs/SF_SIDING_EXT_FIELD_PAINT_v1/ (must NOT appear)
Grep: "wall_field" → specs/SF_SIDING_EXT_FIELD_PAINT_v1/spec.json (must NOT appear as surface ID)
Grep: "PS_SURFACE_SF.WALL_FIELD" → specs/SF_SIDING_EXT_FIELD_PAINT_v1/ (must NOT appear)
Grep: "FAC_HEIGHT" → specs/SF_SIDING_EXT_FIELD_PAINT_v1/production.json (must NOT appear)
Grep: "floor_perimeter" → specs/SF_SIDING_EXT_FIELD_PAINT_v1/spec.json (must NOT appear)
```

---

## Planned Next Exterior Spec Families (Post-Phase 5)

After `SF_SIDING_EXT_FIELD_PAINT_v1` validates the stack, these follow in rough priority order:

| Spec Family ID | Scope | Key New Concept |
|---|---|---|
| `SF_FASCIA_SOFFIT_EXT_NC_PAINT` | Fascia, soffit, frieze, rake boards | Roofline elevation; soffit-to-fascia adjacency |
| `SF_EXT_TRIM_NC_PAINT` | All exterior trim boards | Exterior adjacency model for trim-to-siding |
| `SF_EXT_DOOR_SLAB_NC_PAINT` | Exterior door face | Exterior door as separate spec from interior door |
| `SF_EXT_WINDOW_TRIM_NC_PAINT` | Exterior window casing and sill | Window-glass adjacency (protection model) |
| `SF_MASONRY_EXT_NC_PAINT` | Masonry wall field | Porous surface coverage; elastomeric systems |
| `SF_DECK_EXT_STAIN` | Horizontal deck field | Stain domain (penetrating/film); horizontal surface rates |

---

## Change Log

| Version | Date | Author | Summary |
|---------|------|--------|---------|
| 0.1.0 | 2026-02-19 | Orchestrator | Initial plan draft — full exterior spec factory rollout |
