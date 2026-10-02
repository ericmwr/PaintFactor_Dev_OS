# Exterior Modifiers Doctrine

**Spec Family ID:** SF_EXT_MODIFIERS
**Status:** DRAFT
**Version:** 0.1.0
**Effective Date:** 2026-02-20
**Authority:** Estimation_Modifiers_Doctrine.md, PaintFactor_OS.md

---

## 1. Scope

### 1.1 What This Doctrine Covers

This doctrine defines production rate modifiers specific to exterior painting estimation. It covers:

- **FAC_EXT_ACCESS** — Access equipment type modifier (replaces FAC_HEIGHT for exterior elevation work)
- **FAC_EXT_SUBSTRATE_CONDITION** — Exterior substrate state modifier for prep tasks
- **FAC_EXT_WIND** — Wind condition modifier for spray and masking tasks
- **FAC_EXT_SUN_EXPOSURE** — Sun exposure modifier for finish coat tasks
- **FAC_EXT_SURFACE_TEMP** — Surface temperature modifier for prime and finish coat tasks
- **FAC_PROFILE_COMPLEXITY** — Profile complexity modifier for exterior trim (shared with interior trim)

### 1.2 What Is Excluded

The following modifiers are explicitly excluded from exterior scope and must not be applied to exterior tasks:

| Modifier | Scope | Reason for Exclusion |
|----------|-------|----------------------|
| FAC_HEIGHT (H1–H5) | Interior only | Ceiling-height-based; not applicable to exterior elevation work. FAC_EXT_ACCESS replaces this function for exterior. |
| Occupancy modifiers (OCC_SENSITIVE, OCC_CREW_HANDLES) | Interior only | Furniture handling and occupant sensitivity are interior conditions; do not apply to exterior scopes. |
| QT modifier | Universal | Applied via `qt_rates` in task definitions; not exterior-specific. See §8.6. |

### 1.3 The Modifier Math Rule (MANDATORY)

> **Critical:** All modifiers in the PaintFactor system are TIME MULTIPLIERS. The canonical formula is:

```
effective_rate = base_rate ÷ modifier
```

Or equivalently:

```
adjusted_hours = base_hours × modifier
```

**Example:**
- Base rate: 150 SF/hr
- Scaffold access modifier: 1.60
- Effective rate: 150 ÷ 1.60 = 94 SF/hr
- For 1,000 SF: base = 6.67 hrs, adjusted = 6.67 × 1.60 = 10.67 hrs

**Validation check:** A modifier > 1.0 MUST result in MORE time and a LOWER effective production rate. If a modifier > 1.0 results in faster work, the math is inverted and must be corrected.

Never multiply rate by modifier.

---

## 2. FAC_EXT_ACCESS — Access Type Modifier

### 2.1 Definition

`FAC_EXT_ACCESS` replaces `FAC_HEIGHT` (H1–H5) for exterior elevation work. Interior height bands are ceiling-height-based and do not translate to exterior conditions. For exterior work, the access equipment type is the correct driver of productivity impact — it captures both the physical overhead of working at height and the logistical costs of the equipment required to do so.

Driven by `access_type` input from `Site_Condition_Vocabulary_Reference.md`.

### 2.2 Modifier Values

| `access_type` value | Modifier | Rationale |
|---------------------|----------|-----------|
| `ground` | 1.00 | Baseline; work reachable without equipment |
| `ladder` | 1.35 | Extension ladder repositioning overhead; safety considerations; 1–2 story typical |
| `scaffold` | 1.60 | Scaffold setup, move, and teardown; 3+ stories or large continuous runs |
| `lift` | 1.50 | Efficient for point work; delivery and setup overhead; less repositioning than scaffold |
| `rope_access` | Hourly | Production rate unpredictable; exclude from fixed-price estimation |

> **Note:** `rope_access` must trigger hourly billing for all affected tasks. Do not apply a production modifier — exclude those tasks from the fixed-price estimate and flag for separate hourly scope.

### 2.3 Tasks This Modifier Applies To

`FAC_EXT_ACCESS` applies to:

- All finish coat application tasks at elevation
- All prep tasks at elevation (scraping, sanding, caulking, cleaning)
- All masking and protection tasks at elevation

`FAC_EXT_ACCESS` does NOT apply to:

- Ground-level protection setup tasks (no elevation required)
- Tasks that are explicitly ground-scoped regardless of building height

### 2.4 Stacking

`FAC_EXT_ACCESS` stacks multiplicatively with `FAC_EXT_SUBSTRATE_CONDITION` when both apply to the same prep task. See §8 for all stacking formulas and the 4.0× cap rule.

---

## 3. FAC_EXT_SUBSTRATE_CONDITION — Substrate State Modifier

### 3.1 Definition

`FAC_EXT_SUBSTRATE_CONDITION` applies to exterior prep tasks, and in some cases to prime tasks. It is driven by the `SS_EXT_*` input state captured in PaintScope. Finish coat modifiers are 1.00 in all cases — the prep work normalizes the surface.

This modifier is distinct from the interior `SS_*` substrate state modifiers in `Modifier_Registry.md`. Exterior substrate states use the `SS_EXT_` prefix and reflect the distinct failure modes and coating history patterns found on exterior surfaces.

### 3.2 Modifier Values

Source: `Substrate_State_Reference.md` §4.5

| `SS_EXT_*` State | Prep Modifier | Prime Modifier | Finish Modifier |
|------------------|---------------|----------------|-----------------|
| `SS_EXT_BARE_WOOD` | 1.00 | 1.00 | 1.00 |
| `SS_EXT_BARE_FIBERCEMENT` | 0.80 | 1.00 | 1.00 |
| `SS_EXT_BARE_MASONRY` | 1.30 | 1.20 | 1.00 |
| `SS_EXT_BARE_METAL` | 1.20 | 1.10 | 1.00 |
| `SS_EXT_PRIMED_FACTORY` | 0.80 | N/A | 1.00 |
| `SS_EXT_PRIMED_FIELD` | 0.90 | N/A | 1.00 |
| `SS_EXT_SOUND_PAINT` | 1.10 | 1.00 | 1.00 |
| `SS_EXT_CHALKING` | 1.40 | 1.10 | 1.00 |
| `SS_EXT_FAILING_PAINT` | 1.80 | 1.10 | 1.00 |
| `SS_EXT_PEELING` | 2.50 | 1.20 | 1.00 |
| `SS_EXT_WEATHERED` | 1.60 | 1.20 | 1.00 |
| `SS_EXT_STAINED_SOLID` | 1.20 | 1.00 | 1.00 |
| `SS_EXT_STAINED_SEMI` | 1.30 | 1.00 | 1.00 |
| `SS_EXT_STAINED_CLEAR` | 1.10 | 1.00 | 1.00 |

**N/A on Prime Modifier:** States marked N/A for prime indicate the substrate does not require a field-applied prime step (e.g., already factory-primed). If a prime task is scoped regardless, use 1.00.

### 3.3 Escalation Rule

When `SS_EXT_PEELING` is present at QT4 or QT5, the prep scope is unpredictable in extent:

- Charge all prep tasks **hourly** for that surface
- Apply finish coat modifiers normally after prep is complete
- Document this escalation in the estimate notes

---

## 4. FAC_EXT_WIND — Wind Condition Modifier

### 4.1 Definition

`FAC_EXT_WIND` accounts for the overhead of managing overspray drift and masking stability in outdoor wind conditions. It applies only to spray application tasks and to masking and protection setup tasks outdoors. It does not affect brush or roller application tasks — those methods are not meaningfully impacted by moderate wind.

Driven by `wind_condition` input from `Site_Condition_Vocabulary_Reference.md` (exterior conditions, §wind_condition).

### 4.2 Modifier Values

| `wind_condition` value | Modifier | Notes |
|------------------------|----------|-------|
| `calm` | 1.00 | Full spray permitted; no restriction |
| `light_breeze` | 1.10 | Masking must be secured more frequently; minor drift management required |
| `moderate` | 1.25 | Brush and roll only; extra time to secure masking against lift |
| `high` | Task excluded | Production halt for spray and fine work; do not apply this modifier — exclude task |

> **Note:** `high` wind must exclude affected spray and masking tasks, not just modify them. Flag for re-scope when wind clears.

### 4.3 Tasks This Modifier Applies To

