# Adjacency Declaration Registry System

**Document Type:** Future Work Specification  
**Status:** Tracking  
**Created:** 2026-02-03  
**Priority:** Medium (Execute after NC spec catalog complete, before PaintScope development)  
**Companion To:** Modifier Registry (similar "observe then codify" pattern)

---

## Overview

This document specifies requirements for cross-spec adjacency validation and the Adjacency Declaration Registry. When multiple atomic specs reference each other through adjacency declarations, those declarations must be consistent to avoid conflicts at engine assembly time.

---

## Problem Statement

Atomic specs declare adjacency relationships independently:

```
Door Slab Spec (SF_DOOR_SLAB_INT_NC):
  primary_surface: door_leaf_face
  adjacent: door_frame, typical_relationship: same_finish

Door Frame Spec (SF_DOOR_FRAME_NC):
  primary_surface: door_frame
  adjacent: door_leaf_face, typical_relationship: ???
```

If the door frame spec declares `different_finish` while the door slab spec declares `same_finish`, the estimation engine will encounter a conflict when composing these specs into a project.

**Current State:** No validation catches these conflicts. Specs are generated independently, and reciprocal consistency is not enforced.

**Risk:** Conflicting adjacency declarations will cause undefined behavior or errors at engine assembly time.

---

## When to Implement

| Milestone | Status | Gate |
|-----------|--------|------|
| NC spec catalog complete (~27 specs) | Pending | Trigger for validation |
| Run adjacency validation script | — | Identifies all conflicts |
| Create Adjacency Declaration Registry | — | Codifies expected relationships |
| PaintScope development | — | Blocked until registry exists |
| Estimation Engine development | — | Consumes registry |

**Trigger:** Execute after NC spec catalog is substantially complete (all core NC specs generated and reviewed).

---

## Validation Script Specification

### Purpose

Scan all `spec.json` files, build an adjacency index, identify reciprocal pairs, and validate consistency.

### Input

All `spec.json` files in `Claude/specs/*/`

### Process

1. **Build Adjacency Index**
   - For each spec, extract:
     - `spec_family.id`
     - `adjacency_declarations.primary_surface`
     - `adjacency_declarations.adjacent_surfaces[]`
   - Index by primary_surface for lookup

2. **Identify Reciprocal Pairs**
   - For each spec A declaring adjacent surface X:
     - Find spec B where `primary_surface = X`
     - Check if spec B declares A's primary_surface as adjacent
   - Record all reciprocal pairs

3. **Validate Consistency**
   - For each reciprocal pair (A ↔ B):
     - Compare `typical_relationship` values
     - Compare `continuity_rate_modifier` values
     - Compare `edge_type` values
   - Flag conflicts

4. **Handle Edge Cases**
   - `varies` is compatible with `same_finish` or `different_finish` (not a conflict)
   - Missing reciprocal spec is noted but not flagged as error (spec may not exist yet)
   - `not_in_scope` indicates surface won't have its own spec

### Output

**adjacency_validation_report.json:**
```json
{
  "scan_date": "2026-02-XX",
  "specs_scanned": 27,
  "reciprocal_pairs_found": 15,
  "conflicts": [
    {
      "spec_a": "SF_DOOR_SLAB_INT_NC",
      "spec_b": "SF_DOOR_FRAME_NC",
      "surface_a": "door_leaf_face",
      "surface_b": "door_frame",
      "field": "typical_relationship",
      "value_a": "same_finish",
      "value_b": "different_finish",
      "severity": "error"
    }
  ],
  "missing_reciprocals": [
    {
      "spec": "SF_TRIM_NC_PAINT",
      "declares_adjacent": "cabinet_face",
      "reciprocal_spec": "SF_CABINET_*",
      "status": "spec_not_found"
    }
  ],
  "validated_pairs": [
    {
      "spec_a": "SF_DRYWALL_WALL_NC_FINISH",
      "spec_b": "SF_TRIM_NC_PAINT",
      "relationship": "different_finish",
      "status": "consistent"
    }
  ]
}
```

### Script Location

`Claude/scripts/validate_adjacency_consistency.py`

---

## Adjacency Declaration Registry

### Purpose

After validation identifies all adjacency relationships, codify expected relationships in a central registry. This becomes the source of truth for:
- Spec authoring (agents reference registry when declaring adjacencies)
- Spec validation (Critic checks declarations against registry)
- Engine fallback (when one spec is missing, engine uses registry defaults)

### Structure

**Adjacency_Declaration_Registry.md** (in `docs/Reference/`):

