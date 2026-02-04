# Built-Ins / Shelving Quantification System (Opening Count Method)
**Version:** 2.0
**Last Updated:** 2026-02-03
**Applies To:** Built-ins, bookshelves, closet shelving, cubbies, niches, wall units
**Purpose:** Provide a fast, estimator-friendly quantification method that converts complex shelving geometry into consistent counts for spec generation and labor/material modeling.

**Related Documents:**
- `docs/Reference/Substrate_State_Reference.md` — Substrate state definitions (SS_*)
- `docs/Doctrine/Modifier_Registry.md` — Canonical modifier values
- `docs/Doctrine/Quality_Tiers_and_Surface_Condition.md` — Surface condition definitions
- `docs/PaintScope/PaintScope_Quantity_Key_Catalog.md` — Key naming conventions

---

## 1) Concept Overview

Built-ins and shelving units have highly variable geometry.
Measuring every panel surface area during a walkthrough is slow and inconsistent.

This system quantifies shelving using **Opening Count** as the primary unit:

> **Opening = one paintable compartment / bay**  
A distinct space a painter would naturally recognize as “an interior section to paint.”

Examples:
- A bookshelf tower with 5 shelves → **6 openings** (spaces between shelves)
- A 3×3 cubby unit → **9 openings**
- A closet unit with 2 vertical bays → count each bay as openings based on shelf segmentation

The system avoids detailed geometry (SF/LF calculations) and creates a scalable way to:
- generate scope narratives
- drive production time modeling
- standardize estimating language
- enable consistent spec outputs from PaintScope

---

## 2) Primary Metric: Opening Count (EA)

### 2.1 Definition
An **opening** is a compartment bounded by:
- left + right boundaries (side panels or partitions)
- bottom boundary (floor/shelf)
- top boundary (shelf/top panel)
- back boundary (back panel OR wall substrate)

Openings are counted in **EA units**.

### 2.2 What counts as an Opening?
✅ Counts as an opening:
- shelf bays
- cubbies
- niche compartments
- bookcase sections
- closet shelf compartments

❌ Does NOT count as an opening by itself:
- a single shelf board surface
- decorative trim only
- external top surfaces (unless defined separately as surfaces)

---

## 3) Opening Size Tiers (S / M / L / XL)

Openings are classified by **typical compartment size** so estimators can count quickly without measuring every detail.

### 3.1 Tiering Method (Fast On-Site)
The estimator assigns each opening into a tier using visual judgement and/or quick tape checks.

### 3.2 Recommended Size Ranges (Interior Face Approx.)
These ranges represent the **front face envelope** of the compartment.

> Use width × height as the primary classification.  
Depth is handled as a modifier (see §4).

| Tier | Approx Width (in) | Approx Height (in) | Typical Use Case |
|------|-------------------|--------------------|------------------|
| S    | 6–18              | 6–18               | Small cubbies, shoe shelves, small niches |
| M    | 18–36             | 12–30              | Standard bookshelf openings, typical built-in bays |
| L    | 36–60             | 18–42              | Wide media shelving, large compartments |
| XL   | 60+               | 30+                | Oversized bays, deep/wide feature units |

**Estimator Rule of Thumb:**
- If it fits a shoebox-like compartment → S
- If it fits books + decor normally → M
- If it looks “wide like a TV section” → L
- If it’s huge / custom feature bay → XL

---

## 4) Modifiers (Applied to Openings)

Opening counts alone do not capture the main drivers of complexity.
Modifiers are applied as flags or categories that influence time, difficulty, and spec narrative.

Modifiers should NOT change the count — they change how the system interprets the count.

### 4.1 Depth Modifier
Depth increases labor due to reach, masking difficulty, and edge work.

| Modifier | Description | Trigger Guidance |
|----------|-------------|------------------|
| SHALLOW  | ≤ 10" depth | Standard shelves, easy access |
| DEEP     | 10–16" depth | Typical built-ins, medium difficulty |
| VERY_DEEP | 16"+ depth | Closet towers, deep media units |

### 4.2 Detail / Profile Modifier
Captures trim complexity and finishing difficulty.

| Modifier | Description |
|----------|-------------|
| SIMPLE_BOX | Clean inside edges, minimal trim |
| FACE_FRAME | Face frames, stiles/rails, extra edges |
| CROWN/VALANCE | Decorative tops, valances, corbels |
| BEADED/ROUTED | Routed profiles, beaded face, detailed trim |

