# Fine Finish Doctrine

**Status:** Canonical
**Version:** 1.0
**Last Updated:** 2026-01-24

This document defines the material systems, process structure, quality tier behavior, and task classification for fine finish painting. AI agents generating specs for trim, built-ins, doors, millwork, and custom wood surfaces MUST follow this doctrine.

---

## Scope Definition

### Surfaces Covered by Fine Finish Doctrine

| Surface Category | Examples | Notes |
|------------------|----------|-------|
| **Trim** | Baseboard, door casing, window casing, crown molding, chair rail, picture rail | Linear elements, typically spray or brush |
| **Built-Ins** | Cabinets, bookshelves, entertainment centers, mudroom cubbies, window seats | Box construction, mix of flat and detail |
| **Doors** | Interior passage doors, closet doors, entry doors (interior face), French doors | Counted per side, flat + detail areas |
| **Millwork** | Wainscoting, paneling, coffered ceilings, beams, columns, fireplace surrounds | Architectural wood elements |
| **Fine Finish Ceilings** | Wood plank ceilings, beadboard ceilings, coffered ceiling panels | NOT drywall — see drywall specs |
| **Fine Finish Walls** | Wood paneled walls, shiplap, board-and-batten, library walls | NOT drywall — see drywall specs |

### Surfaces NOT Covered

| Surface | Correct Doctrine |
|---------|------------------|
| Drywall walls/ceilings | SF_DRYWALL specs |
| Exterior trim/siding | Exterior doctrine (future) |
| Metal surfaces | Metal coating doctrine (future) |
| Cabinets requiring full refinish (strip/sand) | Cabinet refinishing doctrine (future) |

---

## Core Principles

### 1. Primer is Configuration, Not Tier-Locked

Primer requirement is driven by substrate condition and system specification, not quality tier.

```
IF substrate = 'bare_wood' → primer typically required
IF substrate = 'factory_primed' → primer optional (user decision)
IF substrate = 'previously_painted' → primer optional (adhesion assessment)
IF color_change = 'significant' → tinted primer recommended
IF system = 'Gallery Series' → Gallery primer recommended for full system warranty
```

### 2. Interstage Process is Universal

The inspect-repair-clean cycle runs between every coat at ALL quality tiers. What changes is:
- **Scrutiny level** — how carefully you look
- **Defect tolerance** — what you mark for repair
- **Pace** — how fast you move through the process

### 3. Quality Tier Controls Scrutiny, Not Process Steps

Same tasks exist at all tiers. Higher tiers execute with:
- Slower pace
- Tighter tolerances
- More thorough inspection
- Higher repair standards

### 4. Clear Coat is Optional Scope

Clear coat adds durability and depth but is a configuration option, not automatic at any tier.

---

## Material Systems

### System Overview

| System ID | Name | Quality Tier | Primer | Finish | Clear | Notes |
|-----------|------|--------------|--------|--------|-------|-------|
| SYS_FF_ECONOMY | Economy Acrylic-Urethane | QT3 | Acrylic (tinted, optional) | Modified urethane satin | None | Budget work, rental turnover |
| SYS_FF_STANDARD | Standard Modified Urethane | QT3-QT4 | Acrylic (optional) | Modified urethane (satin/semi-gloss) | None | Standard residential |
| SYS_FF_PREMIUM | Premium Modified Urethane | QT4 | Acrylic or bonding primer (optional) | Emerald Urethane or equivalent | None | Premium residential, light commercial |
| SYS_FF_GALLERY | Gallery Series Full System | QT5 | Gallery Series primer | Gallery Series finish | Optional clear | Showroom quality, custom homes |
| SYS_FF_CONVERSION | Conversion Varnish System | QT5 | Vinyl sealer or conversion primer | Conversion varnish | Optional clear | Commercial millwork, maximum durability |

### System Selection Guidance

