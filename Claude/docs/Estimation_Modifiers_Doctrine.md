# Estimation Modifiers Doctrine

**Status:** Canonical
**Version:** 1.0
**Last Updated:** 2026-01-20

This document defines how production rate modifiers work mathematically, and specifies the canonical modifier values for common conditions. AI agents generating specs MUST follow this doctrine to ensure consistent, accurate labor estimation.

---

## CRITICAL: Time Modifiers vs. Rate Modifiers

### The Mathematical Reality

**Applying 1.5x to TIME and applying 1.5x to RATE have OPPOSITE effects.**

| Scenario | Base Rate | Modifier Application | Result |
|----------|-----------|---------------------|--------|
| Modifier applied to RATE | 100 SF/hr | 100 × 1.5 = 150 SF/hr | FASTER (wrong intent) |
| Modifier applied to TIME | 100 SF/hr | 100 ÷ 1.5 = 66.7 SF/hr | SLOWER (correct intent) |

### PaintFactor Doctrine: MODIFIERS INCREASE TIME REQUIRED

**All modifiers in production.json are TIME MULTIPLIERS.**

**Mathematical formula:**
```
adjusted_hours = base_hours × modifier

OR equivalently:

effective_rate = base_rate ÷ modifier
```

**Example:**
- Base rate: 100 SF/hr
- Height modifier: 1.3 (9-12 ft ceiling)
- Effective rate: 100 ÷ 1.3 = 77 SF/hr
- For 1000 SF: base = 10 hrs, adjusted = 10 × 1.3 = 13 hrs

### Validation Check

When reviewing specs, verify that modifiers > 1.0 result in:
- MORE time (longer to complete)
- LOWER effective production rate

If a modifier > 1.0 results in FASTER work, the math is inverted and must be corrected.

---

## Production Rate Philosophy

### Rates Are Research-Based Estimates

Production rates in specs are **starting estimates** based on research, industry sources, and professional practice — they are NOT fixed doctrine values.

**Key principles:**
- Agents should research and propose reasonable rates based on task characteristics
- Rates will be field-calibrated over time through actual job data
- The app allows users to adjust production rates for every task
- No specific SF/hr or LF/hr value is "canonical" or mandatory

### How Modifiers Apply to Rates

Modifiers adjust TIME, not rate. For any base rate:

| Modifier Scenario | Base Rate | Modifier | Effective Rate | For 1000 SF |
|-------------------|-----------|----------|----------------|-------------|
| Standard conditions | 400 SF/hr | 1.0 | 400 SF/hr | 2.5 hrs |
| 10 ft ceiling (height 1.3) | 400 SF/hr | 1.3 | 308 SF/hr | 3.25 hrs |
| Heavy texture (1.25) | 400 SF/hr | 1.25 | 320 SF/hr | 3.13 hrs |
| Height + texture combined | 400 SF/hr | 1.625 | 246 SF/hr | 4.06 hrs |

**Formula reminder:** `effective_rate = base_rate ÷ modifier`

### Rate Research Guidance

When proposing rates, agents should consider:
- Industry reference sources (RSMeans, manufacturer TDS, trade publications)
- Professional painting contractor experience and feedback
- Task complexity and skill requirements
- Crew configuration assumptions
- Surface type and application method

Rates should include `rate_range_low` and `rate_range_high` to indicate variability, with notes explaining conditions that drive the range.

---

## Spray/Backroll Throughput Coupling

### The Rule (Non-Negotiable)

**When the application method is "spray then backroll" (spray/backroll system), spray throughput is limited by backroll throughput.**

For estimation purposes:
- Spray rate **MUST BE ≤** backroll rate
- Spray **CANNOT** be credited as faster than backroll
- No separate "spray ahead" productivity bonus is allowed

### Why This Rule Exists

In a spray/backroll system:
1. Sprayer applies material
2. Backroller immediately follows to embed and level
3. **Backroller sets the pace** — sprayer cannot outrun the roller without causing defects

If the sprayer works faster than the backroller can follow:
- Spray dries before backroll → orange peel, texture variation
- Lap marks from dry edges
- Uneven film build

**The bottleneck is always backroll.** Crediting spray as faster creates unrealistic estimates.

### Correct Rate Assignment

