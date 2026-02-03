# PaintFactor System Update — February 2026

**Status:** DRAFT  
**Version:** 1.0  
**Created:** 2026-02-03  
**Author:** Eric / Claude  
**Purpose:** Unified rollout combining Mask Level Definitions and Quality Tier Doctrine Amendment

---

## Overview

This document consolidates two independent doctrine updates into a single coordinated system update:

| Update | Scope | Files Affected |
|--------|-------|----------------|
| **A: Mask Level Definitions** | Standardize 3-tier mask terminology across protection documentation | 4 files + 1 schema fix |
| **B: Quality Tier Expansion** | Expand QT2/QT4 definitions; add line-item QT assignment | 1 file + audit |

**Execution Order:** Updates A and B have no cross-dependencies and can be executed in either order or parallel sessions.

---

## Part A: Mask Level Definitions

### Summary

Introduces standardized `mask_level` vocabulary that describes coverage intent based on application method:

| Mask Level | Components | Coverage Intent | Maps to `protection_level` |
|------------|------------|-----------------|---------------------------|
| `light_mask` | Tape line only | Edge protection; surface exposed | `edge_only` |
| `heavy_mask` | Tape + border drape | Overspray buffer zone | `partial_cover` |
| `full_mask` | Tape + complete encapsulation | Full surface protection | `full_cover` |

**Key Principle:** Mask level describes coverage intent, not material selection.

### A.1: Update Protection_and_Masking_Doctrine.md

**Target:** `Claude/docs/Doctrine/Protection_and_Masking_Doctrine.md`

**Instruction:** Add new section AFTER "Masking Adjacent Surfaces" and BEFORE "Plastic Sheeting Types"

**Content to Insert:**

```markdown
---

## Mask Level Definitions

Mask levels standardize masking terminology based on coverage intent, not material selection.

### Three-Tier System

| Mask Level | Components | Coverage Intent | Primary Use Case |
|------------|------------|-----------------|------------------|
| `light_mask` | Tape line only | Edge protection only; surface remains exposed | Brush/roll work requiring clean edge to cut into |
| `heavy_mask` | Tape line + border drape | Protective border around item being protected | Spray work requiring overspray buffer zone |
| `full_mask` | Tape line + complete encapsulation | Entire surface covered | Protecting finished surfaces from spray fallout |

### Key Principle

**Mask level describes coverage intent, not material selection.** Material choices are situational within each level.

| Mask Level | Typical Materials |
|------------|-------------------|
| `light_mask` | 1.5" or 2" painter's tape |
| `heavy_mask` | Tape + 12"-24" paper, or 4' masking film |
| `full_mask` | Tape + 6'-9' film, visqueen, or bulk plastic |

### Application Method Guidance

| Application Method | Typical Mask Level | Rationale |
|--------------------|-------------------|-----------|
| Brush only | `light_mask` | Minimal fallout; tape provides cut-in edge |
| Brush/roll | `light_mask` | Standard approach; splatter risk is low |
| Roll only | `light_mask` to `heavy_mask` | Splatter risk on surfaces below |
| Spray | `heavy_mask` to `full_mask` | Overspray requires buffer or encapsulation |

### Operational Example: Cabinets

| Scenario | Mask Level | Implementation |
|----------|------------|----------------|
| Brush/roll walls adjacent to cabinets | `light_mask` | Tape line at wall-cabinet edge to cut into |
| Spray ceilings with cabinets below | `heavy_mask` | Tape + drape covering cabinet tops and faces |
| Spray work requiring full cabinet isolation | `full_mask` | Tape + plastic wrapped tight around cabinet boxes |

### Relationship to Protection Level Schema

| Mask Level | Maps to `protection_level` |
|------------|---------------------------|
| `light_mask` | `edge_only` |
| `heavy_mask` | `partial_cover` |
| `full_mask` | `full_cover` |

---
```

**Post-edit:** Verify document flow; update table of contents if present.

---

### A.2: Update Spec_Completeness_Doctrine.md

**Target:** `Claude/docs/Doctrine/Spec_Completeness_Doctrine.md`

**Instruction:** Locate the "Protection Levels" table in Layer 1: Protection Zones section and replace with alias-enhanced version.

**Find:**
```markdown
| Level | Description | Typical Materials | When Used |
|-------|-------------|-------------------|-----------|
| `edge_only` | Tape line at junction only | 1.5" tape | Brush/roll adjacent to asset |
| `partial_cover` | Horizontal surfaces + edge | Paper/plastic on tops + tape | Brush/roll with drip risk |
| `full_cover` | Entire exposed surface | Plastic sheeting, taped edges | Spray adjacent to asset |
```

