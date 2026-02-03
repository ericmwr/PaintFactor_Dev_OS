# Engine State Coordination Architecture

**Status:** DRAFT  
**Version:** 1.0.0  
**Last Updated:** 2026-02-03  
**Doctrine Level:** 1  
**Authority:** PaintFactor_OS.md

This document describes how substrate state flows from spec declarations through database tables to estimation engine resolution, enabling dynamic protection calculation and sequence comparison.

---

## 1. Overview

The PaintFactor system separates **static declarations** (what specs define) from **runtime state** (what the engine tracks per project). This separation allows:

- Specs to be pure, reusable definitions
- Database tables to be populated from spec artifacts
- Engine to resolve actual labor based on project-specific sequencing
- Project managers to compare sequence/method alternatives

**Core Principle:** Specs declare capabilities and consequences. Engine resolves actuals.

---

## 2. Architecture Layers

```
┌─────────────────────────────────────────────────────────────────────┐
│                        PROJECT LEVEL                                │
│  ┌───────────────────┐  ┌───────────────────┐  ┌─────────────────┐ │
│  │ Project_Surfaces  │  │ Surface_State_Log │  │ Scheduled_Specs │ │
│  │ (current state)   │  │ (transition hist) │  │ (execution seq) │ │
│  └───────────────────┘  └───────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                              ▲
                              │ Engine reads project state,
                              │ resolves protection & labor
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      ESTIMATION ENGINE                              │
│  ┌───────────────────┐  ┌───────────────────┐  ┌─────────────────┐ │
│  │ State Validator   │  │ Protection Solver │  │ Labor Calculator│ │
│  │ (prereq check)    │  │ (adjacent rules)  │  │ (rates+mods)    │ │
│  └───────────────────┘  └───────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                              ▲
                              │ Engine queries spec rules
                              │ from database tables
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        DATABASE LAYER                               │
│  ┌───────────────────┐  ┌───────────────────┐  ┌─────────────────┐ │
│  │ Spec_State_Decl   │  │ Adjacent_State_   │  │ Tasks           │ │
│  │ (input/output)    │  │ Protection_Rules  │  │ (rates, mods)   │ │
│  └───────────────────┘  └───────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                              ▲
                              │ Spec artifacts decompose
                              │ into normalized tables
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         SPEC ARTIFACTS                              │
│  ┌───────────────────┐  ┌───────────────────┐  ┌─────────────────┐ │
│  │ spec.json         │  │ sop_modules.json  │  │ production.json │ │
│  │ (declarations)    │  │ (task sequences)  │  │ (rates)         │ │
│  └───────────────────┘  └───────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. Spec Declarations (Static)

Specs declare three state-related elements. These are **static** — they don't change per project.

### 3.1 Valid Input States

What substrate states can this spec operate on?

```json
{
  "valid_input_states": {
    "states": ["SS_PRIMED"],
    "notes": "Surface must be primed before finish application"
  }
}
```

**Database Table:** `Spec_Valid_Input_States`

| spec_family_id | surface_id | valid_state |
|----------------|------------|-------------|
| SF_DRYWALL_WALL_NC_PAINT | wall_field | SS_PRIMED |
| SF_TRIM_NC_PAINT | trim_baseboard | SS_PRIMED_FACTORY |
| SF_TRIM_NC_PAINT | trim_baseboard | SS_PRIMED_FIELD |

### 3.2 Output State

What state does executing this spec leave the surface in?

```json
{
  "output_state": {
    "state": "SS_PAINTED_FLAT",
    "varies_by": "finish_sheen",
    "state_map": {
      "flat": "SS_PAINTED_FLAT",
      "eggshell": "SS_PAINTED_EGGSHELL",
      "satin": "SS_PAINTED_SATIN",
      "semi-gloss": "SS_PAINTED_SEMIGLOSS"
    }
  }
}
```

**Database Table:** `Spec_Output_States`

| spec_family_id | surface_id | config_dimension | config_value | output_state |
|----------------|------------|------------------|--------------|--------------|
| SF_DRYWALL_WALL_NC_PAINT | wall_field | finish_sheen | flat | SS_PAINTED_FLAT |
| SF_DRYWALL_WALL_NC_PAINT | wall_field | finish_sheen | satin | SS_PAINTED_SATIN |
| SF_DRYWALL_WALL_NC_PRIME | wall_field | * | * | SS_PRIMED |

### 3.3 Adjacent State Protection Rules

When adjacent surfaces are in state X, what protection is required?

```json
{
  "adjacent_state_protection_rules": [
    {
      "adjacent_surface": "wall_field",
      "when_state": ["SS_PAINTED_FLAT", "SS_PAINTED_EGGSHELL", "SS_PAINTED_SATIN", "SS_PAINTED_SEMIGLOSS"],
      "protection_zone": "wall_mask_for_trim_spray",
      "protection_level": "full_mask"
    },
    {
      "adjacent_surface": "wall_field",
      "when_state": ["SS_BARE", "SS_PRIMED"],
      "protection_zone": null,
      "protection_level": "none"
    }
  ]
}
```

**Database Table:** `Adjacent_State_Protection_Rules`

| spec_family_id | adjacent_surface | when_state | protection_zone | protection_level |
|----------------|------------------|------------|-----------------|------------------|
| SF_TRIM_NC_PAINT | wall_field | SS_PAINTED_FLAT | wall_mask_for_trim_spray | full_mask |
| SF_TRIM_NC_PAINT | wall_field | SS_PAINTED_SATIN | wall_mask_for_trim_spray | full_mask |
| SF_TRIM_NC_PAINT | wall_field | SS_PRIMED | NULL | none |
| SF_TRIM_NC_PAINT | wall_field | SS_BARE | NULL | none |

---

## 4. Project State (Runtime)

The project level tracks actual current state and execution history. This is **runtime** data specific to each project.

### 4.1 Project Surfaces Table

Tracks current state of each surface in the project.

**Table:** `Project_Surfaces`

| project_id | room_id | surface_id | current_state | last_updated | last_spec_applied |
|------------|---------|------------|---------------|--------------|-------------------|
| PRJ_001 | ROOM_LIV | wall_field | SS_PRIMED | 2026-02-03 | SF_DRYWALL_WALL_NC_PRIME |
| PRJ_001 | ROOM_LIV | ceiling_field | SS_PAINTED_FLAT | 2026-02-02 | SF_DRYWALL_CEILINGS_NC_PAINT |
| PRJ_001 | ROOM_LIV | trim_baseboard | SS_PRIMED_FACTORY | NULL | NULL |

### 4.2 State Transition Log

Records state changes for audit and sequencing analysis.

**Table:** `State_Transition_Log`

| project_id | room_id | surface_id | from_state | to_state | spec_family_id | executed_at |
|------------|---------|------------|------------|----------|----------------|-------------|
| PRJ_001 | ROOM_LIV | wall_field | SS_BARE | SS_PRIMED | SF_DRYWALL_WALL_NC_PRIME | 2026-02-03 |
| PRJ_001 | ROOM_LIV | ceiling_field | SS_BARE | SS_PRIMED | SF_DRYWALL_CEILINGS_NC_PRIME | 2026-02-01 |
| PRJ_001 | ROOM_LIV | ceiling_field | SS_PRIMED | SS_PAINTED_FLAT | SF_DRYWALL_CEILINGS_NC_PAINT | 2026-02-02 |

### 4.3 Scheduled Specs

Project-level execution plan with chosen sequence.

**Table:** `Scheduled_Specs`

| project_id | sequence_order | spec_family_id | room_scope | status | scheduled_date |
|------------|----------------|----------------|------------|--------|----------------|
| PRJ_001 | 1 | SF_DRYWALL_CEILINGS_NC_PRIME | ALL | complete | 2026-02-01 |
| PRJ_001 | 2 | SF_DRYWALL_CEILINGS_NC_PAINT | ALL | complete | 2026-02-02 |
| PRJ_001 | 3 | SF_DRYWALL_WALL_NC_PRIME | ALL | complete | 2026-02-03 |
| PRJ_001 | 4 | SF_TRIM_NC_PAINT | ALL | pending | 2026-02-04 |
| PRJ_001 | 5 | SF_DRYWALL_WALL_NC_PAINT | ALL | pending | 2026-02-05 |

---

## 5. Engine Resolution Flow

When the engine calculates labor for a scheduled spec, it follows this flow:

### 5.1 Prerequisite Validation

```
Engine: Can SF_TRIM_NC_PAINT execute?

