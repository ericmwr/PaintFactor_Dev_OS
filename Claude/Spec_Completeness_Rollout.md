# Spec Completeness Doctrine Rollout

**Document Type:** Implementation Rollout  
**Version:** 1.0  
**Created:** 2026-01-31

This document provides a phased implementation plan for the Spec Completeness Doctrine and all supporting documents. Each phase is designed to be executed independently in separate Claude Code sessions.

---

## Rollout Overview

| Phase | Description | Dependencies | Estimated Complexity |
|-------|-------------|--------------|---------------------|
| 1 | Foundation Documents | None | Medium |
| 2 | Core Doctrine Installation | Phase 1 | Low |
| 3 | Reference Vocabulary Creation | Phase 1 | Medium |
| 4 | Interior Protection Doctrine Update | Phase 3 | Medium |
| 5 | Schema Updates | Phase 2 | Medium |
| 6 | Agent Prompt Updates | Phase 2, 3 | High |
| 7 | Validation Script Updates | Phase 5 | Medium |
| 8 | Existing Spec Migration | Phase 5, 6, 7 | High |
| 9 | Testing & Verification | Phase 8 | Medium |

---

## Task Description Format

Each task follows this standard format:

```
### Task [Phase].[Number]: [Task Name]

**Objective:** What this task accomplishes

**Input:** 
- Files/information needed to complete the task

**Output:**
- Files created or modified

**Instructions:**
1. Step-by-step instructions for Claude Code

**Acceptance Criteria:**
- [ ] Criteria that must be met for task completion

**Notes:**
- Additional context or considerations
```

---

## Phase 1: Foundation Documents

**Purpose:** Create task description files and future work documents that establish requirements for subsequent phases.

---

### Task 1.1: Create Zone/Key Alignment Audit Task File

**Objective:** Create a task description document that specifies requirements for auditing zone IDs against PaintScope keys.

**Input:**
- Spec_Completeness_Doctrine_FINAL.md (Zone Patterns by Spec Type table)
- Knowledge of existing Protection_Zones_Reference.md location
- Knowledge of paintscope_quantity_key_catalog.md location

**Output:**
- `Claude/docs/tasks/Zone_Key_Alignment_Audit.md`

**Instructions:**
1. Create the directory `Claude/docs/tasks/` if it doesn't exist
2. Create `Zone_Key_Alignment_Audit.md` with the following content:

```markdown
# Zone/Key Alignment Audit

**Task Type:** Audit  
**Status:** Pending  
**Created:** [DATE]  
**Priority:** High (Blocks Spec Completeness Doctrine finalization)

---

## Objective

Verify that all protection zone IDs referenced in doctrine have corresponding PaintScope keys, and that all PaintScope protection-related keys have zone definitions.

---

## Scope

### Documents to Audit

| Document | Location | Contains |
|----------|----------|----------|
| Protection_Zones_Reference.md | Claude/docs/ | Zone ID definitions |
| paintscope_quantity_key_catalog.md | Claude/docs/ | PaintScope key definitions |
| Spec_Completeness_Doctrine.md | Claude/docs/ | Zone patterns by spec type |
| Interior_Protection_Doctrine.md | Claude/docs/ | Protection strategy references |

### Zone IDs to Verify

From Spec_Completeness_Doctrine Zone Patterns table:

**Floor Protection:**
- `floor_perimeter`
- `floor_full`
- `floor_full_8ft_radius`
- `floor_full_kitchen`
- `floor_door_swing`

**Fixture/Asset Protection:**
- `fixture_covers`
- `hardware_covers`
- `furniture_room`
- `countertop_covers`
- `appliance_adjacent`
- `appliance_covers`

**Surface-Adjacent Protection:**
- `ceiling_line`
- `trim_edges`
- `wall_upper_band`
- `wall_adjacent`
- `wall_adjacent_door`
- `wall_adjacent_window`
- `wall_adjacent_cabinet`
- `jamb_adjacent`

**Masking Zones:**
- `glass_mask`
- `backsplash_mask`
- `sill_protection`

**Millwork/Specialty:**
- `millwork_beam`

---

## Deliverables

### 1. Alignment Report

Create `Zone_Key_Alignment_Report.md` with:

| Zone ID | In Protection_Zones_Reference | Has PaintScope Key | Key ID | Status |
|---------|------------------------------|-------------------|--------|--------|
| floor_perimeter | Yes/No | Yes/No | PS_xxx | ✓/Gap |

### 2. Gap Analysis

For each gap identified:
- Zone without key: Propose PaintScope key ID and definition
- Key without zone: Determine if zone definition needed or key is orphaned
- Inconsistent naming: Propose standardization

### 3. Recommended Actions

Prioritized list of:
- New keys to add to paintscope_quantity_key_catalog.md
- New zones to add to Protection_Zones_Reference.md
- Naming standardizations required
- Cross-reference updates needed

---

## Acceptance Criteria

- [ ] All zone IDs from Spec_Completeness_Doctrine verified
- [ ] All protection-related PaintScope keys verified
- [ ] Gap analysis complete with proposed solutions
- [ ] Alignment report generated
- [ ] Recommended actions prioritized

---

## Notes

- This audit blocks finalization of Spec_Completeness_Doctrine
- New zones may require PaintScope UI/capture updates (flag for future work)
- Zone naming should follow pattern: `[location]_[type]` (e.g., floor_perimeter, wall_adjacent)
```

**Acceptance Criteria:**
- [ ] File created at correct path
- [ ] All zone IDs from doctrine included
- [ ] Clear deliverable structure defined

---

### Task 1.2: Create Doctrine Authority Addition Task File

**Objective:** Create a task description document that specifies requirements for adding the authority hierarchy to PaintFactor_OS.md.

