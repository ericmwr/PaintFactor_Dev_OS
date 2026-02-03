# PaintScope Quantity Key Catalog (v0.2)

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
- `PS_META.SF.FLOOR_VACUUM_AREA`
  **Meaning:** Total floor area used for post-application vacuum cleanup tasks.
  **UOM:** SF
  **Source:** Derived from room floor area at project assembly.
  **Used for:** Production rate calculation on floor vacuum cleanup tasks (e.g., TSK_VACUUM_FLOOR_POST_PRIME). Semantically distinct from PS_PROTECT_SF.FLOOR_EXPOSED, which measures protection coverage area — vacuum cleanup applies regardless of whether floor protection was installed.
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
  **Meaning:** Total LF of wall-to-ceiling boundary requiring cut/tape strategies (if wall painting occurs). Measured from the wall's perspective.
  **Source:** Derived edges.

- `PS_EDGE_LF.TO_WALL`
  **Meaning:** Total LF of ceiling-to-wall boundary requiring cut/tape strategies (if ceiling painting occurs). Measured from the ceiling's perspective. Same physical edge as `PS_EDGE_LF.TO_CEILING` but semantically distinct — each surface's spec declares its own edge relationship.
  **Source:** Derived edges. Same geometry as TO_CEILING.

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

## Protection Quantity Keys

Protection keys measure where masking, tape, and covering goes — the prep work that protects non-painted surfaces. These are semantically distinct from edge keys (`PS_EDGE_LF.*`), which measure where paint is applied.

Three key categories:
- **`PS_PROTECT_SF.*`** — area-based protection (square feet)
- **`PS_PROTECT_LF.*`** — linear protection (linear feet of masking/tape)
- **`PS_PROTECT_EA.*`** — count-based protection (each item)

### Floor Protection Keys (SF)

- `PS_PROTECT_SF.FLOOR_EXPOSED`
  **Meaning:** Floor SF requiring protection in active work zones (room-based).
  **Maps to zone:** `floor_full`
  **Notes:** Must differentiate hard vs carpet via subtypes if strategies differ.

- `PS_PROTECT_SF.FLOOR_PERIMETER`
  **Meaning:** Perimeter drop coverage area.
  **Maps to zone:** `floor_perimeter`
  **PaintScope Capture:** Room perimeter LF x standard drop width.

- `PS_PROTECT_SF.FLOOR_8FT_RADIUS`
  **Meaning:** Radial protection around work item (doors, windows).
  **Maps to zone:** `floor_full_8ft_radius`
  **PaintScope Capture:** Calculated from item location + 8ft radius.

- `PS_PROTECT_SF.FLOOR_KITCHEN`
  **Meaning:** Full kitchen floor area.
  **Maps to zone:** `floor_full_kitchen`
  **PaintScope Capture:** Kitchen room floor area.

- `PS_PROTECT_SF.FLOOR_DOOR_SWING`
  **Meaning:** Door swing area protection.
  **Maps to zone:** `floor_door_swing`
  **PaintScope Capture:** Door swing arc area (standard formula).

- `PS_PROTECT_SF.FLOOR_WORKZONE`
  **Meaning:** Localized floor work area.
  **Maps to zone:** `floor_workzone`
  **PaintScope Capture:** Work area SF (typically door or touch-up zone).

Optional subtypes (drive material selection, not zone selection):
- `PS_PROTECT_SF.FLOOR_HARD_EXPOSED` — hard floor subtype of `FLOOR_EXPOSED`
- `PS_PROTECT_SF.FLOOR_CARPET_EXPOSED` — carpet floor subtype of `FLOOR_EXPOSED`

### Surface-Adjacent Protection Keys (LF)

These `PS_PROTECT_LF.*` keys measure linear footage of masking/tape for protection. They are semantically distinct from `PS_EDGE_LF.*` keys that measure where paint is applied — even when the geometry is identical.

**Example:** `PS_PROTECT_LF.CEILING_LINE` measures masking tape at the ceiling-wall junction to protect the ceiling during wall painting. `PS_EDGE_LF.TO_CEILING` measures the same junction but represents where the wall painter cuts in paint. Same geometry, different semantic purpose.

- `PS_PROTECT_LF.CEILING_LINE`
  **Meaning:** Masking at ceiling-wall junction.
  **Maps to zone:** `ceiling_line`
  **PaintScope Capture:** Room perimeter LF at ceiling.

- `PS_PROTECT_LF.TRIM_EDGES`
  **Meaning:** Masking at trim perimeter.
  **Maps to zone:** `trim_edges`
  **PaintScope Capture:** Trim perimeter LF in room.

- `PS_PROTECT_LF.WALL_ADJACENT`
  **Meaning:** Masking on wall near spray target.
  **Maps to zone:** `wall_adjacent`
  **PaintScope Capture:** Wall LF adjacent to spray work.

- `PS_PROTECT_LF.WALL_ADJACENT_DOOR`
  **Meaning:** Wall masking around door during spray.
  **Maps to zone:** `wall_adjacent_door`
  **PaintScope Capture:** Wall LF surrounding door opening.

