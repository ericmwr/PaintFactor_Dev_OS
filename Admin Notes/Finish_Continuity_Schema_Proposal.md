# Proposed Schema Updates: Finish Continuity Optimization

**Status:** Draft Proposal  
**Created:** 2025-01-25  
**Related Document:** Finish_Continuity_Optimization_System.md  
**Purpose:** Define schema changes required to support finish continuity optimization

---

## Overview

This document specifies the schema additions required to implement finish continuity optimization. Three schemas are affected:

| Schema | Addition | Purpose |
|--------|----------|---------|
| `sop_modules.schema.json` | `adjacency_metadata` on tasks | Flag tasks that depend on adjacent surface finish relationships |
| `spec_definition.schema.json` | `adjacency_declarations` | Declare what surfaces a spec's primary substrate touches |
| `project.schema.json` (new) | `finish_groups` | Project-level surface-to-finish assignments |

---

## 1. Task-Level: adjacency_metadata

**File:** `Claude/specs/_schemas/sop_modules.schema.json`

**Location:** Add as optional property on task objects (alongside `protection_metadata`)

### Schema Definition

```json
{
  "adjacency_metadata": {
    "type": "object",
    "description": "Defines task behavior based on adjacent surface finish relationships. Enables project-level optimization when adjacent surfaces share finish groups.",
    "properties": {
      "adjacent_surface": {
        "type": "string",
        "description": "Surface ID this task relates to (from surface vocabulary)",
        "examples": ["wall_field", "ceiling_field", "door_frame"]
      },
      "condition": {
        "type": "string",
        "enum": ["different_finish", "same_finish", "always"],
        "description": "The finish relationship condition this task is designed for"
      },
      "skip_when": {
        "type": "string",
        "enum": ["same_finish_group", "different_finish_group"],
        "description": "Condition under which the estimation engine should skip this task"
      },
      "required_when": {
        "type": "string",
        "enum": ["same_finish_group", "different_finish_group"],
        "description": "Condition under which this task becomes mandatory (typically for continuity-specific tasks like blending)"
      },
      "rate_modifier_category": {
        "type": "string",
        "enum": ["edge_masking", "cut_in", "spray_edge", "inspection"],
        "description": "Category for applying continuity-based production rate modifiers"
      },
      "application_method": {
        "type": "string",
        "enum": ["brush_roll", "spray", "any"],
        "default": "any",
        "description": "Restricts when this task applies based on application method. Blend tasks are typically brush_roll only."
      }
    },
    "required": ["adjacent_surface"],
    "additionalProperties": false
  }
}
```

### Usage Notes

- **Optional property** — Only present on tasks affected by adjacent surface relationships
- **Mutual exclusivity** — A task should have either `skip_when` OR `required_when`, not both
- **Default behavior** — Tasks without `adjacency_metadata` are always included regardless of finish continuity

### Example Tasks

**Edge masking task (skip when continuous):**
```json
{
  "task_id": "TSK_TRIM_MASK_WALL_EDGE",
  "module_id": "MOD_TRIM_PROTECTION",
  "name": "Mask wall surface at trim edge",
  "task_type": "mask",
  "adjacency_metadata": {
    "adjacent_surface": "wall_field",
    "condition": "different_finish",
    "skip_when": "same_finish_group",
    "rate_modifier_category": "edge_masking"
  }
}
```

**Cut-in task (skip when continuous):**
```json
{
  "task_id": "TSK_TRIM_CUT_WALL_LINE",
  "module_id": "MOD_TRIM_APPLY",
  "name": "Cut trim edge at wall junction",
  "task_type": "apply",
  "adjacency_metadata": {
    "adjacent_surface": "wall_field",
    "condition": "different_finish",
    "skip_when": "same_finish_group",
    "rate_modifier_category": "cut_in"
  }
}
```

