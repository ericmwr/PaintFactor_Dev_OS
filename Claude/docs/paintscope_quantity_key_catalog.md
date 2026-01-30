# PaintScope Quantity Key Catalog (Draft v0.1)

## Purpose

This document defines the canonical **Quantity Keys** that PaintScope publishes for downstream domains.

Downstream domains (Spec Domain, Estimation Engine, UI) must treat these keys as the **only** approved source of measurable quantities (SF/LF/EA).  
Specs must **declare required keys** and must **never compute geometry internally**.

### Non-Negotiable Rules

1) **PaintScope is the only source of geometry.**  
2) **Specs consume quantity keys; they do not compute SF/LF/EA.**  
3) **If a required key is missing, spec application MUST fail** (no silent defaults).  
4) Quantity values must be **auditable** (traceable to surfaces/edges/assets).  
5) Keys are **stable identifiers**. Add new keys when needed; do not repurpose existing keys.

---

## Key Format

### Namespace conventions
- `PS_SURFACE_*` — paintable surfaces
- `PS_EDGE_*` — boundary edges (EdgeLF)
- `PS_OPENING_*` — openings (doors/windows as openings)
- `PS_ASSET_*` — non-paint assets requiring protection
- `PS_PROTECT_*` — measurable protection quantities
- `PS_META_*` — counts/flags used for routing/validation (not pricing)

### General pattern
`<NAMESPACE>.<SUBJECT>.<DETAILS>`

Examples:
- `PS_SURFACE_SF.WALL_FIELD`
- `PS_EDGE_LF.TO_TRIM`
- `PS_PROTECT_SF.ASSET.CABINETS_FACE`

---

## Universal Units of Measure

- `SF` — square feet
- `LF` — linear feet
- `EA` — each
- `EA_SIDE` — each per side (doors/panels where sides are independently scoped)
- `EA_OPENING` — each opening (for opening-based counting)

Downstream rules:
- SOP tasks and production rates MUST align to the UOM used by the required key.
- Conversions (EA → SF, etc.) must not happen in specs. If a conversion is needed, create a new PaintScope key.

---

## Core Interior Keys (Baseline)

### Room / Zone meta (routing & validation)
- `PS_META.EA.ROOMS_TOTAL`
- `PS_META.EA.ZONES_TOTAL`
- `PS_META.FLAG.SPRAY_ENV_POSSIBLE` (true/false; collected, not inferred)
- `PS_META.FLAG.OCCUPIED` (true/false; collected)
- `PS_META.FLAG.NEW_CONSTRUCTION` (true/false; collected)

> Note: Meta flags do not represent quantities; they are used to select eligible strategies.

### Room Complexity Flags
- `PS_ROOM_FLAG.CLOSET_SHELVING_PRESENT` (boolean)
  **Meaning:** TRUE when closet contains fixed shelving or organizer systems that create significant cut-in/masking interruptions.
  **Includes:** Built-in wire shelving, wood shelving systems, closet organizers with multiple shelf/rod levels.
  **Excludes:** Single removable shelf (unless wall-mounted supports remain), freestanding organizers.
  **Used for:** Activating closet shelving complexity modifier (1.5x TIME) on impacted tasks.
  **Source:** Collected during scope capture — not inferred.

---

## Modifier Meta Keys

These keys carry classification values used by production rate modifiers. They are ENUM types, not numeric quantities.

### Height Classification
- `PS_META.HEIGHT_BAND`
  **Type:** ENUM
  **Values:** `STD` (0-8 ft), `STEP` (9-12 ft), `EXT` (13-17 ft), `SCAFFOLD` (18-24 ft), `LIFT` (25+ ft)
  **Source:** Collected during scope capture from room height.
  **Used for:** Height modifier (MOD_HT) selection.

### Surface Condition
- `PS_META.SURFACE_CONDITION`
  **Type:** ENUM
  **Values:** `NEW`, `GOOD`, `FAIR`, `POOR`
  **Source:** Collected during scope capture via visual assessment.
  **Used for:** Condition modifier (MOD_COND) selection. Applies to prep tasks only.

### Surface Texture
- `PS_META.SURFACE_TEXTURE`
  **Type:** ENUM
  **Values:** `SMOOTH`, `ORANGE_PEEL`, `KNOCKDOWN`, `HEAVY_TEXTURE`
  **Source:** Collected during scope capture.
  **Used for:** Texture modifier (MOD_SURF) selection for field surfaces.

