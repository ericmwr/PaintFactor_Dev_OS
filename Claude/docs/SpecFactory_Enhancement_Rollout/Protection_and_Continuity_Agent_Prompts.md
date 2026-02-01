# Protection Zones & Finish Continuity Agent Prompts

**Created:** 2025-01-25  
**Purpose:** Copy-paste prompt sections for each SpecFactory agent  
**Related:** SpecFactory_Enhancement_Rollout_Plan.md

---

## Overview

This document contains the actual prompt text to insert into each SpecFactory agent. Use alongside the rollout plan which defines the phasing and checklist.

**Two features being added:**
1. **Protection Zones** — Metadata on protection tasks enabling project-level dedup
2. **Finish Continuity** — Metadata on edge tasks enabling optimization when adjacent surfaces share finish

---

# Reference Documents (Create First)

Before updating agents, create these reference documents that agents will read.

---

## Protection_Zones_Reference.md

**Location:** `Claude/docs/Reference/Protection_Zones_Reference.md`

```markdown
# Protection Zones Reference

**Status:** Canonical  
**Version:** 1.0  
**Last Updated:** 2025-01-26

Quick reference for protection zone IDs used in task metadata.

---

## Overview

Protection tasks carry zone metadata that enables the estimation engine to optimize setup/teardown across multiple specs in a project. Specs are authored as complete processes; optimization happens at project assembly.

**Related Document:** Protection_and_Masking_Doctrine.md

---

## Zone Catalog

| Zone ID | Description | Typical Materials | Common Specs |
|---------|-------------|-------------------|--------------|
| `floor_full` | Complete floor coverage | Rosin paper, plastic, taped seams | Spray ceilings, spray walls |
| `floor_perimeter` | Perimeter drops/runners | Canvas drops, plastic runners | Brush/roll walls, trim, doors |
| `floor_workzone` | Localized protection under work area | Drop cloth, plastic | Door painting, touch-up |
| `wall_adjacent` | Wall surfaces near work | Paper, plastic film | Spray trim, spray cabinets |
| `ceiling_line` | Ceiling-wall junction | Tape, paper backing | Wall painting |
| `trim_edges` | Trim perimeter (for wall work) | Painter's tape | Wall painting |
| `baseboard_top` | Top edge of baseboard | Painter's tape | Wall painting |
| `door_hardware` | Hinges, knobs, locks | Tape, plastic bags | Door painting |
| `window_glass` | Window panes | Paper, masking film | Window/trim painting |
| `cabinet_interior` | Inside cabinet boxes | Paper, plastic | Cabinet painting |
| `cabinet_hardware` | Pulls, hinges, catches | Remove or tape | Cabinet painting |
| `fixture_covers` | Lights, outlets, switches | Tape, plastic bags | Wall/ceiling painting |
| `countertop` | Counter surfaces | Paper, plastic | Cabinet painting |
| `appliances` | Kitchen/bath appliances | Plastic film | Cabinet, wall painting |

---

## Zone Hierarchy

Some zones supersede others:

| If Using | Supersedes | Reason |
|----------|------------|--------|
| `floor_full` | `floor_perimeter` | Full coverage includes perimeter |

---

## Method-Dependent Zones

When `method_dependent: true`, zone selection varies by application method:

| Logical Need | Brush/Roll Resolves To | Spray Resolves To |
|--------------|------------------------|-------------------|
| Floor protection | `floor_perimeter` | `floor_full` |
| Wall protection | minimal/none | `wall_adjacent` |

---

## Task Metadata Structure

Protection tasks include `protection_metadata`:

```json
{
  "task_id": "TSK_SETUP_FLOOR_PROTECTION",
  "task_type": "protect",
  "protection_metadata": {
    "action": "setup",
    "zones": ["floor_perimeter"],
    "method_dependent": true
  }
}
```

**Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `action` | enum | Yes | `setup`, `teardown`, or `maintain` |
| `zones` | array | Yes | Zone IDs from this catalog |
| `method_dependent` | boolean | No | If true, zones vary by spray vs brush/roll |

---

## Engine Behavior (Future)

At project assembly, the estimation engine will:

1. Collect all specs in project scope
2. Determine work sequence
3. Map zone usage across specs
4. Optimize: setup first, teardown last, skip middle

**Example:** If trim and walls both need `floor_perimeter`:
- Trim (first): SETUP floor_perimeter
- Walls (last): TEARDOWN floor_perimeter

---

## Commonly Paired Zones by Spec Type

| Spec Type | Typical Zones |
|-----------|---------------|
| Ceiling spray | floor_full, wall_adjacent, fixture_covers |
| Wall brush/roll | floor_perimeter, ceiling_line, trim_edges, fixture_covers |
| Wall spray | floor_full, ceiling_line, trim_edges, fixture_covers |
| Trim brush/roll | floor_perimeter |
| Trim spray | floor_perimeter, wall_adjacent |
| Door painting | floor_workzone, door_hardware |
| Cabinet painting | floor_perimeter, wall_adjacent, cabinet_interior, countertop |

---

## Adding New Zones

When a new protection scenario is identified:

1. Check if existing zone covers it
2. If not, propose new zone ID (lowercase, underscores)
3. Add to this reference with description and typical materials
4. Update Protection_and_Masking_Doctrine.md if needed
```

