# Quality Tiers and Surface Condition Doctrine

**Status:** Canonical
**Version:** 1.1
**Last Updated:** 2026-01-24

This document defines the quality tier system and surface condition classification used throughout PaintFactor. AI agents generating specs MUST use these definitions consistently.

---

## Quality Tier System

### Overview

Quality tiers define the level of workmanship, materials, and process discipline expected for a project. Higher tiers mean more care, more steps, and more time.

---

## Task Classification by Quality Tier Sensitivity

Not all tasks vary by quality tier. Tasks fall into three categories based on how quality tier affects them.

### Binary Tasks

Tasks with pass/fail outcomes that must be performed correctly regardless of quality tier. These tasks have **one standard** and **one production rate** across all tiers.

| Characteristic | Description |
|----------------|-------------|
| QT Variation | None — same task, same rate, all tiers |
| Production Rate | Single rate applies to QT2 through QT5 |
| Standard | Pass/fail — done correctly or surface fails |

**Examples:**
- Surface cleaning — dust-free or not
- Primer application — sealed and adhered or not
- Protection setup — protected or not
- Tape removal — removed or not

**Rule:** Binary tasks appear identically in all quality tiers. Quality tier does NOT permit skipping steps vital to a properly painted surface.

### QT-Conditional Tasks

Tasks that **only appear in certain quality tiers**. Lower tiers omit these tasks entirely; higher tiers include them.

| Characteristic | Description |
|----------------|-------------|
| QT Variation | Task included or excluded based on tier |
| Production Rate | Single rate for tiers where task appears |
| Standard | Defined for applicable tiers only |

**Examples:**
- Formal inspection rounds — QT4/QT5 only
- Between-coat sanding — QT4/QT5 only (QT3 spot-sands only)
- Touch-up passes — QT4/QT5 only

**Rule:** QT-conditional tasks are the primary mechanism for adding process steps at higher tiers. The task either happens or it doesn't.

### QT-Scaled Tasks

Tasks that appear in **all quality tiers** but with different production rates. Higher tiers work slower with more scrutiny.

| Characteristic | Description |
|----------------|-------------|
| QT Variation | Rate varies by tier; task always present |
| Production Rate | Different rate per QT (e.g., QT5 slower than QT3) |
| Standard | Tighter tolerance at higher tiers |

**Examples:**
- Cut-in work — slower pace, straighter lines at higher QT
- Finish coat rolling — slower pace, better lay-off at higher QT
- Caulking — more thorough at higher QT

**Rule:** QT-scaled tasks express quality through pace and tolerance, not through different procedures.

---

### Method Variants vs. Quality Tiers

**Method variants** are different ways to achieve the same outcome. Method selection is driven by efficiency, project conditions, or contractor preference — **not quality tier**.

| Method A | Method B | Outcome |
|----------|----------|---------|
| Spray + backroll | Roll only | Primed surface |
| Cut-in freehand | Cut-in to tape | Clean edge line |
| Brush trim | Spray trim | Coated trim |

**Rule:** Method variants are **configuration dimensions** (`application_method`), not quality tier differences. Both methods must achieve the selected tier's quality standard.

**Example:** Spray + backroll and roll-only are both valid for QT3 primer application. The primer must seal the surface regardless of method. Choosing spray does not change quality expectations.

---

### What Quality Tiers Do NOT Control

Quality tiers control thoroughness, tolerance, and additional process steps. They do NOT control:

| Not QT-Controlled | Why |
|-------------------|-----|
| Whether primer is applied | Binary — required for proper system |
| Whether surfaces are cleaned | Binary — required for adhesion |
| Whether protection is set up | Binary — required for mess prevention |
| Application method selection | Configuration dimension, not quality |
| Skipping steps required for durability | Never permitted at any tier |

**Principle:** Quality tiers control HOW THOROUGHLY you work, not WHETHER you work.

---

### Defect Tolerance

Defect tolerance is **task-specific** and varies by quality tier. Each task defines what level of imperfection is acceptable at each tier.

**Structure:**
```
Task: TASK_CUTIN_FINISH_WALL
├─ QT2: Visible wobble acceptable if coverage complete
├─ QT3: Reasonably straight line, minor wobble acceptable at distance
├─ QT4: Clean line, no visible wobble at 3 feet
└─ QT5: Crisp line, no visible wobble at arm's length
```