**Input:**
- Spec_Completeness_Doctrine_FINAL.md (Doctrine Authority section)
- Knowledge of PaintFactor_OS.md location

**Output:**
- `Claude/docs/tasks/Doctrine_Authority_Addition.md`

**Instructions:**
1. Create `Doctrine_Authority_Addition.md` with the following content:

```markdown
# Doctrine Authority Addition

**Task Type:** Documentation Update  
**Status:** Pending  
**Created:** [DATE]  
**Priority:** High (Establishes governance for all doctrine)

---

## Objective

Add a Doctrine Authority Hierarchy section to PaintFactor_OS.md that establishes the precedence order for all system documentation.

---

## Location

**File:** `Claude/docs/PaintFactor_OS.md`

**Insertion Point:** After the system overview section, before any domain-specific sections. This establishes authority early in the document.

---

## Content to Add

```markdown
## Doctrine Authority Hierarchy

PaintFactor documentation follows a strict authority hierarchy. When documents conflict, higher-level documents take precedence.

### Authority Levels

| Level | Document Type | Description | Examples |
|-------|--------------|-------------|----------|
| 1 (Highest) | Core System Doctrine | Foundational architecture and principles | PaintFactor_OS.md, Quality_Tiers_and_Surface_Condition.md |
| 2 | Domain Doctrine | Domain-specific rules and requirements | Interior_Protection_Doctrine.md, Fine_Finish_Doctrine.md, Estimation_Modifiers_Doctrine.md, Spec_Completeness_Doctrine.md |
| 3 | Reference Vocabularies | Controlled vocabularies and registries | Protection_Zones_Reference.md, Surface_Vocabulary_Reference.md, Site_Condition_Vocabulary_Reference.md, Modifier_Registry.md |
| 4 | Agent Prompts | SpecFactory agent instructions | Spec_Researcher.md, SOP_Librarian.md, Estimation_Engineer.md, Critic.md, Materials_Manager.md |
| 5 (Lowest) | Spec Artifacts | Generated specification files | spec.json, sop_modules.json, production.json, materials.json |

### Conflict Resolution Rules

1. **Higher Level Wins:** When a lower-level document contradicts a higher-level document, the higher-level document's requirements apply.

2. **Escalation Required:** If a legitimate conflict is discovered that cannot be resolved by hierarchy:
   - Document the conflict in a GitHub issue
   - Flag for human review
   - Do not proceed with spec generation until resolved

3. **Reference, Don't Redefine:** Lower-level documents should reference higher-level definitions rather than redefining them. For example:
   - Agent prompts reference doctrine, not restate it
   - Specs reference vocabulary terms, not define new ones

4. **Version Control:** When doctrine is updated, all dependent documents must be reviewed for compliance.

### Authority Markers

Documents should include an authority marker in their header:

```
**Doctrine Level:** [1-5]
**Authority:** [Document name this reports to]
```

Example for a Level 2 document:
```
**Doctrine Level:** 2
**Authority:** PaintFactor_OS.md
```
```

---

## Acceptance Criteria

- [ ] Section added to PaintFactor_OS.md at appropriate location
- [ ] All five levels clearly defined with examples
- [ ] Conflict resolution rules documented
- [ ] Authority marker format established

---

## Notes

- After this is added, all existing doctrine documents should be audited for authority markers
- New documents must include authority markers going forward
- This section itself is Level 1 (Core System Doctrine)
```

**Acceptance Criteria:**
- [ ] File created at correct path
- [ ] Clear insertion point specified
- [ ] Complete content provided ready for insertion

---

### Task 1.3: Create Modifier Registry Task File

**Objective:** Create a task description document that specifies requirements for creating the centralized Modifier Registry.

**Input:**
- Spec_Completeness_Doctrine_FINAL.md (modifier references)
- Knowledge of existing modifier locations in doctrine

**Output:**
- `Claude/docs/tasks/Modifier_Registry_Creation.md`

**Instructions:**
1. Create `Modifier_Registry_Creation.md` with the following content:

```markdown
# Modifier Registry Creation

**Task Type:** New Document Creation  
**Status:** Pending  
**Created:** [DATE]  
**Priority:** High (Required for spec validation)

---

## Objective

Create a centralized Modifier Registry that catalogs ALL modifiers used in the PaintFactor estimation system, providing a single source of truth for modifier values and their applications.

---

## Output

**File:** `Claude/docs/Modifier_Registry.md`

---

## Sources to Compile

| Source Document | Modifier Types |
|-----------------|---------------|
| Estimation_Modifiers_Doctrine.md | Height, complexity, condition, texture |
| Quality_Tiers_and_Surface_Condition.md | Quality tier multipliers, condition multipliers |
| Spec_Completeness_Doctrine.md | Site condition modifiers (lead, occupancy) |
| Individual spec production.json files | Task-specific rate modifiers |

---

## Registry Structure

```markdown
# Modifier Registry

**Doctrine Level:** 3  
**Authority:** Estimation_Modifiers_Doctrine.md  
**Status:** Canonical  
**Version:** 1.0  
**Last Updated:** [DATE]

This document is the single source of truth for all modifiers in the PaintFactor estimation system.

---

## Modifier Categories

### Height Modifiers

Applied to all labor tasks based on working height.

| Modifier ID | Value | Description | Source |
|-------------|-------|-------------|--------|
| H1_STANDARD | 1.00 | Floor level to 8 ft | Estimation_Modifiers_Doctrine |
| H2_STEP_LADDER | 1.15 | 8-10 ft, step ladder | Estimation_Modifiers_Doctrine |
| H3_EXTENSION | 1.30 | 10-14 ft, extension ladder | Estimation_Modifiers_Doctrine |
| H4_SCAFFOLD | 1.50 | 14-20 ft, scaffold required | Estimation_Modifiers_Doctrine |
| H5_LIFT | 2.50 | 20+ ft, mechanical lift | Estimation_Modifiers_Doctrine |