**Replace with:**
```markdown
| Level | Alias | Description | Typical Materials | When Used |
|-------|-------|-------------|-------------------|-----------|
| `edge_only` | `light_mask` | Tape line at junction only | 1.5" tape | Brush/roll adjacent to asset |
| `partial_cover` | `heavy_mask` | Border coverage with drape | Paper/film on border + tape | Spray buffer zone; drip risk areas |
| `full_cover` | `full_mask` | Entire exposed surface encapsulated | Plastic sheeting, taped edges | Spray adjacent to asset; full protection |

> **Mask Level Alias:** The alias column provides operational terminology commonly used in SOP documentation. See Protection_and_Masking_Doctrine.md § Mask Level Definitions for detailed guidance.
```

---

### A.3: Update Materials Manager Agent

**Target:** `Claude/agents/materials-manager.md`

**Instruction:** Locate the "Protection Level to Material Mapping" table and replace with alias-enhanced version.

**Find:**
```markdown
| Protection Level | Description | Typical Materials | Material Coverage |
|-----------------|-------------|-------------------|-------------------|
| `edge_only` | Tape line at junction only | 1.5" painter's tape | LF of junction |
| `partial_cover` | Horizontal surfaces + edge | Paper/plastic on tops + tape | SF of horizontal + LF of edge |
| `full_cover` | Entire exposed surface | Plastic sheeting, taped edges | SF of full surface + LF of perimeter tape |
```

**Replace with:**
```markdown
| Protection Level | Mask Level Alias | Description | Typical Materials | Material Coverage |
|-----------------|------------------|-------------|-------------------|-------------------|
| `edge_only` | `light_mask` | Tape line at junction only | 1.5" painter's tape | LF of junction |
| `partial_cover` | `heavy_mask` | Border drape + edge | Tape + 12"-24" paper or 4' film | SF of border + LF of edge |
| `full_cover` | `full_mask` | Complete surface encapsulation | Tape + 6'-9' film, visqueen, bulk plastic | SF of full surface + LF of perimeter |
```

---

### A.4: Schema Consistency Audit

**Instruction:** Search the following files for inconsistent usage of `light_mask` or `full_mask`:

1. `Claude/specs/_schemas/spec.schema.json`
2. `Claude/specs/_schemas/sop_modules.schema.json`
3. `Claude/docs/Reference/Protection_Zones_Reference.md`
4. `Claude/docs/Doctrine/Interior_Protection_Doctrine_Final.md`

**Validation criteria:**
- `light_mask` = tape line only (alias for `edge_only`)
- `heavy_mask` = tape + border drape (alias for `partial_cover`)
- `full_mask` = tape + complete encapsulation (alias for `full_cover`)

Report any inconsistencies and propose corrections.

---

### A.5: Schema Fix — adjacent_state_protection_rules Enum

**Target:** `Claude/specs/_schemas/spec.schema.json`

**Issue:** The `adjacent_state_protection_rules.protection_level` enum (around line 421) currently uses mixed vocabulary:
```json
"enum": ["none", "light_mask", "full_mask", "full_cover"]
```

This is inconsistent because:
- It includes `light_mask` and `full_mask` but omits `heavy_mask`
- It mixes alias (`full_mask`) with primary vocabulary (`full_cover`)

**Find:**
```json
"protection_level": {
  "type": "string",
  "enum": ["none", "light_mask", "full_mask", "full_cover"],
  "description": "Masking intensity for adjacent finished surfaces"
}
```

**Replace with:**
```json
"protection_level": {
  "type": "string",
  "enum": ["none", "light_mask", "heavy_mask", "full_mask"],
  "description": "Masking intensity for adjacent finished surfaces. Uses mask level aliases: light_mask (edge_only), heavy_mask (partial_cover), full_mask (full_cover)."
}
```

**Rationale:** The `adjacent_state_protection_rules` context describes masking intensity for finished surfaces during adjacent work. The mask level vocabulary (`light_mask`, `heavy_mask`, `full_mask`) is more intuitive here than the abstract `protection_level` terms. Standardizing to complete mask level vocabulary ensures consistency with this update.

---

## Part B: Quality Tier Doctrine Expansion

### Summary

Expands QT2 and QT4 definitions with clear boundary criteria and implements line-item quality tier assignment for mixed-tier projects.

**Key additions:**
- QT2 Surface Eligibility — Marginally Prepared Surfaces (putty knife test)
- QT4 Surface Eligibility — Enhanced Process Discipline (sheen gate)
- Line-Item Quality Tier Assignment (inheritance hierarchy)

---

### B.1: Update Quality_Tiers_and_Surface_Condition.md

**Target:** `Claude/docs/Doctrine/Quality_Tiers_and_Surface_Condition.md`

**Instructions:**