**Why task-specific:** Different tasks have different quality indicators. A cut-in line has different tolerance criteria than a rolled field area or a sanded surface.

**Rule:** Defect tolerance must be defined per task in `production.json`, not as a global QT definition.

---

### The Five Quality Tiers

| Tier | Name | Global Modifier | Description |
|------|------|-----------------|-------------|
| QT2 | Minimal | 0.8 | Economy work, no warranty |
| QT3 | Standard | 1.0 | Baseline residential/commercial |
| QT4 | Premium | 1.3 | Enhanced process discipline |
| QT5 | Superior | 1.5* | Highest fixed-price tier |
| QT6 | Superior+ | Hourly | Beyond fixed pricing |

*QT5 modifier applies only when substrate is in Good condition. See condition gate below.

---

## QT2 — Minimal

### Definition

Economy-tier work focused on basic coverage and mess mitigation. Aesthetics are NOT the priority.

### Characteristics

- No warranty
- Cheap materials acceptable
- Minimal to no prep
- Minimal coats (often single coat)
- Properly painted surface maintained, but quality is secondary

### Typical Use Cases

- Apartments (turnover repaints)
- Insurance projects (HUD, quick restoration)
- Quick color change projects
- Properties being sold "as-is"
- Budget-constrained work

### Global Modifier

**0.8** — Tasks are performed faster because quality checkpoints are skipped.

### What QT2 Does NOT Mean

- Does not mean "sloppy" — work should still be professional
- Does not mean "no floor protection" — mess mitigation is required
- Does not mean "visible defects acceptable" — just less scrutiny on minor imperfections

---

## QT3 — Standard

### Definition

Baseline quality tier for typical residential and commercial painting. This is the default assumption for all production rates.

### Characteristics

- Standard materials (mid-grade paints, standard consumables)
- Proper prep (fill holes, light sand, clean surfaces)
- Standard coat count (typically 2 coats finish)
- Professional edge work (cut-in or tape as appropriate)
- Standard inspection before completion

### Typical Use Cases

- Homeowner repaints
- Standard commercial refreshes
- Most residential new construction
- Default when quality not specified

### Global Modifier

**1.0** — Baseline. All rates are calibrated to QT3.

---

## QT4 — Premium

### Definition

Enhanced quality tier with increased process discipline and attention to detail.

### Characteristics

- Premium materials (higher-grade paints, better consumables)
- Thorough prep (more careful patching, light sand between coats)
- Tighter edge discipline (tape lines more common, crisper cut-in)
- More careful inspection
- Higher labor investment per unit

### Typical Use Cases

- High-end residential
- Visible commercial spaces (lobbies, showrooms)
- Projects where client has expressed quality concerns
- Homes with high resale value priority

### Global Modifier

**1.3** — All tasks receive 1.3x time modifier.

### What Changes at QT4

| Aspect | QT3 (Standard) | QT4 (Premium) |
|--------|----------------|---------------|
| Prime-to-finish sand | Light sand 120 grit | Full sand |
| Sanding between coats | Spot sand patches only | Full sand between coats |
| Edge work | Acceptable if neat | Must be crisp |
| Inspection | Quick visual | Thorough, raking light |
| Touch-up | Minimal | As needed for perfection |
| Maximum wall sheen | Eggshell | Any (Semi-Gloss/Gloss allowed) |

---

## QT5 — Superior

### Definition

Highest fixed-price quality tier. Maximum care and discipline within estimable scope.

### Characteristics

- Premium materials throughout
- Full sand and inspection between coats
- Straight-line edge outcome expected (method selectable)
- Additional inspection rounds
- Maximum labor investment per unit

### The Condition Gate — CRITICAL

**QT5 is condition-dependent:**

| Substrate Condition | QT5 Behavior |
|---------------------|--------------|
| Good | Apply 1.5x modifier to all tasks, including additional rounds |
| Fair | **DO NOT apply modifier** — work is charged hourly |
| Poor | **DO NOT apply modifier** — work is charged hourly |

### Why the Condition Gate Exists

When substrate is in Fair or Poor condition at QT5 expectations:
- Repair scope is unpredictable
- Time investment is highly variable
- Fixed-price estimation becomes unreliable
- Hourly tracking protects both contractor and client

### Typical Use Cases (Good Condition)