- `PS_PROTECT_LF.WALL_ADJACENT_WINDOW`
  **Meaning:** Wall masking around window during spray.
  **Maps to zone:** `wall_adjacent_window`
  **PaintScope Capture:** Wall LF surrounding window opening.

- `PS_PROTECT_LF.WALL_ADJACENT_CABINET`
  **Meaning:** Wall masking above/beside cabinets.
  **Maps to zone:** `wall_adjacent_cabinet`
  **PaintScope Capture:** Wall LF at cabinet edge.

- `PS_PROTECT_LF.JAMB_ADJACENT`
  **Meaning:** Jamb area masking.
  **Maps to zone:** `jamb_adjacent`
  **PaintScope Capture:** Jamb perimeter LF.

- `PS_PROTECT_LF.SILL`
  **Meaning:** Window sill edge masking.
  **Maps to zone:** `sill_protection`
  **PaintScope Capture:** Sill edge LF.

### Area Protection Keys (SF) — Non-Floor

- `PS_PROTECT_SF.WALL_UPPER_BAND`
  **Meaning:** Upper wall band area near ceiling (overspray zone).
  **Maps to zone:** `wall_upper_band`
  **PaintScope Capture:** Room perimeter LF x band height (typically 12-18").

- `PS_PROTECT_SF.FURNITURE_ROOM`
  **Meaning:** Furniture coverage area estimate (occupancy-driven).
  **Maps to zone:** `furniture_room`
  **PaintScope Capture:** Room SF (used for time estimate, not material calc).

- `PS_PROTECT_SF.MILLWORK_BEAM`
  **Meaning:** Beam/millwork surface area to protect.
  **Maps to zone:** `millwork_beam`
  **PaintScope Capture:** Surface SF of beam faces.

### Asset Protection Keys (SF/EA)

- `PS_PROTECT_SF.ASSET.CABINETS_FACE`
  **Meaning:** Cabinet face area when cabinets need protection (not in painting scope).
  **Maps to:** `PZ_ASSET_ROOM_*_CABINETS` zone type at runtime.

- `PS_PROTECT_SF.ASSET.COUNTERTOPS`
  **Meaning:** Countertop surface area.
  **Maps to zone:** `countertop_covers`

- `PS_PROTECT_SF.ASSET.TILE_BACKSPLASH`
  **Meaning:** Tile backsplash area.
  **Maps to zone:** `backsplash_mask`

- `PS_PROTECT_SF.ASSET.GLASS_AREA`
  **Meaning:** Window glass area requiring masking.
  **Maps to zone:** `glass_mask`

- `PS_PROTECT_EA.ASSET.FIXTURES`
  **Meaning:** Count of fixtures (fans, lights, outlets, switches).
  **Maps to zone:** `fixture_covers`

- `PS_PROTECT_EA.ASSET.HARDWARE_GROUPS`
  **Meaning:** Count of hardware groups (handles, hinges, locks).
  **Maps to zone:** `hardware_covers`

- `PS_PROTECT_EA.APPLIANCE_ADJACENT`
  **Meaning:** Appliance count for brush/roll adjacency protection.
  **Maps to zone:** `appliance_adjacent`
  **PaintScope Capture:** Count of appliances adjacent to work.

- `PS_PROTECT_EA.APPLIANCE_COVERS`
  **Meaning:** Appliance count for full spray coverage.
  **Maps to zone:** `appliance_covers`
  **PaintScope Capture:** Count of appliances to fully cover.

### Key Derivation Summary

Many protection keys can be derived from existing geometry rather than requiring new PaintScope capture:

| Derivation Method | Keys Using It |
|-------------------|---------------|
| Room perimeter LF x width factor | `FLOOR_PERIMETER`, `CEILING_LINE`, `WALL_UPPER_BAND` |
| Existing edge LF (same geometry, different semantic) | `TRIM_EDGES`, `WALL_ADJACENT_*`, `JAMB_ADJACENT`, `SILL` |
| Room floor SF | `FLOOR_KITCHEN`, `FURNITURE_ROOM` |
| Standard formula from item dimensions | `FLOOR_8FT_RADIUS`, `FLOOR_DOOR_SWING` |
| Direct capture (new measurement needed) | `MILLWORK_BEAM`, `FLOOR_WORKZONE` |

**Flag:** PaintScope team should determine which keys can auto-derive vs. require explicit capture.

### Protection Key Totals

| Category | Keys |
|----------|------|
| `PS_PROTECT_SF.*` (area) | 14 |
| `PS_PROTECT_LF.*` (linear) | 8 |
| `PS_PROTECT_EA.*` (count) | 4 |
| **Total** | **26** |

---

## Validation & Completeness Rules

### Required-for-application rules (examples)
- If a spec includes a wall painting module:
  - MUST require `PS_SURFACE_SF.WALL_FIELD`
- If a wall spec includes cut/tape to ceiling:
  - MUST require `PS_EDGE_LF.TO_CEILING`
- If a ceiling spec includes cut/tape to wall:
  - MUST require `PS_EDGE_LF.TO_WALL`
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