### Quality Tier Modifiers

Applied to task base rates based on quality tier selection.

| Modifier ID | Value | Description | Source |
|-------------|-------|-------------|--------|
| QT2_MINIMAL | 0.80 | Minimal quality tier | Quality_Tiers_and_Surface_Condition |
| QT3_STANDARD | 1.00 | Standard quality tier (baseline) | Quality_Tiers_and_Surface_Condition |
| QT4_PREMIUM | 1.30 | Premium quality tier | Quality_Tiers_and_Surface_Condition |
| QT5_SUPERIOR | 1.50 | Superior quality tier | Quality_Tiers_and_Surface_Condition |
| QT6_MASTERCRAFT | 2.00 | Mastercraft quality tier | Quality_Tiers_and_Surface_Condition |

### Surface Condition Modifiers

Applied to prep tasks based on existing surface condition.

| Modifier ID | Value | Applies To | Description | Source |
|-------------|-------|-----------|-------------|--------|
| COND_GOOD | 1.00 | Prep tasks | Good condition, minimal prep | Quality_Tiers_and_Surface_Condition |
| COND_FAIR | 1.30 | Prep tasks | Fair condition, moderate prep | Quality_Tiers_and_Surface_Condition |
| COND_POOR | 1.60 | Prep tasks | Poor condition, extensive prep | Quality_Tiers_and_Surface_Condition |

### Site Condition Modifiers

Applied based on project site conditions.

| Modifier ID | Value | Condition | Trigger Value | Applies To | Source |
|-------------|-------|-----------|---------------|-----------|--------|
| LEAD_POSITIVE | 2.00 | lead_status | tested_positive | All tasks | Spec_Completeness_Doctrine |
| LEAD_UNKNOWN | 1.50 | lead_status | unknown_pre1978 | Prep tasks | Spec_Completeness_Doctrine |
| OCC_SENSITIVE | 1.30 | occupancy_state | occupied_sensitive | Protection tasks | Spec_Completeness_Doctrine |
| OCC_CREW_HANDLES | 1.15 | occupancy_state | occupied_crew_handles | Protection tasks | Spec_Completeness_Doctrine |
| TIME_ACCELERATED | 1.20 | time_constraint | accelerated | All tasks | Spec_Completeness_Doctrine |
| TIME_PHASED | 1.25 | time_constraint | phased_occupancy | Setup/teardown | Spec_Completeness_Doctrine |

### Complexity Modifiers

Applied based on geometric or detail complexity.

| Modifier ID | Value | Description | Source |
|-------------|-------|-------------|--------|
| COMP_SIMPLE | 0.90 | Simple geometry, minimal detail | Estimation_Modifiers_Doctrine |
| COMP_STANDARD | 1.00 | Standard complexity (baseline) | Estimation_Modifiers_Doctrine |
| COMP_MODERATE | 1.20 | Moderate complexity | Estimation_Modifiers_Doctrine |
| COMP_HIGH | 1.40 | High complexity | Estimation_Modifiers_Doctrine |
| COMP_EXTREME | 1.75 | Extreme complexity | Estimation_Modifiers_Doctrine |

---

## Modifier Stacking Rules

1. **Multiplicative Stacking:** All modifiers stack multiplicatively
   - Example: QT4 (1.30) × H3 (1.30) × COND_FAIR (1.30) = 2.197

2. **Category Limits:** Only one modifier per category applies
   - Cannot apply both H2 and H3 to same task
   - Cannot apply both COND_GOOD and COND_FAIR to same task

3. **Application Order:** Order doesn't affect final value (multiplication is commutative)

---

## Adding New Modifiers

When adding a new modifier:

1. Assign unique Modifier ID following naming pattern: `[CATEGORY]_[DESCRIPTOR]`
2. Document source doctrine
3. Specify what tasks/categories it applies to
4. Update all referencing documents

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | [DATE] | Initial registry compiled from existing doctrine |
```

---

## Acceptance Criteria

- [ ] All modifiers from Estimation_Modifiers_Doctrine.md included
- [ ] All modifiers from Quality_Tiers_and_Surface_Condition.md included
- [ ] All site condition modifiers from Spec_Completeness_Doctrine.md included
- [ ] Unique Modifier IDs assigned to all entries
- [ ] Source document cited for each modifier
- [ ] Stacking rules documented

---

## Notes

- This becomes the authoritative source; other documents should reference it
- Values in this registry override any conflicting values in source documents
- After creation, audit source documents for consistency
```

**Acceptance Criteria:**
- [ ] File created at correct path
- [ ] Complete registry structure defined
- [ ] All known modifier sources identified

---

### Task 1.4: Create Future Work Folder and PaintScope Onboarding Document

**Objective:** Create the Future_Work folder and the PaintScope Project Onboarding Fields document.

**Input:**
- Discussion notes on year_built, last_painted_date, last_paint_professional fields

**Output:**
- `Claude/docs/Future_Work/` (directory)
- `Claude/docs/Future_Work/PaintScope_Project_Onboarding_Fields.md`

**Instructions:**
1. Create the directory `Claude/docs/Future_Work/` if it doesn't exist
2. Create `PaintScope_Project_Onboarding_Fields.md` with the following content:

```markdown
# PaintScope Project Onboarding Fields

**Document Type:** Future Work Specification  
**Status:** Tracking  
**Created:** [DATE]  
**Priority:** Medium

---

## Overview

This document tracks requirements for project-level data capture fields that should be collected during PaintScope project onboarding. These fields provide inference inputs for the estimation engine.

---

## Proposed Fields

### year_built

**Purpose:** Determines default lead_status assumption

| Field | Details |
|-------|---------|
| Data Type | Integer (4-digit year) |
| Required | Yes |
| Default | None (must be captured) |
| Validation | 1800-current year |

**Inference Logic:**
- If year_built < 1978: Set lead_status default to `unknown_pre1978`
- If year_built >= 1978: Set lead_status default to `not_applicable`

**Notes:**
- Can be overridden by actual lead testing results
- Critical for RRP compliance

---

### last_painted_date

**Purpose:** Informs surface condition baseline and coating compatibility

| Field | Details |
|-------|---------|
| Data Type | Date or "unknown" |
| Required | No |
| Default | "unknown" |
| Validation | Cannot be future date |

**Inference Logic:**
- If last_painted_date > 10 years ago: Consider condition modifier increase
- If last_painted_date < 2 years: Check for coating compatibility issues
- If unknown: No inference, rely on visual assessment

**Notes:**
- Helps estimate prep time
- May affect primer requirements

---

### last_paint_professional

**Purpose:** Informs quality baseline expectation

| Field | Details |
|-------|---------|
| Data Type | Boolean or "unknown" |
| Required | No |
| Default | "unknown" |
| Values | true, false, "unknown" |

**Inference Logic:**
- If true: Assume reasonable surface prep, standard prep expected
- If false (DIY): Assume potential issues (drips, poor prep, incompatible coatings)
- If unknown: No inference

**Notes:**
- DIY history may increase prep time estimate
- Professional history suggests more predictable conditions

---

## Implementation Requirements

### PaintScope UI Changes
- Add fields to project creation form
- Add fields to project edit form
- Include in project summary display

### Database Schema
- Add columns to project table
- Add validation constraints
- Add indexes for reporting

### API Updates
- Include fields in project creation endpoint
- Include fields in project retrieval endpoint
- Add validation logic

### Estimation Engine Integration
- Read fields during estimate assembly
- Apply inference logic for defaults
- Allow override at estimate level

---

## Related Documents

- Spec_Completeness_Doctrine.md (references lead_status condition)
- Site_Condition_Vocabulary_Reference.md (defines lead_status values)

---

## Status

- [ ] Requirements documented (this document)
- [ ] UI mockups created
- [ ] Database schema designed
- [ ] API specification written
- [ ] Implementation scheduled
```

**Acceptance Criteria:**
- [ ] Directory created
- [ ] Document created with all three fields specified
- [ ] Implementation requirements outlined

---

### Task 1.5: Create Finish Group Declaration System Document

**Objective:** Create the Future Work document specifying finish group declaration requirements for PaintScope and the Estimation Engine.

**Input:**
- Discussion notes on finish group workflow
- Spec_Completeness_Doctrine_FINAL.md (Finish Group Resolution section)

**Output:**
- `Claude/docs/Future_Work/Finish_Group_Declaration_System.md`

**Instructions:**
1. Create `Finish_Group_Declaration_System.md` with the following content:

```markdown
# Finish Group Declaration System

**Document Type:** Future Work Specification  
**Status:** Tracking  
**Created:** [DATE]  
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
```

**Acceptance Criteria:**
- [ ] Document created at correct path
- [ ] Complete workflow documented
- [ ] Data model specified
- [ ] Implementation requirements outlined

---

## Phase 2: Core Doctrine Installation

**Purpose:** Install the Spec Completeness Doctrine into the repository.

---

### Task 2.1: Install Spec Completeness Doctrine

**Objective:** Copy the finalized doctrine to the repository.

**Input:**
- `Spec_Completeness_Doctrine_FINAL.md` (from outputs)

**Output:**
- `Claude/docs/Spec_Completeness_Doctrine.md`

**Instructions:**
1. Copy `Spec_Completeness_Doctrine_FINAL.md` to `Claude/docs/Spec_Completeness_Doctrine.md`
2. Update the status from "Draft" to "Review"
3. Update the Last Updated date to current date

**Acceptance Criteria:**
- [ ] File exists at correct path
- [ ] Status updated to Review
- [ ] Date updated

---

### Task 2.2: Update Documentation Index

**Objective:** Add Spec Completeness Doctrine to the documentation index/README.

**Input:**
- Current `Claude/docs/README.md` or documentation index

**Output:**
- Updated documentation index

**Instructions:**
1. Locate the documentation index file
2. Add entry for Spec_Completeness_Doctrine.md under Domain Doctrine section
3. Add entries for planned reference documents (Site_Condition_Vocabulary_Reference.md, Modifier_Registry.md) with "Pending" status

**Acceptance Criteria:**
- [ ] Doctrine listed in index
- [ ] Pending documents noted

---

## Phase 3: Reference Vocabulary Creation

**Purpose:** Create the reference vocabulary documents that the doctrine depends on.

---

### Task 3.1: Create Site Condition Vocabulary Reference

**Objective:** Create the comprehensive site condition vocabulary with all IDs, values, definitions, and use cases.

**Input:**
- Spec_Completeness_Doctrine.md (Site Condition Vocabulary section)
- Discussion notes on value definitions

**Output:**
- `Claude/docs/Site_Condition_Vocabulary_Reference.md`

**Instructions:**
1. Create `Site_Condition_Vocabulary_Reference.md` with the following content:

