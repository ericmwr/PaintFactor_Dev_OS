# Fine Finish Doctrine

**Spec Family ID:** SYS_FINE_FINISH  
**Status:** CANONICAL  
**Version:** 1.2.0  
**Effective Date:** 2026-01-27  
**Source:** PaintFactor domain research + industry practice  

This doctrine defines the material systems, process structure, quality tier behavior, and task classification for fine finish painting. AI agents generating specs for trim, built-ins, doors, millwork, and custom wood surfaces MUST follow this doctrine.

---

## 1. Scope Definition

### 1.1 Surfaces Covered

| Surface Category | Examples | Notes |
|------------------|----------|-------|
| Trim | Baseboard, door casing, window casing, crown molding, chair rail, picture rail | Linear elements, typically spray or brush |
| Built-Ins | Cabinets, bookshelves, entertainment centers, mudroom cubbies, window seats | Box construction, mix of flat and detail |
| Doors | Interior passage doors, closet doors, entry doors (interior face), French doors | Counted per side, flat + detail areas |
| Millwork | Wainscoting, paneling, coffered ceilings, beams, columns, fireplace surrounds | Architectural wood elements |
| Fine Finish Ceilings | Wood plank ceilings, beadboard ceilings, coffered ceiling panels | NOT drywall — see drywall specs |
| Fine Finish Walls | Wood paneled walls, shiplap, board-and-batten, library walls | NOT drywall — see drywall specs |

### 1.2 Surfaces NOT Covered

| Surface | Correct Doctrine/Spec |
|---------|----------------------|
| Drywall walls/ceilings | `SF_DRYWALL_*` specs |
| Exterior trim/siding | Exterior doctrine (future) |
| Metal surfaces | Metal coating doctrine (future) |
| Cabinets requiring full refinish (strip/sand) | Cabinet refinishing doctrine (future) |

---

## 2. Core Principles

### 2.1 Primer is Configuration, Not Tier-Locked

Primer requirement is driven by substrate condition and system specification, not quality tier.

| Condition | Primer Decision |
|-----------|-----------------|
| Bare wood | Primer typically required |
| Factory primed | Primer optional (user decision) |
| Previously painted | Primer optional (adhesion assessment) |
| Significant color change | Tinted primer recommended |
| Gallery Series system | Gallery primer recommended for full system warranty |

### 2.2 Interstage Process is Universal

The inspect-repair-clean cycle runs between every coat at ALL quality tiers. What changes is:

- **Scrutiny level** — how carefully you look
- **Defect tolerance** — what you mark for repair
- **Pace** — how fast you move through the process

### 2.3 Quality Tier Controls Scrutiny, Not Process Steps

Same tasks exist at all tiers. Higher tiers execute with:

- Slower pace
- Tighter tolerances
- More thorough inspection
- Higher repair standards

### 2.4 Clear Coat is Optional Scope

Clear coat adds durability and depth but is a configuration option, not automatic at any tier.

---

## 3. Material Systems

### 3.1 System Overview

| System ID | Name | Quality Tier | Primer | Finish | Clear | Notes |
|-----------|------|--------------|--------|--------|-------|-------|
| `SYS_FF_STANDARD_ACRYLIC` | Standard Acrylic Trim Enamel | QT3 | Acrylic (optional) | 100% acrylic enamel | None | Production-grade standard residential |
| `SYS_FF_MODIFIED_URETHANE` | Modified Urethane Trim Enamel | QT4 | Acrylic (optional) | Urethane-modified alkyd | None | Premium residential, upgraded finish |
| `SYS_FF_PREMIUM` | Premium Urethane Trim | QT5 | Bonding primer (optional) | Emerald Urethane or equivalent | None | Showroom quality, custom homes |
| `SYS_FF_GALLERY` | Gallery Series Full System | QT5 | Gallery Series primer | Gallery Series finish | Optional | Maximum quality, architect-spec |
| `SYS_FF_CONVERSION` | Conversion Varnish System | QT5 | Vinyl sealer | Conversion varnish | Optional | Commercial millwork, max durability |