| Scenario | Recommended System | Notes |
|----------|-------------------|-------|
| Rental/turnover | SYS_FF_ECONOMY | Speed over perfection |
| Standard residential new construction | SYS_FF_STANDARD | Balance of quality and cost |
| Premium residential | SYS_FF_PREMIUM | Emerald-tier products |
| Custom home, architect-spec | SYS_FF_GALLERY | Full premium system |
| Commercial millwork, high-traffic | SYS_FF_CONVERSION | Maximum durability |
| Historic restoration | SYS_FF_GALLERY or custom | May require specific products |

### Primer Selection Within Systems

| Substrate Condition | Economy | Standard | Premium | Gallery | Conversion |
|---------------------|---------|----------|---------|---------|------------|
| Bare softwood (pine, poplar) | Acrylic (tinted) | Acrylic | Bonding primer | Gallery primer | Vinyl sealer |
| Bare hardwood (oak, maple) | Acrylic (tinted) | Acrylic | Bonding primer | Gallery primer | Vinyl sealer |
| MDF/composite | Acrylic | Acrylic | Bonding primer | Gallery primer | Vinyl sealer |
| Factory primed | Optional | Optional | Optional | Optional (recommend full system) | Optional |
| Previously painted (good adhesion) | None | None | None | None | Scuff + none |
| Previously painted (questionable) | Bonding primer | Bonding primer | Bonding primer | Bonding primer | Bonding primer |
| Knots/tannin bleed | Shellac spot prime | Shellac spot prime | Shellac spot prime | Shellac spot prime | Shellac spot prime |

### Sheen Selection

| Quality Tier | Allowed Sheens | Rationale |
|--------------|----------------|-----------|
| QT3 | Satin or lower (flat, matte, eggshell, satin) | Lower sheens hide minor surface imperfections |
| QT4 | Any sheen EXCEPT gloss | Semi-gloss acceptable; gloss reveals too much |
| QT5 | Any desired sheen including gloss | Workmanship supports any sheen level |

**Why sheen is tier-restricted:**
- Higher sheens (semi-gloss, gloss) act as magnifiers for surface imperfections
- Gloss finish reveals every dust nib, orange peel texture, and minor defect
- QT5 workmanship (thorough sanding, critical inspection, zero-tolerance repairs) is required to support gloss finishes
- Specifying gloss at QT3 sets the project up for failure

**Common Sheen Choices by Surface:**

| Surface | Typical Sheen | Notes |
|---------|---------------|-------|
| Trim | Semi-gloss | Durability, cleanability |
| Doors | Semi-gloss | High-touch surface |
| Cabinets | Semi-gloss or satin | Client preference |
| Millwork | Satin or semi-gloss | Depends on formality |
| Ceiling planks | Satin | Softer appearance overhead |

---

## Coat Count by Tier

### Standard Coat Sequences

| Tier | Primer | Finish Coats | Clear | Typical Total |
|------|--------|--------------|-------|---------------|
| QT3 | 0-1 | 1-2 | 0 | 1-3 coats |
| QT4 | 0-1 | 2 | 0 | 2-3 coats |
| QT5 | 0-1 | 2 | 0-1 | 2-4 coats |

### When Additional Coats Are Required

| Condition | Additional Coat |
|-----------|-----------------|
| Bare wood with open grain | Add primer or sealer |
| Significant color change (light to dark) | Add tinted primer |
| High-traffic surface (doors, cabinets) | Consider clear coat |
| Maximum durability required | Add clear coat |
| Defects found in final inspection | Touch-up or additional finish coat |

---

## The Initial Prep Phase

### Purpose

The **Initial Prep Phase** is the primary fill-sand-caulk cycle that occurs:
- AFTER primer coat (if primed), OR
- BEFORE first finish coat (if no primer)

This is where the majority of surface preparation work happens. It is distinct from interstage work between subsequent finish coats.

### Module: MOD_FF_INITIAL_PREP

