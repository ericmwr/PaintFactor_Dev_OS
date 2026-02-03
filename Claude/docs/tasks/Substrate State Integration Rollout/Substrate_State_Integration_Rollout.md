# Substrate State Integration Rollout

**Status:** COMPLETE
**Version:** 1.2.0
**Created:** 2026-02-03
**Updated:** 2026-02-03
**Purpose:** Implementation plan for integrating Substrate State as a first-class configuration dimension

---

## 1. Overview

This rollout adds Substrate State as a configuration dimension alongside Quality Tier, Application Method, and other existing dimensions. This enables:

- Dynamic protection calculation based on adjacent surface states
- Prerequisite validation (can't paint before prime)
- State upgrade tracking through spec execution
- Sequence comparison for project optimization

---

## 2. New Documents to Add

### 2.1 Reference Document

| Document | Location | Purpose |
|----------|----------|---------|
| `Substrate_State_Reference.md` | `docs/Reference/` | Vocabulary of SS_* state IDs, sub-states, modifiers, declaration format |

**Action:** Move from staging to `Claude/docs/Reference/Substrate_State_Reference.md`

### 2.2 Architecture Document

| Document | Location | Purpose |
|----------|----------|---------|
| `Engine_State_Coordination_Architecture.md` | `docs/System/` | How specs, database, and engine coordinate on state tracking |

**Action:** Move from staging to `Claude/docs/System/Engine_State_Coordination_Architecture.md`

---

## 3. Existing Documents to Update

### 3.1 Doctrine Updates

| Document | Location | Update Required |
|----------|----------|-----------------|
| `Modifier_Registry.md` | `docs/Doctrine/` | Add substrate state modifier values (Section 5.1 of Substrate_State_Reference) |
| `Spec_Completeness_Doctrine.md` | `docs/Doctrine/` | Add state_declarations to mandatory spec elements |
| `Quality_Tiers_and_Surface_Condition.md` | `docs/Doctrine/` | Add cross-reference to Substrate_State_Reference, clarify distinction between Condition and State |

### 3.2 Reference Updates

| Document | Location | Update Required |
|----------|----------|-----------------|
| `docs/README.md` | `docs/` | Add new documents to index |

### 3.3 System Updates

| Document | Location | Update Required |
|----------|----------|-----------------|
| `PaintFactor_OS.md` | `docs/System/` | Reference Engine_State_Coordination_Architecture in system layers |

---

## 4. Schema Updates

### 4.1 spec.schema.json

**Location:** `specs/_schemas/spec.schema.json`

**Add:** `state_declarations` object to required properties

#### Protection Level Enum Distinction

**IMPORTANT:** The `adjacent_state_protection_rules.protection_level` uses a **different enum** than `protection_zones_required.protection_level`:

| System | Enum Values | Purpose |
|--------|-------------|---------|
| `protection_zones_required` | `edge_only`, `partial_cover`, `full_cover` | Physical area coverage (floor, fixtures) |
| `adjacent_state_protection_rules` | `none`, `light_mask`, `full_mask`, `full_cover` | Masking intensity for adjacent finished surfaces |

**Rationale:** These enums serve different purposes:
- **Protection zones** describe *how much physical area* to protect (perimeter vs full room)
- **Adjacent state protection** describes *masking intensity* based on whether adjacent surfaces are finished (no mask vs tape-only vs tape+paper/plastic vs full enclosure)

Both systems may coexist in the same spec — protection zones handle floor/fixture coverage while adjacent state rules handle finished surface masking.

```json
{
  "state_declarations": {
    "type": "object",
    "required": ["primary_surface", "valid_input_states", "output_state"],
    "properties": {
      "primary_surface": {
        "type": "string",
        "description": "Surface ID from Surface_Vocabulary_Reference"
      },
      "valid_input_states": {
        "type": "object",
        "required": ["states"],
        "properties": {
          "states": {
            "type": "array",
            "items": { "type": "string", "pattern": "^SS_" },
            "minItems": 1
          },
          "notes": { "type": "string" }
        }
      },
      "output_state": {
        "type": "object",
        "required": ["state"],
        "properties": {
          "state": { "type": "string", "pattern": "^SS_" },
          "varies_by": { "type": "string" },
          "state_map": {
            "type": "object",
            "additionalProperties": { "type": "string", "pattern": "^SS_" }
          },
          "notes": { "type": "string" }
        }
      },
      "adjacent_state_protection_rules": {
        "type": "array",
        "items": {
          "type": "object",
          "required": ["adjacent_surface", "when_state", "protection_level"],
          "properties": {
            "adjacent_surface": { "type": "string" },
            "when_state": {
              "type": "array",
              "items": { "type": "string", "pattern": "^SS_" }
            },
            "protection_zone": { "type": ["string", "null"] },
            "protection_level": {
              "type": "string",
              "enum": ["none", "light_mask", "full_mask", "full_cover"]
            },
            "notes": { "type": "string" }
          }
        }
      }
    }
  }
}
```

### 4.2 Spec Template Update

**Location:** `specs/_templates/spec.json`

**Add:** `state_declarations` section with placeholder structure

---

## 5. Agent Updates

### 5.1 spec-researcher.md

**Location:** `agents/spec-researcher.md`

**Updates:**
- Add `Substrate_State_Reference.md` to reference documents list
- Add research requirement: "Identify valid input states for primary surface"
- Add research requirement: "Identify output state produced by this spec"
- Add guidance for adjacent state protection analysis

**New Section to Add:**

```markdown
### State Analysis (MANDATORY)

For every spec, research must identify:

1. **Valid Input States** — What substrate states can this spec operate on?
   - Reference: Substrate_State_Reference.md Section 2-3
   - Example: Prime specs accept SS_BARE; Paint specs accept SS_PRIMED

2. **Output State** — What state does this spec leave the surface in?
   - May vary by configuration (e.g., sheen affects output state)
   - Example: Wall paint outputs SS_PAINTED_FLAT or SS_PAINTED_SATIN depending on sheen config

3. **Adjacent State Protection Rules** — What protection is needed based on adjacent surface states?
   - Reference: Substrate_State_Reference.md Section 10
   - Example: If adjacent wall is SS_PAINTED, require full_mask for trim spray
```

### 5.2 sop-librarian.md

**Location:** `agents/sop-librarian.md`

**Updates:**
- Add reference to Substrate_State_Reference.md
- Add guidance: Tasks may have `substrate_state_rules` for conditional inclusion

### 5.3 estimation-engineer.md

**Location:** `agents/estimation-engineer.md`

**Updates:**
- Add reference to Substrate_State_Reference.md Section 5 (modifiers)
- Add guidance: Substrate state modifiers apply to prep tasks

### 5.4 critic.md

**Location:** `agents/critic.md`

**Updates:**
- Add validation rules for state_declarations
- Add reference document to list

**New Validation Rules:**

```markdown
### State Declaration Validation (SCD_STATE_*)

- `SCD_STATE_DECL_PRESENT` — spec.json has state_declarations object (ERROR if missing)
- `SCD_STATE_PRIMARY_VALID` — primary_surface exists in Surface_Vocabulary_Reference (ERROR if invalid)
- `SCD_STATE_INPUT_VALID` — All valid_input_states are valid SS_* IDs (ERROR if invalid)
- `SCD_STATE_OUTPUT_VALID` — output_state is valid SS_* ID (ERROR if invalid)
- `SCD_STATE_ADJ_SURFACES_VALID` — Adjacent surfaces in rules exist in Surface_Vocabulary_Reference (ERROR if invalid)
- `SCD_STATE_ADJ_STATES_VALID` — when_state values are valid SS_* IDs (ERROR if invalid)
- `SCD_STATE_PROTECTION_LEVELS_VALID` — protection_level values are valid enum (ERROR if invalid)
```

### 5.5 specfactory-orchestrator.md

**Location:** `agents/specfactory-orchestrator.md`

**Updates:**
- Add state_declarations to spec artifact checklist
- Add validation checkpoint for state declarations

---

## 6. Validator Updates

### 6.1 validate_specs.py

**Location:** `scripts/validate_specs.py`

**Add New Validation Functions:**

```python
def validate_state_declarations(spec_data, spec_path):
    """Validate state_declarations in spec.json"""
    errors = []
    warnings = []
    
    # Load valid state IDs from reference
    valid_states = load_substrate_state_ids()
    valid_surfaces = load_surface_vocabulary_ids()
    valid_protection_levels = ["none", "light_mask", "full_mask", "full_cover"]
    
    state_decl = spec_data.get("state_declarations")
    
    if not state_decl:
        errors.append("SCD_STATE_DECL_PRESENT: Missing state_declarations")
        return errors, warnings
    
    # Validate primary_surface
    primary = state_decl.get("primary_surface")
    if primary and primary not in valid_surfaces:
        errors.append(f"SCD_STATE_PRIMARY_VALID: Invalid primary_surface '{primary}'")
    
    # Validate valid_input_states
    input_states = state_decl.get("valid_input_states", {}).get("states", [])
    for state in input_states:
        if state not in valid_states:
            errors.append(f"SCD_STATE_INPUT_VALID: Invalid input state '{state}'")
    
    # Validate output_state
    output = state_decl.get("output_state", {})
    output_state = output.get("state")
    if output_state and output_state not in valid_states:
        errors.append(f"SCD_STATE_OUTPUT_VALID: Invalid output state '{output_state}'")
    
    # Validate state_map if present
    state_map = output.get("state_map", {})
    for config_val, mapped_state in state_map.items():
        if mapped_state not in valid_states:
            errors.append(f"SCD_STATE_OUTPUT_VALID: Invalid mapped state '{mapped_state}'")
    
    # Validate adjacent_state_protection_rules
    adj_rules = state_decl.get("adjacent_state_protection_rules", [])
    for rule in adj_rules:
        adj_surface = rule.get("adjacent_surface")
        if adj_surface and adj_surface not in valid_surfaces:
            errors.append(f"SCD_STATE_ADJ_SURFACES_VALID: Invalid adjacent surface '{adj_surface}'")
        
        when_states = rule.get("when_state", [])
        for ws in when_states:
            if ws not in valid_states:
                errors.append(f"SCD_STATE_ADJ_STATES_VALID: Invalid when_state '{ws}'")
        
        prot_level = rule.get("protection_level")
        if prot_level and prot_level not in valid_protection_levels:
            errors.append(f"SCD_STATE_PROTECTION_LEVELS_VALID: Invalid protection_level '{prot_level}'")
    
    return errors, warnings


def load_substrate_state_ids():
    """Load valid SS_* IDs from Substrate_State_Reference.md"""
    # Parse the reference document or maintain a hardcoded list
    return [
        "SS_BARE",
        "SS_PRIMED", "SS_PRIMED_FACTORY", "SS_PRIMED_FIELD",
        "SS_PAINTED", "SS_PAINTED_FLAT", "SS_PAINTED_EGGSHELL", 
        "SS_PAINTED_SATIN", "SS_PAINTED_SEMIGLOSS", "SS_PAINTED_GLOSS",
        "SS_PAINTED_ALKYD", "SS_PAINTED_UNKNOWN",
        "SS_STAINED", "SS_STAINED_PENETRATING", "SS_STAINED_FILM", "SS_STAINED_UNKNOWN",
        "SS_CLEAR", "SS_CLEAR_POLY", "SS_CLEAR_LACQUER", 
        "SS_CLEAR_VARNISH", "SS_CLEAR_SHELLAC", "SS_CLEAR_UNKNOWN"
    ]
```

---

## 7. Existing Spec Retrofit Strategy

### 7.1 Specs Requiring Updates

| Spec Family | Primary Surface | Valid Input | Output State |
|-------------|-----------------|-------------|--------------|
| `SF_DRYWALL_CEILING_NC_PRIME_v1` | ceiling_field | SS_BARE | SS_PRIMED |
| `SF_DRYWALL_CEILING_NC_FINISH_v1` | ceiling_field | SS_PRIMED | SS_PAINTED_FLAT (varies by sheen) |
| `SF_DRYWALL_CEILINGS_NC_PRIME_v1` | ceiling_field | SS_BARE | SS_PRIMED |
| `SF_DRYWALL_CEILINGS_NC_PAINT_v1` | ceiling_field | SS_PRIMED | SS_PAINTED_FLAT (varies by sheen) |
| `SF_DRYWALL_WALL_NC_PRIME_v1` | wall_field | SS_BARE | SS_PRIMED |
| `SF_DRYWALL_WALL_NC_FINISH_v1` | wall_field | SS_PRIMED | SS_PAINTED_* (varies by sheen) |
| `SF_DRYWALL_FULL_NC_PRIME_v1` | wall_field, ceiling_field | SS_BARE | SS_PRIMED |
| `SF_TRIM_NC_PAINT_v1` | trim_baseboard, trim_casing_* | SS_PRIMED_FACTORY, SS_PRIMED_FIELD | SS_PAINTED_SEMIGLOSS (varies by sheen) |
| `SF_DOOR_SLAB_INT_NC_v1` | door_leaf_face | SS_PRIMED_FACTORY | SS_PAINTED_SEMIGLOSS (varies by sheen) |
| `SF_DOOR_FRAME_NC_FINISH_v1` | door_frame | SS_PRIMED_FACTORY | SS_PAINTED_SEMIGLOSS (varies by sheen) |

### 7.2 Retrofit Process

**Phase 1: Analyze** (Human + AI)
1. Review each spec's scope_boundaries
2. Identify primary surface(s)
3. Determine valid input states from current assumptions
4. Determine output state from spec purpose
5. Identify adjacent surfaces from adjacency_declarations
6. Determine protection rules by adjacent state

**Phase 2: Draft** (AI)
1. Generate `state_declarations` JSON for each spec
2. Cross-reference with existing protection_zones_required
3. Ensure adjacent_state_protection_rules align with current protection assumptions

**Phase 3: Validate** (Script)
1. Run validate_specs.py with new state validation
2. Fix any ID mismatches or missing references

**Phase 4: Review** (Human)
1. Verify state logic matches real-world workflow
2. Confirm protection rules make sense for each sequence scenario
3. Approve changes

### 7.3 Retrofit Template

For each spec, add this structure to spec.json:

```json
{
  "state_declarations": {
    "primary_surface": "{{SURFACE_ID}}",
    
    "valid_input_states": {
      "states": ["SS_{{STATE}}"],
      "notes": "{{WHY_THIS_STATE}}"
    },
    
    "output_state": {
      "state": "SS_{{OUTPUT_STATE}}",
      "varies_by": "{{CONFIG_DIMENSION_IF_APPLICABLE}}",
      "state_map": {
        "{{config_value}}": "SS_{{MAPPED_STATE}}"
      },
      "notes": "{{NOTES}}"
    },
    
    "adjacent_state_protection_rules": [
      {
        "adjacent_surface": "{{ADJACENT_SURFACE_ID}}",
        "when_state": ["SS_{{STATE_REQUIRING_PROTECTION}}"],
        "protection_zone": "{{ZONE_ID_OR_NULL}}",
        "protection_level": "{{none|light_mask|full_mask|full_cover}}",
        "notes": "{{WHY}}"
      }
    ]
  }
}
```

---

## 8. Rollout Phases

### Phase 1: Documentation (This Session)
- [x] Create Substrate_State_Reference.md
- [x] Create Engine_State_Coordination_Architecture.md
- [x] Create this rollout plan

### Phase 1.5: Ad-Hoc State Workaround Audit
Before implementing the new system, audit existing specs for ad-hoc state-related conditions that were created as workarounds. These need to be:
1. Identified
2. Mapped to the new `adjacent_state_protection_rules` pattern
3. Removed after migration

**Known Ad-Hoc Workarounds to Migrate:**

| Spec | Location | Ad-Hoc Key | Intended Purpose | Migration Target |
|------|----------|------------|------------------|------------------|
| Current spec in progress | sop_modules.json | `appliesWhen.wallFinishState` | Determine wall protection level for trim spray based on whether walls are finished | `adjacent_state_protection_rules[].when_state` for wall_field |
| *(add others as discovered during audit)* | | | | |

**Audit Process:**
1. Grep all specs for keys containing: `State`, `state`, `finish`, `primed`, `painted`, `bare`
2. Review any `appliesWhen` conditions that aren't in Site_Condition_Vocabulary_Reference.md
3. Determine if each is a true site condition or a substrate state query
4. Add to migration table above

**Migration happens in Phase 7** — when retrofitting specs, replace ad-hoc conditions with proper `state_declarations`.

### Phase 2: Document Placement (Complete)
- [x] Move Substrate_State_Reference.md to docs/Reference/
- [x] Move Engine_State_Coordination_Architecture.md to docs/System/
- [x] Update docs/README.md with new document links

### Phase 3: Modifier Registry Update (Complete)
- [x] Add substrate state modifiers to Modifier_Registry.md
- [x] Cross-reference with Estimation_Modifiers_Doctrine.md

### Phase 4: Schema Update (Complete)
- [x] Add state_declarations to spec.schema.json
- [x] Update spec template with state_declarations placeholder
- [x] Update research template with state analysis section

### Phase 5: Agent Updates (Complete)
- [x] Update spec-researcher.md with state analysis requirements
- [x] Update sop-librarian.md with substrate_state_rules guidance
- [x] Update estimation-engineer.md with state modifier reference
- [x] Update critic.md with state validation rules
- [x] Update specfactory-orchestrator.md with state checklist

### Phase 6: Validator Update (Complete)
- [x] Add VALID_SUBSTRATE_STATES constant with all SS_* IDs
- [x] Add VALID_ADJACENT_STATE_PROTECTION_LEVELS constant
- [x] Add validate_state_declarations() function
- [x] Integrate into cross_file_checks() validation flow
- [x] Syntax verification passed

### Phase 7: Spec Retrofit (Complete)
- [x] Generate state_declarations for SF_DRYWALL_CEILING_NC_PRIME_v1
- [x] Generate state_declarations for SF_DRYWALL_CEILING_NC_FINISH_v1
- [x] Generate state_declarations for SF_DRYWALL_CEILINGS_NC_PRIME_v1
- [x] Generate state_declarations for SF_DRYWALL_CEILINGS_NC_PAINT_v1
- [x] Generate state_declarations for SF_DRYWALL_WALL_NC_PRIME_v1
- [x] Generate state_declarations for SF_DRYWALL_WALL_NC_FINISH_v1
- [x] Generate state_declarations for SF_DRYWALL_FULL_NC_PRIME_v1
- [x] Generate state_declarations for SF_TRIM_NC_PAINT_v1
- [x] Generate state_declarations for SF_DOOR_FRAME_NC_FINISH_v1
- [N/A] SF_DOOR_SLAB_INT_NC_v1 — spec.json does not exist yet (only supporting files); state_declarations will be added when spec is completed
- [x] **Remove ad-hoc workarounds** — migrated `wall_finish_state` in SF_DOOR_FRAME_NC_FINISH_v1 to state_declarations.adjacent_state_protection_rules
- [x] Run validation on all specs
- [x] Human review and approval (in progress)

**Field corrections applied:**
- Wall-to-ceiling: `protection_level: "none"` — per doctrine, walls always cut into ceilings freehand, no tape/mask
- Ceiling-to-wall (finished): `protection_level: "full_mask"` — solid tape line at wall-to-ceiling junction with draped plastic
- Door frame: Added `applies_when` and `when_finish_group` for conditional protection based on application method and color grouping

**Schema enhancements:**
- Added `applies_when` to adjacent_state_protection_rules for method-conditional protection
- Added `when_finish_group` enum (same/different) for color-group-dependent protection
- Changed `varies_by` to allow null for specs with fixed output state

**Site condition rules standardized:**
- Converted all sop_modules.json site_condition_rules from dict format to list format
- Each rule now has explicit `condition_id` for self-documentation
- Updated validator to expect list format

### Phase 8: Smoke Test (Complete)
- [x] Full validate_specs.py run — SCD_STATE_* validation passing (0 errors)
- [x] Full validate_specs.py run — TASK_SC_* validation passing (0 errors)
- [x] Added `floor_type` and `occupied_normal` to VALID_SITE_CONDITIONS
- [ ] SpecFactory test run with state declarations in output (future)

---

## 9. Session Boundaries

This rollout can be executed across multiple sessions:

| Session | Phases | Estimated Effort |
|---------|--------|------------------|
| 1 | Phase 1 (Documentation) | Complete |
| 2 | Phase 2-3 (Placement + Modifiers) | 30 min |
| 3 | Phase 4-5 (Schema + Agents) | 1-2 hours |
| 4 | Phase 6 (Validator) | 1 hour |
| 5 | Phase 7-8 (Retrofit + Test) | 1-2 hours |

Each session can reference this document to continue from where the previous session ended.

---

## 10. Change Log

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-02-03 | Eric + Claude | Initial rollout plan |
| 1.1.0 | 2026-02-03 | Eric + Claude | Phases 5-8 complete. Added applies_when and when_finish_group to schema. Standardized site_condition_rules to list format. Applied field corrections for wall/ceiling protection rules. 9 of 10 specs retrofitted with state_declarations. |
| 1.2.0 | 2026-02-03 | Eric + Claude | Ad-hoc workaround migration complete. Removed wall_finish_state from SF_DOOR_FRAME_NC_FINISH_v1 applies_when conditions; now driven by state_declarations.adjacent_state_protection_rules. |

---

## 11. Related Documents

- `Substrate_State_Reference.md` — State vocabulary and declaration format
- `Engine_State_Coordination_Architecture.md` — Spec/DB/Engine coordination
- `Spec_Completeness_Rollout.md` — Prior rollout (protection zones, adjacency)
- `Zone_Key_Alignment_Rollout.md` — Prior rollout (zone IDs)
