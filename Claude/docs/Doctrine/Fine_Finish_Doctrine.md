# Fine Finish Doctrine

**Spec Family ID:** SYS_FINE_FINISH
**Status:** CANONICAL
**Version:** 1.3.0
**Effective Date:** 2026-02-03  
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

> **Application Method Note:** All surfaces in this doctrine can be finished via spray or brush/roll application. Method selection is a configuration dimension (see § 15). Both methods must achieve the selected quality tier's standards.

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

> **Brush/Roll Compatibility:** All material systems listed above are compatible with brush and roll application. Waterborne alkyds (Advance, Emerald Urethane) are preferred for brush/roll due to longer open time. See § 15 for technique guidance specific to each coating chemistry.

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
| Application method | Spray preferred for production; brush viable for occupied spaces using proper technique (§ 15.11.1). Work full length of runs when possible. |

### 10.2 Doors

| Consideration | Guidance |
|---------------|----------|
| UOM | Each (EA), counted per side |
| Panel doors | More detail = slower production |
| Flush doors | Faster, but shows roller/spray texture more |
| Edges | Coat all edges, especially top and bottom |
| Hardware | Remove or mask before spray |
| Hanging vs laid flat | Laid flat prevents runs, but requires drying space |
| Application method | Spray preferred for production; brush/roll viable using Roll and Tip methodology (§ 15.6). Lay doors flat when possible to eliminate runs. Follow panel door sequence (§ 15.11.2). |

### 10.3 Built-Ins and Cabinets

| Consideration | Guidance |
|---------------|----------|
| UOM | Square feet (SF) for box, linear feet (LF) for face frames |
| Interior vs exterior | Interior typically lower tier than exterior faces |
| Shelves | Removable shelves can be sprayed separately |
| Hardware | Remove all hardware before coating |
| Drawers | Remove, coat separately |
| Application method | Spray preferred for cabinet interiors and complex profiles; brush/roll viable for face frames and doors using "Thin to Win" philosophy (§ 15.11.3). Allow 5-7 day cure before reinstalling doors. |

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

### 12.4 Industry Standards

- AWI/ANSI 0400 — Architectural Woodwork Standards (quality grades)
- AWI/ANSI 0622 — Finish Carpentry/Installation Standards
- SCAQMD Rule 1113 — Architectural Coatings VOC Limits

---

## 13. Change Log

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.3.0 | 2026-02-03 | Eric | Added Section 15: Brush and Roll Application Method. Documents Roll and Tip methodology, sanding strategy, tool selection by coating chemistry, AWI quality grade mapping, and environmental management for non-spray application. Research-validated. |
| 1.2.0 | 2026-01-27 | SpecFactory | Reformatted to Doctrine Format Standard v1.0.0. Added numbered sections, cross-references, change log. No content changes. |
| 1.1 | 2026-01-25 | SpecFactory | Added substrate-specific considerations. Clarified interstage run rule. |
| 1.0 | 2026-01-20 | SpecFactory | Initial canonical release. |

---

## 14. Reserved

*(Section 14 reserved for future use)*

---

## 15. Brush and Roll Application Method

**Version:** 1.0.0
**Status:** CANONICAL
**Effective Date:** 2026-02-03
**Source:** Field experience + NotebookLM research (Fine Architectural Finishing: Hand-Applied Trim and Millwork Systems)

This section defines brush and roll application techniques for fine finish surfaces when spray application is not feasible. Covers tool selection, technique by coating chemistry, and the multi-coat sanding strategy for achieving quality results.

---

### 15.1 Scope and Method Selection

#### 15.1.1 When Brush and Roll is Appropriate

| Condition | Rationale |
|-----------|-----------|
| Occupied spaces | No overspray tolerance; containment impractical |
| Small scope / touch-up / punch list | Spray setup cost not justified |
| No spray room available | Doors cannot be removed for off-site spray |
| Budget constraints | Labor for spray setup exceeds brush/roll premium |
| Contractor capability | Not all contractors have spray equipment or skill |

#### 15.1.2 When Spray Remains Preferred