| Task ID | Task Name | Task Class | UOM | Description |
|---------|-----------|------------|-----|-------------|
| TSK_FF_FILL_FASTENERS | Fill Fastener Holes | qt_scaled | EA | Fill nail holes, screw holes, staple marks |
| TSK_FF_FILL_GAPS | Fill Gaps/Cracks | qt_scaled | LF | Caulk or fill gaps at joints, corners, wall intersections |
| TSK_FF_SAND_FILL | Sand Filled Areas | qt_scaled | EA | Sand filler smooth, feather edges |
| TSK_FF_CAULK_JOINTS | Caulk Joints | qt_scaled | LF | Caulk trim-to-wall, trim-to-trim joints |
| TSK_FF_FULL_SAND | Full Surface Sand | qt_scaled | LF or SF | Sand entire surface for adhesion and smoothness |
| TSK_FF_CLEAN_DUST | Clean Sanding Dust | binary | SF | Remove all sanding dust before coating |

### Initial Prep Scrutiny by Tier

| Task | QT3 | QT4 | QT5 |
|------|-----|-----|-----|
| Fill Fasteners | Fill obvious holes; small pinholes may be left | Fill all visible holes | Fill every hole, no matter how small |
| Fill Gaps | Fill gaps that would show through finish | Fill all gaps | Fill all gaps, perfect smooth finish |
| Sand Fill | Knock down ridges; flush not required | Sand flush, blend edges | Sand perfectly flush, invisible |
| Caulk Joints | Functional caulk; bead appearance acceptable | Smooth caulk lines | Perfect tooled caulk, invisible joints |
| Full Sand | Light scuff for adhesion | Full sand 180-220 grit | Thorough sand 220+ grit, uniform scratch pattern |

### When Initial Prep Occurs

```
Scenario A (with primer):
  Prime → INITIAL PREP → Finish Coat 1 → Interstage → Finish Coat 2

Scenario B (no primer, factory primed substrate):
  INITIAL PREP → Finish Coat 1 → Interstage → Finish Coat 2
```

**Key Point:** Initial prep is the HEAVY LIFT. Interstage is lighter maintenance between subsequent coats.

---

## The Interstage Process

### Overview

The **Interstage Process** is a lighter maintenance cycle that runs between finish coats (after the initial prep is complete). It addresses any issues that developed during coating.

**Module ID:** `MOD_FF_INTERSTAGE`

### Interstage vs Initial Prep

| Aspect | Initial Prep | Interstage |
|--------|--------------|------------|
| **When** | After primer / before finish coat 1 | Between finish coats |
| **Scope** | All filling, caulking, major sanding | Light sanding, dust nib removal |
| **Labor** | Heavy — majority of prep time | Light — maintenance only |
| **Defects addressed** | Substrate defects, fastener holes, gaps | Coating defects (nibs, minor imperfections) |

### Interstage Tasks

| Task ID | Task Name | Task Class | UOM | Description |
|---------|-----------|------------|-----|-------------|
| TSK_FF_CLEAN_WORK_AREA | Clean Work Area | binary | SF | Clean floors, flat surfaces, remove dust and debris |
| TSK_FF_INSPECT_COAT | Inspect Coat | qt_scaled | LF or SF | Visual inspection, mark defects for repair |
| TSK_FF_LIGHT_SAND | Light Sand | qt_scaled | LF or SF | Scuff sand full surface (220-320 grit) |
| TSK_FF_PATCH_REPAIR | Patch/Repair Defects | qt_scaled | EA | Fill holes, repair damage, address defects |
| TSK_FF_SAND_PATCHES | Sand Patches | qt_scaled | EA | Feather patches smooth |
| TSK_FF_SPOT_COAT_PATCHES | Spot Coat Patches | qt_scaled | EA | Touch prime or finish patched areas |

### Interstage Runs

Interstage runs **AFTER each coat EXCEPT the final coat**.