**Blend task (required when continuous, brush/roll only):**
```json
{
  "task_id": "TSK_TRIM_BLEND_TO_WALL",
  "module_id": "MOD_TRIM_APPLY",
  "name": "Blend trim application into wall field",
  "task_type": "apply",
  "adjacency_metadata": {
    "adjacent_surface": "wall_field",
    "condition": "same_finish",
    "required_when": "same_finish_group",
    "application_method": "brush_roll"
  }
}
```

**Line inspection task (skip when continuous):**
```json
{
  "task_id": "TSK_TRIM_INSPECT_WALL_LINE",
  "module_id": "MOD_TRIM_QC",
  "name": "Inspect edge line at wall junction",
  "task_type": "inspect",
  "adjacency_metadata": {
    "adjacent_surface": "wall_field",
    "condition": "different_finish",
    "skip_when": "same_finish_group",
    "rate_modifier_category": "inspection"
  }
}
```

---

## 2. Spec-Level: adjacency_declarations

**File:** `Claude/specs/_schemas/spec_definition.schema.json` (or create if needed)

**Location:** Top-level spec metadata

### Schema Definition

```json
{
  "adjacency_declarations": {
    "type": "object",
    "description": "Declares the primary surface and its adjacent surfaces for finish continuity optimization",
    "properties": {
      "primary_surface": {
        "type": "string",
        "description": "Surface ID of this spec's primary substrate (from surface vocabulary)",
        "examples": ["trim_baseboard", "wall_field", "door_leaf_face"]
      },
      "adjacent_surfaces": {
        "type": "array",
        "description": "List of surfaces that touch or meet the primary surface",
        "items": {
          "type": "object",
          "properties": {
            "surface_id": {
              "type": "string",
              "description": "Adjacent surface ID from surface vocabulary"
            },
            "edge_type": {
              "type": "string",
              "enum": ["linear", "complex"],
              "description": "Nature of the adjacency: linear (two surfaces meet along a line) or complex (multiple interconnected surfaces)"
            },
            "typical_relationship": {
              "type": "string",
              "enum": ["same_finish", "different_finish", "varies"],
              "default": "varies",
              "description": "Most common finish relationship in typical projects"
            },
            "continuity_rate_modifier": {
              "type": "number",
              "minimum": 1.0,
              "maximum": 2.0,
              "description": "Production rate multiplier when same_finish_group detected (e.g., 1.20 = 20% faster)"
            }
          },
          "required": ["surface_id", "edge_type"],
          "additionalProperties": false
        }
      }
    },
    "required": ["primary_surface", "adjacent_surfaces"],
    "additionalProperties": false
  }
}
```

### Example Spec Declarations