| Condition | Rationale |
|-----------|-----------|
| Large volume NC production | Speed advantage justifies setup |
| QT5 gloss finishes | Brush/roll texture unacceptable at gloss sheen |
| Cabinet interiors and complex profiles | Brush access limited; spray reaches all surfaces |
| Speed-critical schedules | Faster application and dry times |

#### 15.1.3 Method Selection is Configuration, Not Quality

Per Fine Finish Doctrine § 2: Application method is a configuration dimension. Both spray and brush/roll must achieve the selected quality tier's standards. Choosing brush/roll does not lower quality expectations — it changes the technique for achieving them.

> **Research Note:** "The hand-applicator can produce results that are indistinguishable from factory finishes to the untrained eye... the ability to deliver a Premium Grade finish with a brush and roller is not merely an alternative—it is the hallmark of the master architectural painter."

---

### 15.2 Coating Chemistry and Open Time

#### 15.2.1 Why Open Time Matters

The performance of a hand-applied finish is primarily governed by the coating's ability to "flow and level" — the duration of the "open time" during which the paint remains sufficiently fluid to allow surface tension to pull the film flat after the applicator has passed.

#### 15.2.2 Coating System Comparison

| Feature | Traditional Oil-Based (Alkyd) | Waterborne Alkyd (Hybrid) | Acrylic-Urethane Enamel |
|---------|------------------------------|---------------------------|------------------------|
| Binder Type | Oxidative alkyd resin | Emulsified alkyd resin | Urethane-modified acrylic |
| Solvent/Carrier | Mineral spirits/turpentine | Water | Water |
| **Open Time** | **Very long (4-8 hours)** | **Long (up to 30 mins)** | **Short (5-15 mins)** |
| Cure Mechanism | Oxidation | Evaporation + oxidation | Evaporation + cross-linking |
| Yellowing | Prone (high) | Moderate/low | Minimal/zero |
| VOC Levels | High (>250 g/L) | Low/zero (<50 g/L) | Low/zero |
| Cleanup | Mineral spirits | Soap and water | Soap and water |
| Blocking Resistance | Excellent | Good | Good (requires full cure) |

#### 15.2.3 The Implication for Technique

The 10x difference in open time between oil-based (4-8 hours) and acrylic-urethane (5-15 minutes) fundamentally changes the application approach:

- **Oil-based:** Work the material. Tip off repeatedly. Let it self-level.
- **Waterborne:** Apply it right the first time. Do not overwork. Sand between coats.

---

### 15.3 Core Principle: The Sanding Strategy

#### 15.3.1 Waterborne Philosophy: Sand Is Your Friend

> **MANDATORY DOCTRINE:** Do not fight the working time. Accept that waterborne products cannot be tipped off like oil-based. Lay the coating down properly, put your hands up, and walk away. If brush marks or texture remain, sand them out between coats.

This is fundamentally different from oil-based technique. With waterborne products, you **build** the finish through multiple sanded coats:

1. Apply coat with proper technique
2. Allow full cure per manufacturer spec
3. Sand with rigid block to level any texture or defects
4. Clean sanding dust thoroughly
5. Apply next coat — it fills the scratch pattern from sanding
6. Repeat until finish meets quality tier standard

**Premium products sand easier.** Higher-quality waterborne alkyds and urethane enamels (Emerald Urethane, Advance, etc.) produce a film that sands more easily than budget acrylics. This is a key reason to spec premium products when brush/roll is the method.

**More coats = path to mirror finish.** Each sanded coat removes the previous coat's imperfections and provides a smoother base for the next. QT5 brush/roll work may require 3+ coats where spray would need only 2.

#### 15.3.2 Oil-Based Philosophy: Work the Material

Traditional oil-based and alkyd coatings allow a different approach:

- Extended open time (4-8 hours) permits working and reworking
- Tipping off technique is effective throughout the open window
- Self-leveling properties reduce brush marks naturally
- Fewer coats typically needed for equivalent smoothness

However, oil-based products are increasingly restricted by VOC regulations and have extended cure times that may not suit project schedules.

---

### 15.4 Sanding Tools and Technique

#### 15.4.1 Rigid Block Sanding — Mandatory for Defect Removal

