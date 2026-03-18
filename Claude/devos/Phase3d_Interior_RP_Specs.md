# Phase 3d: Interior RP Specs — Implementation Plan

## Summary

9 interior RP spec directories already exist with complete 7-file pipelines:
- SF_CABINET_INT_RP_v1, SF_CLOSET_INT_RP_v1, SF_DOOR_INT_RP_v1
- SF_DRYWALL_CEILING_INT_RP_v1, SF_DRYWALL_WALL_INT_RP_v1
- SF_SPECIALTY_INT_RP_v1, SF_STAIR_INT_RP_v1, SF_TRIM_INT_RP_v1, SF_WINDOW_INT_RP_v1

The gap analysis is complete (`devos/Interior_RP_Gap_Analysis.md`). This plan covers what remains: registry integration, DB import, condition scale harmonization verification, and PaintScope UI interior RP mode.

---

## Current State

### What's Done
- 9 interior RP spec directories created with all 7 JSON files each
- Gap analysis covering all 18 NC specs → 9 RP spec consolidation
- Task classification: 345 DIRECT, 117 MODIFIED, 42 NOT_APPLICABLE, 30 RP_NEW (~534 total NC tasks analyzed)
- 5 interior substrate states defined: SS_INT_SOUND_PAINT, SS_INT_FAILING_PAINT, SS_INT_PEELING, SS_INT_MOISTURE_DAMAGE, SS_INT_SMOKE_DAMAGE

### What Remains
1. Registry integration (id_registry.json + controlled_enums.json)
2. DB import of 9 interior RP specs
3. Condition scale harmonization verification
4. PaintScope UI interior RP mode

---

## Phase 3d-1: Registry Integration

### id_registry.json Updates (v2.0.0 → v2.1.0)

**Add 9 SF_ entries:**
- SF_CABINET_INT_RP_v1, SF_CLOSET_INT_RP_v1, SF_DOOR_INT_RP_v1
- SF_DRYWALL_CEILING_INT_RP_v1, SF_DRYWALL_WALL_INT_RP_v1
- SF_SPECIALTY_INT_RP_v1, SF_STAIR_INT_RP_v1, SF_TRIM_INT_RP_v1, SF_WINDOW_INT_RP_v1

**Add TSK_ context prefixes:**
| Prefix | Spec |
|--------|------|
| TSK_WLRP_* | Drywall Wall RP |
| TSK_CLRP_* | Drywall Ceiling RP |
| TSK_TMRP_* | Trim RP |
| TSK_DIRP_* | Door Interior RP |
| TSK_WNRP_* | Window Interior RP |
| TSK_STRP_* | Stair RP |
| TSK_CBRP_* | Cabinet RP |
| TSK_SPRP_* | Specialty RP |
| TSK_CSRP_* | Closet RP |
| TSK_RRP_INT_* | Shared RRP interior module |

**Add corresponding MOD_, ROUND_, COV_, SYS_, FAC_ entries** extracted from each spec's resolution.json `registry_additions_proposed`.

### controlled_enums.json Updates

**Verify 5 interior substrate states exist:**
- SS_INT_SOUND_PAINT, SS_INT_FAILING_PAINT, SS_INT_PEELING, SS_INT_MOISTURE_DAMAGE, SS_INT_SMOKE_DAMAGE

**Verify interior primer systems exist:**
- SYS_PRIMER_ADHESION_INT, SYS_PRIMER_STAINBLOCK_INT, SYS_PRIMER_MILDEW_INT

### Approach
- Script to extract `registry_additions_proposed` from 9 RP spec resolution.json files
- Deduplicate shared RRP module entries
- Merge into registry, bump version to v2.1.0

---

## Phase 3d-2: DB Import

### Prerequisites
- Import script fixes from Phase 3a already applied (flat spec structure, _section headers, dict coats_required, alternate dimension keys)
- Schema supports interior RP (same tables as exterior RP — condition_scale, substrate_state columns exist)

### Import Sequence
```bash
for spec in SF_DRYWALL_WALL_INT_RP_v1 SF_DRYWALL_CEILING_INT_RP_v1 SF_TRIM_INT_RP_v1 \
            SF_DOOR_INT_RP_v1 SF_WINDOW_INT_RP_v1 SF_STAIR_INT_RP_v1 \
            SF_CABINET_INT_RP_v1 SF_SPECIALTY_INT_RP_v1 SF_CLOSET_INT_RP_v1; do
    python database/scripts/import_spec.py "specs/$spec"
done
```

### Expected Issues
- Interior RP specs may use different structural key names (same issues as Engineered Siding: `config_dimensions` vs `configuration_dimensions`, `dimension` vs `dimension_id`)
- State declarations may use dict format (input_states/output_states) — already handled by Phase 3a fix
- Import script is now hardened for both patterns — should work without additional fixes

### Validation
- Verify all 9 specs appear in `spec_families` table
- Spot-check task counts against gap analysis projections
- Total DB should reach ~62 spec families (40 NC + 18 ext RP + 9 int RP = 67, minus 5 overlap = 62)

---

## Phase 3d-3: Condition Scale Harmonization Verification

Verify all 9 interior RP specs use GOOD/FAIR/POOR condition scale consistently:

| Check | Expected |
|-------|----------|
| `spec.json` configuration_dimensions.substrate_condition | `["GOOD", "FAIR", "POOR"]` |
| `production.json` FAC_*_CONDITION modifier values | `{GOOD: 1.00, FAIR: 1.30-1.80, POOR: 2.00-3.00}` |
| `sop_modules.json` applies_when references | GOOD, FAIR, POOR (no SC_*, no DSD_*) |
| Prep pool tasks | Condition modifier applied |
| Coating pool tasks | Condition modifier NOT applied |

