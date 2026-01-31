# Spec Completeness Doctrine

**Status:** Canonical
**Version:** 1.1
**Last Updated:** 2026-01-31

This document establishes mandatory completeness requirements for spec generation. Specs must declare all information the estimation engine needs to resolve any valid project configuration at runtime.

---

## Prerequisites

Before this doctrine is finalized, the following must be completed:

| Prerequisite | Description | Status |
|--------------|-------------|--------|
| Zone/Key Alignment Audit | Verify all protection zone IDs have corresponding PaintScope keys | Complete (see Zone_Key_Alignment_Report.md — gaps identified, remediation needed) |
| Doctrine Authority Addition | Add authority hierarchy to PaintFactor_OS.md | Complete |
| Site Condition Vocabulary | Create Site_Condition_Vocabulary_Reference.md | Complete |
| Modifier Registry | Create Modifier_Registry.md compiling all system modifiers | Complete |
| Interior Protection Doctrine Update | Consolidate repaint + new construction into single doctrine | Complete |
| Finish Group System | Document finish group declaration requirements for PaintScope/Engine | Complete |

---

## Doctrine Authority

This document is **Level 2 Domain Doctrine** in the PaintFactor authority hierarchy.

| Level | Document Type | Examples |
|-------|--------------|----------|
| 1 (Highest) | Core System Doctrine | PaintFactor_OS.md, Quality_Tiers_and_Surface_Condition.md |
| 2 | Domain Doctrine | This document, Interior_Protection_Doctrine, Fine_Finish_Doctrine, Estimation_Modifiers_Doctrine |
| 3 | Reference Vocabularies | Protection_Zones_Reference, Surface_Vocabulary_Reference, Site_Condition_Vocabulary_Reference, Modifier_Registry |
| 4 | Agent Prompts | SpecFactory agent .md files |
| 5 | Spec Artifacts | Individual spec.json, sop_modules.json, etc. |

**Rule:** Lower-level documents cannot contradict higher-level. If conflict exists, escalate to human review.

**Note:** The full authority hierarchy definition resides in PaintFactor_OS.md. This section is a reference summary.

---

## Core Principle

**Specs DECLARE → Engine RESOLVES**

Specs do not enumerate every possible scenario. Instead, they declare:
- What protection zones they activate
- What surfaces they are adjacent to
- What site conditions affect their tasks
- What skip/include rules apply to tasks

The estimation engine resolves actual protection time, finish continuity optimization, and task inclusion at project assembly based on project-level inputs.

---

## The Three Mandatory Declaration Layers

Every spec MUST include these three declaration types:

| Layer | Purpose | Resolved At |
|-------|---------|-------------|
| **Protection Zone Declarations** | Which zones this spec activates | Project assembly (deduplication) |
| **Adjacency Declarations** | Which surfaces this spec touches | Project assembly (finish continuity) |
| **Site Condition Rules** | Which conditions affect task inclusion | Runtime (per task) |

Without these declarations, the estimation engine cannot resolve project-level optimizations or site-specific task selection.

---

## Layer 1: Protection Zone Declarations (MANDATORY)

### Relationship to Existing Doctrine

This section formalizes protection level concepts from `Interior_Protection_Doctrine.md`. It extends that doctrine by codifying protection levels into queryable, deterministic values.

### Project Type Independence

Protection requirements are driven by **what is present**, not by project type (repaint vs new construction). If finished floors exist in a new construction project, they require the same protection as in a repaint. The distinction between project types affects:
- **Occupancy-driven protection** (furniture, personal items) — typically repaint only
- **Trade coordination** — new construction may have items not yet installed

See `Interior_Protection_Doctrine.md` for complete protection strategy guidance.

### Spec-Level Declaration

Every spec MUST include `protection_zones_required` in `spec.json`:

```json
{
  "protection_zones_required": [
    {
      "zone_id": "floor_perimeter",
      "condition": "always",
      "protection_level": "edge_only",
      "upgrades_to_zone": "floor_full_8ft_radius",
      "upgrades_to_level": "full_cover",
      "upgrade_condition": { "application_method": "spray" }
    },
    {
      "zone_id": "fixture_covers",
      "condition": "always",
      "protection_level": "full_cover"
    },
    {
      "zone_id": "furniture_room",
      "condition": { "occupancy_state": ["occupied_crew_handles", "occupied_owner_assists"] },
      "protection_level": "full_cover"
    }
  ]
}
```

### Field Definitions