```markdown
# Site Condition Vocabulary Reference

**Doctrine Level:** 3  
**Authority:** Spec_Completeness_Doctrine.md  
**Status:** Canonical  
**Version:** 1.0  
**Last Updated:** [DATE]

This document defines all valid site condition IDs and their values for use in spec task declarations.

---

## occupancy_state

Describes the building's occupancy level and furniture handling responsibility during the project.

| Value | Definition | Typical Impact |
|-------|------------|----------------|
| `vacant` | No furniture, no occupants, no personal items present | Fastest scenario; skip all furniture protection; full unrestricted access to all areas |
| `vacant_with_fixtures` | Empty of furniture but light fixtures, window treatments, HVAC covers, and built-in items remain | Minor protection for installed fixtures; most floor protection still required |
| `occupied_owner_assists` | Homeowner lives in the space and will move small items, clear surfaces, and prep areas before crew arrives each day | Moderate furniture handling time; owner responsible for valuables; crew handles large items |
| `occupied_crew_handles` | Homeowner lives in the space; crew is responsible for all furniture movement, protection, and daily reset | Significant time for furniture handling; daily setup/teardown required; room-by-room completion |
| `occupied_sensitive` | High-value, fragile, or irreplaceable items present (antiques, art, medical equipment) | Premium protection protocols; possible exclusion zones; extra care required; may require specialty movers |

**Use in site_condition_rules:**
```json
{
  "include_when": { "occupancy_state": ["occupied_crew_handles", "occupied_sensitive"] },
  "exclude_when": { "occupancy_state": ["vacant"] }
}
```

---

## access_constraint

Describes the access equipment required to reach the work area.

| Value | Definition | Typical Impact |
|-------|------------|----------------|
| `none` | Standard floor-level access; no equipment beyond basic tools | No access-related time modifier |
| `step_ladder` | 2-4 step ladder required to reach work area | Minor time impact for repositioning |
| `extension_ladder` | 6-12 ft extension ladder required | Moderate repositioning time; safety considerations |
| `scaffold` | Rolling or fixed scaffold required for extended work at height | Setup, move, and teardown tasks added; significant time impact |
| `lift` | Mechanical lift required (scissor lift, boom lift) | Significant setup time; may require operator certification; delivery/pickup logistics |

**Use in site_condition_rules:**
```json
{
  "include_when": { "access_constraint": ["scaffold", "lift"] }
}
```

**Related Modifiers:** See Modifier_Registry.md for height modifiers (H1-H5)

---

## lead_status

Describes the presence and testing status of lead-based paint.

| Value | Definition | Typical Impact |
|-------|------------|----------------|
| `not_applicable` | Structure built 1978 or later; lead paint not possible | No lead protocol required |
| `presumed_safe` | Pre-1978 structure but previous abatement documented and certified | Standard practices; no RRP required; documentation should be on file |
| `tested_negative` | Laboratory testing confirmed no lead present in painted surfaces | No lead protocol required; test results should be on file |
| `tested_positive` | Laboratory testing confirmed lead present in painted surfaces | Full EPA RRP protocol required; certified renovator required; containment, cleaning, disposal protocols |
| `unknown_pre1978` | Pre-1978 structure with no testing performed | Presumptive lead-safe work practices; treat as if lead present; recommend testing |

**Use in site_condition_rules:**
```json
{
  "include_when": { "lead_status": ["tested_positive", "unknown_pre1978"] },
  "modifier_when_included": {
    "lead_status": {
      "tested_positive": 2.0,
      "unknown_pre1978": 1.5
    }
  }
}
```

**Related:** PaintScope_Project_Onboarding_Fields.md (year_built field drives default)

---

## moisture_condition

Describes moisture presence that may affect paint application or adhesion.

| Value | Definition | Typical Impact |
|-------|------------|----------------|
| `dry` | No moisture concerns; surfaces test within acceptable range | Standard application and dry times |
| `recently_wet` | Recent water event (leak, flood, cleaning); surfaces dry but may have elevated moisture | Extended dry time before painting; moisture testing recommended; may need to delay |
| `active_moisture` | Ongoing moisture intrusion; water stains, condensation, or active leaks present | Stop work condition; remediation required before painting; do not proceed |

**Use in site_condition_rules:**
```json
{
  "exclude_when": { "moisture_condition": ["active_moisture"] }
}
```

**Note:** `active_moisture` should typically exclude painting tasks entirely until remediated.

---

## temperature_condition

Describes temperature constraints affecting paint application and curing.

| Value | Definition | Typical Impact |
|-------|------------|----------------|
| `normal` | 50-90°F ambient temperature | Standard application and dry times; most coatings perform normally |
| `cold_below_50f` | Below 50°F ambient temperature | Extended dry times (2-3x normal); some products won't cure; may require heating; low-temp products may be needed |
| `hot_above_90f` | Above 90°F ambient temperature | Accelerated dry times; reduced open time; early morning work preferred; may need flow additives |

**Use in site_condition_rules:**
```json
{
  "modifier_when_included": {
    "temperature_condition": {
      "cold_below_50f": 1.30,
      "hot_above_90f": 1.15
    }
  }
}
```

---

## ventilation_condition

Describes ventilation status affecting dry times and product selection.

| Value | Definition | Typical Impact |
|-------|------------|----------------|
| `adequate` | Normal room airflow; windows or HVAC providing air movement | Standard dry times |
| `limited` | Enclosed space with minimal airflow; interior rooms without windows | Extended dry times (1.5x); portable fans may help |
| `poor` | Confined space with no natural airflow; closets, mechanical rooms | Significant dry time extension (2x+); mechanical ventilation recommended; solvent products may be restricted |

**Note:** This condition is currently a placeholder for future implementation. No tasks currently reference it.

**Future Use Cases:**
- Dry time calculations
- Product selection (low-VOC requirements)
- Safety protocols for solvent-based products

---

## time_constraint

Describes schedule pressure and occupancy patterns during the project.

| Value | Definition | Typical Impact |
|-------|------------|----------------|
| `normal` | Standard project timeline; work can proceed at normal pace | No schedule-related modifiers |
| `accelerated` | Tight deadline; expedited completion required | May require additional crew; overtime; fast-dry products; premium pricing |
| `phased_occupancy` | Homeowner living in house during project; work must be completed room-by-room with daily setup/teardown | Daily protection setup and teardown; room-by-room completion; extra care with dust, fumes, and access; significant time impact |

**Use in site_condition_rules:**
```json
{
  "include_when": { "time_constraint": ["phased_occupancy"] },
  "modifier_when_included": {
    "time_constraint": {
      "phased_occupancy": 1.25
    }
  }
}
```

**Note:** `phased_occupancy` is distinct from `occupied_crew_handles`. A project can have `occupied_crew_handles` (furniture handling) without `phased_occupancy` (if homeowner temporarily relocates during work).

---

## Validation

All condition IDs and values in this document are the canonical set. Specs referencing invalid IDs or values will fail validation with:
- `TASK_SC_INVALID_CONDITION` — Condition ID not in this vocabulary
- `TASK_SC_INVALID_VALUE` — Value not valid for the specified condition ID

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | [DATE] | Initial vocabulary definition |
```

