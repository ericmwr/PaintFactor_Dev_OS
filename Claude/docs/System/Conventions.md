# PaintFactor Conventions

This document defines naming, ID, and versioning conventions for PaintFactor development.

These are **forward guidance** — existing specs are not required to retroactively comply, but all new work must follow these standards.

---

## ID Prefixes

All IDs must use consistent prefixes to indicate their type:

| Prefix | Entity Type | Example |
|--------|-------------|---------|
| `SF_` | Spec Family | `SF_DRYWALL_WALL_NC_FINISH` |
| `MOD_` | SOP Module | `MOD_WALL_PREP_STANDARD` |
| `TSK_` | Task | `TSK_SAND_PRIME_COAT` |
| `SYS_` | Material System | `SYS_LATEX_WALL_STANDARD` |
| `FAC_` | Factor | `FAC_HEIGHT_ACCESS` |
| `MAT_` | Material (product) | `MAT_SW_PROMAR200_FLAT` |
| `CON_` | Consumable | `CON_ROLLER_9IN_38NAP` |

### ID Rules

1. **IDs must be stable** — once assigned, an ID must never change meaning
2. **IDs must never be repurposed** — if an entity is deprecated, its ID is retired
3. **IDs are uppercase with underscores** — no spaces, no camelCase
4. **IDs must be human-readable** — avoid cryptic abbreviations

---

## Folder Naming

### Spec Family Folders

Format: `SF_<SUBSTRATE>_<SCOPE>_<CONTEXT>_<WORK_TYPE>`

Examples:
- `SF_DRYWALL_WALL_NC_FINISH` — Drywall walls, new construction, finish coat
- `SF_DRYWALL_CEILING_NC_FINISH` — Drywall ceilings, new construction, finish coat
- `SF_DOORS_INT_REPAINT` — Interior doors, repaint
- `SF_DRYWALL_BARE_NC_PRIME` — Bare drywall, new construction, prime only

### Rules

1. Use underscores, not hyphens
2. Keep names descriptive but concise
3. NC = New Construction, RP = Repaint
4. Substrate comes first, then scope, then context, then work type

---

## Versioning

### Artifact Status

All spec artifacts must declare a status:

| Status | Meaning |
|--------|---------|
| `draft` | Initial creation, not reviewed |
| `reviewed` | Critic has passed, awaiting human approval |
| `approved` | Human-approved, production-ready |
| `deprecated` | No longer valid, retained for history |

### Version Numbers

Use semantic versioning where applicable:
- `1.0.0` — Initial approved version
- `1.1.0` — Minor enhancement (new tasks, adjusted rates)
- `2.0.0` — Major change (structural rework, breaking changes)

### Changelog Requirements

Every spec family folder must contain a `CHANGELOG.md` with:
- Version number
- Date
- Summary of changes
- Author/reviewer

---

## Geometry Input Declarations

### Required Inputs

Specs must explicitly declare what geometry they require:

| Input | Source | Description |
|-------|--------|-------------|
| `SF` | PaintScope | Square footage (field work) |
| `LF` | PaintScope | Linear footage (edge work) |
| `EA` | PaintScope | Each/count (discrete items) |

### Declaration Format

In `spec.json`:
```json
{
  "required_inputs": {
    "primary_sf": true,
    "edge_lf": {
      "to_ceiling": true,
      "to_trim": true
    },
    "openings_ea": true
  }
}
```

### Rules

1. **Never assume geometry** — if it's not declared, it's not available
2. **Never compute geometry** — PaintScope is the sole source
3. **Match UOM to task type** — field tasks use SF, edge tasks use LF

---

## Task Naming

### Format

`TSK_<ACTION>_<TARGET>_<QUALIFIER>`

Examples:
- `TSK_SAND_PRIME_COAT` — Sand the prime coat
- `TSK_ROLL_FINISH_COAT` — Roll the finish coat
- `TSK_CUT_IN_CEILING_LINE` — Cut in at ceiling line
- `TSK_TAPE_BASEBOARD_EDGE` — Tape baseboard edge

### Rules

1. Start with the action verb
2. Include the target surface or material
3. Add qualifiers only when necessary for disambiguation

---

## Module Naming

### Format

`MOD_<SCOPE>_<PURPOSE>_<QUALIFIER>`

Examples:
- `MOD_WALL_PREP_STANDARD` — Standard wall prep module
- `MOD_WALL_FINISH_PREMIUM` — Premium wall finish module
- `MOD_EDGE_TAPE_LINE` — Tape-line edge work module

---

## Material System Naming

### Format

`SYS_<BASE>_<SCOPE>_<TIER>`

Examples:
- `SYS_LATEX_WALL_STANDARD` — Standard latex wall system
- `SYS_LATEX_WALL_PREMIUM` — Premium latex wall system
- `SYS_ENAMEL_TRIM_STANDARD` — Standard enamel trim system

---

## Enforcement

The System Critic will flag violations of these conventions as `minor` issues unless they affect system integrity, in which case they escalate to `major`.

Human review may override convention warnings but should document the exception.
