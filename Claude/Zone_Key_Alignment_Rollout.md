# Zone/Key Alignment Rollout

**Status:** DRAFT
**Version:** 0.1.0
**Created:** 2026-01-31
**Blocks:** Spec_Completeness_Doctrine finalization (last prerequisite)
**Source:** Zone_Key_Alignment_Audit.md, Zone_Key_Alignment_Report.md

---

## Author Notes

The post-Phase 1 catalog lands at 27 zones — up from 14. That's a meaningful expansion but every addition maps directly to a doctrine zone pattern entry, so there's nothing speculative in there.

Phase 2 adds 17 new PaintScope keys, with the big structural change being the new `PS_PROTECT_LF.*` category. A derivation table is included showing which keys can auto-derive from existing geometry vs. which need new PaintScope capture — that should help scope the PaintScope UI work later.

The orphaned keys (`FLOOR_HARD_EXPOSED`, `FLOOR_CARPET_EXPOSED`, `CABINETS_FACE`) are recommended for retention rather than removal. The floor subtypes drive material selection (paper vs plastic), and the cabinet face key maps to the `PZ_ASSET_ROOM_*_CABINETS` pattern from Interior_Protection_Doctrine.

One thing to watch in Phase 3: The spec coverage gap check may surface specs that need more zone declarations than they currently have. `SF_CEILINGS_NC_PAINT` only declares `fixture_covers` but doctrine patterns suggest it should also have `floor_full` and `furniture_room`. However, NC specs may legitimately omit occupancy-driven zones like `furniture_room` since NC projects are typically vacant. The doctrine patterns are guidelines — NC specs should only declare zones that apply given their project context.

---

> **Before starting Phase 1:** Read this document in full and read `docs/Protection_Zones_Reference.md` to understand the current state of zone definitions before making changes.

---

## Context

The Zone/Key Alignment Audit identified vocabulary fragmentation across three documents that define protection zones using three different naming conventions. Only 26% of doctrine zone IDs have formal definitions, only 22% have PaintScope keys, and only one zone (`fixture_covers`) is fully aligned across all systems.

This rollout resolves all gaps identified in the audit and unblocks Spec_Completeness_Doctrine finalization.

### Decisions Captured

| Decision | Resolution | Rationale |
|----------|-----------|-----------|
| Canonical naming convention | Doctrine flat IDs (`floor_perimeter`, `hardware_covers`) | More descriptive — captures protection action, not just asset name |
| Edge key vs dedicated protection key | Dedicated `PS_PROTECT_LF.*` keys | Semantic distinction: edge keys measure where paint is applied; protection keys measure where masking goes |
| PZ_* parameterized IDs vs flat IDs | Coexist as different layers | Flat IDs = conceptual vocabulary (spec authoring); PZ_* = runtime instantiation per room (engine) |
| Spec JSON updates | Included in this rollout | Required for complete remediation |

---

## Two-Layer Zone ID Architecture

This rollout formalizes the relationship between flat zone IDs and parameterized PZ_* IDs. These are NOT competing conventions — they are different layers of the same system.

### Layer 1: Flat Zone IDs (Spec Authoring)

Flat zone IDs are the **conceptual vocabulary** used when authoring specs. They define WHAT KIND of protection is needed.

- **Used in:** `spec.json` → `protection_zones_required[].zone_id`
- **Defined in:** Protection_Zones_Reference.md (this rollout updates it)
- **Mapped to:** PaintScope keys for geometry sourcing
- **Examples:** `floor_perimeter`, `ceiling_line`, `fixture_covers`, `hardware_covers`

### Layer 2: Parameterized PZ_* IDs (Engine Runtime)

PZ_* IDs are **runtime instantiation patterns** used by the estimation engine to apply protection per room/area. They define WHERE protection is applied.

- **Used in:** Interior_Protection_Doctrine.md zone architecture; engine logic
- **Pattern:** `PZ_{TYPE}_{LOCATION}_{SUBTYPE}` (e.g., `PZ_FLOOR_ROOM_KITCHEN`)
- **Resolved at:** Project assembly when engine maps flat zone IDs to specific rooms
- **Examples:** `PZ_FLOOR_ROOM_{room_id}`, `PZ_ASSET_ROOM_{room_id}_CABINETS`