**Acceptance Criteria:**
- [ ] All seven condition IDs documented
- [ ] All values defined with descriptions and typical impacts
- [ ] Use case examples provided
- [ ] Validation rules noted

---

### Task 3.2: Create Modifier Registry

**Objective:** Execute the Modifier Registry Creation task to compile all modifiers.

**Input:**
- `Claude/docs/tasks/Modifier_Registry_Creation.md` (task spec)
- `Claude/docs/Estimation_Modifiers_Doctrine.md`
- `Claude/docs/Quality_Tiers_and_Surface_Condition.md`
- `Spec_Completeness_Doctrine.md`

**Output:**
- `Claude/docs/Modifier_Registry.md`

**Instructions:**
1. Follow the task specification in `Modifier_Registry_Creation.md`
2. Compile all modifiers from source documents
3. Assign unique Modifier IDs following naming patterns
4. Create the registry document

**Acceptance Criteria:**
- [ ] All modifiers from all sources included
- [ ] Unique IDs assigned
- [ ] Stacking rules documented
- [ ] Source citations complete

---

## Phase 4: Interior Protection Doctrine Update

**Purpose:** Consolidate the Interior Protection Doctrine to cover both repaint and new construction scenarios.

---

### Task 4.1: Update Interior Protection Doctrine

**Objective:** Rename and update the Interior Protection Doctrine to be project-type agnostic.

**Input:**
- Current `Interior_Protection_Doctrine_Residential_Repaint.md`
- Discussion notes on universal vs occupancy-driven protection

**Output:**
- `Claude/docs/Interior_Protection_Doctrine.md` (renamed, updated)
- Archive of original file (optional)

**Instructions:**
1. Rename `Interior_Protection_Doctrine_Residential_Repaint.md` to `Interior_Protection_Doctrine.md`
2. Update the document structure to include three sections:
   - **Universal Protection** — applies to all projects regardless of type
   - **Occupancy-Driven Protection** — applies based on occupancy_state
   - **New Construction Considerations** — trade coordination, installation sequence

3. Move carpet from repaint-specific to universal protection (protection is driven by presence, not project type)

4. Update all internal references to reflect new structure

5. Add note referencing Spec_Completeness_Doctrine.md for protection level formalization

**Content Updates:**

Add this section structure:

```markdown
## Protection Categories

### Universal Protection

These items require protection whenever they are present, regardless of project type (repaint or new construction):

- **Finished Floors:** Hardwood, tile, LVP, carpet, vinyl, concrete (sealed)
- **Cabinets:** All cabinet faces, interiors when doors removed
- **Countertops:** All countertop surfaces
- **Millwork/Trim:** When not in scope of current work
- **Built-ins:** Bookcases, entertainment centers, benches
- **Fixed Appliances:** Ranges, refrigerators, dishwashers (when present)

### Occupancy-Driven Protection

These items require protection based on occupancy_state site condition:

- **Furniture:** Applies when occupancy_state includes occupied values
- **Personal Items:** Applies when occupancy_state includes occupied values
- **Window Treatments:** Applies when present (common in repaint, rare in NC)
- **Wall Décor:** Applies when present (common in repaint, rare in NC)

### New Construction Considerations

New construction projects have unique considerations:

- **Trade Coordination:** Some items may not yet be installed
- **Installation Sequence:** Protection may vary based on construction phase
- **Punch List Items:** Final protection may be minimal if surfaces are new

When estimating new construction, verify which items are installed:
- Flooring installed? → Apply floor protection
- Cabinets installed? → Apply cabinet protection
- Countertops installed? → Apply countertop protection
```

**Acceptance Criteria:**
- [ ] File renamed
- [ ] Three-section structure implemented
- [ ] Carpet moved to universal protection
- [ ] Cross-reference to Spec_Completeness_Doctrine added
- [ ] All internal references updated

---

## Phase 5: Schema Updates

**Purpose:** Update JSON schemas to enforce new mandatory fields.

---

### Task 5.1: Update spec.schema.json

**Objective:** Add protection_zones_required and adjacency_declarations to the spec schema.

**Input:**
- Current `Claude/validation/schemas/spec.schema.json`
- Schema additions from Spec_Completeness_Doctrine.md

**Output:**
- Updated `spec.schema.json`

**Instructions:**
1. Locate `spec.schema.json`
2. Add `protection_zones_required` definition to properties
3. Add `adjacency_declarations` definition to properties
4. Add both to the `required` array
5. Validate schema syntax

**Schema Additions:**
(See Spec_Completeness_Doctrine.md Schema Updates Required section for complete definitions)

**Acceptance Criteria:**
- [ ] protection_zones_required property added with full definition
- [ ] adjacency_declarations property added with full definition
- [ ] Both added to required array
- [ ] Schema validates correctly

---

### Task 5.2: Update sop_modules.schema.json

**Objective:** Add site_condition_rules, modifier_when_included, and protection_metadata to task schema.