---

## Surface_Vocabulary_Reference.md

**Location:** `Claude/docs/Reference/Surface_Vocabulary_Reference.md`

```markdown
# Surface Vocabulary Reference

**Status:** Canonical  
**Version:** 1.0  
**Last Updated:** 2025-01-26

Standardized surface IDs for adjacency metadata and finish group assignments.

---

## Overview

Surface IDs identify specific substrate types for:
- `adjacency_metadata` on tasks (what surface is adjacent)
- `adjacency_declarations` on specs (what the primary surface touches)
- `finish_groups` in projects (which surfaces share a finish)

**Related Document:** Finish_Continuity_Optimization_System.md

---

## Wall Surfaces

| Surface ID | Description | Common Adjacencies |
|------------|-------------|-------------------|
| `wall_field` | Main wall surface area | trim_baseboard, trim_casing_door, trim_casing_window, trim_crown, ceiling_field, trim_chair_rail, trim_wainscot_rail, trim_shadow_box |
| `wall_accent` | Accent wall (different color/finish) | wall_field, trim_baseboard |
| `wall_panel` | Paneled wall sections | trim_baseboard, trim_panel_mold |

---

## Ceiling Surfaces

| Surface ID | Description | Common Adjacencies |
|------------|-------------|-------------------|
| `ceiling_field` | Main ceiling surface | wall_field, trim_crown, fixture_canopy |
| `ceiling_detail` | Coffered/tray ceiling details | ceiling_field, trim_crown |

---

## Trim Surfaces - Linear

| Surface ID | Description | Common Adjacencies |
|------------|-------------|-------------------|
| `trim_baseboard` | Baseboard | wall_field, floor (not painted) |
| `trim_casing_door` | Door casing | wall_field, door_frame |
| `trim_casing_window` | Window casing | wall_field, window_jamb |
| `trim_crown` | Crown molding | wall_field, ceiling_field |
| `trim_chair_rail` | Chair rail | wall_field (above/below) |
| `trim_wainscot_rail` | Wainscot cap/rail | wall_field, wainscot_panel |
| `trim_shadow_box` | Shadow box / picture frame molding | wall_field |
| `trim_panel_mold` | Panel molding | wall_panel |

---

## Door System Surfaces

| Surface ID | Description | Common Adjacencies |
|------------|-------------|-------------------|
| `door_casing` | Door casing | wall_field, door_frame |
| `door_frame` | Door frame/jamb | door_casing, door_leaf_edge |
| `door_leaf_face` | Door face (field) | door_leaf_edge |
| `door_leaf_edge` | Door edges (hinge, latch, top, bottom) | door_frame, door_leaf_face |
| `door_stop` | Door stop molding | door_frame |

---

## Window System Surfaces

| Surface ID | Description | Common Adjacencies |
|------------|-------------|-------------------|
| `window_casing` | Window casing | wall_field, window_jamb |
| `window_jamb` | Window jamb/extension | window_casing, window_sash |
| `window_sash` | Window sash (operable) | window_jamb, window_glass |
| `window_stool` | Window stool | window_jamb, window_apron |
| `window_apron` | Window apron | wall_field, window_stool |

---

## Cabinet Surfaces

| Surface ID | Description | Common Adjacencies |
|------------|-------------|-------------------|
| `cabinet_face_frame` | Cabinet face frame | cabinet_door, cabinet_drawer |
| `cabinet_door` | Cabinet door face | cabinet_face_frame |
| `cabinet_drawer` | Cabinet drawer face | cabinet_face_frame |
| `cabinet_box_interior` | Cabinet box inside | cabinet_shelf |
| `cabinet_end_panel` | Exposed cabinet end | wall_field |

---

## Built-In Surfaces

| Surface ID | Description | Common Adjacencies |
|------------|-------------|-------------------|
| `builtin_carcass` | Built-in cabinet body | wall_field, builtin_face |
| `builtin_face` | Built-in face frame | builtin_carcass, builtin_door |
| `builtin_shelf` | Built-in shelving | builtin_carcass |
| `builtin_trim` | Built-in trim details | builtin_face, wall_field |

---

## Millwork Surfaces

| Surface ID | Description | Common Adjacencies |
|------------|-------------|-------------------|
| `wainscot_panel` | Wainscot panel field | wainscot_rail, wainscot_stile |
| `wainscot_rail` | Wainscot rails (horizontal) | wainscot_panel, wall_field |
| `wainscot_stile` | Wainscot stiles (vertical) | wainscot_panel |
| `wainscot_cap` | Wainscot cap rail | wainscot_panel, wall_field |
| `beam_wrap` | Decorative beam wrap | ceiling_field |
| `column_wrap` | Decorative column wrap | ceiling_field, floor |
| `mantel` | Fireplace mantel | wall_field |

---

## Edge Types

When declaring adjacencies, specify the edge type:

| Edge Type | Description | Examples |
|-----------|-------------|----------|
| `linear` | Two surfaces meet along a line | Wall/baseboard, wall/casing, ceiling/crown |
| `complex` | Multiple surfaces form interconnected system | Door assembly, window assembly |

---

## Usage in Tasks

```json
{
  "task_id": "TSK_TRIM_MASK_WALL_EDGE",
  "task_type": "mask",
  "adjacency_metadata": {
    "adjacent_surface": "wall_field",
    "condition": "different_finish",
    "skip_when": "same_finish_group"
  }
}
```

---

## Usage in Specs

```json
{
  "adjacency_declarations": {
    "primary_surface": "trim_baseboard",
    "adjacent_surfaces": [
      {
        "surface_id": "wall_field",
        "edge_type": "linear",
        "typical_relationship": "different_finish",
        "continuity_rate_modifier": 1.20
      }
    ]
  }
}
```

---

## Adding New Surfaces

When a new surface type is identified:

1. Check if existing surface ID covers it
2. If not, propose new ID following naming convention:
   - Category prefix: `wall_`, `trim_`, `door_`, `window_`, `cabinet_`, `builtin_`, etc.
   - Lowercase with underscores
3. Add to appropriate category in this reference
4. Document common adjacencies
```