| Scenario | Interstage Runs |
|----------|-----------------|
| Prime + 1 Finish | 1 (after prime) |
| Prime + 2 Finish | 2 (after prime, after finish 1) |
| 2 Finish (no prime) | 1 (after finish 1) |
| Prime + 2 Finish + Clear | 3 (after prime, after finish 1, after finish 2) |

**Rule:** Final inspection is a separate task, not part of interstage.

---

## Scrutiny Definitions by Tier

### TSK_FF_CLEAN_WORK_AREA

| Tier | Scrutiny Definition |
|------|---------------------|
| QT3 | Quick sweep. Remove obvious debris, dust piles, overspray accumulation. |
| QT4 | Thorough clean. No visible dust on floors or horizontal surfaces within work zone. |
| QT5 | Meticulous clean. Floors, flat surfaces, adjacent areas, windowsills, tops of trim. No dust that could contaminate next coat. |

### TSK_FF_INSPECT_COAT (Interstage Inspection)

**Critical Philosophy:** Quality tiers define **expectation levels**, NOT tolerance for poor workmanship. Runs, sags, holidays, and drips should **NEVER exist at ANY tier** — these indicate improper application technique, not acceptable QT3 work.

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

### TSK_FF_LIGHT_SAND

| Tier | Scrutiny Definition |
|------|---------------------|
| QT3 | Spot sand only. Address visible nibs, runs, rough spots. Not full surface. |
| QT4 | Light full sand (220 grit). Entire surface gets scuff for adhesion. Address all marked defects. |
| QT5 | Thorough full sand (220-320 grit). Entire surface with attention to detail. All marked defects addressed. Surface must be uniformly smooth to touch. |

### TSK_FF_PATCH_REPAIR

| Tier | Scrutiny Definition |
|------|---------------------|
| QT3 | Repair only glaring defects. Deep scratches, obvious holes, runs that won't sand out. |
| QT4 | Repair all marked defects. Holes, dents, scratches, any damage visible at 3 feet. |
| QT5 | Repair all defects regardless of size. Any imperfection that could telegraph through finish. |

### TSK_FF_SAND_PATCHES

| Tier | Scrutiny Definition |
|------|---------------------|
| QT3 | Quick feather. Patches level with surface, edges knocked down. |
| QT4 | Proper feather. Patches blend with surrounding surface, no visible edges at 3 feet. |
| QT5 | Invisible blend. Patches completely undetectable by touch or sight. |

### TSK_FF_SPOT_COAT_PATCHES

| Tier | Scrutiny Definition |
|------|---------------------|
| QT3 | Optional. Skip if patches are small and primer is tinted. |
| QT4 | Required. All patches get spot coat before next full coat. |
| QT5 | Required, may need multiple passes. Patches must be fully sealed and color-matched before next coat. |

---

## Defect Tolerance Reference

### Application Failures vs. Expectation Differences

**Critical distinction:** Some defects indicate improper application technique and should NEVER exist at any tier. Other defects are matters of expectation level.

### Application Failures (NEVER Acceptable at Any Tier)

| Defect | Why It's Unacceptable |
|--------|----------------------|
| Runs | Indicates over-application or improper technique |
| Sags | Indicates over-application or improper technique |
| Drips | Indicates over-application or sloppy work |
| Holidays (missed spots) | Indicates incomplete coverage |

**If these defects are found:** Stop and address application technique. Do not proceed with "it's just QT3" — these are workmanship failures, not quality tier differences.

### Expectation-Level Defects by Tier

| Defect Type | QT3 | QT4 | QT5 |
|-------------|-----|-----|-----|
| Dust nibs | Accept if minor | Isolated minor nibs acceptable | Not acceptable — sand and recoat |
| Orange peel texture | Accept if consistent | Accept if very light and consistent | Not acceptable — must be smooth |
| Brush marks (brush/roll only) | Accept if minor | Very minor acceptable | Not acceptable |
| Stipple (roller texture) | Accept | Minor acceptable | Not acceptable |
| Uneven sheen | Accept if coverage complete | Not acceptable | Not acceptable |
| Fill/caulk visibility | Visible acceptable, no ridges/edges | Not visible at 3 feet | Not visible at arm's length |
| Edge definition | Coverage complete, minor overspray ok | Clean lines, minimal overspray | Perfect lines, zero overspray |