1. Query Spec_Valid_Input_States:
   - SF_TRIM_NC_PAINT requires trim_baseboard in [SS_PRIMED_FACTORY, SS_PRIMED_FIELD]

2. Query Project_Surfaces:
   - trim_baseboard current_state = SS_PRIMED_FACTORY

3. Validate: SS_PRIMED_FACTORY ∈ [SS_PRIMED_FACTORY, SS_PRIMED_FIELD] ✓

Result: Prerequisite satisfied, spec can execute
```

### 5.2 Protection Resolution

```
Engine: What protection does SF_TRIM_NC_PAINT need?

1. Query Adjacent_State_Protection_Rules for SF_TRIM_NC_PAINT:
   - Adjacent surface: wall_field
   
2. Query Project_Surfaces for wall_field:
   - current_state = SS_PRIMED

3. Match rule: when_state = SS_PRIMED → protection_level = none

Result: No wall masking required for trim spray
```

### 5.3 State Update (Post-Execution)

```
Engine: SF_TRIM_NC_PAINT marked complete

1. Query Spec_Output_States:
   - SF_TRIM_NC_PAINT outputs SS_PAINTED_SEMIGLOSS (for semi-gloss config)

2. Update Project_Surfaces:
   - SET current_state = SS_PAINTED_SEMIGLOSS
   - SET last_spec_applied = SF_TRIM_NC_PAINT

3. Insert State_Transition_Log:
   - from_state: SS_PRIMED_FACTORY
   - to_state: SS_PAINTED_SEMIGLOSS
