# Substrate State Reference

**Status:** DRAFT  
**Version:** 1.0.0  
**Last Updated:** 2026-02-03  
**Doctrine Level:** 3  
**Authority:** Quality_Tiers_and_Surface_Condition.md

Standardized substrate state IDs for spec configuration and estimation engine resolution.

---

## 1. Overview

Substrate State identifies the **starting condition of a surface's coating system** — what exists on the substrate before the painting scope begins. This is distinct from:

- **Substrate Type** — The physical material (drywall, wood, MDF, metal)
- **Surface Condition** — The physical state of what exists (Like New, Good, Damaged, Bad)
- **Quality Tier** — The expected outcome standard

Substrate State determines:
- Which prep tasks are required
- Whether primer is needed
- What material systems are compatible
- Production rate modifiers

**PaintScope captures Substrate State → Spec declares task rules per state → Engine resolves tasks and rates**

---

## 2. Primary Substrate States

These are the five primary states from the PaintFactor system architecture:

| State ID | Name | Description |
|----------|------|-------------|
| `SS_BARE` | Bare | Raw, uncoated substrate — no primer, no finish |
| `SS_PRIMED` | Primed | Has primer coat only — no finish coat |
| `SS_PAINTED` | Painted | Has existing paint finish (latex or alkyd) |
| `SS_STAINED` | Stained | Has existing wood stain (penetrating or film-forming) |
| `SS_CLEAR` | Clear Coated | Has existing clear finish (polyurethane, lacquer, varnish, shellac) |

---

## 3. Substrate State Sub-Types

### 3.1 Bare (`SS_BARE`)

Bare substrate requires no sub-typing — the substrate type itself (drywall, wood, MDF, etc.) determines prep and primer requirements.

| Sub-State ID | Description | Typical Context |
|--------------|-------------|-----------------|
| `SS_BARE` | Uncoated substrate | New construction, stripped surfaces |

**Task Implications:**
- Full prep sequence required
- Primer coat required (system-appropriate)
- Sealing required for porous substrates

---

### 3.2 Primed (`SS_PRIMED`)

Primed surfaces vary by primer origin and condition.

| Sub-State ID | Description | Typical Context |
|--------------|-------------|-----------------|
| `SS_PRIMED_FACTORY` | Factory-applied primer | Pre-primed trim, doors, MDF |
| `SS_PRIMED_FIELD` | Field-applied primer | Previously primed by painter |

**Task Implications:**

| Sub-State | Scuff Sand | Spot Prime | Full Prime | Notes |
|-----------|------------|------------|------------|-------|
| `SS_PRIMED_FACTORY` | Yes | Damaged areas | Optional (user config) | Factory primer is transit protection, not finish-ready |
| `SS_PRIMED_FIELD` | Light | As needed | No | Assumes proper field primer was applied |

---

### 3.3 Painted (`SS_PAINTED`)

Painted surfaces require sub-typing by existing finish characteristics that affect prep and adhesion.

| Sub-State ID | Description | Key Consideration |
|--------------|-------------|-------------------|
| `SS_PAINTED_FLAT` | Existing flat/matte latex | Good tooth, minimal prep |
| `SS_PAINTED_EGGSHELL` | Existing eggshell latex | Moderate tooth |
| `SS_PAINTED_SATIN` | Existing satin latex | Some sheen, light scuff needed |
| `SS_PAINTED_SEMIGLOSS` | Existing semi-gloss latex | Low porosity, degloss or sand required |
| `SS_PAINTED_GLOSS` | Existing gloss latex | Very low porosity, degloss + bonding primer |
| `SS_PAINTED_ALKYD` | Existing alkyd/oil-based | Adhesion test required, bonding primer |
| `SS_PAINTED_UNKNOWN` | Existing paint, type unknown | Adhesion test required, conservative prep |

**Task Implications:**