- Showcase homes
- Museum/gallery quality requirements
- Premium custom homes
- Projects where "flawless" is the expectation

### Global Modifier

**1.5** (Good condition only)

---

## QT6 — Superior+ (Hourly)

### Definition

Beyond fixed-price estimation. Work is tracked hourly due to unpredictable scope or extreme quality requirements.

### When to Use QT6

- Any QT5 work where substrate is Fair or Poor condition
- Restoration work
- Historic preservation
- Specialty finishes requiring artisan techniques
- When client demands perfection but conditions are unknown

### Estimation Approach

- Provide hourly labor rate
- Estimate range (not fixed hours)
- Track actual time
- Bill accordingly

### No Global Modifier

QT6 does not use task modifiers. Time is tracked directly.

---

## Quality Tier Summary

| Tier | Modifier | Prep Level | Edge Quality | Inspection | Coat Discipline |
|------|----------|------------|--------------|------------|-----------------|
| QT2 | 0.8 | Minimal | Acceptable | Quick | Single/minimal |
| QT3 | 1.0 | Standard | Professional | Standard | Standard 2-coat |
| QT4 | 1.3 | Thorough | Crisp | Thorough | 2-coat + sand |
| QT5 | 1.5* | Maximum | Straight-line | Multiple | Full discipline |
| QT6 | Hourly | As needed | As needed | Continuous | As required |

---

## Sanding Standards by Quality Tier

### Overview

Sanding requirements increase with quality tier. This table defines the minimum sanding expectations for each tier.

### Sanding Requirements Table

| Quality Tier | Prime-to-Finish Sanding | Between Finish Coats | Notes |
|--------------|-------------------------|----------------------|-------|
| QT2 | None | None | No sanding, no patching |
| QT3 | Light sand with 120 grit | Spot sand patches only if necessary | Standard residential |
| QT4 | Full sand | Spot sand as needed + full sand between coats | Enhanced process discipline |
| QT5 | Full sand | Same as QT4 | More scrutiny on inspection and patchwork. Slower working speed. |

### Sanding Method Guidance

| Sanding Type | Grit | Tool | Application |
|--------------|------|------|-------------|
| Light sand (QT3) | 120 | Sanding block or pole sander | Scuff primer surface for adhesion |
| Full sand (QT4/QT5) | 120-150 | Pole sander for walls, block for detail | Smooth entire surface, feather edges |
| Between coats (QT4/QT5) | 220 | Pole sander or sanding sponge | Light pass to remove dust nibs, smooth texture |
| Spot sand patches | 150-220 | Sanding block | Blend repair edges, smooth patch compound |

### Critical Notes

- **QT2:** Explicitly NO sanding. If sanding is required for adhesion, quality tier should be upgraded to QT3 minimum.
- **QT3:** Sanding is for adhesion preparation, not perfection. Spot sanding patches is reactive (only if needed).
- **QT4:** Full sanding is proactive — entire surface receives attention. Sand between coats is standard.
- **QT5:** Same sanding as QT4 but with slower execution speed and more thorough inspection before/after.

---

## Sheen and Quality Tier Minimums

### The Rule

**Higher sheen finishes require higher quality tiers.** Sheen reveals surface imperfections — the shinier the finish, the more visible every flaw.

### Maximum Sheen by Quality Tier

| Quality Tier | Maximum Sheen on Walls | Rationale |
|--------------|------------------------|-----------|
| QT2 | Flat or Matte | Higher sheens show imperfections; QT2 prep is insufficient |
| QT3 | Eggshell | Standard prep supports moderate sheen |
| QT4 | Any (including Semi-Gloss, Gloss) | Enhanced prep and sanding support higher sheens |
| QT5 | Any (including Semi-Gloss, Gloss) | Maximum prep supports all sheens |

### Automatic Quality Tier Upgrade Rule

**If the specified sheen exceeds the quality tier maximum, automatically upgrade the quality tier.**

| Requested Sheen | Minimum Quality Tier |
|-----------------|---------------------|
| Flat | QT2 |
| Matte | QT2 |
| Eggshell | QT3 |
| Satin | QT4 |
| Semi-Gloss | QT4 |
| Gloss | QT4 |

### Why This Matters

Semi-gloss and gloss finishes:
- Show every roller stipple mark
- Reveal brush strokes
- Highlight surface imperfections (bumps, ridges, patches)
- Require sanding between coats for acceptable results