---

# Agent Prompt Updates

Below are the prompt sections to insert into each agent.

---

## 1. docs/README.md Update

**Add to Core Doctrine table:**

```markdown
| [Protection_Zones_Reference.md](Protection_Zones_Reference.md) | Zone IDs for protection task metadata |
| [Surface_Vocabulary_Reference.md](Surface_Vocabulary_Reference.md) | Surface IDs for adjacency metadata and finish groups |
```

---

## 2. SOP Librarian (sop-librarian.md)

### Add to Required Reading Section

```markdown
### Protection & Continuity References
- **Protection_Zones_Reference.md** — Zone IDs for protection task metadata
- **Surface_Vocabulary_Reference.md** — Surface IDs for adjacency metadata
```

### Add New Section: Protection Task Metadata

```markdown
---

## Protection Task Metadata

Protection tasks (setup, teardown, maintain) must include `protection_metadata` to enable project-level optimization.

### Required Structure

```json
{
  "task_id": "TSK_[SCOPE]_SETUP_PROTECTION",
  "task_type": "protect",
  "protection_metadata": {
    "action": "setup",
    "zones": ["floor_perimeter"],
    "method_dependent": true
  }
}
```

### Fields

| Field | Required | Values | Description |
|-------|----------|--------|-------------|
| `action` | Yes | `setup`, `teardown`, `maintain` | What this task does to the protection |
| `zones` | Yes | Array of zone IDs | Which zones this task affects |
| `method_dependent` | No | boolean | If true, zones vary by application method |

### Zone Selection Rules

1. **Use standard zone IDs** from Protection_Zones_Reference.md
2. **Be specific** — use the most precise zone that describes the protection
3. **Be complete** — list ALL zones the task affects
4. **Match physical reality** — zones map to actual protected areas

### Common Patterns

| Spec Type | Setup Zones | Teardown Zones |
|-----------|-------------|----------------|
| Wall brush/roll | floor_perimeter, fixture_covers | floor_perimeter, fixture_covers |
| Wall spray | floor_full, ceiling_line, trim_edges, fixture_covers | floor_full, ceiling_line, trim_edges, fixture_covers |
| Trim brush/roll | floor_perimeter | floor_perimeter |
| Trim spray | floor_perimeter, wall_adjacent | floor_perimeter, wall_adjacent |

### Method-Dependent Zones

Set `method_dependent: true` when zone selection varies:

```json
{
  "protection_metadata": {
    "action": "setup",
    "zones": ["floor_perimeter"],
    "method_dependent": true
  }
}
```

The estimation engine will upgrade `floor_perimeter` to `floor_full` for spray applications.
```