### Fill and Caulk Standards by Tier

| Element | QT3 | QT4 | QT5 |
|---------|-----|-----|-----|
| Fastener fill | Filled, may show dimple | Filled flush | Filled perfectly flush, invisible |
| Sanded fill | No ridges or raised edges | Smooth, blended | Invisible, perfectly feathered |
| Caulk lines | Functional, may show tooling | Smooth, neat appearance | Perfect, invisible joints |
| Gaps at joints | Filled, may not be perfect | Properly filled and smooth | Invisible, perfect transitions |

### Inspection Distance Reference

| Tier | Primary Inspection Distance | Lighting |
|------|----------------------------|----------|
| QT3 | 6 feet (casual glance) | Ambient |
| QT4 | 3 feet (systematic scan) | Good ambient |
| QT5 | Arm's length (18-24") | Work lights, raking light |

---

## Pre-Spray Critical Inspection (QT5 Only)

### Purpose

At QT5, a **critical pre-spray inspection** occurs BEFORE any coating is applied. This catches substrate defects that will telegraph through all subsequent coats.

### Module: MOD_FF_CRITICAL_PRE_INSPECTION

| Task ID | Task Name | Task Class | Description |
|---------|-----------|------------|-------------|
| TSK_FF_LIGHTED_CRITICAL_INSPECTION | Lighted Critical Inspection | qt_conditional (QT5) | Work lights, inspect all surfaces for scratches, dents, mill marks, sanding swirls, raised grain |
| TSK_FF_ROUND_2_PREP | Round 2 Prep | qt_conditional (QT5) | Address ALL defects found before any coating applied |

### What to Look For

| Defect | Action |
|--------|--------|
| Scratches | Sand out or fill |
| Dents | Fill and sand |
| Mill marks | Sand smooth |
| Raised grain | Sand smooth (may need wetting/re-sand) |
| Glue residue | Remove completely |
| Pencil marks | Sand or solvent wipe |
| Sanding swirls | Re-sand with finer grit |
| Previous finish defects | Sand or strip |

---

## Application Methods

### Method Selection

| Surface Type | QT3 | QT4 | QT5 |
|--------------|-----|-----|-----|
| Trim (linear) | Spray or brush/roll | Spray preferred | Spray (HVLP or airless fine finish) |
| Doors | Spray or brush/roll | Spray preferred | Spray (HVLP or airless fine finish) |
| Cabinets | Spray | Spray | Spray (HVLP preferred for detail) |
| Built-ins | Spray | Spray | Spray (HVLP preferred for detail) |
| Paneling/wainscot | Spray or brush/roll | Spray | Spray |
| Ceiling planks | Spray or roll | Spray | Spray |

**Brush/Roll Fine Finish Notes:**
- Use microfiber rollers (3/16" - 1/4" nap) for smoothest finish
- Proper brush technique essential — quality angle brush, proper loading
- Tape lines recommended at QT4+ to reduce brush marks at edges

### Spray Equipment by Tier

| Tier | Equipment | Notes |
|------|-----------|-------|
| QT3 | Airless (standard tips) | Production speed priority |
| QT4 | Airless (fine finish tips) or HVLP | Balance of speed and quality |
| QT5 | HVLP or Airless (fine finish tips) | HVLP common for control; airless acceptable with skilled operator |

**Note:** Equipment choice at QT5 depends on surface complexity, painter skill, and project scale. HVLP offers finer control for detail work; airless fine finish provides faster coverage on larger surfaces.
| QT5 | HVLP or airless with fine finish tips | Quality priority, controlled application |