### 4.3 Access Modifier
Captures whether the painter can work freely.

| Modifier | Description |
|----------|-------------|
| OPEN_ACCESS | Normal access |
| CRAMPED | Tight closet, narrow hallway built-in |
| OBSTRUCTED | Permanent obstacles or hard masking zones |

### 4.4 Application Method
Primary application technique.

| Modifier | Description |
|----------|-------------|
| `BRUSH_ROLL` | Brush and roll application (typical for installed built-ins) |
| `SPRAY` | Spray application (pre-installation or production runs) |
| `SPRAY_ROLLOFF` | Spray + immediate rolloff to work primer into grain (required for SS_BARE wood) |

> Note: `SPRAY_ROLLOFF` ensures primer penetration on bare wood grain. Exact production baselines belong in production doctrine, not this quantification doc.

### 4.5 Substrate State (SS_*)
Identifies the existing coating system on the surface. Uses canonical SS_* values from Substrate_State_Reference.md.

| Substrate State | Description | Prep Impact |
|-----------------|-------------|-------------|
| `SS_BARE` | Raw, uncoated substrate (new wood/MDF) | Full primer required |
| `SS_PRIMED_FACTORY` | Factory-primed (typical NC millwork) | Scuff + spot prime |
| `SS_PRIMED_FIELD` | Field-applied primer | Light prep |
| `SS_PAINTED_FLAT` | Existing flat/matte latex | Clean + light sand |
| `SS_PAINTED_EGGSHELL` | Existing eggshell latex | Clean + light sand |
| `SS_PAINTED_SATIN` | Existing satin latex | Clean + degloss optional |
| `SS_PAINTED_SEMIGLOSS` | Existing semi-gloss latex | Degloss required |
| `SS_PAINTED_GLOSS` | Existing gloss latex | Full degloss + bonding primer |
| `SS_PAINTED_ALKYD` | Existing alkyd/oil-based | Adhesion test + bonding primer |
| `SS_STAINED_PENETRATING` | Penetrating stain (no film) | Shellac seal required |
| `SS_CLEAR_POLY` | Polyurethane finish | Sand + bonding primer, may strip |
| `SS_CLEAR_LACQUER` | Lacquer finish | Often requires strip |

> **Note:** Substrate state determines WHAT coating system exists. See Modifier_Registry.md for SS_* modifier values.

### 4.6 Surface Condition
Describes the physical state of the existing surface (damage level). Uses canonical values from Modifier_Registry.md.

| Condition | Modifier ID | Value | Description |
|-----------|-------------|-------|-------------|
| Good | `COND_GOOD` | 1.00 | Minimal prep — surface intact, no peeling |
| Fair | `COND_FAIR` | 1.50 | Moderate prep — some damage, spot repairs |
| Poor | `COND_POOR` | 2.00 | Extensive prep — peeling, heavy repair |

> **Note:** Substrate state and surface condition are independent dimensions. A surface can be SS_PAINTED_SEMIGLOSS + COND_GOOD (intact semi-gloss) or SS_PAINTED_FLAT + COND_POOR (damaged flat paint). Contamination (grease, smoke, mold) is assessed as part of surface condition — heavy contamination typically drives COND_FAIR or COND_POOR classification.

---

## 5) PaintScope Integration (Canonical Keys)

### 5.1 Doctrine Alignment
This quantification method supports the PaintScope doctrine:

- **PaintScope is the only source of geometry and counts**
- Specs consume counts and flags
- Specs do not compute SF/LF from assumed geometry
- PaintScope must explicitly state the opening counts and modifiers

### 5.2 Required PaintScope Keys (Counts)
Represent each tier as an EA count.

**Recommended keys:**
- `PS_OPENING_EA.BUILTIN_SHELF.S`
- `PS_OPENING_EA.BUILTIN_SHELF.M`
- `PS_OPENING_EA.BUILTIN_SHELF.L`
- `PS_OPENING_EA.BUILTIN_SHELF.XL`

Optionally add category-specific families if you want more granularity:
- `PS_OPENING_EA.CLOSET_SHELF.M`
- `PS_OPENING_EA.BOOKSHELF.M`
- `PS_OPENING_EA.CUBBY.S`