### Add New Section: Adjacency Task Metadata

```markdown
---

## Adjacency Task Metadata

Tasks that depend on adjacent surface relationships must include `adjacency_metadata` to enable finish continuity optimization.

### Which Tasks Need Adjacency Metadata

| Task Type | Needs Metadata | Typical Condition |
|-----------|----------------|-------------------|
| Edge masking (tape at wall/trim junction) | Yes | `skip_when: same_finish_group` |
| Cut-in at edge | Yes | `skip_when: same_finish_group` |
| Blend to adjacent surface | Yes | `required_when: same_finish_group` |
| Edge/line inspection | Yes | `skip_when: same_finish_group` |
| General application (not at edge) | No | — |
| Sanding, cleaning, prep (not edge-specific) | No | — |

### Required Structure

**For tasks that apply when finishes DIFFER:**
```json
{
  "task_id": "TSK_TRIM_MASK_WALL_EDGE",
  "task_type": "mask",
  "adjacency_metadata": {
    "adjacent_surface": "wall_field",
    "condition": "different_finish",
    "skip_when": "same_finish_group",
    "rate_modifier_category": "edge_masking"
  }
}
```

**For tasks that apply when finishes are the SAME:**
```json
{
  "task_id": "TSK_TRIM_BLEND_TO_WALL",
  "task_type": "apply",
  "adjacency_metadata": {
    "adjacent_surface": "wall_field",
    "condition": "same_finish",
    "required_when": "same_finish_group",
    "application_method": "brush_roll"
  }
}
```

### Fields

| Field | Required | Values | Description |
|-------|----------|--------|-------------|
| `adjacent_surface` | Yes | Surface ID | Which surface this task relates to |
| `condition` | No | `different_finish`, `same_finish`, `always` | Design assumption |
| `skip_when` | No* | `same_finish_group`, `different_finish_group` | When engine skips task |
| `required_when` | No* | `same_finish_group`, `different_finish_group` | When task is mandatory |
| `rate_modifier_category` | No | `edge_masking`, `cut_in`, `spray_edge`, `inspection` | For rate calculations |
| `application_method` | No | `brush_roll`, `spray`, `any` | Method restriction |

*Use either `skip_when` OR `required_when`, not both.

### Surface ID Rules

1. **Use standard surface IDs** from Surface_Vocabulary_Reference.md
2. **Match the actual adjacent surface** — if task masks the wall, use `wall_field`
3. **One adjacent_surface per task** — if task affects multiple adjacencies, create separate tasks

### Blend Tasks Are Brush/Roll Only

Blend tasks always specify `application_method: brush_roll`:

```json
{
  "adjacency_metadata": {
    "adjacent_surface": "wall_field",
    "condition": "same_finish",
    "required_when": "same_finish_group",
    "application_method": "brush_roll"
  }
}
```

Spray achieves continuity through continuous pass, not blending.
```

---

## 3. Estimation Engineer (estimation-engineer.md)

### Add to Required Reading Section

```markdown
### Protection & Continuity References
- **Protection_Zones_Reference.md** — Zone IDs for protection optimization
- **Surface_Vocabulary_Reference.md** — Surface IDs for finish continuity
```

### Add New Section: Future Engine Optimizations

```markdown
---

## Future Engine Optimizations

The following metadata systems enable project-level optimizations in the estimation engine. These do not change current rate assignment but will affect calculations when the engine is built.

### Protection Zone Optimization

Tasks with `protection_metadata` carry zone information. At project assembly, the engine will:
- Include setup only for the FIRST spec needing each zone
- Include teardown only for the LAST spec using each zone
- Skip setup/teardown for middle specs sharing zones

**Current action:** Assign rates normally. Optimization happens engine-side.

### Finish Continuity Optimization

Tasks with `adjacency_metadata` carry finish relationship information. At project assembly, the engine will:
- Skip tasks marked `skip_when: same_finish_group` when adjacent surfaces share finish
- Include tasks marked `required_when: same_finish_group` only when finishes match
- Apply `continuity_rate_modifier` to affected production rates

**Current action:** Assign rates normally. The `rate_modifier_category` field enables future rate adjustments but does not affect current estimates.

### Production Rate Implications

When finish continuity is detected, edge work rates improve:

| Edge Type | Rate Improvement |
|-----------|------------------|
| Linear (wall/trim) | 15-25% faster on edge work |
| Complex (door/window system) | 20-30% faster when fully continuous |

These modifiers will be applied by the engine based on project-level finish group assignments.
```