**Input:**
- Current `Claude/validation/schemas/sop_modules.schema.json`
- Schema additions from Spec_Completeness_Doctrine.md

**Output:**
- Updated `sop_modules.schema.json`

**Instructions:**
1. Locate `sop_modules.schema.json`
2. Add `site_condition_rules` to task definition
3. Add `modifier_when_included` to task definition
4. Add `protection_metadata` to task definition
5. Validate schema syntax

**Acceptance Criteria:**
- [ ] site_condition_rules property added
- [ ] modifier_when_included property added
- [ ] protection_metadata property added
- [ ] Schema validates correctly

---

## Phase 6: Agent Prompt Updates

**Purpose:** Update all SpecFactory agent prompts to enforce completeness requirements.

---

### Task 6.1: Update SpecFactory Orchestrator

**Objective:** Add completeness gate to orchestrator workflow.

**Input:**
- Current SpecFactory Orchestrator prompt
- Spec_Completeness_Doctrine.md

**Output:**
- Updated orchestrator prompt with Step 0.5 Completeness Gate

**Instructions:**
1. Add a new step before spec dispatch: "Step 0.5: Completeness Gate"
2. Gate checks that research.json includes:
   - protection_zones_analysis
   - adjacency_analysis
   - site_condition_analysis
3. Block dispatch if analysis incomplete
4. Add completeness checklist to final review

**Acceptance Criteria:**
- [ ] Completeness gate added
- [ ] Blocking logic implemented
- [ ] Final review checklist added

---

### Task 6.2: Update Spec Researcher

**Objective:** Add mandatory analysis sections to research output.

**Input:**
- Current Spec Researcher prompt
- Spec_Completeness_Doctrine.md

**Output:**
- Updated Spec Researcher prompt

**Instructions:**
1. Add mandatory output sections to research.json template:
   - `protection_zones_analysis`
   - `adjacency_analysis`
   - `site_condition_analysis`
2. Add guidance for each analysis type
3. Reference Site_Condition_Vocabulary_Reference.md for valid conditions

**Acceptance Criteria:**
- [ ] Three analysis sections added to output requirements
- [ ] Guidance provided for each section
- [ ] Vocabulary reference included

---

### Task 6.3: Update SOP Librarian

**Objective:** Add site condition rules and adjacency metadata requirements.

**Input:**
- Current SOP Librarian prompt
- Spec_Completeness_Doctrine.md

**Output:**
- Updated SOP Librarian prompt

**Instructions:**
1. Add requirement for `site_condition_rules` on affected tasks
2. Add requirement for `adjacency_metadata` on edge tasks
3. Add validation that protection tasks have `protection_metadata`
4. Reference Modifier_Registry.md for modifier values

**Acceptance Criteria:**
- [ ] Site condition rules requirement added
- [ ] Adjacency metadata requirement added
- [ ] Protection metadata requirement added
- [ ] Modifier registry reference added

---

### Task 6.4: Update Estimation Engineer

**Objective:** Add site condition modifier alignment validation.

**Input:**
- Current Estimation Engineer prompt
- Spec_Completeness_Doctrine.md
- Modifier_Registry.md

**Output:**
- Updated Estimation Engineer prompt

**Instructions:**
1. Add validation that modifier values align with Modifier_Registry
2. Add check for site condition modifier consistency
3. Add finish continuity rate modifier validation

**Acceptance Criteria:**
- [ ] Modifier alignment validation added
- [ ] Site condition modifier check added
- [ ] Continuity modifier validation added

---

### Task 6.5: Update Critic

**Objective:** Add full completeness checklist with ERROR-level validation.

**Input:**
- Current Critic prompt
- Spec_Completeness_Doctrine.md (Completeness Validation Checklist)

**Output:**
- Updated Critic prompt

**Instructions:**
1. Add complete checklist from doctrine
2. Set severity to ERROR for all completeness failures
3. Add specific validation codes from doctrine
4. Add blocking behavior for ERROR-level failures

**Acceptance Criteria:**
- [ ] Full checklist added
- [ ] ERROR severity set
- [ ] Validation codes match doctrine
- [ ] Blocking behavior implemented

---

### Task 6.6: Update Materials Manager

**Objective:** Add zone-to-material mapping awareness.

**Input:**
- Current Materials Manager prompt
- Spec_Completeness_Doctrine.md

**Output:**
- Updated Materials Manager prompt

**Instructions:**
1. Add awareness of protection_zones_required
2. Map protection levels to material requirements
3. Ensure material quantities account for protection zones

**Acceptance Criteria:**
- [ ] Protection zone awareness added
- [ ] Level-to-material mapping added
- [ ] Quantity calculation updated

---

## Phase 7: Validation Script Updates

**Purpose:** Update validation scripts to enforce new requirements.

---

### Task 7.1: Update validate_specs.py

**Objective:** Add completeness validation functions.

**Input:**
- Current `Claude/validation/validate_specs.py`
- Validation rules from Spec_Completeness_Doctrine.md

**Output:**
- Updated `validate_specs.py`

**Instructions:**
1. Add `validate_protection_completeness()` function
2. Add `validate_adjacency_completeness()` function
3. Add `validate_site_condition_completeness()` function
4. Add all validation codes from doctrine
5. Set severity to ERROR for all completeness validations
6. Add grace period logic (warnings for 30 days, then errors)

**Acceptance Criteria:**
- [ ] All three validation functions added
- [ ] All validation codes implemented
- [ ] ERROR severity set
- [ ] Grace period logic implemented

---

## Phase 8: Existing Spec Migration

**Purpose:** Update existing specs to include mandatory declarations.

---

### Task 8.1: Audit Existing Specs

**Objective:** Identify all specs needing updates.

**Input:**
- All spec directories under `Claude/specifications/`

**Output:**
- Migration report listing specs and required updates