| Field | Required | Description |
|-------|----------|-------------|
| `zone_id` | Yes | Zone ID from Protection_Zones_Reference.md |
| `condition` | Yes | `"always"` or object with dimension/condition filters |
| `protection_level` | Yes | `"edge_only"`, `"partial_cover"`, or `"full_cover"` |
| `upgrades_to_zone` | No | Zone ID to upgrade to under certain conditions |
| `upgrades_to_level` | No | Protection level to upgrade to |
| `upgrade_condition` | No | Conditions triggering the upgrade |

### Protection Levels

| Level | Description | Typical Materials | When Used |
|-------|-------------|-------------------|-----------|
| `edge_only` | Tape line at junction only | 1.5" tape | Brush/roll adjacent to asset |
| `partial_cover` | Horizontal surfaces + edge | Paper/plastic on tops + tape | Brush/roll with drip risk |
| `full_cover` | Entire exposed surface | Plastic sheeting, taped edges | Spray adjacent to asset |

### Zone Patterns by Spec Type

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

**Note:** Zone IDs must be verified against Protection_Zones_Reference.md and have corresponding PaintScope keys. See Zone/Key Alignment Audit prerequisite.

### Validation Rules

| Code | Severity | Condition |
|------|----------|-----------|
| `SPEC_PZ_MISSING` | ERROR | spec.json missing `protection_zones_required` array |
| `SPEC_PZ_EMPTY` | ERROR | `protection_zones_required` array is empty |
| `SPEC_PZ_INVALID_ZONE` | ERROR | zone_id not in Protection_Zones_Reference vocabulary |
| `SPEC_PZ_MISSING_CONDITION` | ERROR | zone entry missing `condition` field |
| `SPEC_PZ_MISSING_LEVEL` | ERROR | zone entry missing `protection_level` field |
| `SPEC_PZ_INVALID_LEVEL` | ERROR | protection_level not one of: edge_only, partial_cover, full_cover |

---

## Layer 2: Adjacency Declarations (MANDATORY)

### Protection Zones vs Adjacency - Key Distinction

These systems track different work and are NOT redundant:

| System | Tracks | Unit | Example Task |
|--------|--------|------|--------------|
| **Protection Zones** | Area/asset coverage | SF or EA | TSK_PROTECT_CABINET_FULL (put plastic over cabinet faces) |
| **Adjacency** | Linear edge work | LF | TSK_WALL_CUTIN_TO_CABINET (cut-in at junction) |

**Protection zone task:** Cover the cabinet doors with plastic sheeting
- Input: EA (cabinet banks) or SF (cabinet face area)
- Output: Protected surface ready for adjacent painting

**Adjacency task:** Cut-in or mask at wall/cabinet junction
- Input: LF (edge length where wall meets cabinet)
- Output: Clean edge line for painting

**For brush/roll:** May do adjacency edge work WITHOUT full protection zone coverage

**For spray:** Need BOTH protection zone coverage AND adjacency edge work

### Universal Protection Tasks vs Directional Edge Work

**Protection tasks are UNIVERSAL** — the asset doesn't care which spec is protecting it:
- `TSK_PROTECT_MILLWORK_EDGE` — tape line at millwork junction
- `TSK_PROTECT_MILLWORK_FULL` — cover millwork surface
- `TSK_PROTECT_CABINET_FULL` — cover cabinet faces

**Edge work tasks are SPEC-OWNED and DIRECTIONAL** — each spec defines its own edge work:
- `TSK_WALL_CUTIN_TO_MILLWORK` — wall spec cuts in to millwork
- `TSK_CEILING_CUTIN_TO_MILLWORK` — ceiling spec cuts in to millwork

**Engine behavior:**
- Protection tasks are deduplicated across specs (same millwork protected once)
- Edge work tasks are spec-specific (each spec owns its edge work)

### Spec-Level Declaration

Every spec MUST include `adjacency_declarations` in `spec.json`:

```json
{
  "adjacency_declarations": {
    "primary_surface": "wall_field",
    "adjacent_surfaces": [
      {
        "surface_id": "trim_baseboard",
        "edge_type": "linear",
        "typical_relationship": "different_finish",
        "continuity_rate_modifier": 1.20,
        "affected_tasks": ["TSK_WALL_CUTIN_TO_BASEBOARD"]
      },
      {
        "surface_id": "trim_casing",
        "edge_type": "linear",
        "typical_relationship": "different_finish",
        "continuity_rate_modifier": 1.15,
        "affected_tasks": ["TSK_WALL_CUTIN_TO_CASING"]
      },
      {
        "surface_id": "ceiling_field",
        "edge_type": "linear",
        "typical_relationship": "varies",
        "continuity_rate_modifier": 1.25,
        "affected_tasks": ["TSK_WALL_CUTIN_TO_CEILING", "TSK_WALL_BLEND_TO_CEILING"]
      },
      {
        "surface_id": "cabinet_face",
        "edge_type": "linear",
        "typical_relationship": "not_in_scope",
        "affected_tasks": ["TSK_WALL_CUTIN_TO_CABINET"]
      }
    ]
  }
}
```

### Field Definitions

| Field | Required | Description |
|-------|----------|-------------|
| `primary_surface` | Yes | Surface ID this spec paints (from Surface_Vocabulary_Reference.md) |
| `adjacent_surfaces` | Yes | Array of surfaces this spec touches |
| `surface_id` | Yes | Adjacent surface ID |
| `edge_type` | Yes | `"linear"` or `"complex"` |
| `typical_relationship` | Yes | `"same_finish"`, `"different_finish"`, `"varies"`, or `"not_in_scope"` |
| `continuity_rate_modifier` | No | Rate improvement when same finish group (default 1.0) |
| `affected_tasks` | Yes | Task IDs affected by this adjacency |

### Typical Relationship Values

| Value | Meaning | Edge Treatment |
|-------|---------|----------------|
| `same_finish` | Adjacent surface usually same color/sheen | Blend task, skip masking |
| `different_finish` | Adjacent surface usually different color/sheen | Cut-in task |
| `varies` | Depends on project (e.g., wall to ceiling) | Both tasks available, engine selects based on finish group |
| `not_in_scope` | Adjacent surface is not being painted | Cut-in task (asset protection via protection zones) |

### Finish Group Resolution

