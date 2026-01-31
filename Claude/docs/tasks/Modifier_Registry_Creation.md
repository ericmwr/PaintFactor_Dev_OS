# Modifier Registry Creation

**Task Type:** New Document Creation
**Status:** Pending
**Created:** 2026-01-31
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
   - Example: QT4 (1.30) x H3 (1.30) x COND_FAIR (1.30) = 2.197

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