### Complexity Factor
- `PS_META.COMPLEXITY_FACTOR`
  **Type:** ENUM
  **Values:** `OPEN`, `STD`, `MOD`, `COMPLEX`, `VCOMPLEX`, `EXTREME`
  **Source:** Collected or inferred from room characteristics.
  **Used for:** Complexity modifier (MOD_COMP) selection.

---

## Surface Quantity Keys

### Walls
- `PS_SURFACE_SF.WALL_FIELD`  
  **Meaning:** Total paintable wall field area (excluding openings if PaintScope subtracts them).  
  **Source:** Derived from room geometry or surface polygons.

- `PS_SURFACE_SF.WALL_REPAIR_AREA` (optional)  
  **Meaning:** Measured/declared SF of localized repairs if captured explicitly.  
  **Source:** Manual measure/annotation.

### Ceilings
- `PS_SURFACE_SF.CEILING_FIELD`  
  **Meaning:** Total paintable ceiling area.  
  **Source:** Derived from room geometry or ceiling polygons.

### Trim (LF-based)
- `PS_SURFACE_LF.TRIM_BASEBOARD`
- `PS_SURFACE_LF.TRIM_CROWN`
- `PS_SURFACE_LF.TRIM_CASING_DOOR`
- `PS_SURFACE_LF.TRIM_CASING_WINDOW`
- `PS_SURFACE_LF.TRIM_OTHER` (fallback bucket; avoid if possible)

- `PS_META.EA.CASING_END_COUNT`
  **Meaning:** Count of trim casing end-grain exposures requiring grain filler.
  **Source:** Derived: typically 2 per door opening, 4 per window opening.
  **Used for:** Grain fill tasks on paint-grade trim.

> Note: Trim LF should be produced by PaintScope; specs must not compute it from room perimeter unless PaintScope explicitly does and publishes it here.

### Cabinets
- `PS_SURFACE_SF.CABINET_FACE`
  **Meaning:** Total paintable cabinet face area (doors, drawer fronts, face frames).
  **Source:** Measured or derived from cabinet layout.
  **Notes:** Does not include cabinet interiors unless explicitly scoped.

- `PS_META.EA.CABINET_DOORS`
  **Meaning:** Count of cabinet doors to be removed/reinstalled.
  **Source:** Manual count during scope capture.
  **Used for:** Door removal/reinstall labor tasks.

- `PS_META.EA.CABINET_HARDWARE`
  **Meaning:** Count of cabinet hardware pieces (pulls, knobs, hinges) to be removed/reinstalled.
  **Source:** Manual count or derived (e.g., 2 hinges + 1 pull per door).
  **Used for:** Hardware removal/reinstall labor tasks.

---

## Edge (EdgeLF) Quantity Keys

### Standard edge targets (Interior)
- `PS_EDGE_LF.TO_CEILING`  
  **Meaning:** Total LF of wall-to-ceiling boundary requiring cut/tape strategies (if wall painting occurs).  
  **Source:** Derived edges.

- `PS_EDGE_LF.TO_TRIM`  
  **Meaning:** Total LF of wall-to-trim boundary (baseboard/top edge, casing edges, crown edges where relevant).  
  **Source:** Derived edges.

- `PS_EDGE_LF.TO_ASSET`  
  **Meaning:** Total LF where a paintable surface edges into a protected asset (cabinets, tile, stone, etc.).  
  **Source:** Derived edges + adjacency.

- `PS_EDGE_LF.TO_BOTH` (optional)  
  **Meaning:** Edge situations that conceptually require dual treatment (rare; use only if defined).  
  **Source:** Derived edges.

### Classified asset edge targets (optional expansion)
Use these only if PaintScope can classify and trace them reliably:
- `PS_EDGE_LF.TO_ASSET.CABINETS`
- `PS_EDGE_LF.TO_ASSET.TILE`
- `PS_EDGE_LF.TO_ASSET.COUNTERTOP`
- `PS_EDGE_LF.TO_ASSET.FLOOR_HARD`
- `PS_EDGE_LF.TO_ASSET.FLOOR_CARPET`
- `PS_EDGE_LF.TO_ASSET.FIXTURES`
- `PS_EDGE_LF.TO_ASSET.WINDOW`
  **Meaning:** LF where paintable surface edges to window frame/glass.
  **Source:** Derived from window perimeters.
  **Used for:** Window cut-in tasks.