| Sub-State | Clean | Scuff/Sand | Degloss | Adhesion Test | Bonding Primer |
|-----------|-------|------------|---------|---------------|----------------|
| `SS_PAINTED_FLAT` | Yes | Light 150 | No | No | No |
| `SS_PAINTED_EGGSHELL` | Yes | Light 150 | No | No | No |
| `SS_PAINTED_SATIN` | Yes | 120-150 | Optional | No | No |
| `SS_PAINTED_SEMIGLOSS` | Yes | 120-150 | Yes | No | Optional |
| `SS_PAINTED_GLOSS` | Yes | 120-150 | Yes | No | Recommended |
| `SS_PAINTED_ALKYD` | Yes | 120-150 | Yes | Yes | Required |
| `SS_PAINTED_UNKNOWN` | Yes | 120-150 | Yes | Yes | As needed |

---

### 3.4 Stained (`SS_STAINED`)

Stained surfaces require careful assessment for coating compatibility.

| Sub-State ID | Description | Key Consideration |
|--------------|-------------|-------------------|
| `SS_STAINED_PENETRATING` | Penetrating stain (no film) | Can paint over with proper prep |
| `SS_STAINED_FILM` | Film-forming stain | Treat like clear coat |
| `SS_STAINED_UNKNOWN` | Stain type unknown | Test adhesion, conservative approach |

**Task Implications:**

| Sub-State | Sand | Shellac Seal | Bonding Primer | Notes |
|-----------|------|--------------|----------------|-------|
| `SS_STAINED_PENETRATING` | 120-150 | Recommended | Optional | Shellac blocks tannin bleed |
| `SS_STAINED_FILM` | See Clear Coated | — | — | Follow SS_CLEAR protocol |
| `SS_STAINED_UNKNOWN` | 120-150 | Required | Required | Maximum isolation approach |

---

### 3.5 Clear Coated (`SS_CLEAR`)

Clear-coated surfaces present adhesion challenges and may require stripping.

| Sub-State ID | Description | Key Consideration |
|--------------|-------------|-------------------|
| `SS_CLEAR_POLY` | Polyurethane (oil or water) | Sand thoroughly or strip |
| `SS_CLEAR_LACQUER` | Lacquer finish | Chemical compatibility critical |
| `SS_CLEAR_VARNISH` | Traditional varnish | Sand thoroughly |
| `SS_CLEAR_SHELLAC` | Shellac finish | Dewaxed shellac compatible; waxed requires removal |
| `SS_CLEAR_UNKNOWN` | Clear finish, type unknown | Test adhesion, may require strip |

**Task Implications:**

| Sub-State | Sand Grit | Chemical Degloss | Bonding Primer | Strip Assessment |
|-----------|-----------|------------------|----------------|------------------|
| `SS_CLEAR_POLY` | 120-150 | Optional | Required | If adhesion fails |
| `SS_CLEAR_LACQUER` | 150-180 | No (incompatible) | Required | Often required |
| `SS_CLEAR_VARNISH` | 120-150 | Optional | Required | If adhesion fails |
| `SS_CLEAR_SHELLAC` | 150-180 | No | Optional | If waxed |
| `SS_CLEAR_UNKNOWN` | 120-150 | Test first | Required | Often required |

---

## 4. Relationship to Surface Condition

**Substrate State** and **Surface Condition** are independent dimensions that combine to determine prep scope:

| | Like New | Good | Damaged | Bad |
|---|----------|------|---------|-----|
| **SS_BARE** | Minimal dust | Normal prep | Fill defects | Significant repair |
| **SS_PRIMED_FACTORY** | Scuff only | Scuff + spot | Scuff + spot prime | May need full reprime |
| **SS_PAINTED_FLAT** | Clean + light sand | Clean + sand | Scrape + sand + spot prime | Scrape + full prime |
| **SS_PAINTED_SEMIGLOSS** | Clean + degloss | Clean + degloss + sand | Scrape + sand + bond prime | Strip assessment |

**Rule:** Both dimensions must be captured by PaintScope and declared in specs.

---

## 5. Production Rate Modifiers

Substrate state affects production rates through prep complexity. These modifiers are registered in `Modifier_Registry.md`.

### 5.1 Modifier Values

