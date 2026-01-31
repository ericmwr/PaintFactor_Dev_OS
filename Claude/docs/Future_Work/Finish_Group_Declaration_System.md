# Finish Group Declaration System

**Document Type:** Future Work Specification
**Status:** Tracking
**Created:** 2026-01-31
**Priority:** High (Required for Finish Continuity optimization)

---

## Overview

This document specifies requirements for the Finish Group Declaration System, which enables finish continuity optimization in the estimation engine. Finish groups allow the engine to determine when adjacent surfaces share the same color/sheen and can skip certain edge work tasks.

---

## Problem Statement

The Spec_Completeness_Doctrine requires that the estimation engine can:
1. Look up finish group membership for any surface
2. Determine if adjacent surfaces share a finish group
3. Apply skip/include rules based on finish group matches

Currently, no system exists to declare or store finish group assignments.

---

## Workflow Requirements

### Timing of Finish Group Declaration

| Stage | What's Known | Finish Group Status |
|-------|--------------|---------------------|
| Initial walkthrough | Surfaces in scope | Not declared |
| Estimate creation | Scope defined | **Groups declared by contractor** |
| Proposal review | Quality tier selected | Groups locked for estimate |
| Project awarded | Scope locked | Groups confirmed |
| Color selection (client portal) | Specific colors chosen | Colors assigned to groups |
| Pre-production | Everything confirmed | Final validation |

**Key Insight:** Finish groups are known at estimate time based on SCOPE (what surfaces get the same vs different finish), NOT based on specific colors. The contractor knows "all walls and ceilings will match" before they know the specific color code.

---

## Data Model

### Finish Group Declaration (at estimate time)

```json
{
  "project_id": "uuid",
  "finish_groups": [
    {
      "group_id": "FG_WALLS_CEILINGS",
      "surfaces": ["wall_field", "ceiling_field"],
      "description": "All walls and ceilings match",
      "sheen": null
    },
    {
      "group_id": "FG_TRIM",
      "surfaces": ["trim_baseboard", "trim_casing", "trim_crown", "door_casing"],
      "description": "All trim same color",
      "sheen": "semi-gloss"
    },
    {
      "group_id": "FG_DOORS",
      "surfaces": ["door_slab"],
      "description": "Door slabs - may match trim or accent",
      "sheen": null
    }
  ],
  "declared_by": "contractor_user_id",
  "declared_at": "timestamp"
}
```

### Color Assignment (at color selection time)

```json
{
  "project_id": "uuid",
  "color_assignments": [
    {
      "finish_group": "FG_WALLS_CEILINGS",
      "color_code": "SW7029",
      "color_name": "Agreeable Gray",
      "sheen": "eggshell"
    },
    {
      "finish_group": "FG_TRIM",
      "color_code": "SW7006",
      "color_name": "Extra White",
      "sheen": "semi-gloss"
    },
    {
      "finish_group": "FG_DOORS",
      "color_code": "SW7006",
      "color_name": "Extra White",
      "sheen": "semi-gloss"
    }
  ],
  "selected_by": "client_user_id",
  "selected_at": "timestamp"
}
```

### Engine Inference

After color selection, engine can infer:
- FG_TRIM and FG_DOORS have same color + sheen → Could merge for optimization
- FG_WALLS_CEILINGS has different color than FG_TRIM → Different finish, cut-in required

---

## Implementation Requirements

### PaintScope Changes

1. **Estimate Configuration UI:**
   - Add finish group declaration interface
   - Allow grouping of surfaces being painted
   - Auto-suggest based on common patterns (walls+ceilings, all trim)

2. **Surface-to-Group Validation:**
   - Every painted surface must belong to exactly one finish group
   - Surfaces not in scope don't need group assignment

### Client Portal Changes

1. **Color Selection UI:**
   - Display finish groups with their surfaces
   - Allow color/sheen selection per group
   - Show preview of which surfaces will get which color

2. **Color Schedule Output:**
   - Generate printable color schedule from selections
   - Include surface lists per color

### Estimation Engine Changes

1. **Finish Group Lookup:**
   ```
   FUNCTION get_finish_group(surface_id, project_id):
     RETURN finish_group_id WHERE surface_id IN finish_groups.surfaces
   ```

2. **Finish Continuity Check:**
   ```
   FUNCTION surfaces_share_finish(surface_a, surface_b, project_id):
     group_a = get_finish_group(surface_a, project_id)
     group_b = get_finish_group(surface_b, project_id)
     RETURN group_a == group_b
   ```

3. **Task Skip/Include Logic:**
   - When assembling estimate, check finish group matches
   - Apply skip_when and required_when rules from adjacency_metadata

### Database Schema

```sql
CREATE TABLE finish_groups (
  id UUID PRIMARY KEY,
  project_id UUID REFERENCES projects(id),
  group_id VARCHAR(50) NOT NULL,
  description TEXT,
  default_sheen VARCHAR(20),
  created_at TIMESTAMP,
  created_by UUID REFERENCES users(id)
);

CREATE TABLE finish_group_surfaces (
  finish_group_id UUID REFERENCES finish_groups(id),
  surface_id VARCHAR(50) NOT NULL,
  PRIMARY KEY (finish_group_id, surface_id)
);

CREATE TABLE color_assignments (
  id UUID PRIMARY KEY,
  project_id UUID REFERENCES projects(id),
  finish_group_id UUID REFERENCES finish_groups(id),
  color_code VARCHAR(20),
  color_name VARCHAR(100),
  sheen VARCHAR(20),
  assigned_at TIMESTAMP,
  assigned_by UUID REFERENCES users(id)
);
```

---

## Validation Rules

1. **At Estimate Creation:**
   - All painted surfaces must have finish group assignment
   - Each surface can only belong to one group
   - At least one finish group must exist

2. **At Color Selection:**
   - All finish groups must have color assigned before production
   - Sheen must be valid for surface type

3. **At Estimate Assembly:**
   - Warn if finish groups have same color (could merge)
   - Error if painted surface has no finish group

---

## Related Documents

- Spec_Completeness_Doctrine.md (defines finish continuity resolution logic)
- Surface_Vocabulary_Reference.md (valid surface IDs)

---

## Status

- [ ] Requirements documented (this document)
- [ ] Data model finalized
- [ ] PaintScope UI designed
- [ ] Client portal UI designed
- [ ] Database schema implemented
- [ ] Engine integration complete
- [ ] Testing complete