**Baseboard trim spec:**
```json
{
  "spec_id": "SF_TRIM_BASEBOARD_INT_REPAINT_v1",
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

**Door casing spec:**
```json
{
  "spec_id": "SF_TRIM_CASING_DOOR_INT_REPAINT_v1",
  "adjacency_declarations": {
    "primary_surface": "door_casing",
    "adjacent_surfaces": [
      {
        "surface_id": "wall_field",
        "edge_type": "linear",
        "typical_relationship": "different_finish",
        "continuity_rate_modifier": 1.20
      },
      {
        "surface_id": "door_frame",
        "edge_type": "complex",
        "typical_relationship": "same_finish",
        "continuity_rate_modifier": 1.25
      }
    ]
  }
}
```

**Interior wall spec:**
```json
{
  "spec_id": "SF_DRYWALL_INT_REPAINT_v1",
  "adjacency_declarations": {
    "primary_surface": "wall_field",
    "adjacent_surfaces": [
      {
        "surface_id": "trim_baseboard",
        "edge_type": "linear",
        "typical_relationship": "different_finish",
        "continuity_rate_modifier": 1.15
      },
      {
        "surface_id": "trim_casing_door",
        "edge_type": "linear",
        "typical_relationship": "different_finish",
        "continuity_rate_modifier": 1.15
      },
      {
        "surface_id": "trim_casing_window",
        "edge_type": "linear",
        "typical_relationship": "different_finish",
        "continuity_rate_modifier": 1.15
      },
      {
        "surface_id": "trim_crown",
        "edge_type": "linear",
        "typical_relationship": "different_finish",
        "continuity_rate_modifier": 1.10
      },
      {
        "surface_id": "ceiling_field",
        "edge_type": "linear",
        "typical_relationship": "different_finish",
        "continuity_rate_modifier": 1.10
      }
    ]
  }
}
```

---

## 3. Project-Level: finish_groups

**File:** `Claude/specs/_schemas/project.schema.json` (new file)

**Purpose:** Define project-level configuration including finish group assignments

### Schema Definition

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "PaintFactor Project Configuration",
  "description": "Project-level configuration for estimation engine including finish groups",
  "type": "object",
  "properties": {
    "project_id": {
      "type": "string",
      "description": "Unique project identifier"
    },
    "project_name": {
      "type": "string",
      "description": "Human-readable project name"
    },
    "finish_groups": {
      "type": "object",
      "description": "Finish group assignments for continuity optimization",
      "additionalProperties": {
        "type": "object",
        "properties": {
          "group_id": {
            "type": "string",
            "description": "Unique identifier for this finish group",
            "pattern": "^FG_[A-Z0-9_]+$"
          },
          "name": {
            "type": "string",
            "description": "Human-readable name for this finish group"
          },
          "surfaces": {
            "type": "array",
            "items": {
              "type": "string"
            },
            "minItems": 1,
            "description": "Surface IDs assigned to this finish group"
          },
          "product_system": {
            "type": "string",
            "description": "Product system ID from material systems",
            "examples": ["SYS_ECONOMY_LATEX", "SYS_FF_STANDARD", "SYS_FF_PREMIUM"]
          },
          "sheen": {
            "type": "string",
            "enum": ["flat", "matte", "eggshell", "satin", "semi-gloss", "gloss"],
            "description": "Finish sheen level"
          },
          "color_id": {
            "type": "string",
            "description": "Color identifier from project color schedule"
          },
          "color_name": {
            "type": "string",
            "description": "Human-readable color name"
          }
        },
        "required": ["group_id", "surfaces", "product_system", "sheen", "color_id"],
        "additionalProperties": false
      }
    },
    "work_sequence": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "Ordered list of spec IDs defining work sequence for protection zone optimization"
    }
  },
  "required": ["project_id", "finish_groups"],
  "additionalProperties": true
}
```

### Example Project Configurations

**Economy project (all same):**
```json
{
  "project_id": "PRJ_2025_001",
  "project_name": "Smith Residence - Economy Repaint",
  "finish_groups": {
    "FG_MAIN": {
      "group_id": "FG_MAIN",
      "name": "Main Interior",
      "surfaces": [
        "wall_field",
        "ceiling_field",
        "trim_baseboard",
        "trim_casing_door",
        "trim_casing_window",
        "door_frame",
        "door_leaf_face",
        "door_leaf_edge"
      ],
      "product_system": "SYS_ECONOMY_LATEX",
      "sheen": "eggshell",
      "color_id": "SW7015",
      "color_name": "Repose Gray"
    }
  }
}
```

**Standard project (walls vs trim):**
```json
{
  "project_id": "PRJ_2025_002",
  "project_name": "Johnson Residence - Standard Repaint",
  "finish_groups": {
    "FG_WALLS": {
      "group_id": "FG_WALLS",
      "name": "Wall Color",
      "surfaces": ["wall_field"],
      "product_system": "SYS_PREMIUM_LATEX",
      "sheen": "eggshell",
      "color_id": "BM_OC17",
      "color_name": "White Dove"
    },
    "FG_TRIM": {
      "group_id": "FG_TRIM",
      "name": "Trim Color",
      "surfaces": [
        "trim_baseboard",
        "trim_casing_door",
        "trim_casing_window",
        "trim_crown",
        "door_frame",
        "door_leaf_face",
        "door_leaf_edge"
      ],
      "product_system": "SYS_FF_STANDARD",
      "sheen": "semi-gloss",
      "color_id": "SW7006",
      "color_name": "Extra White"
    },
    "FG_CEILING": {
      "group_id": "FG_CEILING",
      "name": "Ceiling",
      "surfaces": ["ceiling_field"],
      "product_system": "SYS_CEILING_FLAT",
      "sheen": "flat",
      "color_id": "CEIL_WHITE",
      "color_name": "Ceiling White"
    }
  }
}
```