But avoid over-fragmentation early — start with one family unless you need separate production baselines.

### 5.3 Modifier Keys (Flags / Enums)
Modifiers should be recorded as either:
- boolean flags (`true/false`)
- enumerations (one-of)

Recommended patterns:

#### Depth (enum)
- `PS_OPENING_MOD.DEPTH = SHALLOW | DEEP | VERY_DEEP`

#### Detail (enum)
- `PS_OPENING_MOD.DETAIL = SIMPLE_BOX | FACE_FRAME | CROWN_VALANCE | BEADED_ROUTED`

#### Access (enum)
- `PS_OPENING_MOD.ACCESS = OPEN_ACCESS | CRAMPED | OBSTRUCTED`

#### Application Method (enum)
- `PS_OPENING_MOD.APPLICATION_METHOD = BRUSH_ROLL | SPRAY | SPRAY_ROLLOFF`

> **Note:** Use `SPRAY_ROLLOFF` when substrate state is SS_BARE to work primer into wood grain.

#### Substrate State (enum — uses SS_* values)
Uses canonical substrate state IDs from Substrate_State_Reference.md.

- `PS_META.SUBSTRATE_STATE.BUILTIN = SS_BARE | SS_PRIMED_FACTORY | SS_PRIMED_FIELD | SS_PAINTED_FLAT | SS_PAINTED_EGGSHELL | SS_PAINTED_SATIN | SS_PAINTED_SEMIGLOSS | SS_PAINTED_GLOSS | SS_PAINTED_ALKYD | SS_STAINED_* | SS_CLEAR_*`

> **Note:** Substrate state modifiers are defined in Modifier_Registry.md. These apply to prep tasks multiplicatively.

#### Surface Condition (enum — uses COND_* values)
Uses canonical condition values from Modifier_Registry.md.

- `PS_META.SURFACE_CONDITION.BUILTIN = COND_GOOD | COND_FAIR | COND_POOR`

> **Note:** Surface condition is independent of substrate state. Contamination (grease, smoke, mold) is assessed as part of condition — heavy contamination drives COND_FAIR or COND_POOR.

---

## 6) Spec Consumption Rules (How Specs Use PaintScope)

Specs should treat opening counts as the “quantity driver” for:
- interior compartment painting work
- masking, cutting, sanding, priming decisions
- scope description and line items

### 6.1 Spec Quantification Model
The spec engine must:
1. Read opening counts by tier
2. Read modifiers
3. Select appropriate task recipe / work package
4. Apply time/material logic based on tier + modifiers

Example high-level interpretation:
- S openings produce lower time per EA
- XL openings produce higher time per EA
- Depth/detail/access modifiers scale complexity
- Condition determines prep sequence and primer selection

### 6.2 Non-Goals (Explicitly Forbidden)
Specs must NOT:
- infer shelf SF from tier dimensions
- infer number of shelves from opening count
- calculate panel area from assumed layout

If deeper geometry is required, that must come from a separate measurement system.

---

## 7) Estimator Field Procedure (Fast Counting Workflow)

1. Identify shelving / built-in unit(s)
2. Divide into logical bays (left/right sections)
3. Count each paintable compartment as an opening
4. Assign each opening to a tier: S/M/L/XL
5. Assign modifiers for the overall unit:
   - Depth (SHALLOW / DEEP / VERY_DEEP)
   - Detail (SIMPLE_BOX / FACE_FRAME / CROWN_VALANCE / BEADED_ROUTED)
   - Access (OPEN_ACCESS / CRAMPED / OBSTRUCTED)
   - Application Method (BRUSH_ROLL / SPRAY / SPRAY_ROLLOFF)
   - Substrate State (SS_* per Substrate_State_Reference.md)
   - Surface Condition (COND_GOOD / COND_FAIR / COND_POOR)
6. Record counts + modifiers into PaintScope

---

## 8) Example PaintScope Payload (Human Readable)

**Built-In Wall Unit (Repaint Scenario)**
- S openings: 4
- M openings: 10
- L openings: 2
- XL openings: 0

Modifiers:
- Depth: DEEP
- Detail: FACE_FRAME
- Access: OPEN_ACCESS
- Application Method: SPRAY
- Substrate State: SS_PAINTED_SATIN (existing satin latex)
- Surface Condition: COND_GOOD (intact, minimal prep)