| Substrate State | Prep Modifier | Prime Modifier | Finish Modifier | Notes |
|-----------------|---------------|----------------|-----------------|-------|
| `SS_BARE` | 1.0 | 1.0 | 1.0 | Baseline for new work |
| `SS_PRIMED_FACTORY` | 1.0 | N/A | 1.0 | Baseline for NC trim |
| `SS_PRIMED_FIELD` | 0.9 | N/A | 1.0 | Less prep than factory |
| `SS_PAINTED_FLAT` | 1.1 | 1.0 | 1.0 | Cleaning adds time |
| `SS_PAINTED_EGGSHELL` | 1.1 | 1.0 | 1.0 | Similar to flat |
| `SS_PAINTED_SATIN` | 1.15 | 1.0 | 1.0 | Light degloss |
| `SS_PAINTED_SEMIGLOSS` | 1.25 | 1.0 | 1.0 | Degloss required |
| `SS_PAINTED_GLOSS` | 1.3 | 1.0 | 1.0 | Full degloss + bonding |
| `SS_PAINTED_ALKYD` | 1.35 | 1.0 | 1.0 | Adhesion test + bonding |
| `SS_PAINTED_UNKNOWN` | 1.4 | 1.0 | 1.0 | Conservative approach |
| `SS_STAINED_PENETRATING` | 1.3 | 1.0 | 1.0 | Shellac seal step |
| `SS_STAINED_FILM` | See Clear | — | — | Follow clear protocol |
| `SS_CLEAR_*` | 1.5+ | 1.0 | 1.0 | Assessment + possible strip |

### 5.2 Modifier Stacking

Substrate State modifiers stack with other modifiers per `Estimation_Modifiers_Doctrine.md`:

```
total_modifier = substrate_state × condition × height × complexity × color_change

Example: Repaint semi-gloss walls, 10ft ceiling, light-to-dark
- SS_PAINTED_SEMIGLOSS: 1.25
- Condition Good: 1.0
- Height 10ft: 1.3
- Color change: 1.0 (light-to-dark doesn't add time for painting, only coverage)

Prep modifier = 1.25 × 1.0 × 1.3 × 1.0 = 1.625
```

---

## 6. PaintScope Key Requirements

### 6.1 Required Keys

PaintScope must capture substrate state for estimable surfaces:

| PaintScope Key | Description | Values |
|----------------|-------------|--------|
| `PS_STATE.{surface_id}` | Substrate state for surface | `SS_*` enum values |
| `PS_STATE_SUB.{surface_id}` | Sub-state where applicable | Sub-state enum values |

**Examples:**
- `PS_STATE.WALL_FIELD` = `SS_PAINTED`
- `PS_STATE_SUB.WALL_FIELD` = `SS_PAINTED_SEMIGLOSS`
- `PS_STATE.TRIM_BASEBOARD` = `SS_PRIMED`
- `PS_STATE_SUB.TRIM_BASEBOARD` = `SS_PRIMED_FACTORY`

### 6.2 Capture Methods

| Method | When Used | Accuracy |
|--------|-----------|----------|
| Visual assessment | Default for repaint | Good for paint vs stain vs clear |
| Solvent test | Alkyd vs latex determination | High |
| Adhesion test | Unknown coatings | High |
| Owner interview | History unknown | Variable |
| Assumed from context | NC with factory-primed materials | High |

---

## 7. Spec Configuration Requirements

### 7.1 Dimension Declaration

Specs must declare `substrate_state` as a configuration dimension:

```json
{
  "configuration_dimensions": [
    {
      "dimension_id": "substrate_state",
      "description": "Starting state of the substrate's coating system",
      "values": ["SS_BARE", "SS_PRIMED_FACTORY", "SS_PRIMED_FIELD", "SS_PAINTED_FLAT", "..."],
      "default": "SS_PRIMED_FACTORY",
      "notes": "Affects prep task inclusion and rate modifiers"
    }
  ]
}
```

### 7.2 Task Inclusion Rules

Tasks must declare substrate state rules:

```json
{
  "task_id": "TSK_PREP_DEGLOSS",
  "substrate_state_rules": {
    "include_when": ["SS_PAINTED_SATIN", "SS_PAINTED_SEMIGLOSS", "SS_PAINTED_GLOSS", "SS_PAINTED_ALKYD", "SS_PAINTED_UNKNOWN"],
    "exclude_when": ["SS_BARE", "SS_PRIMED_FACTORY", "SS_PRIMED_FIELD", "SS_PAINTED_FLAT", "SS_PAINTED_EGGSHELL"]
  }
}
```