### 3.2 QT3 Material System: Standard Acrylic Enamel

**Product Type:** 100% acrylic enamel (NOT hybrid alkyd)

| Brand | Product Name | Series |
|-------|--------------|--------|
| Sherwin-Williams | ProClassic Waterborne Interior Acrylic Enamel | B31 series |
| Benjamin Moore | Regal Select Interior Semi-Gloss | N551 |
| PPG | Break-Through Interior/Exterior Acrylic | V52 series |
| Behr | Pro Interior Semi-Gloss Enamel | — |

**Characteristics:**
- Fast dry/recoat times suitable for production pace
- Good leveling but not alkyd-level self-leveling
- Non-yellowing
- Water cleanup

### 3.3 QT4 Material System: Modified Urethane / Waterbased Alkyd

**Product Type:** Urethane-modified alkyd / waterbased alkyd

| Brand | Product Name | Series |
|-------|--------------|--------|
| Sherwin-Williams | Pro Industrial Waterbased Alkyd Urethane | B53 series |
| Benjamin Moore | Advance Waterborne Interior Alkyd | N794 |
| PPG | Glyptex Interior/Exterior Urethane Alkyd | — |
| Behr | Premium Urethane Alkyd Semi-Gloss Enamel | No. 3900 |

**Characteristics:**
- Superior flow and leveling (alkyd-like, reduces brush marks)
- Longer open time than pure acrylic
- Harder cured film than standard acrylic
- Extended cure time (allow 7+ days for full hardness)
- Water cleanup despite alkyd properties

### 3.4 QT5 Material Systems: Premium and Gallery

**SYS_FF_PREMIUM:**
- Sherwin-Williams Emerald Urethane Trim Enamel
- Benjamin Moore Scuff-X
- PPG Manor Hall Interior/Exterior

**SYS_FF_GALLERY:**
- Gallery Series full system products
- Conversion varnish systems for commercial millwork

### 3.5 System Selection Guidance

| Scenario | Recommended System |
|----------|-------------------|
| Standard residential new construction | `SYS_FF_STANDARD_ACRYLIC` |
| Premium residential, upgraded finish | `SYS_FF_MODIFIED_URETHANE` |
| Custom home, showroom quality | `SYS_FF_PREMIUM` |
| Architect-spec, maximum quality | `SYS_FF_GALLERY` |
| Commercial millwork, high-traffic | `SYS_FF_CONVERSION` |
| Historic restoration | `SYS_FF_GALLERY` or custom |

### 3.6 Primer Selection Within Systems

| Substrate Condition | Standard | Premium | Gallery | Conversion |
|---------------------|----------|---------|---------|------------|
| Bare softwood (pine, poplar) | Acrylic | Bonding primer | Gallery primer | Vinyl sealer |
| Bare hardwood (oak, maple) | Acrylic | Bonding primer | Gallery primer | Vinyl sealer |
| MDF/composite | Acrylic | Bonding primer | Gallery primer | Vinyl sealer |
| Factory primed | Optional | Optional | Optional (recommend full system) | Optional |
| Previously painted (good adhesion) | None | None | None | Scuff + none |
| Previously painted (questionable) | Bonding primer | Bonding primer | Bonding primer | Bonding primer |
| Knots/tannin bleed | Shellac spot prime | Shellac spot prime | Shellac spot prime | Shellac spot prime |

---

## 4. Sheen Selection

### 4.1 Sheen-to-Tier Restrictions

| Quality Tier | Allowed Sheens | Rationale |
|--------------|----------------|-----------|
| QT3 | Satin or lower (flat, matte, eggshell, satin) | Lower sheens hide minor surface imperfections |
| QT4 | Any sheen EXCEPT gloss | Semi-gloss acceptable; gloss reveals too much |
| QT5 | Any desired sheen including gloss | Workmanship supports any sheen level |

### 4.2 Why Sheen is Tier-Restricted