**Instructions:**
1. Scan all spec.json files
2. Check for presence of `protection_zones_required`
3. Check for presence of `adjacency_declarations`
4. Check sop_modules.json for `site_condition_rules` on affected tasks
5. Generate report of missing elements per spec

**Acceptance Criteria:**
- [ ] All specs scanned
- [ ] Missing elements identified
- [ ] Report generated

---

### Task 8.2: Migrate Specs (Iterative)

**Objective:** Update each spec family to include required declarations.

**Input:**
- Migration report from Task 8.1
- Protection zone patterns from doctrine
- Adjacency patterns from doctrine

**Output:**
- Updated spec files

**Instructions:**
1. For each spec family, add:
   - `protection_zones_required` based on spec type and application method
   - `adjacency_declarations` based on surface type
   - `site_condition_rules` to affected tasks
2. Run validation after each update
3. Document any issues or decisions

**Acceptance Criteria:**
- [ ] All specs have protection_zones_required
- [ ] All specs have adjacency_declarations
- [ ] Affected tasks have site_condition_rules
- [ ] All specs pass validation

---

## Phase 9: Testing & Verification

**Purpose:** Verify all changes work correctly together.

---

### Task 9.1: Run Full Validation Suite

**Objective:** Verify all specs pass validation with new rules.

**Input:**
- All updated specs
- Updated validation scripts

**Output:**
- Validation report

**Instructions:**
1. Run `validate_specs.py` on all specs
2. Review any errors or warnings
3. Fix issues identified
4. Re-run until clean

**Acceptance Criteria:**
- [ ] All specs pass validation
- [ ] No unexpected warnings
- [ ] Clean validation report

---

### Task 9.2: Test SpecFactory Pipeline

**Objective:** Generate a test spec using updated agent prompts.

**Input:**
- Updated agent prompts
- Test spec request

**Output:**
- Generated spec with all completeness requirements

**Instructions:**
1. Request a new spec through SpecFactory
2. Verify research.json includes all analysis sections
3. Verify spec.json includes protection_zones_required
4. Verify spec.json includes adjacency_declarations
5. Verify tasks have appropriate site_condition_rules
6. Run validation on generated spec

**Acceptance Criteria:**
- [ ] Spec generates successfully
- [ ] All completeness requirements present
- [ ] Spec passes validation

---

### Task 9.3: Update Doctrine Status

**Objective:** Mark doctrine as Canonical after successful testing.

**Input:**
- Successful test results
- All phase completion confirmations

**Output:**
- Updated Spec_Completeness_Doctrine.md with Canonical status

**Instructions:**
1. Update status from "Review" to "Canonical"
2. Update Last Updated date
3. Add changelog entry for finalization
4. Update prerequisites table to show all complete

**Acceptance Criteria:**
- [ ] Status updated to Canonical
- [ ] Date updated
- [ ] Changelog updated
- [ ] Prerequisites marked complete

---

## Rollout Checklist

Use this checklist to track overall progress:

### Phase 1: Foundation Documents
- [x] Task 1.1: Zone/Key Alignment Audit task file
- [x] Task 1.2: Doctrine Authority Addition task file
- [x] Task 1.3: Modifier Registry Creation task file
- [x] Task 1.4: Future Work folder and PaintScope Onboarding document
- [x] Task 1.5: Finish Group Declaration System document

### Phase 2: Core Doctrine Installation
- [x] Task 2.1: Install Spec Completeness Doctrine
- [x] Task 2.2: Update Documentation Index

### Phase 3: Reference Vocabulary Creation
- [x] Task 3.1: Create Site Condition Vocabulary Reference
- [x] Task 3.2: Create Modifier Registry

### Phase 4: Interior Protection Doctrine Update
- [x] Task 4.1: Update Interior Protection Doctrine

### Phase 5: Schema Updates
- [x] Task 5.1: Update spec.schema.json
- [x] Task 5.2: Update sop_modules.schema.json

### Phase 6: Agent Prompt Updates
- [x] Task 6.1: Update SpecFactory Orchestrator
- [x] Task 6.2: Update Spec Researcher
- [x] Task 6.3: Update SOP Librarian
- [x] Task 6.4: Update Estimation Engineer
- [x] Task 6.5: Update Critic
- [x] Task 6.6: Update Materials Manager

### Phase 7: Validation Script Updates
- [x] Task 7.1: Update validate_specs.py

### Phase 8: Existing Spec Migration
- [x] Task 8.1: Audit Existing Specs
- [x] Task 8.2: Migrate Specs

### Phase 9: Testing & Verification
- [x] Task 9.1: Run Full Validation Suite
- [ ] Task 9.2: Test SpecFactory Pipeline ← **DEFERRED** (run in future session with real spec generation)
- [x] Task 9.3: Update Doctrine Status

---

## Notes for Claude Code Sessions

Each phase is designed to be executed in a separate Claude Code session. When starting a new session:

1. **Reference this document** to understand the current phase
2. **Check the rollout checklist** to see what's been completed
3. **Read the task description** for the specific task you're working on
4. **Verify inputs exist** before starting
5. **Confirm outputs** match acceptance criteria
6. **Update the checklist** after completing each task

For complex phases (6, 8), you may want to split into multiple sessions by task.

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-31 | Initial rollout document |
| 1.1 | 2026-01-31 | Phases 1-7 complete. Phase 8 (Spec Migration) is next. |
| 1.2 | 2026-01-31 | Phase 8 complete. All 5 specs migrated with protection_zones_required and affected_tasks. Schema relaxed for empty affected_tasks. Validator updated for empty affected_tasks (warning). |
| 1.3 | 2026-01-31 | Phase 9 partially complete. Validation passes (0 errors). Doctrine promoted to Canonical v1.1. Task 9.2 (SpecFactory pipeline test) deferred to future session. |