```

---

## 6. Sequence Comparison Capability

Because specs declare **consequences** rather than **requirements** for sequencing independent scopes, the engine can calculate labor for multiple sequence options.

### 6.1 Comparison Request

```
User: Compare trim-first vs walls-first sequence

Option A: Trim → Walls
  1. SF_TRIM_NC_PAINT (walls at SS_PRIMED)
  2. SF_DRYWALL_WALL_NC_PAINT (trim at SS_PAINTED)

Option B: Walls → Trim  
  1. SF_DRYWALL_WALL_NC_PAINT (trim at SS_PRIMED_FACTORY)
  2. SF_TRIM_NC_PAINT (walls at SS_PAINTED)
```

### 6.2 Engine Calculates Both

**Option A (Trim First):**
```
SF_TRIM_NC_PAINT:
  - Wall state: SS_PRIMED → wall protection: none
  - Protection labor: 0 hours

SF_DRYWALL_WALL_NC_PAINT:
  - Trim state: SS_PAINTED → trim protection: light_mask
  - Protection labor: 2 hours

Total protection labor: 2 hours
```

**Option B (Walls First):**
```
SF_DRYWALL_WALL_NC_PAINT:
  - Trim state: SS_PRIMED_FACTORY → trim protection: none
  - Protection labor: 0 hours

SF_TRIM_NC_PAINT:
  - Wall state: SS_PAINTED → wall protection: full_mask
  - Protection labor: 4 hours

Total protection labor: 4 hours
```

### 6.3 Comparison Output

| Sequence | Protection Labor | Other Considerations |
|----------|------------------|----------------------|
| Trim First | 2 hours | Risk: trim overspray on primed walls needs touch-up |
| Walls First | 4 hours | Clean walls, but more masking labor |

**Recommendation:** Trim First saves 2 hours protection labor. Touch-up risk is low with proper technique.

---

## 7. Database Schema Summary

### 7.1 Tables Populated from Specs (Static)

| Table | Source | Purpose |
|-------|--------|---------|
| `Spec_Valid_Input_States` | spec.json | Prerequisite validation |
| `Spec_Output_States` | spec.json | State upgrade tracking |
| `Adjacent_State_Protection_Rules` | spec.json | Protection resolution |
| `Tasks` | sop_modules.json | Task definitions |
| `Production_Rates` | production.json | Rate lookup |
| `Modifiers` | Modifier_Registry.md | Rate adjustment |

### 7.2 Tables Managed by Engine (Runtime)

| Table | Source | Purpose |
|-------|--------|---------|
| `Project_Surfaces` | PaintScope + Engine | Current state tracking |
| `State_Transition_Log` | Engine | Audit trail |
| `Scheduled_Specs` | User/PM | Execution plan |
| `Resolved_Tasks` | Engine | Calculated task list with protection |
| `Estimate_Output` | Engine | Final labor/material totals |

---

## 8. Key Principles

### 8.1 Specs Are Declarative

Specs declare:
- What states they accept (input)
- What state they produce (output)
- What protection they need based on adjacent states

Specs do NOT:
- Track current state
- Enforce sequencing between independent scopes
- Calculate actual protection labor

### 8.2 Engine Resolves at Runtime

Engine responsibilities:
- Validate prerequisites before execution
- Query current adjacent surface states
- Resolve protection requirements
- Calculate labor with appropriate modifiers
- Update state after execution
- Compare alternative sequences

### 8.3 Separation Enables Flexibility

This architecture enables:
- Reusable specs across any project
- Dynamic protection calculation
- Sequence optimization
- What-if analysis
- Audit trail of state changes

---

## 9. Implementation Checklist

### 9.1 Spec Schema Updates

- [ ] Add `state_declarations` object to spec.schema.json
- [ ] Add `valid_input_states` array
- [ ] Add `output_state` object with config-dependent mapping
- [ ] Add `adjacent_state_protection_rules` array
- [ ] Update spec template with state declaration section

### 9.2 Database Schema

- [ ] Create `Spec_Valid_Input_States` table
- [ ] Create `Spec_Output_States` table
- [ ] Create `Adjacent_State_Protection_Rules` table
- [ ] Create `Project_Surfaces` table
- [ ] Create `State_Transition_Log` table

### 9.3 Engine Functions

- [ ] Implement prerequisite validator
- [ ] Implement protection resolver
- [ ] Implement state updater
- [ ] Implement sequence comparator

### 9.4 Existing Spec Updates

- [ ] Add state declarations to all existing specs
- [ ] Validate state declarations against Substrate_State_Reference.md

---

## 10. Change Log

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-02-03 | Eric + Claude | Initial architecture document |

---

## 11. Related Documents

- `Substrate_State_Reference.md` — State ID vocabulary and modifiers
- `Protection_Zones_Reference.md` — Protection zone definitions
- `Surface_Vocabulary_Reference.md` — Surface ID vocabulary
- `Estimation_Modifiers_Doctrine.md` — Modifier stacking rules
- `Interior_Protection_Doctrine.md` — Protection requirements by context