1. Insert "QT2 Surface Eligibility" section AFTER existing "What QT2 Does NOT Mean" section
2. Insert "QT4 Surface Eligibility" section AFTER existing "What Changes at QT4" table
3. Add "Line-Item Quality Tier Assignment" section AFTER "Quality Tier Summary" table and BEFORE "Sanding Standards by Quality Tier"
4. Update document version to 1.3 and Last Updated to 2026-02-03

---

#### B.1a: QT2 Surface Eligibility — Marginally Prepared Surfaces

**Insert after "What QT2 Does NOT Mean":**

```markdown
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
```

---

#### B.1b: QT4 Surface Eligibility — Enhanced Process Discipline

**Insert after "What Changes at QT4" table:**

```markdown
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
```

---

#### B.1c: Line-Item Quality Tier Assignment

**Insert after "Quality Tier Summary" table and before "Sanding Standards by Quality Tier":**

```markdown
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
```

---

### B.2: Post-Update Audit — QT2 Coverage Gap Analysis

**Execute after B.1 is complete.**

**Objective:** Identify all specs and system files needing QT2 coverage.

**Scope:**
1. All spec families in `/specs/` directory
2. All `production.json` files
3. All `sop_modules.json` files
4. All `materials.json` files
5. Schema files defining `quality_tier` enums
6. Validation scripts checking QT coverage

**Audit Criteria:**
- Flag specs defining QT3-QT5 but omitting QT2
- Flag production rates lacking QT2 modifier definitions
- Flag SOP modules lacking QT2 procedural variants
- Flag material systems lacking QT2-appropriate options
- Note specs where QT2 is intentionally excluded (document rationale)

**Output Format:**

| File | Current Coverage | QT2 Status | Action |
|------|------------------|------------|--------|
| `specs/SF_DRYWALL_WALL_NC_FINISH/production.json` | QT3-QT5 | Missing | Add QT2 rates |
| `specs/SF_TRIM_INT_NC_FINISH/spec.json` | QT3-QT5 | Missing | Add QT2 config |
| `specs/SF_MILLWORK_NC_LACQUER/spec.json` | QT5-QT6 | Intentionally Excluded | QT2 incompatible with lacquer |

**Priority for updates:**
1. Core specs (drywall, trim, ceilings) — highest
2. Common specs (doors, windows) — medium
3. Specialty specs (millwork, built-ins) — case-by-case

---

## Execution Plan

### Phase 1: Documentation Updates (Single Session)

Execute in order:

| Step | Update | Target File |
|------|--------|-------------|
| A.1 | Mask Level Definitions section | Protection_and_Masking_Doctrine.md |
| A.2 | Protection Levels alias table | Spec_Completeness_Doctrine.md |
| A.3 | Material mapping alias table | materials-manager.md |
| A.5 | Schema enum fix | spec.schema.json |
| B.1a | QT2 Surface Eligibility | Quality_Tiers_and_Surface_Condition.md |
| B.1b | QT4 Surface Eligibility | Quality_Tiers_and_Surface_Condition.md |
| B.1c | Line-Item QT Assignment | Quality_Tiers_and_Surface_Condition.md |

### Phase 2: Validation (Same or Separate Session)

| Step | Task |
|------|------|
| A.4 | Schema consistency audit for mask level terms |
| B.2 | QT2 coverage gap analysis |

### Phase 3: Implementation (Separate Sessions)

Based on audit findings:
- Add QT2 configurations to flagged specs
- Update production rates with QT2 modifiers
- Add QT2 SOP variants where needed

---

## Validation Checklist

### Part A: Mask Levels
- [ ] Protection_and_Masking_Doctrine.md contains Mask Level Definitions section
- [ ] Spec_Completeness_Doctrine.md protection levels table includes alias column
- [ ] Materials Manager agent prompt includes alias column
- [ ] spec.schema.json `adjacent_state_protection_rules.protection_level` enum updated to `["none", "light_mask", "heavy_mask", "full_mask"]`
- [ ] No orphaned references to mask levels without context
- [ ] All three mask levels consistently defined across all files

### Part B: Quality Tiers
- [ ] QT2 Surface Eligibility section added with putty knife test
- [ ] QT4 Surface Eligibility section added with sheen gate
- [ ] Line-Item Quality Tier Assignment section added
- [ ] Document version updated to 1.3
- [ ] QT2 coverage gap audit report generated

---

## Reference Sources

**Mask Levels:**
- Existing protection_level schema enum
- Interior_Protection_Doctrine_Final.md

**Quality Tiers:**
- PCA P14 Industry Standard (Quality Levels 1-4)
- SSPC-SP 2 (Hand Tool Cleaning)
- SSPC-SP 3 (Power Tool Cleaning)
- ISO 8501-1 preparation grades
- AMPP/SSPC surface preparation standards

---

**Document Status:** Ready for execution