### How They Connect

```
Spec declares:        "zone_id": "floor_perimeter"          ← flat ID (what kind)
Engine instantiates:  PZ_FLOOR_ROOM_KITCHEN                 ← PZ_* ID (where)
PaintScope sources:   PS_PROTECT_SF.FLOOR_PERIMETER          ← geometry (how much)
```

**Agent rule:** Agents use flat IDs when authoring specs. Agents NEVER use PZ_* IDs in spec artifacts. The engine handles the flat-to-PZ mapping at runtime.

### Future Engine Work

The engine will need a mapping layer that:
1. Takes flat zone IDs from `protection_zones_required` arrays
2. Instantiates them as PZ_* IDs per room based on project scope
3. Deduplicates across specs sharing the same room
4. Sources geometry from the mapped PaintScope keys

**Flag for:** Engine architecture documentation (see Backlog section).

---

## Phase 1: Vocabulary Standardization

### 1A: Resolve Naming Conflicts

Update Protection_Zones_Reference.md to adopt doctrine flat IDs as canonical. Retire conflicting old names.

| Old ID (Zones Ref) | New Canonical ID (Doctrine) | Action |
|--------------------|-----------------------------|--------|
| `door_hardware` | `hardware_covers` | Rename — captures protection action |
| `window_glass` | `glass_mask` | Rename — captures protection action |
| `countertop` | `countertop_covers` | Rename — captures protection action |
| `appliances` | `appliance_adjacent` + `appliance_covers` | Split — brush/roll vs spray have different scope |

For each rename, add alias note so existing references can be traced:

```
Aliases: formerly `door_hardware` (Protection_Zones_Reference v1.0)
```

### 1B: Add Missing Zone Definitions

Add 12 new zone IDs to Protection_Zones_Reference.md. All sourced from Spec_Completeness_Doctrine zone patterns table.

#### Floor Protection — New Zones

| Zone ID | Description | Typical Materials | Common Specs |
|---------|-------------|-------------------|--------------|
| `floor_full_8ft_radius` | Radial floor protection around spray work area (doors, windows) | Rosin paper, plastic | Door spray, window spray |
| `floor_full_kitchen` | Full kitchen floor coverage for cabinet spray | Rosin paper, taped seams | Cabinet spray |
| `floor_door_swing` | Door swing area floor protection | Drop cloth, plastic | Door spray |

#### Fixture/Asset Protection — New Zones

| Zone ID | Description | Typical Materials | Common Specs |
|---------|-------------|-------------------|--------------|
| `furniture_room` | Room furniture protection (occupancy-driven) | Plastic sheeting, furniture pads | Wall brush/roll, ceiling, spray |

#### Surface-Adjacent Protection — New Zones

| Zone ID | Description | Typical Materials | Common Specs |
|---------|-------------|-------------------|--------------|
| `wall_upper_band` | Upper wall band near ceiling (spray overspray zone) | Paper, plastic film | Ceiling spray |
| `wall_adjacent_door` | Wall area adjacent to door during spray | Paper, masking film | Door spray |
| `wall_adjacent_window` | Wall area adjacent to window during spray | Paper, masking film | Window spray |
| `wall_adjacent_cabinet` | Wall area adjacent to cabinets during spray | Paper, masking film | Cabinet spray |
| `jamb_adjacent` | Door/window jamb area protection | Tape, masking paper | Window spray |

#### Masking — New Zones

| Zone ID | Description | Typical Materials | Common Specs |
|---------|-------------|-------------------|--------------|
| `backsplash_mask` | Tile backsplash masking | Masking paper, tape | Cabinet spray |
| `sill_protection` | Window sill surface protection | Paper, tape | Window spray |

#### Millwork/Specialty — New Zones

| Zone ID | Description | Typical Materials | Common Specs |
|---------|-------------|-------------------|--------------|
| `millwork_beam` | Decorative beam/millwork protection | Masking film 72-99", tape | Ceiling spray, wall spray |