---

## 4. Surface Vocabulary Reference

**File:** `Claude/specs/_schemas/surface_vocabulary.schema.json` (new file)

**Purpose:** Define valid surface IDs for validation

### Schema Definition

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Surface Vocabulary",
  "description": "Valid surface IDs for adjacency and finish group declarations",
  "definitions": {
    "surface_id": {
      "type": "string",
      "enum": [
        "wall_field",
        "wall_accent",
        "wall_panel",
        "ceiling_field",
        "ceiling_detail",
        "trim_baseboard",
        "trim_casing_door",
        "trim_casing_window",
        "trim_crown",
        "trim_chair_rail",
        "trim_wainscot_rail",
        "trim_shadow_box",
        "trim_panel_mold",
        "door_casing",
        "door_frame",
        "door_leaf_face",
        "door_leaf_edge",
        "door_stop",
        "window_casing",
        "window_jamb",
        "window_sash",
        "window_stool",
        "window_apron",
        "cabinet_face_frame",
        "cabinet_door",
        "cabinet_drawer",
        "cabinet_box_interior",
        "cabinet_end_panel",
        "builtin_carcass",
        "builtin_face",
        "builtin_shelf",
        "builtin_trim",
        "wainscot_panel",
        "wainscot_rail",
        "wainscot_stile",
        "wainscot_cap",
        "beam_wrap",
        "column_wrap",
        "mantel"
      ]
    }
  }
}
```

---

## 5. Implementation Checklist

### Schema Files to Create/Update

| File | Action | Priority |
|------|--------|----------|
| `sop_modules.schema.json` | Add `adjacency_metadata` property | High |
| `spec_definition.schema.json` | Add `adjacency_declarations` property | High |
| `project.schema.json` | Create new file | Medium |
| `surface_vocabulary.schema.json` | Create new file | Medium |

### Validation Script Updates

- [ ] Update `validate_specs.py` to validate `adjacency_metadata` on tasks
- [ ] Update `validate_specs.py` to validate `adjacency_declarations` on specs
- [ ] Create `validate_project.py` for project configuration validation
- [ ] Add surface vocabulary validation (surface IDs must be in vocabulary)

### Template Updates

- [ ] Update `sop_modules.json` template with `adjacency_metadata` example
- [ ] Update spec template with `adjacency_declarations` example
- [ ] Create `project.json` template

---

## 6. Backward Compatibility

All additions are **optional properties**:

- Existing specs without `adjacency_declarations` remain valid
- Existing tasks without `adjacency_metadata` remain valid
- Projects without `finish_groups` default to discontinuous (all edge masking applies)

**No breaking changes to existing schema validation.**

---

## 7. Future Considerations

### Hardware/Door Removal Optimization

The door system scenarios mention hardware removal and door removal as continuity alternatives. This could be modeled as:

```json
{
  "continuity_alternatives": {
    "door_hardware": {
      "options": ["mask", "remove_and_reinstall", "remove_and_replace_dummy"],
      "affects_continuity": true
    },
    "door_leaf": {
      "options": ["mask_in_place", "remove"],
      "affects_continuity": true
    }
  }
}
```

This is deferred for future implementation.

### Cross-Spec Task Merging

When full continuity is detected across an entire system (e.g., door casing + frame + leaf all same finish), the engine could potentially merge specs into a unified work order. This requires additional schema work and is deferred.