### Spray Technique by Tier

| Aspect | QT3 | QT4 | QT5 |
|--------|-----|-----|-----|
| Overlap | 50% | 50% | 50-75% |
| Distance | 10-12" | 10-12" | 8-10" |
| Speed | Production pace | Moderate pace | Slow, controlled |
| Wet mil | Standard | Standard-heavy | Optimal per PDS |
| Pattern | Consistent | Consistent | Perfect uniformity |

---

## Production Rate Guidance

### Setup and Prep Tasks (Binary)

| Task | Rate | UOM | Notes |
|------|------|-----|-------|
| TSK_FF_CLEAN_SURFACES_FLOORS | 1500 | SF | Initial job setup |
| TSK_FF_INSPECT_MASKING | 500 | LF | Verify all masking sealed |
| TSK_FF_WIPE_DOWN_SURFACES | 300 | LF | Remove dust from surfaces to be coated |

### Interstage Tasks

| Task | QT3 Rate | QT4 Rate | QT5 Rate | UOM |
|------|----------|----------|----------|-----|
| TSK_FF_CLEAN_WORK_AREA | 2000 | 1500 | 1000 | SF |
| TSK_FF_INSPECT_COAT | 800 | 500 | 300 | LF |
| TSK_FF_LIGHT_SAND | 400 | 250 | 150 | LF |
| TSK_FF_PATCH_REPAIR | 20 | 15 | 10 | EA |
| TSK_FF_SAND_PATCHES | 30 | 20 | 12 | EA |
| TSK_FF_SPOT_COAT_PATCHES | 25 | 18 | 10 | EA |

### Application Tasks (Spray)

| Task | QT3 Rate | QT4 Rate | QT5 Rate | UOM | Notes |
|------|----------|----------|----------|-----|-------|
| TSK_FF_SPRAY_PRIMER | 400 | 350 | 300 | LF | Trim/linear |
| TSK_FF_SPRAY_PRIMER | 500 | 450 | 350 | SF | Flat surfaces |
| TSK_FF_SPRAY_FINISH | 350 | 300 | 250 | LF | Trim/linear |
| TSK_FF_SPRAY_FINISH | 450 | 400 | 300 | SF | Flat surfaces |
| TSK_FF_SPRAY_CLEAR | — | — | 250 | LF | QT5 optional |
| TSK_FF_SPRAY_CLEAR | — | — | 300 | SF | QT5 optional |

### Final Inspection

| Task | QT3 Rate | QT4 Rate | QT5 Rate | UOM |
|------|----------|----------|----------|-----|
| TSK_FF_FINAL_INSPECTION | 1000 | 600 | 300 | LF |

*All rates are starting estimates pending field calibration.*

---

## Module Structure

### Standard Fine Finish Modules

```
MOD_FF_SETUP (binary, all tiers)
├── TSK_FF_CLEAN_SURFACES_FLOORS (binary)
├── TSK_FF_INSPECT_MASKING (binary)
└── TSK_FF_WIPE_DOWN_SURFACES (binary)

MOD_FF_CRITICAL_PRE_INSPECTION (qt_conditional, QT5 only)
├── TSK_FF_LIGHTED_CRITICAL_INSPECTION (qt_conditional)
└── TSK_FF_ROUND_2_PREP (qt_conditional)

MOD_FF_PRIME (binary, optional based on primer_required)
└── TSK_FF_SPRAY_PRIMER (binary)

MOD_FF_INTERSTAGE (qt_scaled, all tiers, runs between coats)
├── TSK_FF_CLEAN_WORK_AREA (binary)
├── TSK_FF_INSPECT_COAT (qt_scaled)
├── TSK_FF_LIGHT_SAND (qt_scaled)
├── TSK_FF_PATCH_REPAIR (qt_scaled)
├── TSK_FF_SAND_PATCHES (qt_scaled)
└── TSK_FF_SPOT_COAT_PATCHES (qt_scaled)

MOD_FF_FINISH (qt_scaled, all tiers)
├── TSK_FF_SPRAY_FINISH_COAT_1 (qt_scaled)
└── TSK_FF_SPRAY_FINISH_COAT_2 (qt_scaled, QT4/QT5 or 2-coat spec)

MOD_FF_CLEAR (qt_conditional, optional)
└── TSK_FF_SPRAY_CLEAR_COAT (qt_conditional)

MOD_FF_FINAL (qt_scaled, all tiers)
└── TSK_FF_FINAL_INSPECTION (qt_scaled)
```

