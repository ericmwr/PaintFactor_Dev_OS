# Quality Tiers and Surface Condition Doctrine

**Status:** Canonical
**Version:** 1.3
**Last Updated:** 2026-02-03

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

### Application Quality Is Not Tiered

**MANDATORY DOCTRINE:** A properly painted surface — free of drips, sags, holidays, and lap marks — is the baseline expectation at EVERY quality tier, including QT2. There is no tier at which application defects are acceptable.

Quality tiers control:
- **Inspection scrutiny** — how carefully and how many times you look
- **Sanding and patchwork** — between-coat prep steps added at higher tiers
- **Time and pace** — slower, more deliberate work at higher tiers
- **Material quality** — higher-grade products at higher tiers

Quality tiers do NOT control:
- **Application quality** — all tiers require a properly painted surface per PCA standards
- **Defect acceptance** — drips, sags, holidays, and lap marks are NEVER acceptable at any tier

**Agent rule:** When writing `quality_notes` on application tasks (roll, spray, backroll, brush), agents MUST NOT write tier-differentiated notes that imply lower tiers accept application defects. Use `"all"` key to state the universal standard. Tier-specific notes may only add ADDITIONAL requirements (e.g., mil thickness verification at QT5), never reduce the baseline.

**Wrong:**
```
"QT2": "Full coverage, minor lap marks acceptable"
"QT3": "Even coverage, no holidays"
```

**Right:**
```
"all": "All tiers: properly painted surface per PCA. No drips, sags, holidays, or lap marks."
"QT5": "Additional: verify consistent mil thickness"
```

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

### QT2 Surface Eligibility — Marginally Prepared Surfaces

Quality Tier 2 is fundamentally a **maintenance/repaint tier** for marginally prepared surfaces. The defining characteristic of QT2 is that surface defects are assessed for *paintability*, not remediated for appearance.

#### Substrate Completeness Threshold (Below QT2)

Before any quality tier applies, the substrate must meet minimum completeness requirements:

| Condition | Classification |
|-----------|----------------|
| Holes or voids exposing structure/cavities | **Not paintable** — restore to completeness first |
| Missing portions of components (trim, casing, etc.) | **Not paintable** — replace missing elements first |
| Active structural failure (rot, crumbling substrate) | **Not paintable** — structural repair required first |
| Complete surface with cosmetic defects | **QT2 eligible** — assess for paintability |

**Principle:** You cannot paint what isn't there. Restoration to substrate completeness is not QT2 prep — it is making the surface exist.

#### The Paintability Assessment

At QT2, the question is not "does this surface have defects?" but "is this surface stable enough to accept and hold a coating?"

**The Putty Knife Test:** If legacy coating cannot be lifted or removed with a dull putty knife, it is considered "tightly adhered" and acceptable as a foundation for QT2 application. This is the definitive boundary between paintable and requires-remediation.

**QT2 Paintability Criteria:**
- Legacy coating is tightly adhered (passes putty knife test)
- No active failure mode (ongoing delamination, moisture intrusion, contamination)
- Substrate is structurally sound and complete
- Surface can accept coating without immediate adhesion failure

#### QT2 vs. QT3 Threshold

**QT2 (Paintability Only):** No inspection for defects to fix. Assessment is for paintability only. Defects that exist before painting will exist after painting.

**QT3 (Inspection and Remediation):** Inspect and remediate. Surface is improved to meet an appearance standard before coating. Spackle and caulk are used to make surfaces appear more seamless and without defect.

**Threshold Statement:** When the client requires surface defects to be addressed prior to coating, the project exceeds QT2 scope and requires QT3 minimum.

#### QT2 Drivers (Priority Order)

1. Speed
2. Budget
3. Basic coverage and protection
4. Acceptable appearance (not embarrassing, but not scrutinized)

#### Profile Tolerance at QT2

Per PCA P14 Level 2, surface profile differences up to **1/8 inch (125 mils)** are acceptable without correction. Compare to:
- QT3: 1/8 inch (125 mils) — same tolerance, focus is on prep not profile
- QT4: 1/16 inch (62.5 mils)

#### What QT2 Excludes (Defined by Omission)

- No texture matching on patches
- No filling of tight pitting or minor surface irregularities
- No sanding for appearance
- No complex sealing — standard painter's caulk only
- No total strip-down of adhered legacy coatings
- No anchor profile creation
- No inspection rounds for cosmetic defects

#### Expected Service Life

QT2 coating systems on marginally prepared surfaces typically achieve **5-7 years** service life versus 15-20 years for premium preparation. This is the tradeoff clients accept when choosing this tier.

#### Typical QT2 Use Cases

- Apartment turnover repaints
- Pre-sale property refreshes
- Rental property maintenance
- Budget-constrained projects
- Temporary or short-term occupancy
- Code compliance applications

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