### 7.3 Material System Selection

Material systems may vary by substrate state:

```json
{
  "material_selection": {
    "primer": {
      "SS_BARE": "SYS_PRIMER_STANDARD",
      "SS_PAINTED_ALKYD": "SYS_PRIMER_BONDING",
      "SS_STAINED_PENETRATING": "SYS_PRIMER_SHELLAC_SEAL",
      "SS_CLEAR_*": "SYS_PRIMER_BONDING"
    }
  }
}
```

---

## 8. New Construction vs Repaint Context

### 8.1 New Construction Typical States

| Surface | Typical State | Notes |
|---------|---------------|-------|
| Drywall (walls/ceilings) | `SS_BARE` | After tape/mud/sand by drywall contractor |
| Trim (baseboard, casing) | `SS_PRIMED_FACTORY` | Factory-primed millwork standard |
| Doors (interior) | `SS_PRIMED_FACTORY` | Factory-primed MDF or wood |
| Doors (exterior) | `SS_PRIMED_FACTORY` | Factory-primed fiberglass/steel |
| Cabinets | `SS_PRIMED_FACTORY` or `SS_BARE` | Varies by spec |

### 8.2 Repaint Context

Repaint scopes typically encounter:
- `SS_PAINTED_*` — Most common
- `SS_STAINED_*` — Wood trim, cabinets
- `SS_CLEAR_*` — Cabinets, woodwork

**Rule:** Repaint specs must support the full range of painted/stained/clear sub-states. New construction specs may limit to `SS_BARE` and `SS_PRIMED_*` states.

---

## 9. Validation Rules

### 9.1 Schema Enforcement

- `substrate_state` must be a declared configuration dimension in all specs
- Task `substrate_state_rules` must reference valid `SS_*` IDs
- PaintScope keys must use standard `PS_STATE.*` format

### 9.2 Cross-Reference Validation

- All `SS_*` IDs used in specs must exist in this reference
- Modifier values must align with `Modifier_Registry.md`
- Task inclusion logic must be consistent across spec families

---

## 10. State Transition Declarations

Specs must declare state-related information so the estimation engine can resolve protection requirements and validate sequencing at project assembly time.

### 10.1 Declaration Requirements

Every spec must include three state-related declarations:

| Declaration | Purpose | Example |
|-------------|---------|---------|
| `valid_input_states` | What states can this spec operate on? | Prime spec accepts `SS_BARE` only |
| `output_state` | What state does this spec leave the surface in? | Prime spec outputs `SS_PRIMED` |
| `adjacent_state_protection_rules` | When adjacent surfaces are in state X, what protection is required? | If wall is `SS_PAINTED`, full mask for trim spray |

### 10.1.1 Adjacent State Protection Levels

The `adjacent_state_protection_rules.protection_level` uses a **dedicated enum** distinct from `protection_zones_required`:

| Level | Description | Typical Materials |
|-------|-------------|-------------------|
| `none` | No masking required | — |
| `light_mask` | Tape line only at junction | 1.5" blue tape |
| `full_mask` | Tape + paper/plastic covering | Tape + masking paper or plastic |
| `full_cover` | Complete enclosure/draping | Plastic sheeting, taped edges |

**Note:** This enum differs from `protection_zones_required.protection_level` (`edge_only`, `partial_cover`, `full_cover`) because it describes **masking intensity for adjacent finished surfaces** rather than **physical area coverage** for floors/fixtures. Both systems coexist in specs — protection zones handle room-level coverage while adjacent state rules handle finish-based masking decisions.

### 10.2 Spec Declaration Format