---

## 4. Critic (critic.md)

### Add to Required Reading Section

```markdown
### Protection & Continuity References
- **Protection_Zones_Reference.md** — Valid zone IDs
- **Surface_Vocabulary_Reference.md** — Valid surface IDs
```

### Add New Section: Protection Metadata Validation

```markdown
---

## Protection Metadata Validation

### Rules

| Code | Severity | Condition |
|------|----------|-----------|
| `PZ_MISSING_METADATA` | Warning | Protection task (`task_type: protect`) missing `protection_metadata` |
| `PZ_MISSING_ACTION` | Error | `protection_metadata` present but missing `action` |
| `PZ_MISSING_ZONES` | Error | `protection_metadata` present but missing or empty `zones` |
| `PZ_INVALID_ACTION` | Error | `action` not one of: setup, teardown, maintain |
| `PZ_UNKNOWN_ZONE` | Warning | Zone ID not in Protection_Zones_Reference vocabulary |
| `PZ_SETUP_NO_TEARDOWN` | Warning | Spec has protection setup but no matching teardown |
| `PZ_TEARDOWN_NO_SETUP` | Warning | Spec has protection teardown but no matching setup |

### Validation Logic

```
For each task where task_type == "protect":
  If protection_metadata is missing:
    Warn: PZ_MISSING_METADATA
  Else:
    If action is missing: Error: PZ_MISSING_ACTION
    If action not in [setup, teardown, maintain]: Error: PZ_INVALID_ACTION
    If zones is missing or empty: Error: PZ_MISSING_ZONES
    For each zone in zones:
      If zone not in vocabulary: Warn: PZ_UNKNOWN_ZONE

After processing all tasks:
  Collect setup zones and teardown zones
  For each setup zone not in teardown zones: Warn: PZ_SETUP_NO_TEARDOWN
  For each teardown zone not in setup zones: Warn: PZ_TEARDOWN_NO_SETUP
```
```

### Add New Section: Adjacency Metadata Validation

```markdown
---

## Adjacency Metadata Validation

### Rules

| Code | Severity | Condition |
|------|----------|-----------|
| `FC_EDGE_NO_METADATA` | Warning | Edge task (mask at junction, cut-in, blend) missing `adjacency_metadata` |
| `FC_MISSING_SURFACE` | Error | `adjacency_metadata` present but missing `adjacent_surface` |
| `FC_UNKNOWN_SURFACE` | Warning | Surface ID not in Surface_Vocabulary_Reference |
| `FC_INVALID_CONDITION` | Error | `condition` not one of: different_finish, same_finish, always |
| `FC_INVALID_SKIP_WHEN` | Error | `skip_when` not one of: same_finish_group, different_finish_group |
| `FC_INVALID_REQUIRED_WHEN` | Error | `required_when` not one of: same_finish_group, different_finish_group |
| `FC_SKIP_AND_REQUIRED` | Error | Task has both `skip_when` AND `required_when` |
| `FC_BLEND_NO_METHOD` | Warning | Blend task missing `application_method: brush_roll` |
| `FC_BLEND_WRONG_METHOD` | Error | Blend task has `application_method: spray` |

### Edge Task Detection

Tasks are considered "edge tasks" if:
- Task name contains: "mask wall", "mask edge", "cut-in", "cut line", "blend"
- Task is `task_type: mask` AND relates to adjacent surface boundary
- Task description mentions edge, junction, or adjacent surface

### Validation Logic

```
For each task:
  If appears to be edge task AND adjacency_metadata is missing:
    Warn: FC_EDGE_NO_METADATA
  
  If adjacency_metadata is present:
    If adjacent_surface is missing: Error: FC_MISSING_SURFACE
    If adjacent_surface not in vocabulary: Warn: FC_UNKNOWN_SURFACE
    If condition present and invalid: Error: FC_INVALID_CONDITION
    If skip_when present and invalid: Error: FC_INVALID_SKIP_WHEN
    If required_when present and invalid: Error: FC_INVALID_REQUIRED_WHEN
    If both skip_when AND required_when present: Error: FC_SKIP_AND_REQUIRED
    
    If task appears to be blend task:
      If application_method is missing: Warn: FC_BLEND_NO_METHOD
      If application_method == "spray": Error: FC_BLEND_WRONG_METHOD
