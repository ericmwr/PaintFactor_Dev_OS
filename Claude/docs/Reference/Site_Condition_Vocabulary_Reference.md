# Site Condition Vocabulary Reference

**Doctrine Level:** 3
**Authority:** Spec_Completeness_Doctrine.md
**Status:** Canonical
**Version:** 1.1
**Last Updated:** 2026-01-31

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

## floor_type

Describes the floor surface condition, primarily relevant in new construction where finished floors may or may not be installed at the time of painting.

| Value | Definition | Typical Impact |
|-------|------------|----------------|
| `subfloor` | Bare subfloor (plywood, OSB, concrete slab) — no finished flooring installed | No floor protection needed; overspray and drips are acceptable on subfloor |
| `finished` | Finished flooring installed (tile, hardwood, LVP, carpet, or other) | Floor protection required — rosin paper on hard surfaces, canvas/plastic on carpet |
| `partial` | Mix of subfloor and finished areas (e.g., tile in bathrooms but subfloor elsewhere) | Protection required in finished areas only; room-by-room assessment needed |

**Use in site_condition_rules:**
```json
{
  "include_when": { "floor_type": ["finished", "partial"] },
  "exclude_when": { "floor_type": ["subfloor"] }
}
```

**Context:** In new construction, the painting sequence may occur before or after flooring installation. This condition drives whether floor protection tasks are included. The default assumption for NC was historically `subfloor`, but field experience shows finished floors are often present during prime and paint phases.

**Source:** Research correction RC-003 (SF_DRYWALL_CEILINGS_NC_PRIME pipeline, 2026-01-31)

---

## Validation

All condition IDs and values in this document are the canonical set. Specs referencing invalid IDs or values will fail validation with:
- `TASK_SC_INVALID_CONDITION` — Condition ID not in this vocabulary
- `TASK_SC_INVALID_VALUE` — Value not valid for the specified condition ID

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-31 | Initial vocabulary definition |
| 1.1 | 2026-01-31 | Added floor_type condition (subfloor/finished/partial) per RC-003 |