The engine determines whether adjacent surfaces share a finish group at project assembly. Finish groups are declared by the contractor during estimate configuration based on scope (what's getting the same color vs different), NOT based on specific color selections.

**Example finish group declaration (at estimate time):**
```json
{
  "finish_groups": [
    { "group_id": "FG_WALLS_CEILINGS", "surfaces": ["wall_field", "ceiling_field"] },
    { "group_id": "FG_TRIM", "surfaces": ["trim_baseboard", "trim_casing", "trim_crown"] }
  ]
}
```

Color selections may come later (via client portal) but finish groups are known at estimate time based on scope.

**Note:** Finish group declaration is a PaintScope/Estimation Engine requirement. See `Future_Work/Finish_Group_Declaration_System.md` for full specification.

### Ceiling Edge Treatment Rules

Masking at ceiling line is only appropriate in specific scenarios. Professionals cut in ceiling lines freehand — they do NOT mask drywall-to-drywall ceiling junctions.

| Ceiling Type | Wall Method | Edge Treatment | Task |
|--------------|-------------|----------------|------|
| Drywall | brush/roll | Cut-in (freehand) | `TSK_WALL_CUTIN_TO_CEILING` |
| Drywall | spray | Cut-in (freehand) | `TSK_WALL_CUTIN_TO_CEILING` |
| Millwork/beam | brush/roll | Cut-in (freehand) | `TSK_WALL_CUTIN_TO_MILLWORK` |
| Millwork/beam | spray | Mask (protect from overspray) | `TSK_PROTECT_MILLWORK_FULL` + `TSK_WALL_CUTIN_TO_MILLWORK` |
| Acoustic tile | brush/roll | Cut-in to track | `TSK_WALL_CUTIN_TO_CEILING` |
| Acoustic tile | spray | Mask (protect tiles from overspray) | `TSK_PROTECT_ACOUSTIC_CEILING` + `TSK_WALL_CUTIN_TO_CEILING` |

**Rule:** For drywall-to-drywall, professionals cut in — they do NOT mask the ceiling line, even when spraying walls.

### Universal Adjacency Example: Coffered Ceiling with Wood Beam

When ceiling spec is painting around a wood beam not in scope:

```json
{
  "spec_id": "SF_CEILING_SPRAY",

  "protection_zones_required": [
    {
      "zone_id": "millwork_beam",
      "condition": { "adjacency_exists": ["ceiling_field", "millwork_beam"] },
      "protection_level": "full_cover"
    }
  ],

  "adjacency_declarations": {
    "primary_surface": "ceiling_field",
    "adjacent_surfaces": [
      {
        "surface_id": "millwork_beam",
        "edge_type": "linear",
        "typical_relationship": "not_in_scope",
        "affected_tasks": ["TSK_CEILING_CUTIN_TO_BEAM"]
      }
    ]
  }
}
```

**Tasks generated:**
- `TSK_PROTECT_MILLWORK_FULL` — universal protection (deduplicated if multiple specs need it)
- `TSK_CEILING_CUTIN_TO_BEAM` — ceiling-specific edge work

### Validation Rules

| Code | Severity | Condition |
|------|----------|-----------|
| `SPEC_ADJ_MISSING` | ERROR | spec.json missing `adjacency_declarations` |
| `SPEC_ADJ_NO_PRIMARY` | ERROR | `adjacency_declarations` missing `primary_surface` |
| `SPEC_ADJ_EMPTY` | ERROR | `adjacent_surfaces` array is empty |
| `SPEC_ADJ_INVALID_SURFACE` | ERROR | surface_id not in Surface_Vocabulary_Reference |
| `SPEC_ADJ_NO_TASKS` | ERROR | adjacent_surfaces entry missing `affected_tasks` |
| `SPEC_ADJ_TASK_NOT_FOUND` | ERROR | Task ID in `affected_tasks` not in sop_modules.json |
| `SPEC_ADJ_INVALID_RELATIONSHIP` | ERROR | typical_relationship not valid enum value |

---

## Layer 3: Site Condition Rules (MANDATORY)

### Overview

Site conditions are project-level inputs that affect task inclusion. Tasks must declare which site conditions trigger their inclusion or exclusion.

### Site Condition Vocabulary

All site condition IDs, valid values, definitions, and typical impacts are defined in `Site_Condition_Vocabulary_Reference.md`.

**Summary of condition IDs:**

| Condition ID | Description |
|--------------|-------------|
| `occupancy_state` | Building occupancy level and furniture handling responsibility |
| `access_constraint` | Access equipment required for the work |
| `lead_status` | Lead paint presence and testing status |
| `moisture_condition` | Moisture presence affecting application |
| `temperature_condition` | Temperature constraints affecting application and dry times |
| `ventilation_condition` | Ventilation status (placeholder for future use) |
| `time_constraint` | Schedule pressure and phased occupancy requirements |

**Note:** See `Site_Condition_Vocabulary_Reference.md` for complete value definitions and use case guidance.

### Task-Level Site Condition Rules

Every task in `sop_modules.json` that is affected by site conditions MUST include `site_condition_rules`:

```json
{
  "task_id": "TSK_SETUP_FURNITURE_PROTECTION",
  "task_type": "protect",
  "site_condition_rules": {
    "include_when": {
      "occupancy_state": ["occupied_owner_assists", "occupied_crew_handles", "occupied_sensitive"]
    },
    "exclude_when": {
      "occupancy_state": ["vacant", "vacant_with_fixtures"]
    }
  },
  "protection_metadata": {
    "action": "setup",
    "zones": ["furniture_room"],
    "protection_level": "full_cover"
  }
}
```

```json
{
  "task_id": "TSK_LEAD_SAFE_CONTAINMENT",
  "task_type": "protect",
  "site_condition_rules": {
    "include_when": {
      "lead_status": ["tested_positive", "unknown_pre1978"]
    }
  },
  "modifier_when_included": {
    "lead_status": {
      "tested_positive": 2.0,
      "unknown_pre1978": 1.5
    }
  }
}
```

```json
{
  "task_id": "TSK_SCAFFOLD_SETUP",
  "task_type": "protect",
  "site_condition_rules": {
    "include_when": {
      "access_constraint": ["scaffold"]
    }
  }
}
```

**Note:** Modifier values (e.g., 2.0 for tested_positive lead) are defined in `Modifier_Registry.md`. Task-level declarations reference those canonical values.

### Task-Level Finish Continuity Rules

Tasks affected by finish continuity MUST include `adjacency_metadata` with skip/include rules:

```json
{
  "task_id": "TSK_WALL_CUTIN_TO_CEILING",
  "task_type": "cut_in",
  "adjacency_metadata": {
    "adjacent_surface": "ceiling_field",
    "skip_when": null,
    "required_when": null
  },
  "notes": "Always required - professionals cut in ceiling line freehand"
}
```

```json
{
  "task_id": "TSK_WALL_BLEND_TO_CEILING",
  "task_type": "blend",
  "adjacency_metadata": {
    "adjacent_surface": "ceiling_field",
    "skip_when": null,
    "required_when": "same_finish_group",
    "application_method": "brush_roll"
  },
  "notes": "Only when wall and ceiling share finish group"
}
```

### Validation Rules

| Code | Severity | Condition |
|------|----------|-----------|
| `TASK_SC_REQUIRED` | ERROR | Task type requires `site_condition_rules` but none provided |
| `TASK_SC_INVALID_CONDITION` | ERROR | Condition ID not in Site_Condition_Vocabulary_Reference |
| `TASK_SC_INVALID_VALUE` | ERROR | Condition value not valid for condition ID |
| `TASK_ADJ_MISSING` | ERROR | Edge task (cut_in, blend) missing `adjacency_metadata` |
| `TASK_ADJ_NO_SURFACE` | ERROR | adjacency_metadata missing `adjacent_surface` |
| `TASK_BLEND_WRONG_METHOD` | ERROR | Blend task `application_method` is not `brush_roll` |
| `TASK_PROTECT_NO_LEVEL` | ERROR | Protect task missing `protection_level` |

---

## Runtime Resolution Logic

### Protection Zone Resolution (Project Assembly)

```
FOR each room in project:
  COLLECT protection_zones_required from all specs in room

  FOR each zone:
    EVALUATE condition against project inputs
    IF condition met:
      IF upgrade_condition met:
        USE upgrades_to_zone with upgrades_to_level
      ELSE:
        USE zone_id with protection_level
      ADD to active_zones

  DEDUPLICATE active_zones (keep highest protection_level per zone)

  CALCULATE setup_time = SUM(zone.setup_time for zone in active_zones)
  CALCULATE teardown_time = SUM(zone.teardown_time for zone in active_zones)

  CREATE project-level protection tasks (universal):
    TSK_PROTECT_[ZONE]_SETUP
    TSK_PROTECT_[ZONE]_TEARDOWN
```

### Finish Continuity Resolution (Project Assembly)

```
FOR each spec in project:
  FOR each adjacent_surface in adjacency_declarations:
    LOOKUP finish_group for primary_surface
    LOOKUP finish_group for adjacent_surface.surface_id

    IF finish_groups match:
      FOR each task_id in affected_tasks:
        IF task.adjacency_metadata.skip_when == "same_finish_group":
          EXCLUDE task from estimate
        IF task.adjacency_metadata.required_when == "same_finish_group":
          INCLUDE task in estimate
          APPLY continuity_rate_modifier to task rate

    IF typical_relationship == "not_in_scope":
      ENSURE protection zone exists for adjacent surface
      INCLUDE cut-in task (protection handled by protection zone)
```

### Site Condition Resolution (Per Task)

```
FOR each task in spec:
  IF task has site_condition_rules:
    EVALUATE include_when against project site_conditions
    EVALUATE exclude_when against project site_conditions

    IF exclude_when matches:
      EXCLUDE task
    ELSE IF include_when matches OR include_when is empty:
      INCLUDE task
      IF modifier_when_included exists:
        LOOKUP modifier value from Modifier_Registry
        APPLY modifier based on specific condition value
```

---

## Completeness Validation Checklist

Before a spec can be approved, the Critic MUST verify:

### Protection Completeness
- [ ] `protection_zones_required` array exists and is non-empty
- [ ] All zone IDs are valid (in Protection_Zones_Reference.md)
- [ ] All zones have `protection_level` specified
- [ ] All conditions reference valid dimensions or site conditions
- [ ] Protection tasks in `sop_modules.json` have matching `protection_metadata`
- [ ] Setup tasks have matching teardown tasks

### Adjacency Completeness
- [ ] `adjacency_declarations` exists with valid `primary_surface`
- [ ] `adjacent_surfaces` array is non-empty
- [ ] All surface IDs are valid (in Surface_Vocabulary_Reference.md)
- [ ] All entries have valid `typical_relationship`
- [ ] All `affected_tasks` reference real task IDs in `sop_modules.json`
- [ ] Edge tasks (cut_in, blend) have `adjacency_metadata`
- [ ] Blend tasks specify `application_method: brush_roll`
- [ ] `not_in_scope` adjacencies have corresponding protection zones

### Site Condition Completeness
- [ ] Tasks affected by occupancy include `site_condition_rules`
- [ ] Tasks affected by access include `site_condition_rules`
- [ ] Tasks affected by lead status include `site_condition_rules`
- [ ] All condition IDs are valid (in Site_Condition_Vocabulary_Reference.md)
- [ ] All condition values are valid for their condition ID
- [ ] Modifier values align with Modifier_Registry.md

### Task-Adjacency Alignment
- [ ] Every task in `affected_tasks` has matching `adjacency_metadata`
- [ ] `adjacency_metadata.adjacent_surface` matches declaration
- [ ] Skip/include rules are consistent with `typical_relationship`

---

## Schema Updates Required

### spec.schema.json Additions

```json
{
  "protection_zones_required": {
    "type": "array",
    "minItems": 1,
    "items": {
      "type": "object",
      "required": ["zone_id", "condition", "protection_level"],
      "properties": {
        "zone_id": { "type": "string" },
        "condition": {
          "oneOf": [
            { "const": "always" },
            { "type": "object" }
          ]
        },
        "protection_level": {
          "type": "string",
          "enum": ["edge_only", "partial_cover", "full_cover"]
        },
        "upgrades_to_zone": { "type": "string" },
        "upgrades_to_level": {
          "type": "string",
          "enum": ["edge_only", "partial_cover", "full_cover"]
        },
        "upgrade_condition": { "type": "object" }
      }
    }
  },
  "adjacency_declarations": {
    "type": "object",
    "required": ["primary_surface", "adjacent_surfaces"],
    "properties": {
      "primary_surface": { "type": "string" },
      "adjacent_surfaces": {
        "type": "array",
        "minItems": 1,
        "items": {
          "type": "object",
          "required": ["surface_id", "edge_type", "typical_relationship", "affected_tasks"],
          "properties": {
            "surface_id": { "type": "string" },
            "edge_type": { "enum": ["linear", "complex"] },
            "typical_relationship": { "enum": ["same_finish", "different_finish", "varies", "not_in_scope"] },
            "continuity_rate_modifier": { "type": "number", "minimum": 1.0, "maximum": 2.0 },
            "affected_tasks": { "type": "array", "items": { "type": "string" }, "minItems": 1 }
          }
        }
      }
    }
  }
}
```

### sop_modules.schema.json Additions

```json
{
  "site_condition_rules": {
    "type": "object",
    "properties": {
      "include_when": { "type": "object" },
      "exclude_when": { "type": "object" }
    }
  },
  "modifier_when_included": {
    "type": "object"
  },
  "protection_metadata": {
    "type": "object",
    "properties": {
      "action": { "enum": ["setup", "teardown", "maintain"] },
      "zones": { "type": "array", "items": { "type": "string" } },
      "protection_level": { "enum": ["edge_only", "partial_cover", "full_cover"] }
    }
  }
}
```

---

## Migration Path for Existing Specs

Existing specs must be updated to include mandatory declarations:

1. **Protection Zones:** Add `protection_zones_required` array with appropriate zones and protection levels
2. **Adjacency:** Ensure `adjacency_declarations` exists with complete `affected_tasks` lists
3. **Site Conditions:** Add `site_condition_rules` to tasks affected by occupancy, access, lead, etc.
4. **Protection Levels:** Add `protection_level` to all protection zone entries

**Grace Period:** Existing specs will generate validation warnings (not errors) for 30 days after this doctrine is finalized, after which these become blocking errors.

---

## Document References

- **[Protection_Zones_Reference.md](Protection_Zones_Reference.md)** — Valid zone IDs
- **[Surface_Vocabulary_Reference.md](Surface_Vocabulary_Reference.md)** — Valid surface IDs
- **[Site_Condition_Vocabulary_Reference.md](Site_Condition_Vocabulary_Reference.md)** — Site condition IDs, values, and definitions
- **[Modifier_Registry.md](Modifier_Registry.md)** — All system modifiers with canonical values
- **[Interior_Protection_Doctrine.md](Interior_Protection_Doctrine.md)** — Protection strategy doctrine
- **[Quality_Tiers_and_Surface_Condition.md](Quality_Tiers_and_Surface_Condition.md)** — Quality tier task selection
- **[PaintFactor_OS.md](PaintFactor_OS.md)** — System architecture and doctrine authority hierarchy

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-31 | Initial doctrine establishing mandatory completeness requirements |
| 1.1 | 2026-01-31 | Promoted to Canonical. All prerequisites complete except Zone/Key Alignment Audit. Schemas, agents, validation, and existing specs migrated (Phases 1-8). |