Interior RP specs were created after the harmonization standard was established (exterior RP used GOOD/FAIR/POOR from the start for the 13 new specs), so they should already be correct. This is a verification step, not a conversion.

---

## Phase 3d-4: PaintScope UI — Interior RP Mode

### Architecture (mirrors Phase 3c exterior approach)

**Project-level NC/RP toggle** (interior equivalent):
- Add `interior.project_type: "NC" | "RP"` to state
- Toggle changes spec routing, substrate state options, and condition inputs
- Independent of exterior toggle (a project can be NC interior + RP exterior, or any combination)

### Spec Routing

**File: `src/data/spec-maps.js`**
- Add `INTERIOR_RP_SPEC_IDS` Set
- Add `INT_RP_SUBSTRATE_SPEC_MAP`:

```
walls       → SF_DRYWALL_WALL_INT_RP
ceiling     → SF_DRYWALL_CEILING_INT_RP
baseboard   → SF_TRIM_INT_RP (item_type: baseboard)
crown       → SF_TRIM_INT_RP (item_type: crown)
casing      → SF_TRIM_INT_RP (item_type: casing)
doors       → SF_DOOR_INT_RP
windows     → SF_WINDOW_INT_RP
stairs      → SF_STAIR_INT_RP
cabinets    → SF_CABINET_INT_RP
closet      → SF_CLOSET_INT_RP
wainscot    → SF_SPECIALTY_INT_RP (item_type: wainscot)
wood_wall   → SF_SPECIALTY_INT_RP (item_type: wood_wall)
wood_ceiling → SF_SPECIALTY_INT_RP (item_type: wood_ceiling)
beam        → SF_SPECIALTY_INT_RP (item_type: beam)
column      → SF_SPECIALTY_INT_RP (item_type: column)
mantel      → SF_SPECIALTY_INT_RP (item_type: mantel)
builtin     → SF_SPECIALTY_INT_RP (item_type: builtin)
```

Note: Interior RP consolidates 18 NC specs → 9 RP specs. The spec-map routes previously-distinct substrates to the consolidated RP spec with an `item_type` discriminator (especially SF_SPECIALTY_INT_RP which covers 7 item types).

### Room Editor Changes

**File: `src/components/room-editor/RoomEditor.jsx`** (or equivalent)
- When RP: Add condition dropdown (GOOD/FAIR/POOR) per substrate in room
- Show substrate state dropdown filtered to SS_INT_* states
- Add contamination type selector for MOISTURE_DAMAGE and SMOKE_DAMAGE (drives primer selection)

**File: `src/components/room-editor/SubstrateRow.jsx`** (or equivalent)
- When RP: Show condition badge next to substrate state
- Condition defaults to GOOD, overridable per substrate

### Context Building

- Interior `buildRoomContext()` gains `condition_scale` and `project_type` fields
- Primer routing becomes state-driven (SS_INT_FAILING_PAINT → adhesion primer, SS_INT_SMOKE_DAMAGE → stain-block primer)
- Prep pool tasks receive condition modifier; coating pool tasks do not

### Estimate Display

- Same prep/coating pool grouping as exterior RP (Phase 3c Step 5)
- Interior-specific additions:
  - Furniture/contents management line items (RP_NEW tasks)
  - Assessment section (adhesion test, moisture check, lead screen for pre-1978)
  - Contamination treatment line items (TSP wash, mold remediation)

---

## Execution Order

1. **Phase 3d-1** (Registry) — prerequisite for everything
2. **Phase 3d-2** (DB Import) — after registry, enables engine queries
3. **Phase 3d-3** (Harmonization Verification) — after import, validation pass
4. **Phase 3d-4** (UI) — after DB import, parallel with exterior RP UI work (Phase 3c)

---

## Dependencies

| Phase | Depends On |
|-------|-----------|
| 3d-1 (Registry) | Phase 1 complete (v2.0.0 established) |
| 3d-2 (DB Import) | Phase 3d-1 + import script fixes from Phase 3a |
| 3d-3 (Harmonization) | Phase 3d-2 |
| 3d-4 (UI) | Phase 3d-2 + Phase 3c architectural patterns (NC/RP toggle, condition inputs) |

---

## Risk Assessment

- **Low risk**: Registry integration — well-established pattern from Phase 1
- **Low risk**: DB import — script already hardened for structural variations
- **Medium risk**: UI consolidation routing — SF_SPECIALTY_INT_RP covers 7 item types from 5 NC specs. The item_type discriminator needs careful wiring to ensure correct task selection per item.
- **Medium risk**: Cabinet RP dual mobilization — UI needs to represent two-visit workflow (paint → cure → reinstall). No precedent in current UI.

---

## Key Differences from Exterior RP UI (Phase 3c)

| Aspect | Exterior RP (3c) | Interior RP (3d) |
|--------|-----------------|-----------------|
| Scope unit | Elevation + standalone | Room |
| Consolidation | 1:1 NC→RP mapping | 18 NC → 9 RP (many-to-one) |
| Condition inputs | Per siding section, per trim type | Per substrate in room |
| Contamination | Weathering only | Smoke, moisture, mold, grease |
| Furniture mgmt | N/A | Core RP_NEW task category |
| Lead/RRP | Rare (pre-1978 exterior) | Common (pre-1978 interior) |
| Multi-visit | Never | Cabinet RP only |