### Applicability Rules

```json
{
  "applicability_rules": [
    {
      "rule_id": "APR_FF_SETUP",
      "condition": "always",
      "modules": ["MOD_FF_SETUP"]
    },
    {
      "rule_id": "APR_FF_CRITICAL_PRE",
      "condition": "quality_tier = 'QT5'",
      "modules": ["MOD_FF_CRITICAL_PRE_INSPECTION"]
    },
    {
      "rule_id": "APR_FF_PRIME",
      "condition": "primer_required = true",
      "modules": ["MOD_FF_PRIME"]
    },
    {
      "rule_id": "APR_FF_INTERSTAGE",
      "condition": "always (after each coat except final)",
      "modules": ["MOD_FF_INTERSTAGE"]
    },
    {
      "rule_id": "APR_FF_FINISH",
      "condition": "always",
      "modules": ["MOD_FF_FINISH"]
    },
    {
      "rule_id": "APR_FF_CLEAR",
      "condition": "clear_coat = true",
      "modules": ["MOD_FF_CLEAR"]
    },
    {
      "rule_id": "APR_FF_FINAL",
      "condition": "always",
      "modules": ["MOD_FF_FINAL"]
    }
  ]
}
```

---

## Substrate-Specific Considerations

### Trim (Baseboard, Casing, Crown)

| Consideration | Guidance |
|---------------|----------|
| UOM | Linear feet (LF) |
| Profile complexity | Detailed profiles slow production; flat stock is faster |
| Inside corners | Require careful technique, slower pace |
| Outside corners | Check for adequate coverage on edges |
| Gaps to wall/floor | Caulk before prime (separate task) |

### Doors

| Consideration | Guidance |
|---------------|----------|
| UOM | Each (EA), counted per side |
| Panel doors | More detail = slower production |
| Flush doors | Faster, but shows roller/spray texture more |
| Edges | Coat all edges, especially top and bottom |
| Hardware | Remove or mask before spray |
| Hanging vs laid flat | Laid flat prevents runs, but requires drying space |

### Built-Ins and Cabinets

| Consideration | Guidance |
|---------------|----------|
| UOM | Square feet (SF) for box, linear feet (LF) for face frames |
| Interiors | May be different spec (economy interior, premium exterior) |
| Adjustable shelves | Remove, coat separately, reinstall |
| Doors/drawers | Remove, coat separately, reinstall |
| Hardware | Remove before spray |
| Hinges | European hinges allow door removal; traditional may not |

### Millwork (Paneling, Wainscoting, Coffered Ceilings)

| Consideration | Guidance |
|---------------|----------|
| UOM | Square feet (SF) |
| Reveal lines | Require careful spray technique to avoid pooling |
| Raised panels | Spray panel fields first, then rails/stiles |
| Beadboard | Spray at angle to ensure groove coverage |
| Beams/columns | Wrap technique, multiple angles |

### Wood Ceilings

| Consideration | Guidance |
|---------------|----------|
| UOM | Square feet (SF) |
| Overhead ergonomics | Slower than wall work |
| Plank gaps | May accumulate spray; wipe or accept |
| Beam wraps | Multi-angle spray required |
| Access | Scaffolding or lifts for height |

### Wood Walls