```
```

### Add New Section: Adjacency Declarations Validation

```markdown
---

## Adjacency Declarations Validation

### Rules

| Code | Severity | Condition |
|------|----------|-----------|
| `FC_DECL_MISSING` | Info | Spec missing `adjacency_declarations` (optional but recommended) |
| `FC_DECL_NO_PRIMARY` | Error | `adjacency_declarations` present but missing `primary_surface` |
| `FC_DECL_NO_ADJACENT` | Error | `adjacency_declarations` present but `adjacent_surfaces` empty |
| `FC_DECL_UNKNOWN_SURFACE` | Warning | Surface ID not in vocabulary |
| `FC_DECL_INVALID_EDGE_TYPE` | Error | `edge_type` not one of: linear, complex |
| `FC_DECL_INVALID_RELATIONSHIP` | Error | `typical_relationship` not one of: same_finish, different_finish, varies |
| `FC_DECL_MODIFIER_RANGE` | Warning | `continuity_rate_modifier` outside range 1.0-2.0 |

### Validation Logic

```
If adjacency_declarations is present:
  If primary_surface is missing: Error: FC_DECL_NO_PRIMARY
  If primary_surface not in vocabulary: Warn: FC_DECL_UNKNOWN_SURFACE
  If adjacent_surfaces is missing or empty: Error: FC_DECL_NO_ADJACENT
  
  For each adjacent_surface:
    If surface_id not in vocabulary: Warn: FC_DECL_UNKNOWN_SURFACE
    If edge_type missing or invalid: Error: FC_DECL_INVALID_EDGE_TYPE
    If typical_relationship present and invalid: Error: FC_DECL_INVALID_RELATIONSHIP
    If continuity_rate_modifier present and outside 1.0-2.0: Warn: FC_DECL_MODIFIER_RANGE
Else:
  Info: FC_DECL_MISSING (optional)
```
```

---

## 5. Materials Manager (materials-manager.md)

### Add to Required Reading Section

```markdown
### Protection & Continuity References
- **Protection_Zones_Reference.md** — Zone IDs map to protection material categories
```

### Add Brief Context Section

```markdown
---

## Protection Zone Awareness

Protection materials map to zones defined in Protection_Zones_Reference.md:

| Zone Category | Typical Materials |
|---------------|-------------------|
| Floor zones (floor_full, floor_perimeter) | Rosin paper, canvas drops, plastic runners |
| Wall zones (wall_adjacent) | Masking paper, plastic film |
| Edge zones (ceiling_line, trim_edges) | Painter's tape, tape + paper |
| Hardware zones (door_hardware, cabinet_hardware) | Tape, plastic bags |
| Fixture zones (fixture_covers) | Tape, plastic bags |
| Surface zones (window_glass, countertop) | Masking film, paper |

When assigning materials to protection tasks, ensure consumables match the zone type.
```

---

## 6. Spec Researcher (spec-researcher.md)

### Add to Required Reading Section

```markdown
### Protection & Continuity References
- **Protection_Zones_Reference.md** — Zone vocabulary for protection tasks
- **Surface_Vocabulary_Reference.md** — Surface vocabulary for adjacency relationships
```

### Add Brief Context

```markdown
---

## Metadata Awareness

When researching existing specs or industry practices, note:

### Protection Patterns
- What areas are protected during this work?
- Is protection shared with other processes?
- Does protection vary by application method?

### Adjacency Patterns
- What surfaces does this substrate typically touch?
- Are edges typically masked or blended?
- Does this work typically match or differ from adjacent surfaces?

This context helps inform `protection_metadata` and `adjacency_metadata` on tasks.
```

---

## 7. SpecFactory Orchestrator (specfactory-orchestrator.md)

### Add Brief Context (no major changes needed)

```markdown
---

## Metadata Systems

Specs may include optional metadata that enables project-level optimization:

### Protection Zones
Tasks with `task_type: protect` should include `protection_metadata` with zone IDs. This enables the estimation engine to dedupe protection setup/teardown across specs in a project.

### Finish Continuity
Edge-related tasks (masking, cut-in, blend) should include `adjacency_metadata` with surface IDs. This enables optimization when adjacent surfaces share the same finish group.

These metadata systems are additive — specs without metadata remain valid. The SOP Librarian is responsible for adding appropriate metadata to tasks.
```

---

# Quick Reference Card

**For any agent needing a compact reference:**