### 1C: Update Zone Hierarchy

Add new supersession rules to Protection_Zones_Reference.md:

| If Using | Supersedes | Reason |
|----------|------------|--------|
| `floor_full` | `floor_perimeter` | Full coverage includes perimeter (existing) |
| `floor_full_8ft_radius` | `floor_door_swing` | 8ft radius includes door swing area |
| `floor_full_kitchen` | `floor_perimeter` (in kitchen) | Full kitchen includes perimeter |
| `appliance_covers` | `appliance_adjacent` | Full covers includes adjacent protection |

### 1D: Update Method-Dependent Zones Table

Expand the existing table in Protection_Zones_Reference.md:

| Logical Need | Brush/Roll Resolves To | Spray Resolves To |
|--------------|------------------------|-------------------|
| Floor protection (general) | `floor_perimeter` | `floor_full` |
| Floor protection (door work) | `floor_perimeter` | `floor_full_8ft_radius` |
| Floor protection (kitchen cabinets) | `floor_perimeter` | `floor_full_kitchen` |
| Wall protection | minimal/none | `wall_adjacent` |
| Wall protection (door adjacent) | none | `wall_adjacent_door` |
| Wall protection (window adjacent) | none | `wall_adjacent_window` |
| Wall protection (cabinet adjacent) | none | `wall_adjacent_cabinet` |
| Appliance protection | `appliance_adjacent` | `appliance_covers` |

### 1E: Add Commonly Paired Zones for New Spec Types

Update the "Commonly Paired Zones by Spec Type" table to include all spec categories from Spec_Completeness_Doctrine:

| Spec Category | Application | Typical Zones |
|---------------|-------------|---------------|
| Wall | brush/roll | `floor_perimeter`, `fixture_covers` |
| Wall | spray | `floor_full`, `ceiling_line`, `trim_edges`, `fixture_covers` |
| Ceiling | brush/roll | `floor_full`, `furniture_room`, `fixture_covers` |
| Ceiling | spray | `floor_full`, `furniture_room`, `fixture_covers`, `wall_upper_band` |
| Trim | brush | `floor_perimeter` |
| Trim | spray | `floor_perimeter`, `wall_adjacent` |
| Door | brush/roll | `floor_perimeter`, `hardware_covers` |
| Door | spray | `floor_full_8ft_radius`, `wall_adjacent_door`, `hardware_covers`, `floor_door_swing` |
| Window | brush/roll | `floor_perimeter`, `hardware_covers`, `glass_mask` |
| Window | spray | `floor_full_8ft_radius`, `wall_adjacent_window`, `jamb_adjacent`, `hardware_covers`, `glass_mask`, `sill_protection` |
| Cabinet | brush/roll | `floor_perimeter`, `countertop_covers`, `appliance_adjacent` |
| Cabinet | spray | `floor_full_kitchen`, `countertop_covers`, `appliance_covers`, `backsplash_mask`, `wall_adjacent_cabinet` |

### 1F: Add Optional `related_adjacency` Field

Add a new optional field to zone definitions that links protection zones to Surface_Vocabulary_Reference surface IDs. This enables the future engine to coordinate protection zone setup/teardown with finish continuity decisions.

**Field definition:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `related_adjacency` | string | No | Surface ID from Surface_Vocabulary_Reference.md that this zone protects at the edge junction |

**Zones with related adjacencies:**

| Zone ID | Related Adjacency | Engine Implication |
|---------|-------------------|--------------------|
| `ceiling_line` | `ceiling_field` | Skip protection when wall and ceiling share finish group |
| `trim_edges` | `trim_baseboard` | Skip protection when wall and trim share finish group |
| `wall_adjacent` | `wall_field` | Skip protection when adjacent spec paints same wall |
| `wall_adjacent_door` | `wall_field` | Skip protection when door and wall share finish group |
| `wall_adjacent_window` | `wall_field` | Skip protection when window trim and wall share finish group |
| `wall_adjacent_cabinet` | `cabinet_face_frame` | Always protect (cabinets typically not in scope) |
| `glass_mask` | `window_glass` | Always protect (glass is never painted) |

