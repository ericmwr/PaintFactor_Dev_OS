# Quality Tier Doctrine Amendment

**Purpose:** Expand QT2 and QT4 definitions with clear boundary criteria and implement line-item quality tier assignment.

**Target File:** `Claude/docs/Doctrine/Quality_Tiers_and_Surface_Condition.md`

**Version:** 1.3

---

## Claude Code Update Prompt

```
Update the Quality_Tiers_and_Surface_Condition.md doctrine file with the following amendments:

1. Insert the "QT2 Surface Eligibility — Marginally Prepared Surfaces" section after the existing QT2 "What QT2 Does NOT Mean" section.

2. Insert the "QT4 Surface Eligibility — Enhanced Process Discipline" section after the existing QT4 "What Changes at QT4" table.

3. Add the new "Line-Item Quality Tier Assignment" section after the "Quality Tier Summary" table and before the "Sanding Standards by Quality Tier" section.

4. Update the document version to 1.3 and Last Updated date to current date.

5. After completing the doctrine update, perform a system audit to identify all specs and files that need to be updated to reference QT2 where it is not currently present.

The full amendment content follows below.
```

---

## Amendment Content

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
- QT3: 1/16 inch (62.5 mils)
- QT4: 1/32 inch (31.25 mils)

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

#### QT4 vs. QT5 Threshold

**QT4:** Enhanced discipline with predictable labor investment. Premium results on good-condition substrates.

**QT5:** Maximum care with condition-gated pricing. QT5 modifier (1.5x) only applies when substrate is in Good condition. Fair or Poor condition at QT5 expectations triggers hourly billing.

**Threshold Statement:** When the project requires maximum process discipline, straight-line edge outcomes, or substrate condition is uncertain, evaluate for QT5/QT6.

#### Typical QT4 Use Cases

- High-end residential repaints
- Visible commercial spaces (lobbies, showrooms, reception areas)
- Projects where client has expressed quality concerns
- Homes with high resale value priority
- Any project specifying satin, semi-gloss, or gloss wall finishes
- Custom home production where "builder grade" is insufficient

---

### Quality Tier Selection Summary

| Question | If Yes → |
|----------|----------|
| Is the substrate incomplete (holes, missing elements, structural failure)? | Not paintable — restore first |
| Is speed and budget the primary driver, with appearance secondary? | QT2 |
| Is this standard residential/commercial with no special requirements? | QT3 |
| Does the client require satin or higher sheen on walls? | QT4 minimum |
| Has the client expressed quality concerns or premium expectations? | QT4 minimum |
| Is "flawless" or "showroom" the expectation? | QT5 (Good condition) or QT6 (Fair/Poor) |
| Is substrate condition uncertain or known to be problematic? | QT6 (hourly) |

---

### Line-Item Quality Tier Assignment

Quality tier is determined **per surface element**, not per project. A single project may contain multiple quality tiers across different surfaces, rooms, or zones.

#### Assignment Hierarchy

Quality tier can be set at multiple levels, with more specific assignments overriding more general ones:

| Level | Scope | Example |
|-------|-------|---------|
| Project Default | Baseline for all surfaces | "This is a QT3 project" |
| Room Override | All surfaces within a room | "Master bedroom is QT4" |
| Surface-Type Override | Specific surface type within room | "Master bedroom walls QT4, ceiling QT3" |
| Surface-Instance Override | Individual surface | "Accent wall behind bed QT5" |

**Resolution Rule:** Most specific assignment wins. If no override exists, inherit from parent level.

#### Typical Mixed-Tier Scenarios

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

#### PaintScope Implementation

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

#### Estimation Engine Implementation

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

#### Cross-Surface Consistency Considerations

Some quality tier assignments create implicit requirements on adjacent surfaces:

| If This Surface Is... | Then Consider... |
|-----------------------|------------------|
| Walls at QT4+ | Ceiling cut-in edge work should match wall QT |
| Trim at QT4+ | Wall-to-trim transition quality should match |
| Accent wall at QT5 | Adjacent walls may need QT4 minimum for seamless transition |

**Edge Work Rule:** When two adjacent surfaces have different quality tiers, edge work at the junction is performed to the **higher** of the two tiers. The cut-in line belongs to both surfaces.

#### Proposal Display

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

#### Client Consultation Prompts

During scope definition, prompt clients with tier-relevant questions:

- "Are there any rooms where appearance is especially important to you?"
- "Any spaces where you just need basic coverage — utility rooms, storage areas?"
- "Do you have any high-sheen finish requirements? Satin or semi-gloss on walls?"
- "Is there a focal point — an accent wall or entry area — where you want extra attention?"

Map responses to appropriate QT assignments.

---

## Post-Update Audit Instructions

After completing the doctrine update, execute the following audit:

```
AUDIT TASK: QT2 Reference Gap Analysis

Objective: Identify all specs and system files that need to be updated to include QT2 coverage where it is not currently present.

Scope:
1. All spec families in /specs/ directory
2. All production.json files
3. All sop_modules.json files
4. All materials.json files
5. Schema files that define quality_tier enums
6. Any validation scripts that check QT coverage

Audit Criteria:
- Flag specs that define QT3-QT5 but omit QT2
- Flag production rates that lack QT2 modifier definitions
- Flag SOP modules that lack QT2 procedural variants
- Flag material systems that lack QT2-appropriate options
- Note any specs where QT2 may be intentionally excluded (document rationale)

Output Format:
Create a report listing:
1. File path
2. Current QT coverage (e.g., "QT3, QT4, QT5")
3. QT2 status: "Missing" | "Present" | "Intentionally Excluded"
4. If excluded, state rationale
5. Recommended action

Example Output:
| File | Current Coverage | QT2 Status | Action |
|------|------------------|------------|--------|
| specs/SF_DRYWALL_WALL_NC_FINISH/production.json | QT3-QT5 | Missing | Add QT2 rates |
| specs/SF_TRIM_INT_NC_FINISH/spec.json | QT3-QT5 | Missing | Add QT2 config |
| specs/SF_MILLWORK_NC_LACQUER/spec.json | QT5-QT6 | Intentionally Excluded | QT2 incompatible with lacquer systems |

After generating the report, prioritize updates based on:
1. Core specs (drywall, trim, ceilings) — highest priority
2. Common specs (doors, windows) — medium priority
3. Specialty specs (millwork, built-ins) — evaluate case-by-case
```

---

## Reference Sources

This amendment incorporates findings from:
- PCA P14 Industry Standard (Quality Levels 1-4)
- SSPC-SP 2 (Hand Tool Cleaning)
- SSPC-SP 3 (Power Tool Cleaning)
- ISO 8501-1 (St 2, St 3 preparation grades)
- AMPP/SSPC surface preparation standards
- Industry research on marginally prepared surfaces and coating performance expectations

---

**Document Status:** Ready for Claude Code execution