```markdown
## Protection & Continuity Quick Reference

### Protection Metadata (on protect tasks)
```json
{
  "protection_metadata": {
    "action": "setup|teardown|maintain",
    "zones": ["floor_perimeter", "wall_adjacent"],
    "method_dependent": true
  }
}
```

### Adjacency Metadata (on edge tasks)
```json
{
  "adjacency_metadata": {
    "adjacent_surface": "wall_field",
    "condition": "different_finish|same_finish|always",
    "skip_when": "same_finish_group",
    "rate_modifier_category": "edge_masking|cut_in|spray_edge|inspection",
    "application_method": "brush_roll|spray|any"
  }
}
```

### Adjacency Declarations (on spec)
```json
{
  "adjacency_declarations": {
    "primary_surface": "trim_baseboard",
    "adjacent_surfaces": [
      {
        "surface_id": "wall_field",
        "edge_type": "linear|complex",
        "typical_relationship": "different_finish",
        "continuity_rate_modifier": 1.20
      }
    ]
  }
}
```

### Key Rules
1. Protection tasks → add protection_metadata with zones
2. Edge tasks (mask, cut-in, blend) → add adjacency_metadata
3. Blend tasks → always `application_method: brush_roll`
4. Use standard IDs from vocabulary references
5. Specs remain valid without metadata (optional but recommended)
```

---

# Validation Script Additions

## validate_specs.py Updates