- Higher sheens (semi-gloss, gloss) act as magnifiers for surface imperfections
- Gloss finish reveals every dust nib, orange peel texture, and minor defect
- QT5 workmanship (thorough sanding, critical inspection, zero-tolerance repairs) is required to support gloss finishes
- Specifying gloss at QT3 sets the project up for failure

### 4.3 Common Sheen Choices by Surface

| Surface | Typical Sheen | Notes |
|---------|---------------|-------|
| Trim (baseboard, casing) | Semi-gloss | Requires QT4+ |
| Crown molding | Satin or semi-gloss | Higher = more visible imperfections |
| Doors | Semi-gloss | Durability and cleanability |
| Built-ins | Satin | Softer appearance |
| Cabinets | Semi-gloss or satin | Per client preference |

---

## 5. Module Structure

### 5.1 Standard Fine Finish Modules

| Module ID | Phase | Purpose | Task Class |
|-----------|-------|---------|------------|
| `MOD_FF_SETUP` | Setup | Protection, staging | binary |
| `MOD_FF_INITIAL_PREP` | Prep | Fill, caulk, sand before first coat | qt_scaled |
| `MOD_FF_PRIME` | Prime | Primer coat (if needed) | qt_scaled |
| `MOD_FF_FINISH_COAT` | Finish | Finish coat application | qt_scaled |
| `MOD_FF_INTERSTAGE` | Inspect | Between-coat maintenance | qt_scaled |
| `MOD_FF_FINAL_INSPECT` | Inspect | Final quality check | qt_scaled |
| `MOD_FF_CLEANUP` | Cleanup | Protection removal, touch-up | binary |

### 5.2 Workflow Sequence

**Scenario A (with primer):**
```
SETUP → INITIAL_PREP → PRIME → INTERSTAGE → FINISH_COAT_1 → INTERSTAGE → FINISH_COAT_2 → FINAL_INSPECT → CLEANUP
```

**Scenario B (factory-primed, no additional primer):**
```
SETUP → INITIAL_PREP → FINISH_COAT_1 → INTERSTAGE → FINISH_COAT_2 → FINAL_INSPECT → CLEANUP
```

### 5.3 Interstage Run Rule

> **Critical:** Interstage runs AFTER each coat EXCEPT the final coat.

| Coat System | Interstage Runs |
|-------------|-----------------|
| Prime + 1 Finish | 1 (after prime) |
| Prime + 2 Finish | 2 (after prime, after finish 1) |
| 2 Finish (no prime) | 1 (after finish 1) |
| Prime + 2 Finish + Clear | 3 (after prime, after finish 1, after finish 2) |

**Rule:** Final inspection is a separate task, not part of interstage.

### 5.4 Applicability Rules

| Rule ID | Condition | Modules Applied |
|---------|-----------|-----------------|
| `APR_FF_SETUP` | Always | `MOD_FF_SETUP` |
| `APR_FF_CRITICAL_PRE` | quality_tier = 'QT5' | `MOD_FF_CRITICAL_PRE_INSPECTION` |
| `APR_FF_PRIME` | primer_required = true | `MOD_FF_PRIME` |
| `APR_FF_INTERSTAGE` | After each coat except final | `MOD_FF_INTERSTAGE` |
| `APR_FF_FINISH` | Always | `MOD_FF_FINISH` |
| `APR_FF_CLEAR` | clear_coat = true | `MOD_FF_CLEAR` |
| `APR_FF_FINAL` | Always | `MOD_FF_FINAL` |

---

## 6. The Initial Prep Phase

### 6.1 Overview

The **Initial Prep Phase** is the heavy-lifting prep work done BEFORE the first finish coat. It addresses substrate defects and prepares the surface for coating. It is distinct from interstage work between subsequent finish coats.

### 6.2 Initial Prep Tasks