- `TSK_*_SPRAY_*` tasks (all spray application tasks)
- `TSK_*_MASK_*` tasks (masking and protection setup tasks at exterior locations)

`FAC_EXT_WIND` does NOT apply to brush or roll application tasks.

---

## 5. FAC_EXT_SUN_EXPOSURE — Sun Exposure Modifier

### 5.1 Definition

`FAC_EXT_SUN_EXPOSURE` accounts for the crew repositioning and scheduling overhead caused by working on surfaces with varying sun exposure throughout the day. Direct sun compresses the working window due to flash dry and blistering risk on dark surfaces. Full shade slows cure and may extend required recoat windows, adding scheduling overhead.

Driven by `sun_exposure` input from `Site_Condition_Vocabulary_Reference.md` (exterior conditions, §sun_exposure).

### 5.2 Modifier Values

| `sun_exposure` value | Modifier | Notes |
|----------------------|----------|-------|
| `full_shade` | 1.05 | Slower dry; crew may need to wait for recoat window; slight scheduling overhead |
| `partial_shade` | 1.00 | Baseline; standard scheduling applies |
| `full_sun` | 1.15 | Crew must reposition to stay ahead of direct sun; compressed working window; early morning start required |

### 5.3 Tasks This Modifier Applies To

`FAC_EXT_SUN_EXPOSURE` applies to all finish coat application tasks.

`FAC_EXT_SUN_EXPOSURE` does NOT apply to:

- Prep tasks (surface temperature is the relevant variable for prep, not sun exposure)
- Protection tasks

---

## 6. FAC_EXT_SURFACE_TEMP — Surface Temperature Modifier

### 6.1 Definition

`FAC_EXT_SURFACE_TEMP` accounts for the application difficulty and material performance degradation outside the optimal surface temperature window (50°F–85°F). Cold surfaces slow cure and increase adhesion risk. Hot surfaces cause flash dry, streaking, and blistering on dark substrates. Both conditions require adjusted pacing and technique.

Driven by `surface_temperature` input from `Site_Condition_Vocabulary_Reference.md` (exterior conditions, §surface_temperature).

### 6.2 Modifier Values

| `surface_temperature` value | Modifier | Notes |
|-----------------------------|----------|-------|
| `optimal` | 1.00 | Ideal window (50°F–85°F); no adjustment |
| `cold_surface` | 1.20 | Slower cure; extended recoat window; adhesion monitoring required |
| `hot_surface` | 1.25 | Flash dry risk; streaking risk; early morning application preferred; dark surfaces at blister risk |

### 6.3 Tasks This Modifier Applies To

`FAC_EXT_SURFACE_TEMP` applies to:

- All finish coat application tasks
- All prime application tasks

`FAC_EXT_SURFACE_TEMP` does NOT apply to:

- Prep tasks
- Protection and masking tasks

---

## 7. FAC_PROFILE_COMPLEXITY — Exterior Trim (Shared Modifier)

### 7.1 Definition

`FAC_PROFILE_COMPLEXITY` is a shared modifier that applies equally to interior and exterior trim surfaces. It accounts for the additional brush work, cutting precision, and masking complexity introduced by more intricate molding profiles.

For exterior trim, this modifier applies to: fascia, `ext_trim_corner`, `ext_trim_window_casing`, `ext_trim_door_casing`, and `ext_trim_band` surface types.

### 7.2 Modifier Values

| `profile_complexity` value | Modifier |
|---------------------------|----------|
| `simple` | 0.85 |
| `standard` | 1.00 |
| `complex` | 1.25 |
| `ornate` | 1.40 |

> **Note:** `simple` (0.85) is a sub-baseline modifier — simple profiles are faster than the standard assumption and reduce estimated time accordingly.

### 7.3 Tasks This Modifier Applies To

`FAC_PROFILE_COMPLEXITY` applies to:

- All exterior trim application tasks (prime and finish)
- All exterior trim prep tasks

This modifier is already registered in `Modifier_Registry.md` for interior trim. No new registry entry is required; the same entry and values apply to exterior trim scope.

---

## 8. Modifier Stacking Rules

### 8.1 Stack Formula — Exterior Prep Tasks

```
total_modifier = FAC_EXT_ACCESS × FAC_EXT_SUBSTRATE_CONDITION
```

Both access type and substrate condition affect prep task time. They stack multiplicatively.