**Note:** This is metadata for future engine use. It does not change current spec authoring or agent behavior.

### Post-Phase 1 Zone Catalog (Complete)

After all Phase 1 changes, Protection_Zones_Reference.md will contain 27 zones:

| # | Zone ID | Category | Status |
|---|---------|----------|--------|
| 1 | `floor_full` | Floor | Existing |
| 2 | `floor_perimeter` | Floor | Existing |
| 3 | `floor_workzone` | Floor | Existing |
| 4 | `floor_full_8ft_radius` | Floor | **New** |
| 5 | `floor_full_kitchen` | Floor | **New** |
| 6 | `floor_door_swing` | Floor | **New** |
| 7 | `wall_adjacent` | Surface-Adjacent | Existing |
| 8 | `wall_upper_band` | Surface-Adjacent | **New** |
| 9 | `wall_adjacent_door` | Surface-Adjacent | **New** |
| 10 | `wall_adjacent_window` | Surface-Adjacent | **New** |
| 11 | `wall_adjacent_cabinet` | Surface-Adjacent | **New** |
| 12 | `ceiling_line` | Surface-Adjacent | Existing |
| 13 | `trim_edges` | Surface-Adjacent | Existing |
| 14 | `baseboard_top` | Surface-Adjacent | Existing |
| 15 | `jamb_adjacent` | Surface-Adjacent | **New** |
| 16 | `fixture_covers` | Fixture/Asset | Existing |
| 17 | `hardware_covers` | Fixture/Asset | **Renamed** from `door_hardware` |
| 18 | `furniture_room` | Fixture/Asset | **New** |
| 19 | `countertop_covers` | Fixture/Asset | **Renamed** from `countertop` |
| 20 | `appliance_adjacent` | Fixture/Asset | **New** (split from `appliances`) |
| 21 | `appliance_covers` | Fixture/Asset | **New** (split from `appliances`) |
| 22 | `cabinet_interior` | Fixture/Asset | Existing |
| 23 | `cabinet_hardware` | Fixture/Asset | Existing |
| 24 | `glass_mask` | Masking | **Renamed** from `window_glass` |
| 25 | `backsplash_mask` | Masking | **New** |
| 26 | `sill_protection` | Masking | **New** |
| 27 | `millwork_beam` | Millwork/Specialty | **New** |

---

## Phase 2: PaintScope Key Additions

### Design Decision: Dedicated Protection Keys

Surface-adjacent protection zones get dedicated `PS_PROTECT_LF.*` keys rather than reusing `PS_EDGE_LF.*` keys.

**Rationale:**
- `PS_EDGE_LF.*` keys measure where paint is applied (the work itself)
- `PS_PROTECT_LF.*` keys measure where masking/tape goes (prep for adjacent work)
- Example: `ceiling_line` protection exists because you're painting the wall below it — that's not the same surface as the ceiling edge paint line
- Conflating these would muddy the semantic distinction between "work surface" and "protection zone"

### 2A: Existing Key Mapping (Confirm)

These PaintScope keys already exist and map correctly to zones. No changes needed.

| PaintScope Key | UOM | Maps To Zone | Status |
|---------------|-----|-------------|--------|
| `PS_PROTECT_SF.FLOOR_EXPOSED` | SF | `floor_full` | ✓ Confirmed |
| `PS_PROTECT_EA.ASSET.FIXTURES` | EA | `fixture_covers` | ✓ Confirmed |
| `PS_PROTECT_SF.ASSET.COUNTERTOPS` | SF | `countertop_covers` | ✓ Confirmed (zone renamed) |
| `PS_PROTECT_SF.ASSET.TILE_BACKSPLASH` | SF | `backsplash_mask` | ✓ Confirmed (zone added) |
| `PS_PROTECT_SF.ASSET.GLASS_AREA` | SF | `glass_mask` | ✓ Confirmed (zone renamed) |

### 2B: Existing Key Mapping (Update Reference)