### QT4 Surface Eligibility — Enhanced Process Discipline

Quality Tier 4 represents **proactive defect management** versus QT3's reactive approach. The defining characteristic of QT4 is that surfaces are improved through systematic preparation steps regardless of whether defects are immediately visible.

#### QT3 vs. QT4 Threshold

**QT3 (Reactive):** Inspect and address visible defects. Spot-sand patches when necessary. Standard visual inspection confirms acceptable appearance.

**QT4 (Proactive):** Systematic preparation of entire surfaces regardless of visible defect presence. Full sanding between coats. Thorough inspection with raking light to reveal defects not visible under normal lighting.

**Threshold Statement:** When the project requires higher sheen finishes (satin, semi-gloss, gloss), systematic sanding discipline, or enhanced inspection rigor, the project requires QT4 minimum.

#### The Sheen Gate

Higher sheen finishes reveal surface imperfections that lower sheens hide. This creates a hard requirement:

| Sheen | Minimum Quality Tier |
|-------|---------------------|
| Flat, Matte | QT2 |
| Eggshell | QT3 |
| Satin | QT4 |
| Semi-Gloss | QT4 |
| Gloss | QT4 |

**Automatic Upgrade Rule:** If specified sheen exceeds the quality tier's maximum, automatically upgrade the quality tier. You cannot deliver acceptable semi-gloss results with QT3 prep.

#### Profile Tolerance at QT4

Surface profile differences exceeding **1/16 inch (62.5 mils)** must be corrected at QT4. Compare to:
- QT2: 1/8 inch (125 mils)
- QT3: 1/8 inch (125 mils)
- QT5: 1/32 inch (31.25 mils)

#### Sanding Discipline Comparison

| Stage | QT3 | QT4 |
|-------|-----|-----|
| Prime-to-finish | Light sand, 120 grit | Full sand, 120-150 grit |
| Between finish coats | Spot sand patches only (if necessary) | Full sand, 220 grit (standard) |
| Approach | Reactive — sand where needed | Proactive — sand everything |

#### Inspection Discipline Comparison

| Aspect | QT3 | QT4 |
|--------|-----|-----|
| Method | Quick visual | Thorough with raking light |
| Timing | Before completion | Multiple checkpoints |
| Defect threshold | Visible at 39 inches | Visible under directional light |
| Touch-up | Minimal | As needed for quality standard |

#### Edge Work Comparison

| Aspect | QT3 | QT4 |
|--------|-----|-----|
| Standard | Acceptable if neat | Must be crisp |
| Cut-in tolerance | Minor wobble acceptable at distance | No visible wobble at 3 feet |
| Method | Contractor's choice | Tape lines more common |

#### QT4 Drivers (Priority Order)

1. Appearance standard (client has expressed quality concerns)
2. Higher sheen requirements
3. Longevity and durability
4. Resale value consideration
5. Then speed/budget as constraints

#### What QT4 Adds Over QT3

- **Full surface sanding** — entire surface receives attention, not just problem areas
- **Between-coat sanding** — 220 grit full sand between finish coats is standard
- **Thorough inspection** — raking light inspection reveals defects invisible under ambient lighting
- **Tighter edge discipline** — crisp lines expected, tape more commonly used
- **Touch-up passes** — additional touch-up as needed to meet quality standard
- **Higher-grade materials** — premium paints with better flow and leveling

#### What QT4 Does NOT Include

QT4 is still a fixed-price tier with predictable scope. It does not include:
- Substrate condition remediation beyond standard patching
- Multiple inspection cycles with client sign-off
- Controlled environment requirements (dust-free, humidity controlled)
- Specialty finish systems (conversion varnish, lacquer)

When substrate condition is Fair or Poor and QT4+ expectations are required, the project moves to hourly billing (QT6).

#### Typical QT4 Use Cases

- Higher-end residential interiors
- Semi-gloss or gloss wall applications
- Trim in standard+ residential (semi-gloss is default)
- Commercial spaces where appearance matters (lobbies, conference rooms)
- Exterior front elevations
- Any surface where client has expressed quality concerns

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

## Line-Item Quality Tier Assignment

Real projects frequently require different quality tiers for different surfaces. A kitchen might need QT4 cabinets but QT3 ceilings. A basement might be QT2 while the main floor is QT4. The estimation system must support mixed-tier projects with line-item granularity.

### Assignment Hierarchy

Quality tier can be assigned at multiple levels, with more specific assignments overriding general ones:

| Level | Scope | Example |
|-------|-------|---------|
| Project Default | Entire project | "This is a QT3 project" |
| Room Override | All surfaces in room | "Master bedroom is QT4" |
| Surface-Type Override | Surface type within room | "Master bedroom ceiling is QT3" |
| Surface-Instance Override | Individual surface | "Accent wall behind bed QT5" |