| Task ID | Task Name | Task Class | UOM | Description |
|---------|-----------|------------|-----|-------------|
| `TSK_FF_FILL_FASTENERS` | Fill Fastener Holes | qt_scaled | EA | Fill nail holes, screw holes, staple marks |
| `TSK_FF_FILL_GAPS` | Fill Gaps/Cracks | qt_scaled | LF | Caulk or fill gaps at joints, corners, wall intersections |
| `TSK_FF_SAND_FILL` | Sand Filled Areas | qt_scaled | EA | Sand filler smooth, feather edges |
| `TSK_FF_CAULK_JOINTS` | Caulk Joints | qt_scaled | LF | Caulk trim-to-wall, trim-to-trim joints |
| `TSK_FF_FULL_SAND` | Full Surface Sand | qt_scaled | LF or SF | Sand entire surface for adhesion and smoothness |
| `TSK_FF_CLEAN_DUST` | Clean Sanding Dust | binary | SF | Remove all sanding dust before coating |

### 6.3 Initial Prep Scrutiny by Tier

| Task | QT3 | QT4 | QT5 |
|------|-----|-----|-----|
| Fill Fasteners | Fill obvious holes; small pinholes may be left | Fill all visible holes | Fill every hole, no matter how small |
| Fill Gaps | Fill gaps that would show through finish | Fill all gaps | Fill all gaps, perfect smooth finish |
| Sand Fill | Knock down ridges; flush not required | Sand flush, blend edges | Sand perfectly flush, invisible |
| Caulk Joints | Functional caulk; bead appearance acceptable | Smooth caulk lines | Perfect tooled caulk, invisible joints |
| Full Sand | Light scuff for adhesion | Full sand 180-220 grit | Thorough sand 220+ grit, uniform scratch pattern |

### 6.4 When Initial Prep Occurs

**Scenario A (with primer):**
```
Prime → INITIAL PREP → Finish Coat 1 → Interstage → Finish Coat 2
```

**Scenario B (no primer, factory primed substrate):**
```
INITIAL PREP → Finish Coat 1 → Interstage → Finish Coat 2
```

> **Key Point:** Initial prep is the HEAVY LIFT. Interstage is lighter maintenance between subsequent coats.

---

## 7. The Interstage Process

### 7.1 Overview

The **Interstage Process** is a lighter maintenance cycle that runs between finish coats (after the initial prep is complete). It addresses any issues that developed during coating.

**Module ID:** `MOD_FF_INTERSTAGE`

### 7.2 Interstage vs Initial Prep

| Aspect | Initial Prep | Interstage |
|--------|--------------|------------|
| When | After primer / before finish coat 1 | Between finish coats |
| Scope | All filling, caulking, major sanding | Light sanding, dust nib removal |
| Labor | Heavy — majority of prep time | Light — maintenance only |
| Defects addressed | Substrate defects, fastener holes, gaps | Coating defects (nibs, minor imperfections) |

### 7.3 Interstage Tasks

| Task ID | Task Name | Task Class | UOM | Description |
|---------|-----------|------------|-----|-------------|
| `TSK_FF_CLEAN_WORK_AREA` | Clean Work Area | binary | SF | Clean floors, flat surfaces, remove dust and debris |
| `TSK_FF_INSPECT_COAT` | Inspect Coat | qt_scaled | LF or SF | Visual inspection, mark defects for repair |
| `TSK_FF_LIGHT_SAND` | Light Sand | qt_scaled | LF or SF | Scuff sand full surface (220-320 grit) |
| `TSK_FF_PATCH_REPAIR` | Patch/Repair Defects | qt_scaled | EA | Fill holes, repair damage, address defects |
| `TSK_FF_SAND_PATCHES` | Sand Patches | qt_scaled | EA | Feather patches smooth |
| `TSK_FF_SPOT_COAT_PATCHES` | Spot Coat Patches | qt_scaled | EA | Touch prime or finish patched areas |

---

## 8. Scrutiny Definitions by Tier

### 8.1 TSK_FF_CLEAN_WORK_AREA

| Tier | Scrutiny Definition |
|------|---------------------|
| QT3 | Quick sweep. Remove obvious debris, dust piles, overspray accumulation. |
| QT4 | Thorough clean. No visible dust on floors or horizontal surfaces within work zone. |
| QT5 | Meticulous clean. Floors, flat surfaces, adjacent areas, windowsills, tops of trim. No dust that could contaminate next coat. |

