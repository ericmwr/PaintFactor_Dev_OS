# Modifier Registry

**Doctrine Level:** 3
**Authority:** Estimation_Modifiers_Doctrine.md
**Status:** Canonical
**Version:** 1.0
**Last Updated:** 2026-01-31

This document is the single source of truth for all modifiers in the PaintFactor estimation system.

---

## Modifier Categories

### Height Modifiers

Applied to all labor tasks based on working height.

| Modifier ID | Value | Description | Source |
|-------------|-------|-------------|--------|
| H1_STANDARD | 1.00 | 7-8 ft ceiling, floor-level access | Estimation_Modifiers_Doctrine |
| H2_TALL | 1.30 | 9-12 ft ceiling, step/extension ladder | Estimation_Modifiers_Doctrine |
| H3_HIGH | 1.50 | 13-17 ft ceiling, scaffold likely | Estimation_Modifiers_Doctrine |
| H4_EXTREME | 2.00 | 18+ ft ceiling, scaffold or lift required | Estimation_Modifiers_Doctrine |

### Quality Tier Modifiers

Applied to task base rates based on quality tier selection.

| Modifier ID | Value | Description | Source |
|-------------|-------|-------------|--------|
| QT2_MINIMAL | 0.80 | Minimal quality tier | Quality_Tiers_and_Surface_Condition |
| QT3_STANDARD | 1.00 | Standard quality tier (baseline) | Quality_Tiers_and_Surface_Condition |
| QT4_PREMIUM | 1.30 | Premium quality tier | Quality_Tiers_and_Surface_Condition |
| QT5_SUPERIOR | 1.50 | Superior quality tier (good condition only) | Quality_Tiers_and_Surface_Condition |
| QT6_MASTERCRAFT | hourly | Hourly rate — no production factor applies | Quality_Tiers_and_Surface_Condition |

### Surface Condition Modifiers

Applied to prep tasks based on existing surface condition.

| Modifier ID | Value | Applies To | Description | Source |
|-------------|-------|-----------|-------------|--------|
| COND_GOOD | 1.00 | Prep tasks | Good condition, minimal prep | Quality_Tiers_and_Surface_Condition |
| COND_FAIR | 1.50 | Prep tasks | Fair condition, moderate prep | Quality_Tiers_and_Surface_Condition |
| COND_POOR | 2.00 | Prep tasks | Poor condition, extensive prep | Quality_Tiers_and_Surface_Condition |

**Note:** QT5 + Fair, QT5 + Poor, QT4 + Poor, and all QT6 conditions convert to hourly billing — no production factor applies.

### Room Complexity Modifiers

Applied based on room configuration and obstructions.

| Modifier ID | Value | Description | Source |
|-------------|-------|-------------|--------|
| COMP_BATHROOM | 2.00 | Bathroom with hardware installed | Estimation_Modifiers_Doctrine |
| COMP_CABINETS | 1.50 | Room with cabinets present | Estimation_Modifiers_Doctrine |
| COMP_FIREPLACE | 1.30 | Fireplace wall | Estimation_Modifiers_Doctrine |
| COMP_CLOSET_SHELVING | 1.50 | Closet with shelving present | Estimation_Modifiers_Doctrine |

### Color Change Modifiers

Applied based on color transition scenario.

| Modifier ID | Value | Description | Source |
|-------------|-------|-------------|--------|
| COLOR_SAME | 1.00 | Light-to-light or similar colors | Estimation_Modifiers_Doctrine |
| COLOR_LIGHT_TO_DARK | 1.10 | Light-to-dark color change | Estimation_Modifiers_Doctrine |
| COLOR_DARK_TO_LIGHT | 1.30 | Dark-to-light color change | Estimation_Modifiers_Doctrine |
| COLOR_HIGH_CONTRAST | 1.30 | High contrast color change | Estimation_Modifiers_Doctrine |

### Texture Surface Modifiers

Applied based on wall/ceiling texture affecting application speed.

| Modifier ID | Value | Description | Source |
|-------------|-------|-------------|--------|
| TEX_SMOOTH | 1.00 | Smooth surface (baseline) | Estimation_Modifiers_Doctrine |
| TEX_ORANGE_PEEL | 1.10 | Light orange peel texture | Estimation_Modifiers_Doctrine |
| TEX_KNOCKDOWN | 1.15 | Knockdown texture | Estimation_Modifiers_Doctrine |
| TEX_HEAVY | 1.25 | Heavy texture | Estimation_Modifiers_Doctrine |

### Surface Type Modifiers

Applied to prep tasks based on existing coating type.

| Modifier ID | Value | Applies To | Description | Source |
|-------------|-------|-----------|-------------|--------|
| SURF_ALKYD | 1.20 | Prep tasks | Alkyd/oil-based surface requiring prep | Estimation_Modifiers_Doctrine |
| SURF_HIGH_SHEEN | 1.20 | Prep tasks | Semi-gloss/high-sheen existing finish requiring scuff | Estimation_Modifiers_Doctrine |

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

---

## Modifier Stacking Rules

1. **Multiplicative Stacking:** All modifiers stack multiplicatively
   - Example: H2_TALL (1.30) x COMP_CABINETS (1.50) x COLOR_DARK_TO_LIGHT (1.30) x TEX_KNOCKDOWN (1.15) = 2.92

2. **Category Limits:** Only one modifier per category applies
   - Cannot apply both H2 and H3 to same task
   - Cannot apply both COND_GOOD and COND_FAIR to same task

3. **Application Order:** Order doesn't affect final value (multiplication is commutative)

4. **Hourly Conversion:** When condition+tier combination triggers hourly billing, production factor modifiers do not apply — the task is billed at hourly rate

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
| 1.0 | 2026-01-31 | Initial registry compiled from existing doctrine |