### Trim-specific edges
- `PS_EDGE_LF.TRIM_JOINTS`
  **Meaning:** Total LF of trim miter joints, cope joints, and scarf joints requiring caulk.
  **Source:** Derived from trim layout or estimated from trim LF (approx 1 joint per 8-12 LF).
  **Used for:** Trim caulk joint tasks.

- `PS_EDGE_LF.TO_SURFACE`
  **Meaning:** Edge where two painted surfaces meet (inside corners, wall-to-wall transitions).
  **Source:** Derived from room geometry.
  **Used for:** Inside corner cut-in tasks.

---

## Openings & Door/Window Keys

### Openings (count)
- `PS_OPENING_EA.DOOR_OPENINGS_TOTAL`
- `PS_OPENING_EA.WINDOW_OPENINGS_TOTAL`

### Window Size Buckets (Size Bucket Method)

The Size Bucket Method enables fast, accurate window quantification without tape measure for most windows. See `PaintScope_Window_Counting_System.md` for full specification.

#### Window Counts by Size Bucket
- `PS_OPENING_EA.WINDOW_S`
  **Meaning:** Count of Small windows (8 LF perimeter, 4 SF derived via P²÷16)
  **Source:** Visual categorization during walkthrough
  **Used for:** Trim LF derivation, deduction SF derivation

- `PS_OPENING_EA.WINDOW_M`
  **Meaning:** Count of Medium windows (12 LF perimeter, 9 SF derived)
  **Source:** Visual categorization during walkthrough
  **Used for:** Trim LF derivation, deduction SF derivation

- `PS_OPENING_EA.WINDOW_L`
  **Meaning:** Count of Large windows (17 LF perimeter, 18 SF derived)
  **Source:** Visual categorization during walkthrough
  **Used for:** Trim LF derivation, deduction SF derivation

- `PS_OPENING_EA.WINDOW_O`
  **Meaning:** Count of Oversized windows (measured perimeter required)
  **Source:** Tape measure required, manual entry
  **Used for:** Trim LF derivation, deduction SF derivation

- `PS_OPENING_EA.WINDOW_TOTAL`
  **Meaning:** Sum of all window counts (S+M+L+O)
  **Source:** Derived from size bucket counts
  **Used for:** Validation, reporting

#### Window Height Distribution
- `PS_OPENING_EA.WINDOW_H1`
  **Meaning:** Windows at 0-8 ft (standard height, no access equipment)
  **Source:** Collected during walkthrough
  **Used for:** Height modifier application at 1.00x

- `PS_OPENING_EA.WINDOW_H2`
  **Meaning:** Windows at 9-12 ft (step ladder required)
  **Source:** Collected during walkthrough
  **Used for:** Height modifier application at 1.30x

- `PS_OPENING_EA.WINDOW_H3`
  **Meaning:** Windows at 13-17 ft (extension ladder or scaffold)
  **Source:** Collected during walkthrough
  **Used for:** Height modifier application at 1.50x

- `PS_OPENING_EA.WINDOW_H4`
  **Meaning:** Windows at 18-24 ft (scaffold required)
  **Source:** Collected during walkthrough
  **Used for:** Height modifier application at 2.00x

- `PS_OPENING_EA.WINDOW_H5`
  **Meaning:** Windows at 25+ ft (lift equipment required)
  **Source:** Collected during walkthrough
  **Used for:** Height modifier application at 2.50x

#### Derived Window Quantities
- `PS_OPENING_LF.TRIM_WINDOW`
  **Meaning:** Total window trim linear footage
  **Source:** Derived from size buckets: (S×8) + (M×12) + (L×17) + (O×measured)
  **Used for:** Window casing/trim painting tasks

- `PS_OPENING_SF.WINDOW_DEDUCT`
  **Meaning:** Total window area for wall deductions
  **Source:** Derived from size buckets using P²÷16 formula
  **Used for:** Wall SF calculations (gross → net)