These keys exist but their zone mapping needs updating due to renames.

| PaintScope Key | UOM | Old Zone Ref | New Zone Ref | Action |
|---------------|-----|-------------|-------------|--------|
| `PS_PROTECT_EA.ASSET.HARDWARE_GROUPS` | EA | `door_hardware` | `hardware_covers` | Update catalog description |

### 2C: Orphaned Keys (Resolve)

These keys exist but have no zone mapping. Determine disposition.

| PaintScope Key | UOM | Description | Resolution |
|---------------|-----|-------------|------------|
| `PS_PROTECT_SF.FLOOR_HARD_EXPOSED` | SF | Hard floor subtype | **Retain as subtype of `PS_PROTECT_SF.FLOOR_EXPOSED`** — floor type drives material selection (paper vs plastic), not zone selection |
| `PS_PROTECT_SF.FLOOR_CARPET_EXPOSED` | SF | Carpet floor subtype | **Retain as subtype** — same rationale |
| `PS_PROTECT_SF.ASSET.CABINETS_FACE` | SF | Cabinet face area | **Map to `PZ_ASSET_ROOM_*_CABINETS`** zone type — used when cabinets are not in scope and need protection |

### 2D: New Floor Protection Keys

| PaintScope Key | UOM | Maps To Zone | Description | PaintScope Capture |
|---------------|-----|-------------|-------------|-------------------|
| `PS_PROTECT_SF.FLOOR_PERIMETER` | SF | `floor_perimeter` | Perimeter drop coverage area | Room perimeter LF × standard drop width |
| `PS_PROTECT_SF.FLOOR_8FT_RADIUS` | SF | `floor_full_8ft_radius` | Radial protection around work item | Calculated from item location + 8ft radius |
| `PS_PROTECT_SF.FLOOR_KITCHEN` | SF | `floor_full_kitchen` | Full kitchen floor | Kitchen room floor area |
| `PS_PROTECT_SF.FLOOR_DOOR_SWING` | SF | `floor_door_swing` | Door swing area | Door swing arc area (standard formula) |

### 2E: New Surface-Adjacent Protection Keys (Dedicated LF)

These are the new `PS_PROTECT_LF.*` key category. They measure linear footage of masking/tape for protection — distinct from `PS_EDGE_LF.*` keys that measure where paint is applied.

| PaintScope Key | UOM | Maps To Zone | Description | PaintScope Capture |
|---------------|-----|-------------|-------------|-------------------|
| `PS_PROTECT_LF.CEILING_LINE` | LF | `ceiling_line` | Masking at ceiling-wall junction | Room perimeter LF at ceiling (may equal `PS_EDGE_LF.TO_CEILING` geometrically but semantically distinct) |
| `PS_PROTECT_LF.TRIM_EDGES` | LF | `trim_edges` | Masking at trim perimeter | Trim perimeter LF in room |
| `PS_PROTECT_LF.WALL_ADJACENT` | LF | `wall_adjacent` | Masking on wall near spray target | Wall LF adjacent to spray work |
| `PS_PROTECT_LF.WALL_ADJACENT_DOOR` | LF | `wall_adjacent_door` | Wall masking around door during spray | Wall LF surrounding door opening |
| `PS_PROTECT_LF.WALL_ADJACENT_WINDOW` | LF | `wall_adjacent_window` | Wall masking around window during spray | Wall LF surrounding window opening |
| `PS_PROTECT_LF.WALL_ADJACENT_CABINET` | LF | `wall_adjacent_cabinet` | Wall masking above/beside cabinets | Wall LF at cabinet edge |
| `PS_PROTECT_LF.JAMB_ADJACENT` | LF | `jamb_adjacent` | Jamb area masking | Jamb perimeter LF |
| `PS_PROTECT_LF.SILL` | LF | `sill_protection` | Window sill edge masking | Sill edge LF |

### 2F: New Asset/Other Protection Keys