```json
{
  "state_declarations": {
    "primary_surface": "wall_field",
    
    "valid_input_states": {
      "states": ["SS_PRIMED"],
      "notes": "Wall must be primed before finish application"
    },
    
    "output_state": {
      "state": "SS_PAINTED_FLAT",
      "notes": "Standard flat finish for NC walls"
    },
    
    "adjacent_state_protection_rules": [
      {
        "adjacent_surface": "trim_baseboard",
        "when_state": ["SS_PAINTED"],
        "protection_zone": "trim_mask_for_wall_roll",
        "protection_level": "light_mask",
        "notes": "Protect finished trim from roller spatter"
      },
      {
        "adjacent_surface": "trim_baseboard",
        "when_state": ["SS_BARE", "SS_PRIMED_FACTORY"],
        "protection_zone": null,
        "protection_level": "none",
        "notes": "Unfinished trim needs no protection"
      }
    ]
  }
}
```

### 10.3 Hard vs Soft Sequencing

**Hard Prerequisites (Engine-Enforced):**

The `valid_input_states` declaration creates hard prerequisites. The engine will not allow a spec to execute if the surface is not in a valid input state.

| Spec | Valid Input States | Prerequisite Meaning |
|------|-------------------|---------------------|
| `SF_DRYWALL_WALL_NC_PRIME` | `SS_BARE` | Cannot prime already-primed wall |
| `SF_DRYWALL_WALL_NC_PAINT` | `SS_PRIMED` | Must prime before finish |
| `SF_TRIM_NC_PAINT` | `SS_PRIMED_FACTORY`, `SS_PRIMED_FIELD` | Trim must have primer |

**Soft Sequencing (Project Choice):**

The order of independent scopes (walls vs trim vs ceilings) is a project-level decision. Specs do not lock in this sequencing — they only declare the protection consequences of any valid sequence.

| Sequence Choice | Adjacent State at Execution | Protection Result |
|-----------------|----------------------------|-------------------|
| Trim before wall finish | Wall is `SS_PRIMED` | Minimal wall protection |
| Trim after wall finish | Wall is `SS_PAINTED` | Full wall masking required |

Both sequences are valid. The engine calculates total labor for each based on protection requirements.

### 10.4 State Upgrade Flow Example

**New Construction Wall Lifecycle:**

```
Initial State:       SS_BARE (after drywall contractor)
                         │
                         ▼
    ┌─────────────────────────────────────────┐
    │  SF_DRYWALL_WALL_NC_PRIME executes      │
    │  valid_input: SS_BARE                   │
    │  output: SS_PRIMED                      │
    └─────────────────────────────────────────┘
                         │
                         ▼
Intermediate State:  SS_PRIMED
                         │
                         ▼
    ┌─────────────────────────────────────────┐
    │  SF_DRYWALL_WALL_NC_PAINT executes      │
    │  valid_input: SS_PRIMED                 │
    │  output: SS_PAINTED_FLAT                │
    └─────────────────────────────────────────┘
                         │
                         ▼
Final State:         SS_PAINTED_FLAT
```

### 10.5 Protection Resolution Example

**Scenario:** Spraying trim when walls are in different states

```
Project has scheduled:
  1. SF_DRYWALL_WALL_NC_PRIME (complete) → walls now SS_PRIMED
  2. SF_TRIM_NC_PAINT (pending)
  3. SF_DRYWALL_WALL_NC_PAINT (pending)

Engine resolves SF_TRIM_NC_PAINT:
  - Check adjacent_state_protection_rules for wall_field
  - Current wall state: SS_PRIMED
  - Rule lookup: when_state includes SS_PRIMED → protection_level: "light_mask"
  - Result: Include light masking tasks, not full masking

If sequence changed (walls painted before trim):
  - Current wall state: SS_PAINTED_FLAT  
  - Rule lookup: when_state includes SS_PAINTED → protection_level: "full_mask"
  - Result: Include full masking tasks
```

---

## 11. Change Log

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-02-03 | Eric + Claude | Initial reference document |

---

## 11. Related Documents

- `Quality_Tiers_and_Surface_Condition.md` — Surface condition classification
- `Modifier_Registry.md` — Production rate modifier values
- `Estimation_Modifiers_Doctrine.md` — Modifier stacking rules
- `Fine_Finish_Doctrine.md` — Primer selection by substrate condition
- `Surface_Vocabulary_Reference.md` — Surface type IDs
- `Site_Condition_Vocabulary_Reference.md` — Site condition factors