**Built-In Wall Unit (New Construction — Factory Primed)**
- S openings: 0
- M openings: 8
- L openings: 4
- XL openings: 0

Modifiers:
- Depth: DEEP
- Detail: SIMPLE_BOX
- Access: OPEN_ACCESS
- Application Method: SPRAY
- Substrate State: SS_PRIMED_FACTORY (factory-primed MDF)
- Surface Condition: COND_GOOD (new, intact)

**Built-In Wall Unit (New Construction — Bare Wood)**
- S openings: 0
- M openings: 6
- L openings: 2
- XL openings: 0

Modifiers:
- Depth: SHALLOW
- Detail: SIMPLE_BOX
- Access: OPEN_ACCESS
- Application Method: SPRAY_ROLLOFF (work primer into grain)
- Substrate State: SS_BARE (raw wood)
- Surface Condition: COND_GOOD (new)

---

## 9) Example PaintScope Payload (Keyed)

**Repaint Scenario:**
```
PS_OPENING_EA.BUILTIN_SHELF.S = 4
PS_OPENING_EA.BUILTIN_SHELF.M = 10
PS_OPENING_EA.BUILTIN_SHELF.L = 2
PS_OPENING_EA.BUILTIN_SHELF.XL = 0

PS_OPENING_MOD.DEPTH = DEEP
PS_OPENING_MOD.DETAIL = FACE_FRAME
PS_OPENING_MOD.ACCESS = OPEN_ACCESS
PS_OPENING_MOD.APPLICATION_METHOD = SPRAY
PS_META.SUBSTRATE_STATE.BUILTIN = SS_PAINTED_SATIN
PS_META.SURFACE_CONDITION.BUILTIN = COND_GOOD
```

**New Construction (Bare Wood):**
```
PS_OPENING_EA.BUILTIN_SHELF.S = 0
PS_OPENING_EA.BUILTIN_SHELF.M = 6
PS_OPENING_EA.BUILTIN_SHELF.L = 2
PS_OPENING_EA.BUILTIN_SHELF.XL = 0

PS_OPENING_MOD.DEPTH = SHALLOW
PS_OPENING_MOD.DETAIL = SIMPLE_BOX
PS_OPENING_MOD.ACCESS = OPEN_ACCESS
PS_OPENING_MOD.APPLICATION_METHOD = SPRAY_ROLLOFF
PS_META.SUBSTRATE_STATE.BUILTIN = SS_BARE
PS_META.SURFACE_CONDITION.BUILTIN = COND_GOOD
```

---

## 10) Notes / Extensibility

### 10.1 Optional: Separate Exterior Surfaces
If needed, top surfaces, end panels, and exposed trim can be handled as separate PaintScope surface keys:
- `PS_SURFACE_SF.BUILTIN_END_PANEL`
- `PS_EDGE_LF.BUILTIN_FACEFRAME`
- `PS_SURFACE_SF.BUILTIN_TOP`

But those are outside the Opening Count system and should remain optional unless required by production accuracy.

### 10.2 Optional: Multi-Unit Grouping
If a project has multiple built-ins, repeat PaintScope blocks per unit using identifiers:
- `BUILTIN_01`
- `BUILTIN_02`

Do not merge unlike units if modifiers differ substantially.

---

## Summary

This Opening Count method converts built-ins/shelving into:
- **EA opening counts by tier (S/M/L/XL)**
- **Modifier flags/enums for complexity** (depth, detail, access, application method)
- **Substrate state** (SS_* from Substrate_State_Reference.md)
- **Surface condition** (COND_* from Modifier_Registry.md)
- **PaintScope-first quantification**

The spec engine can consistently generate scope and labor models without doing geometry math.

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 2.0 | 2026-02-03 | Aligned with current system: replaced custom condition values with SS_* substrate states and COND_* surface conditions per Substrate_State_Reference.md and Modifier_Registry.md. Renamed "Finish Method" to "Application Method" with simplified options (BRUSH_ROLL, SPRAY, SPRAY_ROLLOFF). Removed contamination field (rolled into surface condition). Removed contents field (assume empty). Added related document references. |
| 1.0 | — | Initial version |