| PaintScope Key | UOM | Maps To Zone | Description | PaintScope Capture |
|---------------|-----|-------------|-------------|-------------------|
| `PS_PROTECT_SF.WALL_UPPER_BAND` | SF | `wall_upper_band` | Upper wall band area near ceiling | Room perimeter LF × band height (typically 12-18") |
| `PS_PROTECT_SF.FURNITURE_ROOM` | SF | `furniture_room` | Furniture coverage area estimate | Room SF (used for time estimate, not material calc) |
| `PS_PROTECT_EA.APPLIANCE_ADJACENT` | EA | `appliance_adjacent` | Appliance count for brush/roll adjacency | Count of appliances adjacent to work |
| `PS_PROTECT_EA.APPLIANCE_COVERS` | EA | `appliance_covers` | Appliance count for full spray coverage | Count of appliances to fully cover |
| `PS_PROTECT_SF.MILLWORK_BEAM` | SF | `millwork_beam` | Beam/millwork surface area to protect | Surface SF of beam faces |
| `PS_PROTECT_SF.FLOOR_WORKZONE` | SF | `floor_workzone` | Localized floor work area | Work area SF (typically door or touch-up zone) |

### Post-Phase 2 Key Summary

| Category | Existing Keys | New Keys | Total |
|----------|--------------|----------|-------|
| `PS_PROTECT_SF.*` (area) | 7 | 7 | 14 |
| `PS_PROTECT_LF.*` (linear) | 0 | 8 | 8 |
| `PS_PROTECT_EA.*` (count) | 2 | 2 | 4 |
| **Total** | **9** | **17** | **26** |

### PaintScope UI/Capture Implications

Many new keys can be **derived from existing geometry** rather than requiring new PaintScope capture:

| Derivation Method | Keys Using It |
|-------------------|---------------|
| Room perimeter LF × width factor | `FLOOR_PERIMETER`, `CEILING_LINE`, `WALL_UPPER_BAND` |
| Existing edge LF (same geometry, different semantic) | `TRIM_EDGES`, `WALL_ADJACENT_*`, `JAMB_ADJACENT`, `SILL` |
| Room floor SF | `FLOOR_KITCHEN`, `FURNITURE_ROOM` |
| Standard formula from item dimensions | `FLOOR_8FT_RADIUS`, `FLOOR_DOOR_SWING` |
| Direct capture (new measurement needed) | `MILLWORK_BEAM`, `FLOOR_WORKZONE` |

**Flag:** PaintScope team should determine which keys can auto-derive vs. require explicit capture. This is a PaintScope implementation decision, not a spec authoring concern.

---

## Phase 3: Spec JSON Updates

### 3A: Audit Scope

All existing spec.json files with `protection_zones_required` arrays must be audited for:

1. Zone IDs match canonical vocabulary (post-Phase 1)
2. All zones referenced have corresponding PaintScope keys (post-Phase 2)
3. `protection_level` is specified for all zone entries
4. Upgrade conditions reference valid zone IDs

### 3B: Known Spec Files Requiring Updates

From the audit report, specs currently using protection zones:

| Spec | Zones Used | Issues |
|------|-----------|--------|
| SF_DRYWALL_WALL_NC_PRIME | `floor_perimeter`, `floor_full` (upgrade), `fixture_covers` | Verify PaintScope key for `floor_perimeter` exists (Phase 2) |
| SF_DRYWALL_WALL_NC_FINISH | `floor_perimeter`, `fixture_covers`, `ceiling_line`, `trim_edges` | Verify PaintScope keys for `ceiling_line`, `trim_edges` exist (Phase 2) |
| SF_TRIM_NC_PAINT | `floor_perimeter`, `floor_full` (upgrade) | Verify PaintScope key for `floor_perimeter` exists (Phase 2) |
| SF_DRYWALL_WALL_NC_FULL | `fixture_covers` | Minimal — already aligned |
| SF_CEILINGS_NC_PAINT | `fixture_covers` | Minimal — may need `floor_full`, `furniture_room`, `wall_upper_band` per doctrine patterns |

### 3C: Coverage Gap — Specs Missing Expected Zones

Compare each spec's `protection_zones_required` against the "Zone Patterns by Spec Type" table in Spec_Completeness_Doctrine. Flag specs that are missing expected zones.

**Example:** SF_CEILINGS_NC_PAINT currently only declares `fixture_covers`, but the doctrine pattern for Ceiling brush/roll is `floor_full`, `furniture_room`, `fixture_covers`. This spec needs two additional zone declarations.

### 3D: Update Procedure

For each spec requiring updates:

1. Open spec.json
2. Cross-reference against Spec_Completeness_Doctrine zone patterns table
3. Add missing zone entries with appropriate `condition`, `protection_level`, and upgrade rules
4. Ensure all zone IDs use canonical vocabulary
5. Run Critic validation (protection completeness checklist from Spec_Completeness_Doctrine)

---

## Phase 4: Cross-Reference Updates

### 4A: Interior_Protection_Doctrine.md

Add cross-reference note clarifying the two-layer zone ID architecture (Section: "Protection Zone Schema"):

> **Zone ID Layers:** This doctrine defines parameterized `PZ_*` IDs for runtime instantiation per room. The flat zone IDs used in spec authoring (e.g., `floor_perimeter`, `ceiling_line`) are defined in `Protection_Zones_Reference.md`. Agents use flat IDs when authoring specs; the engine maps flat IDs to `PZ_*` instances at project assembly. These are not competing conventions — they are different layers of the same system. See `Zone_Key_Alignment_Rollout.md` for the formal relationship.

### 4B: Spec_Completeness_Doctrine.md

1. Update prerequisite table — mark Zone/Key Alignment Audit as **Complete — Remediated**
2. Remove the caveat note on the Zone Patterns table ("Zone IDs must be verified...")
3. Update version to 1.2

### 4C: paintscope_quantity_key_catalog.md

1. Add all new keys from Phase 2
2. Add new `PS_PROTECT_LF.*` category section with semantic explanation
3. Update zone mapping references for renamed zones

### 4D: Validation Script Update

`scripts/validate_specs.py` contains a hardcoded list of valid zone IDs used for `SPEC_PZ_INVALID_ZONE` validation. After Phase 1 adds 12 new zones and renames 4, this list must be updated.

1. Add all 12 new zone IDs to the valid zones set
2. Replace the 4 renamed zone IDs (`door_hardware`→`hardware_covers`, `window_glass`→`glass_mask`, `countertop`→`countertop_covers`, `appliances`→`appliance_adjacent`/`appliance_covers`)
3. Run validation against all specs to confirm no regressions

### 4E: Agent Prompt Updates

The following agent prompts reference Protection_Zones_Reference.md and should be verified for consistency:

| Agent | File | Check |
|-------|------|-------|
| Critic | critic.md | Zone vocabulary validation uses canonical IDs |
| SOP Librarian | sop-librarian.md | Protection task metadata uses canonical zone IDs |
| Estimation Engineer | estimation-engineer.md | Protection rate assignment uses canonical zone IDs |
| SpecFactory Orchestrator | specfactory-orchestrator.md | PaintScope readiness gate checks for new key category |

No prompt content changes expected — these agents reference the documents, not hardcoded zone IDs. But verify after Phase 1 and 2 changes are committed.

---

## Backlog Items

### B1: Finish_Continuity_Optimization_System.md

**Type:** Documentation consolidation (not blocking)
**Priority:** Medium
**Context:** Surface_Vocabulary_Reference.md references this document, but it was never generated. Finish continuity logic is currently distributed across:
- Agent prompts (adjacency_metadata structure, skip/include rules)
- Surface_Vocabulary_Reference.md (surface IDs)
- Individual spec.json files (adjacency_declarations, continuity_rate_modifier)
- Estimation Engineer prompt (engine optimization behavior)

**Recommended content:**
- Consolidated finish continuity rules
- Finish group declaration requirements
- Rate modifier catalog
- Engine resolution logic (currently in Spec_Completeness_Doctrine §Runtime Resolution)
- Interaction with protection zones (via `related_adjacency` field)

**When to create:** After this rollout is complete and Spec_Completeness_Doctrine is finalized.

### B2: Finish_Group_Declaration_System.md

**Type:** Future work specification
**Priority:** Medium
**Context:** Referenced in Spec_Completeness_Doctrine line 282 as `Future_Work/Finish_Group_Declaration_System.md`. Defines how contractors declare which surfaces share a finish group at estimate time.

**Status:** Exists at `docs/Future_Work/Finish_Group_Declaration_System.md` (created during Spec Completeness Rollout Phase 1). Requirements documented; implementation pending.

### B3: Engine Zone Mapping Architecture

**Type:** Future engine design
**Priority:** Low (until engine build begins)
**Context:** The engine will need to:
1. Map flat zone IDs to PZ_* instances per room
2. Coordinate protection zone setup/teardown with finish continuity skip/include decisions
3. Use `related_adjacency` field to determine when protection can be skipped due to same finish group
4. Resolve PaintScope key derivation (auto-derive vs explicit capture)

**When to address:** During engine architecture phase.

### B4: PaintScope Capture Strategy for New Keys

**Type:** PaintScope implementation decision
**Priority:** Medium (blocks PaintScope UI work)
**Context:** Phase 2 adds 17 new PaintScope keys. Many can be derived from existing geometry measurements. PaintScope team needs to determine:
- Which keys auto-derive from existing measurements
- Which keys require new explicit capture fields
- UI implications for new capture requirements

**When to address:** After Phase 2 key definitions are finalized.

---

## Validation Criteria

### Phase 1 Complete When:
- [ ] All 4 naming conflicts resolved (old IDs retired with alias notes)
- [ ] All 12 new zone definitions added to Protection_Zones_Reference.md
- [ ] Zone hierarchy updated with new supersession rules
- [ ] Method-dependent zones table expanded
- [ ] Commonly paired zones table covers all spec categories
- [ ] `related_adjacency` field added to applicable zones
- [ ] Two-layer architecture (flat vs PZ_*) documented in Protection_Zones_Reference.md
- [ ] Protection_Zones_Reference.md version bumped to 2.0

### Phase 2 Complete When:
- [ ] All 17 new PaintScope keys added to catalog
- [ ] New `PS_PROTECT_LF.*` category section created with semantic explanation
- [ ] Orphaned key dispositions documented
- [ ] Zone-to-key mapping is 100% (every zone has a key)
- [ ] paintscope_quantity_key_catalog.md version bumped

### Phase 3 Complete When:
- [ ] All existing spec.json files audited against doctrine zone patterns
- [ ] All zone IDs use canonical vocabulary
- [ ] Missing zone declarations added per doctrine patterns
- [ ] Critic validation passes for all updated specs (protection completeness)

### Phase 4 Complete When:
- [ ] Interior_Protection_Doctrine.md cross-reference added
- [ ] Spec_Completeness_Doctrine.md prerequisite marked complete, version bumped to 1.2
- [ ] paintscope_quantity_key_catalog.md updated
- [ ] validate_specs.py valid zone list updated (new zones added, renamed zones replaced)
- [ ] Validation passes on all specs after zone list update
- [ ] Agent prompts verified for consistency
- [ ] Backlog items B1-B4 logged in task tracking

### Rollout Complete When:
- [ ] All four phases pass validation
- [ ] Spec_Completeness_Doctrine.md can be finalized (all prerequisites met)
- [ ] Zone/Key alignment is 100% (audit re-run shows no gaps)

---

## Execution Order

Phases must execute in order due to dependencies:

```
Phase 1 (Vocabulary)
  ↓
Phase 2 (PaintScope Keys) — depends on canonical zone IDs from Phase 1
  ↓
Phase 3 (Spec JSONs) — depends on both zone vocabulary and PaintScope keys
  ↓
Phase 4 (Cross-References) — depends on all prior phases being stable
  ↓
Backlog items (asynchronous, no blocking dependencies)
```

---

## Change Log

| Version | Date | Changes |
|---------|------|---------|
| 0.1.0 | 2026-01-31 | Initial rollout plan based on Zone/Key Alignment Audit findings |