> **MANDATORY DOCTRINE:** When sanding between coats to remove brush marks, orange peel, or texture, use a rigid sanding block. A rigid block contacts high spots first and levels them down to the surrounding surface.

**Sand the profile, not the contour.**

Sanding with a flexible sponge or bare hand conforms to the shape of imperfections rather than removing them. You polish the defect instead of eliminating it.

A rigid block can be:

- A simple block of wood with sandpaper wrapped around it
- A hard rubber sanding block
- A firm cork block

#### 15.4.2 Inside Corner Technique

Inside corners are where brush marks and buildup concentrate. A rigid block pressed into the corner takes down the high spots. A sponge or bare hand follows them.

Wrap sandpaper around a wood block sized to fit the corner geometry. Apply firm, even pressure. The block will contact and remove the high spots first.

#### 15.4.3 Sanding Tool Selection Matrix

| Tool | Rigidity | Use Case |
|------|----------|----------|
| Wood block + sandpaper | High | Flat surfaces, inside corners, defect leveling |
| Hard rubber sanding block | High | General flat work, good paper grip |
| Firm foam sanding pad | Medium | Light scuff sanding where slight contour-following is acceptable |
| Flexible sanding sponge | Low | Complex profiles, carved details, rounded edges only |
| Bare hand | Low | Final light scuff only — never for leveling |

**The Rule:** If removing a defect (brush mark, drip, dust nib, orange peel), use rigid. If scuffing for adhesion on an already-smooth surface, flexible is acceptable.

#### 15.4.4 Grit Progression

Per research, the mechanical preparation phase utilizes a graduated sanding progression:

| Purpose | Grit | Notes |
|---------|------|-------|
| Leveling (significant imperfections, drips, old brush marks) | 120 | Aggressive — use only when needed |
| Profiling (tooth for primer adhesion) | 220 | Smooths leveling scratches |
| Inter-coat refinement (nibs, dust contamination) | 320-400 | Removes contaminants without deep scratches |
| Final sand before last coat (QT5) | 320-400 | Minimizes scratch pattern showing through final coat |

---

### 15.5 Tool Selection by Coating Chemistry

#### 15.5.1 Brush Filament Engineering

Brushes are selected based on the coating's solvent and viscosity.

**Natural Bristles (China/Hog Bristle):**
- Possess natural "flags" (split ends) that hold substantial volume and release with soft touch
- Gold standard for traditional oil-based coatings
- **Unusable with waterborne paints** — bristles absorb water, swell, and become limp

**Synthetic Filaments (Nylon/Polyester):**
- Designed for waterborne systems
- Maintain stiffness and shape in presence of water

| Filament Type | Example Products | Best Use |
|---------------|------------------|----------|
| Nylon/Polyester blend | Purdy XL | General trim work — balance of stiffness and softness |
| 100% Nylon (soft) | Purdy Nylox | Tipping off Zero-VOC enamels — leaves no brush marks |
| Chinex (stiff) | Wooster Pro-Extra | Heavy-bodied Low-VOC paints; high-heat environments where softer filaments drag |

#### 15.5.2 Brush Selection Summary

| Coating Type | Filament | Size/Shape | Rationale |
|--------------|----------|------------|-----------|
| Waterborne acrylic | Synthetic (nylon/polyester blend) | 2" - 2.5" angled sash | Nylon resists water absorption, holds shape wet |
| Waterborne alkyd | Synthetic (soft tips — Nylox) | 2" - 2.5" angled sash | Soft tips aid flow-out, reduce drag marks |
| Zero-VOC enamel | 100% Nylon (Nylox) | 2" - 2.5" angled sash | Exceptionally soft for tipping without marks |
| Heavy-bodied Low-VOC | Chinex | 2" - 2.5" angled sash | Stiff filaments prevent drag |
| Oil-based alkyd | Natural bristle (China bristle) | 2" - 2.5" angled sash | Oil swells natural bristle for smooth release |

**Quality matters.** A $20 brush outperforms a $5 brush significantly. For fine finish work, invest in quality tools.

#### 15.5.3 Roller Nap Selection

When spray application is unfeasible, the roller "lays on" the paint quickly, but nap choice determines the degree of stipple (orange peel texture) that must be addressed.