Attempting high-sheen work at QT3 or below results in:
- Visible defects in finished work
- Customer complaints
- Rework costs
- Reputation damage

### Exception: Trim vs. Walls

This rule applies to **walls and ceilings**. Trim is typically painted at higher sheens (semi-gloss, gloss) regardless of wall quality tier because:
- Trim is smaller, more controlled
- Factory finish or well-prepared wood
- Different prep/paint system than walls

---

## Surface Condition Classification

### Scope

Surface conditions apply to **repairable surfaces** — those that can be improved with spackle, skimcoat, or similar repair materials.

**Primary application:** Drywall, plaster, previously painted surfaces

### What Surface Condition Does NOT Cover

**Drywall patches requiring new drywall, compound, or tape** are NOT covered by surface condition.

These are separate scope items calculated by:
- Square footage of patch
- Complexity of patch (corner, field, ceiling)
- Number of patches

Do not blend major drywall repair into surface condition modifiers.

---

## The Three Conditions

### Good Condition

| Indicator | Description |
|-----------|-------------|
| Repairs | Minor nail holes only |
| Cleaning | Light dust, no stains |
| Surface prep | Minimal scuff sand if any |
| Caulk | Minor touch-up only |

**Prep modifier:** 1.0 (baseline)

### Fair Condition

| Indicator | Description |
|-----------|-------------|
| Repairs | Moderate damage — multiple holes, some cracks |
| Cleaning | May need TSP wash, stain treatment |
| Surface prep | Scuff sand required |
| Caulk | Gaps need filling |
| Patches | Multiple spackle repairs needed |

**Prep modifier:** 1.5

### Poor Condition

| Indicator | Description |
|-----------|-------------|
| Repairs | Many repairs required |
| Skimcoat | May be needed for uniformity |
| Cleaning | Significant contamination |
| Surface prep | Full surface sand required |
| Assessment | Difficult to estimate fixed price |

**Prep modifier:** 2.0 OR charge hourly

### When to Charge Hourly for Poor Condition

If substrate is Poor AND quality tier is QT4 or QT5:
- Do not attempt fixed-price prep estimation
- Track prep time hourly
- Apply finish task modifiers normally once prep is complete

---

## Condition + Quality Tier Matrix

| Condition | QT2 | QT3 | QT4 | QT5 |
|-----------|-----|-----|-----|-----|
| Good | 0.8 | 1.0 | 1.3 | 1.5 |
| Fair | 0.8 × 1.5 prep | 1.0 × 1.5 prep | 1.3 × 1.5 prep | Hourly |
| Poor | 0.8 × 2.0 prep | 1.0 × 2.0 prep | Hourly | Hourly |

**Reading the matrix:**
- Quality tier modifier applies to ALL tasks
- Condition modifier applies to PREP tasks only
- "Hourly" means fixed-price estimation is not appropriate

---

## Applying Condition Modifiers

### Which Tasks Are Affected

Condition modifiers apply to **prep tasks only**:

- Cleaning walls
- Scuff sanding
- Filling holes/cracks
- Sanding repairs
- Caulking gaps
- Spot priming

### Which Tasks Are NOT Affected

Condition does NOT modify:
- Finish coat application
- Edge work (cut-in, tape)
- Protection setup/teardown
- Final inspection

**Why:** Once prep is complete, finish application difficulty is driven by the prepared surface, not the original condition.

---

## Recording Condition

Surface condition should be recorded:
- Per room (residential)
- Per area/zone (commercial)
- As overall project default with room exceptions

**Input options:**
- Good (default if not specified)
- Fair
- Poor

---

## Special Cases

### New Construction

New construction typically has:
- Primed drywall (Good or Fair depending on drywall finish quality)
- No contamination
- Predictable prep scope

Default to **Good condition** unless drywall finish quality is known to be poor.

### Repaint with Unknown History

When repainting and history is unknown:
- Assume **Fair condition** as conservative default
- Adjust after site inspection

### Water/Smoke Damage

Water or smoke damage is a separate scope item:
- Requires stain-blocking primer
- May require remediation before painting
- Do not classify as "Poor condition" — classify as additional scope

---

## References

- Field notes from professional painting contractor (2026-01-20)
- PaintFactor DevOS architecture
- Pilot spec quality_effects structures