```markdown
# Adjacency Declaration Registry

## Door System Adjacencies

| Surface A | Surface B | Expected Relationship | Rate Modifier | Edge Type | Notes |
|-----------|-----------|----------------------|---------------|-----------|-------|
| door_leaf_face | door_frame | same_finish | 1.15 | complex | Typical NC: all door components match |
| door_leaf_face | door_leaf_edge | same_finish | 1.0 | complex | Always same finish |
| door_frame | wall_field | different_finish | 1.20 | linear | Trim vs wall color break |
| door_casing | wall_field | different_finish | 1.20 | linear | Trim vs wall color break |
| door_casing | door_frame | same_finish | 1.10 | linear | Typically same trim color |

## Wall/Ceiling Adjacencies

| Surface A | Surface B | Expected Relationship | Rate Modifier | Edge Type | Notes |
|-----------|-----------|----------------------|---------------|-----------|-------|
| wall_field | ceiling_field | varies | 1.15 | linear | Same in some projects, different in others |
| wall_field | trim_baseboard | different_finish | 1.20 | linear | Standard wall/trim break |
| wall_field | trim_casing_door | different_finish | 1.20 | linear | Standard wall/trim break |

## Window System Adjacencies

| Surface A | Surface B | Expected Relationship | Rate Modifier | Edge Type | Notes |
|-----------|-----------|----------------------|---------------|-----------|-------|
| window_jamb | window_casing | same_finish | 1.10 | linear | Typically same trim color |
| window_jamb | wall_field | different_finish | 1.15 | linear | Window trim vs wall |
| window_stool | window_apron | same_finish | 1.0 | linear | Always same finish |
```

### Registry Rules

1. **Symmetry Required:** If A→B is declared, B→A must have matching values
2. **`varies` Handling:** Use when project-level decision determines relationship
3. **Rate Modifier Consistency:** Both directions use same modifier
4. **Edge Type Consistency:** Both directions use same edge type
5. **Registry Authority:** Specs MUST conform to registry; conflicts require registry update with human approval

---

## Integration Points

### Spec Researcher (Brief Creation)

When creating briefs, Spec Researcher checks registry for expected adjacencies:
- Pre-populates adjacency section based on primary_surface
- Flags if proposed relationship conflicts with registry

### Critic (QA Validation)

Critic validates spec.json adjacency declarations against registry:
- FAIL if declaration contradicts registry
- WARN if adjacency exists in registry but not declared in spec
- PASS if all declarations match registry

### Estimation Engine

Engine uses registry as fallback:
- When composed specs have consistent declarations → use spec values
- When one spec is missing → use registry defaults
- When specs conflict → error (should never happen post-validation)

---

## Workflow

```
NC Spec Catalog Complete
         ↓
Run validate_adjacency_consistency.py
         ↓
Review adjacency_validation_report.json
         ↓
[Conflicts found?]
    ├── Yes → Fix specs or update registry → Re-run validation
    └── No → Proceed
         ↓
Create/Update Adjacency_Declaration_Registry.md from validated pairs
         ↓
Add registry to Critic required reading
         ↓
Future specs validated against registry
```

---

## Relationship to Other Systems

| System | Relationship |
|--------|--------------|
| **Modifier Registry** | Similar pattern: observe specs, codify into registry, validate against registry |
| **Surface_Vocabulary_Reference** | Registry uses surface IDs from vocabulary |
| **Spec_Completeness_Doctrine** | Adjacency declarations are Layer 2 of completeness |
| **Engine_Design_Notes** | Registry enables finish group resolution algorithm |
| **Finish_Group_Declaration_System** | Registry provides `typical_relationship` defaults |

---

## Open Questions

1. **Granularity:** Should registry distinguish NC vs RP contexts? (e.g., door_frame ↔ wall_field might be `same_finish` in NC accent doors but `different_finish` typically)

2. **Override Mechanism:** How do specs declare intentional deviation from registry? (e.g., accent wall spec where wall_field ↔ ceiling_field is `different_finish` instead of `varies`)

3. **Versioning:** How to handle registry updates when new adjacency patterns are discovered?

---

## Status Checklist

- [ ] NC spec catalog complete
- [ ] Validation script written (`validate_adjacency_consistency.py`)
- [ ] Validation script tested on existing specs
- [ ] Conflicts resolved
- [ ] Registry created (`Adjacency_Declaration_Registry.md`)
- [ ] Critic updated to validate against registry
- [ ] Spec Researcher updated to reference registry during brief creation

---

## References

| Document | Relevance |
|----------|-----------|
| Engine_Design_Notes_Atomic_Composition_and_Finish_Groups.md | Architectural context for why consistency matters |
| Spec_Completeness_Doctrine.md | Adjacency declarations as Layer 2 |
| Surface_Vocabulary_Reference.md | Canonical surface IDs |
| spec.schema.json | Adjacency declaration schema |
| Modifier_Registry.md | Similar "observe then codify" pattern |

---

## Change Log

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 0.1.0 | 2026-02-03 | Eric + Claude | Initial specification |