```python
# Add these validation functions

VALID_PROTECTION_ACTIONS = ["setup", "teardown", "maintain"]
VALID_ZONES = [
    "floor_full", "floor_perimeter", "floor_workzone",
    "wall_adjacent", "ceiling_line", "trim_edges", "baseboard_top",
    "door_hardware", "window_glass", "cabinet_interior", "cabinet_hardware",
    "fixture_covers", "countertop", "appliances"
]

VALID_SURFACES = [
    "wall_field", "wall_accent", "wall_panel",
    "ceiling_field", "ceiling_detail",
    "trim_baseboard", "trim_casing_door", "trim_casing_window", "trim_crown",
    "trim_chair_rail", "trim_wainscot_rail", "trim_shadow_box", "trim_panel_mold",
    "door_casing", "door_frame", "door_leaf_face", "door_leaf_edge", "door_stop",
    "window_casing", "window_jamb", "window_sash", "window_stool", "window_apron",
    "cabinet_face_frame", "cabinet_door", "cabinet_drawer", "cabinet_box_interior", "cabinet_end_panel",
    "builtin_carcass", "builtin_face", "builtin_shelf", "builtin_trim",
    "wainscot_panel", "wainscot_rail", "wainscot_stile", "wainscot_cap",
    "beam_wrap", "column_wrap", "mantel"
]

VALID_CONDITIONS = ["different_finish", "same_finish", "always"]
VALID_SKIP_REQUIRED = ["same_finish_group", "different_finish_group"]
VALID_RATE_CATEGORIES = ["edge_masking", "cut_in", "spray_edge", "inspection"]
VALID_APP_METHODS = ["brush_roll", "spray", "any"]
VALID_EDGE_TYPES = ["linear", "complex"]
VALID_RELATIONSHIPS = ["same_finish", "different_finish", "varies"]


def validate_protection_metadata(task, errors, warnings):
    """Validate protection_metadata on a task."""
    if task.get("task_type") == "protect":
        pm = task.get("protection_metadata")
        if not pm:
            warnings.append(f"PZ_MISSING_METADATA: Protection task {task.get('task_id')} missing protection_metadata")
            return
        
        action = pm.get("action")
        if not action:
            errors.append(f"PZ_MISSING_ACTION: {task.get('task_id')} protection_metadata missing action")
        elif action not in VALID_PROTECTION_ACTIONS:
            errors.append(f"PZ_INVALID_ACTION: {task.get('task_id')} invalid action '{action}'")
        
        zones = pm.get("zones")
        if not zones:
            errors.append(f"PZ_MISSING_ZONES: {task.get('task_id')} protection_metadata missing zones")
        else:
            for zone in zones:
                if zone not in VALID_ZONES:
                    warnings.append(f"PZ_UNKNOWN_ZONE: {task.get('task_id')} unknown zone '{zone}'")


def validate_adjacency_metadata(task, errors, warnings):
    """Validate adjacency_metadata on a task."""
    am = task.get("adjacency_metadata")
    if not am:
        return  # Optional unless edge task detection triggers
    
    adjacent_surface = am.get("adjacent_surface")
    if not adjacent_surface:
        errors.append(f"FC_MISSING_SURFACE: {task.get('task_id')} adjacency_metadata missing adjacent_surface")
    elif adjacent_surface not in VALID_SURFACES:
        warnings.append(f"FC_UNKNOWN_SURFACE: {task.get('task_id')} unknown surface '{adjacent_surface}'")
    
    condition = am.get("condition")
    if condition and condition not in VALID_CONDITIONS:
        errors.append(f"FC_INVALID_CONDITION: {task.get('task_id')} invalid condition '{condition}'")
    
    skip_when = am.get("skip_when")
    required_when = am.get("required_when")
    
    if skip_when and skip_when not in VALID_SKIP_REQUIRED:
        errors.append(f"FC_INVALID_SKIP_WHEN: {task.get('task_id')} invalid skip_when '{skip_when}'")
    
    if required_when and required_when not in VALID_SKIP_REQUIRED:
        errors.append(f"FC_INVALID_REQUIRED_WHEN: {task.get('task_id')} invalid required_when '{required_when}'")
    
    if skip_when and required_when:
        errors.append(f"FC_SKIP_AND_REQUIRED: {task.get('task_id')} has both skip_when and required_when")
    
    app_method = am.get("application_method")
    if app_method and app_method not in VALID_APP_METHODS:
        errors.append(f"FC_INVALID_APP_METHOD: {task.get('task_id')} invalid application_method '{app_method}'")
    
    # Blend task checks
    task_name = task.get("name", "").lower()
    if "blend" in task_name:
        if not app_method:
            warnings.append(f"FC_BLEND_NO_METHOD: {task.get('task_id')} blend task should specify application_method: brush_roll")
        elif app_method == "spray":
            errors.append(f"FC_BLEND_WRONG_METHOD: {task.get('task_id')} blend task cannot be spray")


def validate_adjacency_declarations(spec, errors, warnings):
    """Validate adjacency_declarations on a spec."""
    ad = spec.get("adjacency_declarations")
    if not ad:
        return  # Optional
    
    primary = ad.get("primary_surface")
    if not primary:
        errors.append(f"FC_DECL_NO_PRIMARY: Spec missing primary_surface in adjacency_declarations")
    elif primary not in VALID_SURFACES:
        warnings.append(f"FC_DECL_UNKNOWN_SURFACE: Unknown primary_surface '{primary}'")
    
    adjacent = ad.get("adjacent_surfaces")
    if not adjacent:
        errors.append(f"FC_DECL_NO_ADJACENT: Spec has empty adjacent_surfaces")
    else:
        for adj in adjacent:
            surface_id = adj.get("surface_id")
            if surface_id and surface_id not in VALID_SURFACES:
                warnings.append(f"FC_DECL_UNKNOWN_SURFACE: Unknown adjacent surface '{surface_id}'")
            
            edge_type = adj.get("edge_type")
            if not edge_type or edge_type not in VALID_EDGE_TYPES:
                errors.append(f"FC_DECL_INVALID_EDGE_TYPE: Invalid edge_type '{edge_type}' for surface '{surface_id}'")
            
            relationship = adj.get("typical_relationship")
            if relationship and relationship not in VALID_RELATIONSHIPS:
                errors.append(f"FC_DECL_INVALID_RELATIONSHIP: Invalid typical_relationship '{relationship}'")
            
            modifier = adj.get("continuity_rate_modifier")
            if modifier and (modifier < 1.0 or modifier > 2.0):
                warnings.append(f"FC_DECL_MODIFIER_RANGE: continuity_rate_modifier {modifier} outside expected range 1.0-2.0")
```

---

# Verification Test Prompts

## Test: Protection Metadata

```
Generate a spec for interior wall painting, brush/roll method.

Verify the output includes:
1. Protection setup task with protection_metadata
2. action: "setup"
3. zones array with appropriate zone IDs (e.g., floor_perimeter, fixture_covers)
4. Protection teardown task with matching zones
5. action: "teardown"
```

## Test: Adjacency Metadata

```
Generate a spec for interior trim baseboard painting.

Verify the output includes:
1. Edge masking task with adjacency_metadata
2. adjacent_surface: "wall_field"
3. skip_when: "same_finish_group"
4. Spec-level adjacency_declarations with:
   - primary_surface: "trim_baseboard"
   - adjacent_surfaces including wall_field with edge_type: "linear"
```

## Test: Blend Task

```
Generate a spec for interior trim painting that includes a blend task for when trim and walls share the same finish.

Verify the blend task has:
1. adjacency_metadata present
2. required_when: "same_finish_group"
3. application_method: "brush_roll"
```