| Roller Type | Nap | Best Use | Notes |
|-------------|-----|----------|-------|
| High-density foam | N/A | Flat panels (cabinet doors, door skins) | Non-absorbent; lowest initial texture |
| Velour/flock sleeves | Very short | Thin, smooth layers | Minimal air entrapment (bubbles) |
| Microfiber | 1/4" - 3/8" | Door skins, larger flat areas | High loading capacity; keeps surface wet longer before tipping |

**Avoid:** Thick nap covers (3/8"+) on fine finish work — they leave excessive stipple that requires heavy sanding.

---

### 15.6 The Roll and Tip Methodology

#### 15.6.1 Overview

The "Roll and Tip" method (also called "Laying On and Laying Off") is the professional standard for achieving factory-like finish through manual application. This technique separates the distribution of the paint from its final leveling.

#### 15.6.2 Step 1: The Lay-On Phase (Rolling)

Using a small (4" or 6") roller, apply paint to a section of the substrate in long, even strokes.

**Objective:** Deposit a uniform volume of material as quickly as possible to maximize remaining open time.

**Critical:** Avoid "dry rolling" — continuing to roll after paint is depleted from the sleeve. This introduces air bubbles and creates unwanted texture.

#### 15.6.3 Step 2: The Lay-Off Phase (Tipping)

Immediately following the roller, use a clean, high-quality brush to "tip off" the wet paint.

**Technique:**
1. Hold brush at low angle (approximately 45 degrees)
2. Lightly drag the tips of the bristles through the wet film
3. Use long, continuous strokes
4. Work from the "dry" side back into the wet edge
5. Feather away (lift brush gradually) to avoid leave-behind marks

**Physics of Tipping:** The light pressure of the brush tips breaks the surface tension of the roller stipple and any micro-bubbles, allowing the paint to level more effectively.

**Directionality:** Tipping should always follow the direction of the wood grain.

**Tool Management:** Keep the tipping brush "dry" (unloaded). If the brush accumulates too much paint during the process, wipe it on a lint-free cloth or slap against the inside of a bucket. The brush should smooth the surface without adding more material.

---

### 15.7 Waterborne / Zero-VOC Technique

#### 15.7.1 The 2-Minute Window

> **CRITICAL:** Once a Zero-VOC paint is applied, it typically cannot be re-brushed after 2-3 minutes without causing "roping" — where the brush tears the setting film and leaves permanent ridges.

This is the fundamental constraint of waterborne technique. You cannot work the material the way you work oil-based coatings.

#### 15.7.2 The Non-Negotiable Rule

> **MANDATORY DOCTRINE:** Apply. Tip once. Walk away. Do not go back.

If defects remain after the coating dries, sand them out and apply another coat. Attempting to fix defects while the coating is setting makes them worse.

#### 15.7.3 Open Time Management with Additives

To extend working time, practitioners add conditioners to the paint:

| Product | Manufacturer | Use With | Mix Ratio | Effect |
|---------|--------------|----------|-----------|--------|
| Floetrol | Flood/PPG | Latex/Acrylic | 8 oz per gallon | Reduces surface tension, slows water evaporation |
| M-1 Paint Additive | ABC Compounding | Latex | 1-2 oz per gallon | Multi-purpose conditioner |
| XIM Latex Extender | XIM/Rust-Oleum | Latex/Acrylic | Per label | Professional-grade extender |
| Penetrol | Flood/PPG | Oil-based/Alkyd | 8 oz per gallon | Extends open time, improves penetration |

**How extenders work:** These additives function as surfactants, reducing surface tension and slowing evaporation of the water carrier.

#### 15.7.4 Tool Pre-Wetting

Some professionals recommend pre-wetting the roller or brush with water (spinning out the excess) to prevent the tools from immediately wicking moisture out of the paint film. This can extend working time slightly.

#### 15.7.5 Environmental Factors

| Condition | Effect | Response |
|-----------|--------|----------|
| High heat (>80°F) | Water flashes too quickly; heavy brush marks | Lower temperature if possible; use extender; work smaller sections |
| Low humidity (<40% RH) | Accelerated drying | Use extender; work faster |
| High humidity (>70% RH) | Extended dry time; increased dust contamination risk | May improve leveling but monitor for sag; ensure clean environment |
| Airflow | Can cause uneven drying | Seal HVAC vents in immediate work area |

#### 15.7.6 Recoat Windows

| Product Type | Touch Dry | Recoat | Full Cure |
|--------------|-----------|--------|-----------|
| Standard acrylic enamel | 1 hour | 2-4 hours | 7-14 days |
| Waterborne alkyd (Advance, etc.) | 2-4 hours | 16-24 hours | 14-30 days |
| Urethane enamel (Emerald, etc.) | 1-2 hours | 4 hours | 7-14 days |

**Do not rush recoat.** Inadequate cure before sanding or recoating causes lifting, wrinkling, or poor inter-coat adhesion.

---

### 15.8 Oil-Based / Alkyd Technique

#### 15.8.1 The Open Time Advantage

Oil-based and alkyd coatings remain workable for 4-8 hours, allowing:

- Extended brushing and spreading
- Effective tipping off throughout the open window
- Natural self-leveling before skin forms
- The "flood" approach — slightly heavier application that levels out

#### 15.8.2 Application Technique

1. **Load brush fully** — Natural bristle absorbs more material. Full load provides adequate working material.

2. **Apply with the grain** — Spread coating evenly across the surface.

3. **Tip off** — With a nearly-dry brush, make single light passes from dry area into wet. Final stroke lifts off the surface at the end rather than stopping abruptly.

4. **Monitor for sags** — Because oil-based paints level so well, they can be applied heavier, but this increases risk of "curtaining" on vertical surfaces several minutes after you've moved on. Check back.

#### 15.8.3 The "Flood" Approach

Oil-based paints can be applied slightly heavier than waterborne paints because they level so well. However, this increases the risk of runs on vertical surfaces. The technique works best on horizontal surfaces (doors laid flat, shelves).

#### 15.8.4 Yellowing Consideration

Oil-based and alkyd coatings yellow over time, particularly:

- In low-light areas (closets, cabinet interiors)
- On white and off-white colors
- Under artificial light vs natural light

**For white/light trim in closets or low-light areas:** Consider waterborne alkyd (Advance, Emerald Urethane) instead of traditional oil.

**Client communication:** If using traditional oil on white trim, inform client of yellowing characteristic. This is a product property, not a defect.

#### 15.8.5 Cleanup and Safety

| Task | Method |
|------|--------|
| Brush cleaning | Mineral spirits, work thoroughly into bristles, repeat until spirits run clear |
| Brush conditioning | After cleaning, wash with dish soap and water, reshape, hang to dry |
| Brush storage | Hang or lay flat — never rest on bristles |
| Rag disposal | **Place in water-filled metal container** — oil-soaked rags can spontaneously combust during oxidative curing |

---

### 15.9 Regulatory Constraints

#### 15.9.1 VOC Regulations by Region

| Region | Status | Impact |
|--------|--------|--------|
| California (SCAQMD Rule 1113) | Most stringent — 50 g/L for non-flat | Traditional oil-based prohibited |
| OTC states (Northeast) | Restricted | Compliant products available |
| LADCO (Great Lakes) | Moderate restrictions | Most products compliant |
| National (EPA) | Federal limits | Most products compliant |
| Canada | Provincial variation | Generally similar to US |

**Check local regulations** before specifying oil-based products. The small container exemption (higher-VOC coatings in <1 liter containers) is being phased out.

#### 15.9.2 Practical Reality

VOC limits have effectively forced the professional market toward waterborne technologies. Techniques once reserved for traditional oils must now be adapted to the faster-setting rheology of Zero-VOC waterborne enamels.

---

### 15.10 Quality Tier Mapping to AWI Grades

#### 15.10.1 AWI Quality Grades

The Architectural Woodwork Institute (AWI) Standards provide objective criteria for evaluating finish quality:

| AWI Grade | Aesthetic Requirement | Hand-Applied Benchmark | PaintFactor QT |
|-----------|----------------------|------------------------|----------------|
| Premium | Highest aesthetic value | No visible brush marks, orange peel, or sags under normal lighting; factory-equivalent | QT5 |
| Custom | Standard high-quality work | Minimal brush marks allowed; uniform sheen and color; no drips | QT4 |
| Economy | Minimum quality standard | Minor visible texture and brush marks acceptable on semi-exposed surfaces | QT3 |

#### 15.10.2 Surface Visibility Categories

AWI further refines requirements by surface visibility:

| Category | Definition | Finish Requirement |
|----------|------------|-------------------|
| Exposed | Visible when millwork is in closed position (door fronts, trim faces) | Highest grade |
| Semi-Exposed | Visible only when doors/drawers opened (cabinet interiors, drawer sides) | Lower tier acceptable |
| Concealed | Not visible after installation (back of built-in) | Seal coat only for moisture stability |

#### 15.10.3 Quality Tier Achievability with Brush/Roll

| Quality Tier | Sheen | Brush/Roll Achievability | Coat Count | Notes |
|--------------|-------|-------------------------|------------|-------|
| QT3 (Economy) | Satin | Fully achievable | 2 coats | Standard method for many contractors |
| QT3 (Economy) | Semi-gloss | Achievable | 2 coats | Proper technique required |
| QT4 (Custom) | Satin | Fully achievable | 2 coats | Premium product recommended |
| QT4 (Custom) | Semi-gloss | Achievable with skill | 2-3 coats | Waterborne alkyd recommended |
| QT5 (Premium) | Satin | Achievable with high skill | 2-3 coats | Meticulous sanding between coats |
| QT5 (Premium) | Semi-gloss | Achievable with high skill | 3+ coats | Premium product mandatory |
| QT5 (Premium) | Gloss | Difficult / not recommended | — | Spray strongly preferred |

#### 15.10.4 Where Brush/Roll Can Match Spray

| Surface Type | Achievable Match | Notes |
|--------------|------------------|-------|
| Flat trim profiles (baseboard, flat casing) | Yes | Rigid block sanding effective |
| Simple panel doors | Yes, with skill | Proper sequence and technique |
| Satin and semi-gloss sheens | Yes | Sanding strategy handles texture |
| Cabinet face frames | Yes | Accessible flat surfaces |

#### 15.10.5 Where Spray Remains Superior

| Surface Type | Why Spray Preferred |
|--------------|---------------------|
| Complex profiles (detailed crown, dentil, rope molding) | Brush cannot reach all surfaces evenly |
| Gloss finishes | Any texture visible; brush marks unacceptable |
| Cabinet interiors | Access limitations; spray reaches all surfaces |
| High-volume production | Speed differential significant |
| Louvered doors | Impossible to brush effectively |

---

### 15.11 Surface-Specific Technique

#### 15.11.1 Linear Trim (Baseboard, Casing)

1. Work full length of run if possible
2. If breaking, stop at corner, joint, or other natural break
3. Brush with the length of the trim
4. Lay off toward the end of the run
5. Watch inside corners for buildup — brush out excess

**Inside corner technique:** Load brush lightly, work coating out of corner onto flat surfaces. Do not deposit excess material in the corner.

#### 15.11.2 Panel Doors — The Professional Sequence

For a standard six-panel door, the sequence maintains wet edge while working from most complex areas to largest flat surfaces:

| Step | Element | Technique |
|------|---------|-----------|
| 1 | Profiles/Moldings | Angled brush on recessed moldings around panels. Light touch — prone to puddling in corners. Pull out excess. |
| 2 | Panel Centers | Roll or brush flat centers following vertical grain direction. |
| 3 | Horizontal Rails | Paint top, middle (lock), and bottom rails. Strokes strictly horizontal. End at joint with vertical stiles. |
| 4 | Vertical Mullions and Stiles | Center mullions first, then outer stiles. Final strokes: long continuous vertical passes top to bottom. |
| 5 | Edges | Hinge edge and strike edge last. Match edge color to the visible face from that direction. |

**Watch for:**

- Buildup in panel reveal (wipe out with dry brush)
- Drips at rail/stile intersections
- Runs on vertical stiles

**Doors laid flat:** Eliminates runs and sags; requires drying space and handling for flip. Allows paint to "puddle" slightly and level without gravity interference — results in glass-like finish.

#### 15.11.3 Cabinetry — The "Thin to Win" Philosophy

High-performance waterborne alkyds (like BM Advance) are prone to sagging on vertical cabinet gables due to low initial viscosity.

**Horizontal finishing:** Whenever possible, remove cabinet doors and paint horizontally on sawhorses or painting pyramids. This allows the paint to level without gravity interference.

**Blocking resistance:** Cabinets require a minimum of **5-7 days cure time** before doors are reinstalled and closed. Closing doors prematurely causes finishes to fuse together, leading to catastrophic peeling when doors are eventually opened.

#### 15.11.4 Profiled Molding

1. Use brush sized appropriately to profile — not too large
2. Work coating into details/crevices first
3. Then address flat surfaces
4. Watch for runs collecting in crevices — brush out while wet
5. For intricate detail at QT5, consider small artist brush for precision

---

### 15.12 Environmental Management

#### 15.12.1 Dust Control

Achieving a dust-free finish in a residential environment requires environmental controls. Standard construction dust will ruin a fine finish within minutes of application.

| Control Measure | Implementation |
|-----------------|----------------|
| HEPA-filtered vacuum | Mandatory for professional finishing |
| Dustless sanders | Festool, Mirka systems — capture up to 90% of particulates |
| Zippered barriers | ZipWall poles or adhesive zippers to isolate work zone |
| Tack cloth | Wipe entire surface immediately before first brush stroke |
| HVAC isolation | Seal vents in immediate work area to prevent dust distribution |

#### 15.12.2 Tack Cloth Protocol

Immediately before application, wipe the entire surface with a tack cloth. This resin-impregnated cheesecloth picks up microscopic dust that vacuum or damp rag leaves behind.

---

### 15.13 Troubleshooting and Defect Mitigation

#### 15.13.1 Common Defects and Prevention

| Defect | Cause | Prevention |
|--------|-------|------------|
| **Roping** (heavy brush marks) | Over-brushing as paint begins to set | Work in smaller sections; "leave it alone" once tipping pass complete |
| **Alligatoring** (cracks in topcoat) | Hard rigid coating over more flexible one | Ensure primer is harder than or equal to topcoat; use bonding primer |
| **Flash rusting** (orange spots) | Waterborne paint on bare nail heads/steel fasteners | Spot-prime all metal fasteners with oil-based or metal primer |
| **Pinholes and bubbles** | Thick-nap roller; shaking paint can | Use high-density foam rollers; stir paint gently (don't shake) |
| **Sagging/curtaining** | Over-application on vertical surfaces | Apply thinner coats; paint horizontal when possible |
| **Blocking** (paint sticks to itself) | Insufficient cure before closing doors | Wait 5-7 days minimum before reinstalling cabinet doors |

#### 15.13.2 The Universal Fix

For most brush/roll defects in waterborne finishes:

1. Let the defective coat cure fully
2. Sand with rigid block (180-220 grit) to level the defect
3. Clean sanding dust thoroughly
4. Apply another coat

Do not try to fix defects while the coating is wet. You will make them worse.

---

### 15.14 Cross-References

#### 15.14.1 Related Doctrine Sections

- Fine Finish Doctrine § 3: Material Systems — Product specifications
- Fine Finish Doctrine § 8: Interstage Process — Inspection and sanding between coats
- Fine Finish Doctrine § 9: Defect Tolerance — Standards by quality tier
- Materials and Consumables Doctrine § 4: Consumable products including sandpaper

#### 15.14.2 Related Reference Documents

- Production Rate Reference — Brush/roll rates by surface type (rates not in doctrine)
- Surface Vocabulary Reference — Surface type definitions

#### 15.14.3 Industry Standards

- AWI/ANSI 0400 — Architectural Woodwork Standards
- AWI/ANSI 0622 — Finish Carpentry/Installation Standards
- SCAQMD Rule 1113 — Architectural Coatings VOC Limits

---

### 15.15 Change Log

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-02-03 | Eric / Claude | Initial canonical release. Research-validated. |