| Application Method | Spray Rate | Roll/Backroll Rate | Notes |
|--------------------|------------|-------------------|-------|
| Spray only (no backroll) | Use spray-specific rate | N/A | Spray can run at full spray speed |
| Roll only (pan method) | N/A | Researched rate | Standard brush-and-roll method |
| **Spray + Backroll** | **≤ Backroll rate** | Researched rate | Coupled system — spray paces to backroll |

### Example: Spray/Backroll on Interior Walls

```
Method: spray then backroll
Backroll rate (researched): X SF/hr
Spray rate (coupled): X SF/hr  ← paced to match backroll

For 1000 SF with 2-person crew (sprayer + backroller working in tandem):
- Combined throughput: X SF/hr (limited by backroll)
- Time: 1000 ÷ X hrs

WRONG approach (do not use):
- Spray rate: higher than backroll rate (uncoupled)
- Claim spray "gets ahead" and saves time
- This creates defects and is not how the system works
```

### Validation Check

When reviewing specs that include spray/backroll:
- **FAIL** if spray SF/hr > backroll SF/hr
- **FAIL** if spray is credited with independent productivity bonus
- **PASS** only if spray rate ≤ backroll rate (coupled system)

---

## Height Modifiers

Higher ceilings require ladder/scaffold work, reducing productivity.

### Canonical Height Modifier Values

| Ceiling Height | Modifier | Notes |
|----------------|----------|-------|
| 7-8 ft | 1.0 | Baseline — standard residential |
| 9-12 ft | 1.3 | Step ladder required |
| 13-17 ft | 1.5 | Extension ladder or scaffold required |
| 18+ ft | 2.0 | Scaffold or lift required, significant productivity loss |

### Tasks Affected by Height

- Cut-in (all methods)
- Tape application
- Rolling
- Spraying
- Trim painting at elevation
- Ceiling work

**Note:** Height modifier applies to wall tasks when ceiling height creates elevated work areas (e.g., cutting in at ceiling line).

---

## Room Complexity Modifiers

Complex rooms have more obstacles, more cut-in edges, and require more careful work.

### What Triggers Complexity

| Condition | Modifier | Rationale |
|-----------|----------|-----------|
| Bathroom with hardware installed | 2.0 | Fixtures, mirrors, tight spaces, high cut-in density |
| Room with cabinets | 1.5 | Upper/lower cabinet edges, masking, careful cut-in |
| Fireplace wall | 1.3 | Mantle, surround, masking, detail work |

### What Does NOT Trigger Complexity

| Element | Why Excluded |
|---------|--------------|
| Windows | Already measured in cut-in LF |
| Doors | Already measured in cut-in LF |
| Standard trim | Already measured in cut-in LF |

**Key Insight:** Windows and doors ADD linear feet of cut-in, which is already captured in the LF-based task. Complexity modifiers are for elements that make work SLOWER PER LF, not elements that add MORE LF.

### Tasks Affected by Complexity

- Cut-in (all methods)
- Tape application
- Masking
- Wall field (when complexity is extreme)

### Recording Complexity

When generating estimates, complexity should be recorded per wall or per room:
- Flag bathrooms with hardware as complexity = 2.0
- Flag cabinet walls as complexity = 1.5
- Default (simple rectangular room) = 1.0

---

## Complexity Factor — Closet Shelving Present

### Definition

This modifier applies when a closet contains **fixed shelving or organizer systems** that create significant cut-in and masking interruptions.

**PaintScope Flag Required:** `PS_ROOM_FLAG.CLOSET_SHELVING_PRESENT = TRUE`

### What Qualifies

| Condition | Qualifies? | Notes |
|-----------|------------|-------|
| Built-in wire shelving (multiple levels) | Yes | Creates numerous edge interruptions |
| Wood shelving systems | Yes | Requires careful cut-in around each shelf |
| Closet organizer systems (shelf + rod combos) | Yes | High density of edges and masking points |
| Single removable shelf | **No** | Unless wall-mounted supports/cleats remain |
| Freestanding organizers | **No** | Can be moved; no permanent edge work |

### Modifier Value

| Condition | Modifier | Rationale |
|-----------|----------|-----------|
| Closet with shelving present | **1.5x** | Frequent edge interruptions, awkward masking, detail brush work around supports |

### Tasks Affected

This modifier applies ONLY to tasks performed **inside the closet space**:

| Task Category | Affected? | Notes |
|---------------|-----------|-------|
| Cut-in (closet walls/ceiling) | **Yes** | Interrupted by shelving edges |
| Masking | **Yes** | Must mask around shelf supports, rods, brackets |
| Protection | **Yes** | Shelf surfaces require covering |
| Detail work | **Yes** | Brush work around shelf supports |
| Wall field rolling | **No** | Unless closet geometry is isolated in scope |

**Important:** This modifier does NOT globally inflate room-level field rolling. Apply only when the closet is scoped as a distinct paintable zone or when closet-specific tasks are itemized.

### Input-Driven Requirement (Non-Negotiable)

This modifier is **only active when PaintScope flag is TRUE**.

- **FAIL** if closet shelving complexity is applied without `PS_ROOM_FLAG.CLOSET_SHELVING_PRESENT` declared as a required input
- **FAIL** if modifier is assumed/defaulted without explicit PaintScope capture

### Example Application

```
Closet: Walk-in with wire shelving system
PaintScope flag: PS_ROOM_FLAG.CLOSET_SHELVING_PRESENT = TRUE

Cut-in task (closet walls):
- Base rate: 120 LF/hr
- Shelving modifier: 1.5x TIME
- Effective rate: 120 ÷ 1.5 = 80 LF/hr

Masking task (closet):
- Base rate: 200 LF/hr
- Shelving modifier: 1.5x TIME
- Effective rate: 200 ÷ 1.5 = 133 LF/hr
```

---

## Color Change Modifiers

Significant color changes affect application difficulty and coverage.

### Prerequisite: Recording Color Change

**A note must be made in the system for color change and color contrast to be recorded when known.**

Without this input, default to 1.0 (no modifier).

### Canonical Color Change Values

| Scenario | Modifier | Notes |
|----------|----------|-------|
| Light-to-light | 1.0 | No difficulty increase |
| Similar colors | 1.0 | No difficulty increase |
| Light-to-dark | 1.1 | Slight coverage challenge |
| Dark-to-light | 1.3 | May require tinted primer or third coat |
| High contrast | 1.3 | Extra care at edges, potential bleed-through |

### Tasks Affected by Color Change

- Rolling
- Spraying
- Cut-in (all methods)

### Additional Consideration: Third Coat

For dark-to-light color changes, flag potential need for:
- Tinted primer, OR
- Third finish coat

This may be a scope addition rather than just a modifier.

---

## Textured Surface Modifiers

Textured walls and ceilings affect multiple task types.

### Canonical Texture Values

| Texture Level | Modifier | Notes |
|---------------|----------|-------|
| Smooth | 1.0 | Baseline |
| Light orange peel | 1.1 | Slight coverage increase |
| Knockdown | 1.15 | Moderate texture |
| Heavy texture | 1.25 | Significant coverage and pace reduction |

### Tasks Affected by Texture

Texture modifiers apply to MORE tasks than currently specified in pilot specs:

| Task Type | Affected? | Why |
|-----------|-----------|-----|
| Tape application | Yes | Tape seals poorly on texture, requires more pressure |
| Cut-in | Yes | Brush catches on texture, slower stroke |
| Rolling | **Yes** | Texture absorbs more paint, requires slower pace |
| Spraying | **Yes** | Texture requires heavier mil, more passes |

**Correction to pilot specs:** Rolling and spraying tasks were missing texture modifiers. They should be included.

---

## Cut-in Method: Tape vs. Freehand

### Speed Comparison

**Cutting to tape is 2-3x FASTER than freehand cutting.**

| Method | Relative Speed |
|--------|----------------|
| Freehand cut-in | 1.0 (baseline) |
| Cut-to-tape | 2.0 - 3.0x faster |

### Current Pilot Spec Issue

Current pilot rates show:
- Freehand cut-in: 120 LF/hr
- Cut-to-tape: 180 LF/hr
- Ratio: 1.5x (not 2-3x)

**Action:** Field validate whether 2-3x is accurate. If confirmed, adjust cut-to-tape rates upward.

### Total Time Comparison

Cut-to-tape requires additional tasks:
- Tape application
- Tape removal
- (Optional) Edge seal with damp rag

When comparing methods, account for ALL tasks:
```
Freehand total = cut-in time only
Tape method total = tape apply + cut-to-tape + tape remove
```