### 8.2 TSK_FF_INSPECT_COAT (Interstage Inspection)

> **Critical Philosophy:** Quality tiers define **expectation levels**, NOT tolerance for poor workmanship. Runs, sags, holidays, and drips should **NEVER exist at ANY tier** — these indicate improper application technique, not acceptable QT3 work.

| Tier | Scrutiny Definition |
|------|---------------------|
| QT3 | Quick glance inspection. Look for missed fastener holes that weren't filled, gaps that have cracked, dust nibs. Address obvious issues only. |
| QT4 | Systematic scan at 3 feet. Identify any dust nibs, minor orange peel inconsistency, areas needing light sanding. Mark for attention. |
| QT5 | Lighted critical inspection at arm's length. Identify ANY visible imperfection: dust nibs, texture variation, orange peel, brush marks, uneven coverage. Zero tolerance. |

**What Interstage Inspection is NOT Looking For:**
- Runs, sags, drips, holidays — these indicate application failure and should not exist
- If found, stop and address application technique, don't just "accept" at lower tier

**What Interstage Inspection IS Looking For:**
- Dust nibs (dust landed in wet coating)
- Missed areas from initial prep (holes, gaps)
- Surface texture issues (orange peel, stipple)
- Coverage uniformity

### 8.3 TSK_FF_LIGHT_SAND

| Tier | Scrutiny Definition |
|------|---------------------|
| QT3 | Spot sand only. Address visible nibs, runs, rough spots. Not full surface. |
| QT4 | Light full sand (220 grit). Entire surface gets scuff for adhesion. Address all marked defects. |
| QT5 | Thorough full sand (220-320 grit). Entire surface with attention to detail. All marked defects addressed. Surface must be uniformly smooth to touch. |

### 8.4 TSK_FF_PATCH_REPAIR

| Tier | Scrutiny Definition |
|------|---------------------|
| QT3 | Repair only glaring defects. Deep scratches, obvious holes, runs that won't sand out. |
| QT4 | Repair all marked defects. Holes, dents, scratches, any damage visible at 3 feet. |
| QT5 | Repair all defects regardless of size. Any imperfection that could telegraph through finish. |

### 8.5 TSK_FF_SAND_PATCHES

| Tier | Scrutiny Definition |
|------|---------------------|
| QT3 | Quick feather. Patches level with surface, edges knocked down. |
| QT4 | Proper feather. Patches blend with surrounding surface, no visible edges at 3 feet. |
| QT5 | Invisible blend. Patches completely undetectable by touch or sight. |

### 8.6 TSK_FF_SPOT_COAT_PATCHES

| Tier | Scrutiny Definition |
|------|---------------------|
| QT3 | Optional. Skip if patches are small and primer is tinted. |
| QT4 | Required. All patches get spot coat before next full coat. |
| QT5 | Required, may need multiple passes. Patches must be fully sealed and color-matched before next coat. |

---

## 9. Defect Tolerance Reference

### 9.1 Application Failures vs. Expectation Differences

> **Critical distinction:** Some defects indicate improper application technique and should NEVER exist at any tier. Other defects are matters of expectation level.

### 9.2 Application Failures (NEVER Acceptable at Any Tier)

| Defect | Why It's Unacceptable |
|--------|----------------------|
| Runs | Indicates over-application or improper technique |
| Sags | Indicates over-application or improper technique |
| Drips | Indicates over-application or sloppy work |
| Holidays (missed spots) | Indicates incomplete coverage |

> **If these defects are found:** Stop and address application technique. Do not proceed with "it's just QT3" — these are workmanship failures, not quality tier differences.

### 9.3 Tier-Based Tolerance

| Defect Type | QT3 | QT4 | QT5 |
|-------------|-----|-----|-----|
| Dust nibs | Acceptable if minor | Must be sanded | Zero tolerance |
| Brush marks | Acceptable if minimal | Light marks OK | Zero tolerance |
| Orange peel | Light acceptable | Very light OK | Zero tolerance |
| Texture variation | Minor acceptable | Uniform required | Perfect uniformity |