**Example:** `scaffold` (1.60) × `SS_EXT_FAILING_PAINT` (1.80) = 2.88 — within cap; apply.

### 8.2 Stack Formula — Exterior Finish Coat Tasks

```
total_modifier = FAC_EXT_ACCESS × FAC_EXT_SUN_EXPOSURE × FAC_EXT_SURFACE_TEMP
```

**Example:** `ladder` (1.35) × `full_sun` (1.15) × `hot_surface` (1.25) = 1.94

### 8.3 Stack Formula — Exterior Trim Tasks

```
total_modifier = FAC_EXT_ACCESS × FAC_PROFILE_COMPLEXITY
```

**Example:** `scaffold` (1.60) × `ornate` (1.40) = 2.24

### 8.4 Stack Formula — Exterior Spray Tasks

Wind modifier stacks separately on spray tasks only:

```
total_modifier (spray) = FAC_EXT_ACCESS × FAC_EXT_WIND × FAC_EXT_SUN_EXPOSURE × FAC_EXT_SURFACE_TEMP
```

**Example:** `ladder` (1.35) × `light_breeze` (1.10) × `partial_shade` (1.00) × `optimal` (1.00) = 1.49

### 8.5 Cap Rule

No combined modifier stack should exceed **4.0×**. If the calculated total exceeds 4.0, escalate the affected task scope to hourly.

**Boundary example:** `SS_EXT_PEELING` (2.50) × `scaffold` (1.60) = 4.00 — exactly at cap. Any additional modifier (e.g., `hot_surface` 1.25) would push over 4.0 and must trigger hourly escalation.

Document the escalation reason in estimate notes.

### 8.6 QT Modifier Isolation

The QT modifier (Quality Tier) is applied separately via `qt_rates` in task definitions. It does not stack multiplicatively with `FAC_EXT_*` modifiers. The `FAC_EXT_*` stack governs time adjustment for conditions; QT governs rate lookup for quality level. These operate on separate axes and must not be combined into a single multiplicative chain.

---

## 9. FAC_ Registry Entries Required

The following `FAC_` IDs introduced by this doctrine are new and must be registered in `Modifier_Registry.md`:

| FAC_ ID | Category | Source Condition ID |
|---------|----------|---------------------|
| `FAC_EXT_ACCESS` | Exterior — Access | `access_type` |
| `FAC_EXT_SUBSTRATE_CONDITION` | Exterior — Substrate | `SS_EXT_*` states |
| `FAC_EXT_WIND` | Exterior — Wind | `wind_condition` |
| `FAC_EXT_SUN_EXPOSURE` | Exterior — Sun | `sun_exposure` |
| `FAC_EXT_SURFACE_TEMP` | Exterior — Surface Temperature | `surface_temperature` |

`FAC_PROFILE_COMPLEXITY` is already registered in `Modifier_Registry.md` for interior trim. No new entry required; existing registration covers exterior trim use.

> **Action required:** A follow-on task must add the five `FAC_EXT_*` entries above to `Modifier_Registry.md` following the existing `FAC_*` format.

---

## 10. Cross-References

### 10.1 Related Doctrine Documents

- `Estimation_Modifiers_Doctrine.md` v1.1 — Interior modifier baseline; canonical modifier math rule (`effective_rate = base_rate ÷ modifier`); modifier stacking rules
- `Modifier_Registry.md` v1.2 — Single source of truth for all registered modifier IDs; add `FAC_EXT_*` entries per §9

### 10.2 Reference Files

- `docs/Reference/Substrate_State_Reference.md` §4 — `SS_EXT_*` state modifier table source (Prep / Prime / Finish columns)
- `docs/Reference/Site_Condition_Vocabulary_Reference.md` — Exterior conditions section; canonical value IDs for `wind_condition`, `sun_exposure`, `surface_temperature`, `access_type`

### 10.3 Related Spec Doctrine

- `PaintFactor_OS.md` — System authority; modifier application architecture

---

## 11. Change Log

| Version | Date | Author | Summary |
|---------|------|--------|---------|
| 0.1.0 | 2026-02-20 | Claude | Initial draft — exterior modifier definitions, stacking rules, and registry requirements for Phase 1 exterior spec factory rollout |