#### Window Exceptions
- `PS_OPENING_EA.WINDOW_EXCEPTION`
  **Meaning:** Count of flagged window exceptions requiring special handling
  **Source:** Manual flag during walkthrough
  **Notes:** Includes deteriorated, bay/bow, oversized, or other flagged windows

### Doors (per-side counting contract)
PaintScope must represent doors as paintable items with EA_SIDE counting.

- `PS_SURFACE_EA_SIDE.DOOR_SLAB`  
  **Meaning:** Count of door slab sides included in scope (e.g., 10 doors one side = 10 EA_SIDE).  
  **Notes:** Supports “different color each side” and partial painting scenarios.

- `PS_SURFACE_EA_SIDE.DOOR_JAMB` (optional)  
  **Meaning:** Count of jamb sides or jamb sets included (define exact meaning in PaintScope).  

- `PS_SURFACE_EA.DOOR_FRAME_SET` (optional alternative to jamb)  
  **Meaning:** Count of full frame sets to be painted.

### Door type breakdown (optional but recommended)
These enable strategy selection without guessing:
- `PS_META.EA_SIDE.DOOR_SLAB.SLAB`
- `PS_META.EA_SIDE.DOOR_SLAB.PANEL`
- `PS_META.EA_SIDE.DOOR_SLAB.FRENCH`
- `PS_META.EA_SIDE.DOOR_SLAB.BIFOLD`
- `PS_META.EA_SIDE.DOOR_SLAB.LOUVERED`

> Note: These are META counts (routing), not necessarily billable quantities unless you decide they are.

### Door glass pane masking (only if measurable)
If PaintScope can count panes or provide pane-edge LF:
- `PS_META.EA.DOOR_PANES_TOTAL` (count panes)
- `PS_EDGE_LF.TO_ASSET.GLASS_PANES` (if glass edges are tracked)
- `PS_PROTECT_SF.ASSET.GLASS_AREA` (if glass area is tracked)

If PaintScope cannot measure these reliably, do not publish keys yet; handle via conservative fixed allowances per french door in spec logic (but still avoid internal geometry).

---

## Protection Quantity Keys (measurable only)

### Floors
- `PS_PROTECT_SF.FLOOR_EXPOSED`  
  **Meaning:** Floor SF requiring protection in active work zones (room-based).  
  **Notes:** Must differentiate hard vs carpet via assets/meta tags if strategies differ.

Optional:
- `PS_PROTECT_SF.FLOOR_HARD_EXPOSED`
- `PS_PROTECT_SF.FLOOR_CARPET_EXPOSED`

### Assets (by category)
Publish only if PaintScope can measure or approximate with traceable logic:
- `PS_PROTECT_SF.ASSET.CABINETS_FACE`
- `PS_PROTECT_SF.ASSET.COUNTERTOPS`
- `PS_PROTECT_SF.ASSET.TILE_BACKSPLASH`
- `PS_PROTECT_EA.ASSET.FIXTURES` (fans, lights, etc.)
- `PS_PROTECT_EA.ASSET.HARDWARE_GROUPS` (handles/hinges if tracked)

---

## Validation & Completeness Rules

### Required-for-application rules (examples)
- If a spec includes a wall painting module:
  - MUST require `PS_SURFACE_SF.WALL_FIELD`
- If a wall spec includes cut/tape to ceiling:
  - MUST require `PS_EDGE_LF.TO_CEILING`
- If a wall spec includes cut/tape to trim:
  - MUST require `PS_EDGE_LF.TO_TRIM`
- If a spec includes masking adjacent cabinets:
  - MUST require `PS_PROTECT_SF.ASSET.CABINETS_FACE` OR explicitly fail if unavailable

### “Fail fast” principle
If a spec requires a key and it is missing, the Estimation Engine must fail application of that spec and return:
- missing keys list
- recommended PaintScope capture action

---

## Versioning

This catalog will evolve. Rules:
- Add new keys without breaking old ones.
- If a key must be replaced, deprecate the old key and introduce a new one with a new name.
- Maintain a short deprecation table:

| Deprecated Key | Replacement | Reason | Date |
|---|---|---|---|

---

## Next Additions (Planned)

- Exterior elevation keys (wall runs, soffits, fascia, windows/doors exterior)
- Roofline edge targets (where relevant)
- Fence/deck/stain domains
- More detailed asset libraries (brick, stone, landscaping protection)