| Consideration | Guidance |
|---------------|----------|
| UOM | Square feet (SF) |
| Shiplap/board-and-batten | Spray at angle for gap coverage |
| Wainscoting | Lower section may be different spec than upper wall |
| Library walls | Complex millwork, QT4+ recommended |

---

## Edge Work and Masking

### Spray Application: Full Masking Required

For spray application of fine finish work, **all edges are masked** — there is no cut-in with spray.

| Element | Masking Approach |
|---------|------------------|
| Trim-to-wall edges | Tape line on wall, paper/plastic protection |
| Built-in perimeter | Full masking with paper or film |
| Adjacent surfaces | Masking film or paper |
| Floors | Paper or plastic per Protection Doctrine |

**Why no cut-in with spray:** Spray application requires complete masking of all adjacent surfaces. The spray gun does not allow for precision edge work like a brush.

### Brush & Roll Application: Cut-In or Tape Line

For brush and roll fine finish work, edges are handled by cut-in or tape line:

| Method | Description | When to Use |
|--------|-------------|-------------|
| Freehand cut-in | Skilled brush work at edges | Experienced painters, faster turnaround |
| Tape line | Tape edge, paint to tape, remove | Cleaner edge, reduced brush marks at transition |

**Edge Strategy by Tier (Brush/Roll Only):**

| Tier | Recommended Strategy |
|------|---------------------|
| QT3 | Freehand cut-in acceptable; tape line optional |
| QT4 | Tape line recommended for cleaner edges |
| QT5 | Tape line with edge seal required for crisp lines |

### Roller Selection for Brush/Roll Fine Finish

**Microfiber rollers are standard for fine finish brush/roll work.**

| Roller Type | Nap | Application |
|-------------|-----|-------------|
| Microfiber mini roller | 3/16" - 1/4" | Trim, doors, small surfaces |
| Microfiber 9" roller | 3/16" - 1/4" | Larger flat surfaces, panels |
| Foam roller | N/A | Ultra-smooth finish on flat surfaces |

**Why microfiber:** Provides smoother lay-off than traditional woven rollers, reduces stipple and orange peel, works well with modern urethane trim paints.

---

## New Construction Sequencing

### Typical NC Fine Finish Sequence

1. **Walls/ceilings primed** (drywall contractor or paint crew)
2. **Ceiling finish complete** (before trim to avoid overspray)
3. **Full job masked** (cabinets, fixtures, flooring, counters)
4. **Trim package begins** (this doctrine)
5. **Wall finish after trim** (optional sequence)

### Pre-Conditions for Fine Finish

| Condition | Requirement |
|-----------|-------------|
| HVAC | Running and stable (temperature/humidity control) |
| Dust | Drywall sanding complete, dust settled/cleaned |
| Masking | All adjacent surfaces protected |
| Substrate | Trim/millwork installed, caulked, prepped |
| Lighting | Work lighting available for inspection |

---

## Quality Tier Summary

| Aspect | QT3 | QT4 | QT5 |
|--------|-----|-----|-----|
| **Inspection depth** | Glance check | Systematic at 3 ft | Lighted at arm's length |
| **Pre-spray inspection** | No | No | Yes (critical) |
| **Sanding between coats** | Spot only | Light full sand | Thorough full sand |
| **Defect repair** | Glaring only | All visible at 3 ft | All visible at arm's length |
| **Patch visibility** | Acceptable | Not at 3 ft | Not at arm's length |
| **Orange peel** | Acceptable | Consistent OK | Not acceptable |
| **Typical coat count** | 1-2 | 2-3 | 3-4 |
| **Clear coat** | No | No | Optional |
| **Material system** | Economy | Premium | Gallery/Conversion |
| **Application** | Spray or brush | Spray preferred | Spray required |

---

## References

- Field notes from professional painting contractor (2026-01-24)
- PaintFactor DevOS architecture
- Quality_Tiers_and_Surface_Condition.md
- Materials_and_Consumables_Doctrine.md