**Resolution Rule:** Most specific assignment wins. If no override exists, inherit from parent level.

### Typical Mixed-Tier Scenarios

**Residential Interior:**

| Surface | Typical QT | Rationale |
|---------|------------|-----------|
| Living/dining walls | QT3-QT4 | Visible, guest-facing |
| Bedroom walls | QT3 | Standard residential |
| Basement walls | QT2 | Utility space |
| Bathroom walls | QT4 | Higher sheen requirement |
| All trim | QT4 | Semi-gloss standard |
| Garage ceiling | QT2 | Minimal concern |
| Kitchen ceiling | QT3 | Standard |

**Commercial Interior:**

| Surface | Typical QT | Rationale |
|---------|------------|-----------|
| Lobby/reception walls | QT4 | First impression space |
| Back office walls | QT3 | Standard |
| Warehouse walls | QT2 | Utility/industrial |
| Restroom walls | QT4 | Higher sheen, durability |
| Mechanical room | QT2 | Code compliance only |

**Exterior:**

| Surface | Typical QT | Rationale |
|---------|------------|-----------|
| Front elevation siding | QT4 | Curb appeal |
| Side/rear siding | QT3 | Less visible |
| Fascia/soffits (street-facing) | QT4 | Visible from ground |
| Fascia/soffits (rear) | QT3 | Less scrutiny |
| Garage door | QT3 | Standard |
| Front entry door | QT4-QT5 | Focal point |

### PaintScope Implementation

PaintScope must capture quality tier assignment at the appropriate granularity:

```json
{
  "PS_QUALITY_TIER": {
    "project_default": "QT3",
    "room_overrides": [
      {
        "room_id": "master_bedroom",
        "default": "QT4",
        "surface_overrides": [
          {
            "surface_type": "ceiling",
            "quality_tier": "QT3"
          }
        ]
      },
      {
        "room_id": "basement",
        "default": "QT2"
      }
    ],
    "surface_instance_overrides": [
      {
        "surface_id": "living_room_accent_wall_north",
        "quality_tier": "QT5"
      }
    ]
  }
}
```

### Estimation Engine Implementation

The estimation engine must:

1. **Resolve QT per line item** — Walk the assignment hierarchy to determine effective QT for each surface
2. **Apply correct modifier** — Use line-item QT modifier, not project-level
3. **Validate sheen/QT compatibility** — Flag conflicts where specified sheen exceeds QT maximum
4. **Aggregate labor correctly** — Sum labor across mixed QT line items without averaging

**Example Calculation:**

```
Living Room Walls (400 SF) @ QT3 × 1.0 = base labor
Master Walls (350 SF) @ QT4 × 1.3 = enhanced labor
Basement Walls (600 SF) @ QT2 × 0.8 = economy labor
---
Total = sum of individual line items, NOT (1350 SF × average modifier)
```

### Cross-Surface Consistency Considerations

Some quality tier assignments create implicit requirements on adjacent surfaces:

| If This Surface Is... | Then Consider... |
|-----------------------|------------------|
| Walls at QT4+ | Ceiling cut-in edge work should match wall QT |
| Trim at QT4+ | Wall-to-trim transition quality should match |
| Accent wall at QT5 | Adjacent walls may need QT4 minimum for seamless transition |

**Edge Work Rule:** When two adjacent surfaces have different quality tiers, edge work at the junction is performed to the **higher** of the two tiers. The cut-in line belongs to both surfaces.

### Proposal Display

Proposals should make quality tier visible to clients per line item:

```
INTERIOR PAINTING - MAIN LEVEL

Living Room
  Walls (420 SF) .............. QT3 Standard ....... $XXX
  Ceiling (380 SF) ............ QT3 Standard ....... $XXX
  Trim (145 LF) ............... QT4 Premium ........ $XXX

Master Bedroom
  Walls (510 SF) .............. QT4 Premium ........ $XXX
  Ceiling (290 SF) ............ QT3 Standard ....... $XXX
  Trim (98 LF) ................ QT4 Premium ........ $XXX

Basement
  Walls (840 SF) .............. QT2 Economy ........ $XXX
  Ceiling (720 SF) ............ QT2 Economy ........ $XXX
```

This transparency helps clients understand why some line items cost more and gives them agency to adjust tiers based on their priorities.

### Client Consultation Prompts

During scope definition, prompt clients with tier-relevant questions:

- "Are there any rooms where appearance is especially important to you?"
- "Any spaces where you just need basic coverage — utility rooms, storage areas?"
- "Do you have any high-sheen finish requirements? Satin or semi-gloss on walls?"
- "Is there a focal point — an accent wall or entry area — where you want extra attention?"

Map responses to appropriate QT assignments.

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