Even with additional tasks, tape method is often faster for long runs and yields crisper lines.

---

## UOM Guidance for Prep Tasks

### Fill Nail Holes / Sand Repairs

| Surface Type | UOM | Rationale |
|--------------|-----|-----------|
| Walls | SF | Distributed across surface area |
| Trim | LF | Concentrated along linear elements |

### Spot Priming

| Surface Type | UOM | Rationale |
|--------------|-----|-----------|
| Walls | SF | Coverage percentage of wall area |
| Trim | LF or EA | Per repair spot or per trim run |

#### When Spot Priming Is Required

- **Raw drywall patches** — New drywall, joint compound, or mud requires spot priming to seal porosity
- **Non-paintable spackle** — Traditional spackles that are not designed to accept latex directly

#### When Spot Priming May Be Skipped

- **Paintable spackle** — Modern paintable spackles designed to accept latex directly
- **Best practice alternative:** Spot-finish patched areas with wall finish color, allow to dry, then proceed with full wall coats. This eliminates flashing without separate primer step.

#### Failure Mode: Flashing

Unprimed repairs absorb finish coat unevenly, causing visible sheen variance ("flashing"). Either spot prime or spot-finish to prevent.

### Production Rate Baselines

All prep task rates should be baselined for **QT3 (Standard)** quality tier and **Good** surface condition.

Modifiers then adjust from this baseline.

---

## Modifier Stacking

When multiple modifiers apply, they MULTIPLY (not add):

```
total_modifier = height × complexity × color_change × texture

Example:
- 10 ft ceiling (1.3)
- Bathroom with hardware (2.0)
- Dark-to-light (1.3)
- Knockdown texture (1.15)

Total = 1.3 × 2.0 × 1.3 × 1.15 = 3.88

Base 10 hours becomes 38.8 hours
```

### Sanity Check

If stacked modifiers exceed 4.0, flag for review. This may indicate:
- Scope should be broken into separate line items
- Hourly charge may be more appropriate
- Conditions warrant separate assessment

---

## Modifier Summary Table

| Factor | Values | Applies To |
|--------|--------|------------|
| Height (7-8 ft) | 1.0 | Cut-in, tape, roll, spray, trim |
| Height (9-12 ft) | 1.3 | Cut-in, tape, roll, spray, trim |
| Height (13-17 ft) | 1.5 | Cut-in, tape, roll, spray, trim |
| Height (18+ ft) | 2.0 | Cut-in, tape, roll, spray, trim |
| Complexity (bathroom w/ hardware) | 2.0 | Cut-in, tape, masking |
| Complexity (cabinet wall) | 1.5 | Cut-in, tape, masking |
| Complexity (fireplace wall) | 1.3 | Cut-in, tape, masking |
| Color (light-to-light) | 1.0 | Roll, spray, cut-in |
| Color (dark-to-light) | 1.3 | Roll, spray, cut-in |
| Texture (smooth) | 1.0 | Tape, cut-in, roll, spray |
| Texture (light) | 1.1 | Tape, cut-in, roll, spray |
| Texture (knockdown) | 1.15 | Tape, cut-in, roll, spray |
| Texture (heavy) | 1.25 | Tape, cut-in, roll, spray |

---

## Alkyd (Oil-Based) Surface Rule

When existing coating is alkyd/oil-based:

### Required Prep

- Scuff sand, OR
- Degloss, OR
- Bonding primer

### Prep Modifier

**1.2x** applied to prep tasks

### Compatibility Check

Verify primer compatibility with topcoat per PDS.

**Why:** Latex over alkyd requires proper adhesion prep. Skipping this step causes peeling.

---

## Semi-Gloss / High-Sheen Surface Rule

When existing wall coating is **semi-gloss or higher sheen**:

### Required Prep + Prime

1. Clean surface (TSP or degreaser)
2. Degloss OR scuff sand (120-150 grit)
3. Apply adhesion primer / bonding primer

### Prep Modifier

**1.2x** applied to prep tasks (similar to alkyd rule)

### Why This Is Mandatory

Semi-gloss and gloss finishes have low surface porosity. New latex paint will NOT adhere properly without mechanical or chemical surface preparation plus a bonding system. Skipping this step causes peeling and adhesion failure.

---

## References

- Field notes from professional painting contractor (2026-01-20)
- PaintFactor DevOS architecture