---

## 10. Substrate-Specific Considerations

### 10.1 Trim (Baseboard, Casing, Crown)

| Consideration | Guidance |
|---------------|----------|
| UOM | Linear feet (LF) |
| Profile complexity | Detailed profiles slow production; flat stock is faster |
| Inside corners | Require careful technique, slower pace |
| Outside corners | Check for adequate coverage on edges |
| Gaps to wall/floor | Caulk before prime (separate task) |

### 10.2 Doors

| Consideration | Guidance |
|---------------|----------|
| UOM | Each (EA), counted per side |
| Panel doors | More detail = slower production |
| Flush doors | Faster, but shows roller/spray texture more |
| Edges | Coat all edges, especially top and bottom |
| Hardware | Remove or mask before spray |
| Hanging vs laid flat | Laid flat prevents runs, but requires drying space |

### 10.3 Built-Ins and Cabinets

| Consideration | Guidance |
|---------------|----------|
| UOM | Square feet (SF) for box, linear feet (LF) for face frames |
| Interior vs exterior | Interior typically lower tier than exterior faces |
| Shelves | Removable shelves can be sprayed separately |
| Hardware | Remove all hardware before coating |
| Drawers | Remove, coat separately |

---

## 11. Production Rate Guidance

### 11.1 Rate Philosophy

Production rates are research-based estimates, not fixed doctrine values. Rates vary by:

- Surface type and complexity
- Application method (spray vs brush)
- Quality tier (scrutiny level)
- Condition class (prep intensity)

### 11.2 Inspection Distance by Tier

| Tier | Inspection Standard |
|------|---------------------|
| QT3 | Quick glance at 6 feet |
| QT4 | Systematic scan at 3 feet |
| QT5 | Lighted critical inspection at arm's length |

### 11.3 Task Behavior Summary

| Task | QT3 | QT4 | QT5 |
|------|-----|-----|-----|
| Light Sand | Spot sand only | Light full sand 220 grit | Thorough full sand 220-320 grit |
| Inspect Coat | Quick glance, obvious issues | Systematic scan, mark defects | Critical inspection, zero tolerance |
| Patch Repair | Glaring defects only | All marked defects | All defects regardless of size |
| Clean Work Area | Quick sweep | Thorough clean | Meticulous clean |

---

## 12. Cross-References

### 12.1 Related Doctrine Documents

- `Millwork_NC_Paint_Doctrine.md` v1.0.0 — Substrate classification, prep requirements, PDCA standards
- `Quality_Tiers_and_Surface_Condition.md` v1.1 — QT definitions, condition classes, sheen minimums
- `Materials_and_Consumables_Doctrine.md` v1.1 — Consumable usage patterns, caulk/spackle rates
- `Estimation_Modifiers_Doctrine.md` v1.1 — Height/complexity modifiers, modifier stacking rules
- `Interior_Protection_Doctrine.md` v1.0 — Floor protection, masking systems

### 12.2 Related Skills

- `fine-finish-workflow.md` — Workflow patterns for agent consumption
- `pf-specfactory-workflow.md` — SpecFactory pipeline integration

### 12.3 Spec Families Using This Doctrine

- `SF_TRIM_NC_PAINT` — New construction trim
- `SF_DOOR_NC_PAINT` — New construction doors
- `SF_CROWN_NC_PAINT` — Crown molding
- `SF_CABINET_REPAINT` — Cabinet refinishing

---

## 13. Change Log

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.2.0 | 2026-01-27 | SpecFactory | Reformatted to Doctrine Format Standard v1.0.0. Added numbered sections, cross-references, change log. No content changes. |
| 1.1 | 2026-01-25 | SpecFactory | Added substrate-specific considerations. Clarified interstage run rule. |
| 1.0 | 2026-01-20 | SpecFactory | Initial canonical release. |
