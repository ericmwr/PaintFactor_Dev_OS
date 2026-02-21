# PaintScope Exterior Key Catalog (v0.1)

**Status:** ACTIVE
**Domain:** Exterior only
**Last Updated:** 2026-02-20

## Purpose

This document defines the canonical **Quantity Keys** that PaintScope publishes for exterior scopes.

Exterior keys use the `PS_EXT_` namespace prefix to signal domain. Downstream agents must treat these as the authoritative source of exterior geometry — no spec computes SF/LF/EA internally.

### Non-Negotiable Rules

1) **PaintScope is the only source of geometry.**
2) **Specs consume quantity keys; they do not compute SF/LF/EA.**
3) **If a required key is missing, spec application MUST fail** (no silent defaults).
4) Quantity values must be **auditable** (traceable to elevations/surfaces/edges/assets).
5) Keys are **stable identifiers**. Add new keys when needed; do not repurpose existing keys.

---

## Key Format

### Namespace conventions
- `PS_EXT_SURFACE_*` — paintable exterior surfaces (SF)
- `PS_EXT_EDGE_*` — boundary/cut-in edges (LF)
- `PS_EXT_OPENING_*` — exterior openings (doors/windows as apertures)
- `PS_EXT_ASSET_*` — exterior non-paint assets requiring protection
- `PS_EXT_PROTECT_*` — measurable exterior protection quantities
- `PS_EXT_META_*` — counts/flags for routing/validation (not pricing)

### General pattern
`<NAMESPACE>.<SUBJECT>.<DETAILS>`

---

## Universal Units of Measure

(Same as interior catalog — SF, LF, EA, EA_SIDE, EA_OPENING)

- `SF` — square feet
- `LF` — linear feet
- `EA` — each
- `EA_SIDE` — each per side (doors/panels where sides are independently scoped)
- `EA_OPENING` — each opening (for opening-based counting)

Downstream rules:
- SOP tasks and production rates MUST align to the UOM used by the required key.
- Conversions (EA → SF, etc.) must not happen in specs. If a conversion is needed, create a new PaintScope key.

---

## Section: Elevation Meta Keys

Meta keys carry classification values used for routing, access planning, and modifier selection. They are ENUM or FLAG types, not numeric quantities, except where noted as EA counts.

### Elevation and Story Counts (EA)

- `PS_EXT_META.EA.ELEVATIONS_TOTAL`
  **Meaning:** Count of distinct elevation faces included in scope (e.g., front, rear, left side, right side = 4).
  **UOM:** EA
  **Source:** Collected during scope capture — one count per distinct building face.
  **Used for:** Validation (ensures all elevation surfaces are accounted for), routing to elevation-specific tasks.

- `PS_EXT_META.EA.STORIES_TOTAL`
  **Meaning:** Number of above-grade stories on the structure.
  **UOM:** EA
  **Source:** Collected during scope capture.
  **Used for:** Scaffold/lift access routing — drives which access strategy is eligible. A 2-story building may require ladder; 3-story typically triggers scaffold or lift routing.

### Environment and Access Flags (Collected)

- `PS_EXT_META.FLAG.SPRAY_ENV_POSSIBLE`
  **Meaning:** TRUE when site conditions allow airless spray application (wind, neighbor proximity, no sensitive adjacent surfaces prevent it).
  **UOM:** Boolean (true/false)
  **Source:** Collected during scope capture — not inferred from wind keys alone.
  **Used for:** Application method strategy selection (spray vs. brush/roll).

- `PS_EXT_META.FLAG.NEW_CONSTRUCTION`
  **Meaning:** TRUE when exterior surfaces are new construction (no existing coating, no prep/stripping burden).
  **UOM:** Boolean (true/false)
  **Source:** Collected during scope capture.
  **Used for:** Substrate state routing — new construction bypasses condition assessment for most surfaces.

- `PS_EXT_META.FLAG.OCCUPIED`
  **Meaning:** TRUE when the building is occupied during painting work.
  **UOM:** Boolean (true/false)
  **Source:** Collected during scope capture.
  **Used for:** Scheduling and protection task activation — occupied buildings require additional care with access, noise, and overspray management.

### Access Type (ENUM)

- `PS_EXT_META.ENUM.ACCESS_TYPE`
  **Meaning:** Classification of the primary access method required to reach all paintable surfaces.
  **UOM:** ENUM
  **Values:** `ground` / `ladder` / `scaffold` / `lift` / `rope_access`
  **Source:** Collected or derived from stories count and eave height.
  **Used for:** Access modifier (MOD_ACCESS) selection. Drives time and cost differentials per elevation.

  | Value | Meaning |
  |---|---|
  | `ground` | All surfaces reachable without ladders or equipment (single-story low eave) |
  | `ladder` | Extension ladder required (standard 2-story) |
  | `scaffold` | Sectional or rolling scaffold required |
  | `lift` | Aerial lift (boom, scissor) required |
  | `rope_access` | Rope and rigging access (specialty; rare residential) |

### Site Condition ENUMs

- `PS_EXT_META.ENUM.WIND_CONDITION`
  **Meaning:** Prevailing wind condition at site during application window.
  **UOM:** ENUM
  **Values:** `calm` / `light_breeze` / `moderate` / `high`
  **Source:** Collected during scope capture or site visit assessment.
  **Used for:** Overspray risk routing; gates eligibility for airless spray strategy. High wind condition overrides `FLAG.SPRAY_ENV_POSSIBLE` to false regardless of collector input.

  | Value | Approx. Speed |
  |---|---|
  | `calm` | < 5 mph |
  | `light_breeze` | 5–10 mph |
  | `moderate` | 10–20 mph |
  | `high` | > 20 mph |

- `PS_EXT_META.ENUM.DEW_POINT_RISK`
  **Meaning:** Risk classification for dew point / moisture condensation on surfaces during or after application.
  **UOM:** ENUM
  **Values:** `safe` / `marginal` / `unsafe`
  **Source:** Collected or derived from weather data at time of scope.
  **Used for:** Application timing restriction routing. `unsafe` blocks application spec tasks for moisture-sensitive coatings.

- `PS_EXT_META.ENUM.SUN_EXPOSURE`
  **Meaning:** Dominant sun exposure condition across the scope elevations.
  **UOM:** ENUM
  **Values:** `full_shade` / `partial_shade` / `full_sun`
  **Source:** Collected during scope capture via site assessment.
  **Used for:** Dry time modifier; hot-surface routing trigger.

- `PS_EXT_META.ENUM.SURFACE_TEMPERATURE`
  **Meaning:** Surface temperature classification at time of application.
  **UOM:** ENUM
  **Values:** `optimal` / `cold_surface` / `hot_surface`
  **Source:** Collected or assessed at time of scope capture.
  **Used for:** Application modifier routing. `cold_surface` and `hot_surface` trigger time extensions or product restrictions. Interacts with `SUN_EXPOSURE` — full sun on dark siding commonly produces `hot_surface`.

  | Value | Condition |
  |---|---|
  | `optimal` | 50–90°F surface temperature |
  | `cold_surface` | < 50°F (risk of poor adhesion, extended dry time) |
  | `hot_surface` | > 90°F (risk of blistering, flash dry) |

> Note: Meta ENUMs do not represent quantities. They are used to select eligible strategies and production rate modifiers only. Specs that require specific site conditions must declare these keys as dependencies and fail if values fall outside acceptable ranges.

---

## Section: Exterior Surface Quantity Keys

### Field Surfaces (SF)

Field surfaces are the primary paintable face areas of the exterior. All values are net paintable area after standard deductions (openings, non-painted elements).

- `PS_EXT_SURFACE_SF.SIDING_FIELD`
  **Meaning:** Net paintable area of horizontal or diagonal siding field (lap siding, shingle siding, fiber cement panel siding).
  **UOM:** SF
  **Source:** Measured from elevation drawings or field take-off. Openings deducted per PaintScope standard.
  **Used for:** Field coat application tasks on siding substrates.

- `PS_EXT_SURFACE_SF.SIDING_BOARD_BATTEN`
  **Meaning:** Net paintable area of board-and-batten siding field. Tracked separately because the profile (alternating wide boards and narrow battens) affects production rate and roller coverage differently from lap siding.
  **UOM:** SF
  **Source:** Measured from elevation take-off.
  **Used for:** Field coat tasks on board-and-batten substrates; production rate modifier for profile complexity.

- `PS_EXT_SURFACE_SF.STUCCO_FIELD`
  **Meaning:** Net paintable face area of stucco cladding (all finish types: smooth, sand, dash).
  **UOM:** SF
  **Source:** Measured from elevation take-off. Does not include reveals or trim elements.
  **Used for:** Stucco field coat and elastomeric application tasks.

- `PS_EXT_SURFACE_SF.MASONRY_WALL`
  **Meaning:** Net paintable face area of exposed masonry (brick, CMU, concrete block). Includes mortar joints in the SF measure.
  **UOM:** SF
  **Source:** Measured from elevation take-off.
  **Used for:** Masonry sealer, block fill, and field coat tasks.

- `PS_EXT_SURFACE_SF.FOUNDATION_WALL`
  **Meaning:** Net paintable face area of above-grade foundation wall (concrete, parged block, or similar).
  **UOM:** SF
  **Source:** Measured from grade line to sill plate or siding transition — above-grade only.
  **Used for:** Foundation coat and masonry paint tasks.

- `PS_EXT_SURFACE_SF.SOFFIT_FIELD`
  **Meaning:** Net paintable area of soffit (the underside of the eave overhang along the roofline). Includes all enclosed soffit panels and boards.
  **UOM:** SF
  **Source:** Measured from eave depth x roofline perimeter length.
  **Used for:** Soffit field coat tasks. Often brush/roll even when siding is sprayed.

- `PS_EXT_SURFACE_SF.PORCH_CEILING`
  **Meaning:** Net paintable area of covered porch or veranda ceiling (enclosed overhead surface, distinct from soffit).
  **UOM:** SF
  **Source:** Measured from porch ceiling polygon.
  **Used for:** Porch ceiling application tasks; may share strategy with soffit.

- `PS_EXT_SURFACE_SF.PORCH_FLOOR`
  **Meaning:** Net paintable area of porch floor deck surface (wood, composite, or concrete).
  **UOM:** SF
  **Source:** Measured from porch floor polygon.
  **Used for:** Porch floor paint or stain tasks; production rates differ from wall surfaces.

- `PS_EXT_SURFACE_SF.DECK_FIELD`
  **Meaning:** Net paintable area of attached or detached deck field surface (horizontal walking surface).
  **UOM:** SF
  **Source:** Measured from deck surface polygon.
  **Used for:** Deck paint or stain application tasks. Distinct from `PORCH_FLOOR` — decks are typically open, porches are covered.

- `PS_EXT_SURFACE_SF.FENCE_FIELD`
  **Meaning:** Net paintable face area of fence panels, one side only. If both sides are in scope, double the value or use a separate key per side (define at project level).
  **UOM:** SF
  **Source:** Measured from fence length x height, one face.
  **Used for:** Fence paint or stain field application tasks.

---

## Section: Exterior Edge (Trim) Quantity Keys

Exterior edge keys measure linear footage of trim and boundary elements. These drive trim painting tasks. They are semantically distinct from protection keys, even where geometry overlaps.

### Fascia and Roofline Trim (LF)

- `PS_EXT_EDGE_LF.FASCIA`
  **Meaning:** Total linear feet of fascia board along all roofline edges in scope.
  **UOM:** LF
  **Source:** Measured from roofline perimeter take-off.
  **Used for:** Fascia brush/roll application tasks; typically a distinct color from field.

- `PS_EXT_EDGE_LF.TRIM_RAKE`
  **Meaning:** Total linear feet of rake board trim running along the sloped gable ends of the roof.
  **UOM:** LF
  **Source:** Measured from gable perimeter take-off.
  **Used for:** Rake board application tasks.

- `PS_EXT_EDGE_LF.TRIM_FRIEZE`
  **Meaning:** Total linear feet of frieze board (horizontal band between the top of siding and the soffit/fascia).
  **UOM:** LF
  **Source:** Measured from eave-line horizontal run, all elevations.
  **Used for:** Frieze board application tasks.

### Vertical and Horizontal Trim (LF)

- `PS_EXT_EDGE_LF.TRIM_CORNER`
  **Meaning:** Total linear feet of corner trim (corner boards, vinyl corner caps, or metal corner trim) at all building corners in scope.
  **UOM:** LF
  **Source:** Measured from building corner heights x corner count.
  **Used for:** Corner trim application tasks.

- `PS_EXT_EDGE_LF.TRIM_BAND`
  **Meaning:** Total linear feet of horizontal band trim running across the face of the building (belt course, water table, or intermediate band board).
  **UOM:** LF
  **Source:** Measured from elevation take-off.
  **Used for:** Band board application tasks.

### Opening Trim (LF)

- `PS_EXT_EDGE_LF.TRIM_WINDOW_CASING`
  **Meaning:** Total linear feet of exterior window casing/trim surround on all windows in scope.
  **UOM:** LF
  **Source:** Measured or derived from window opening perimeters. May be derived from `PS_EXT_OPENING_EA.WINDOW_S/M/L` counts using standard perimeter factors if PaintScope provides derivation.
  **Used for:** Exterior window casing application tasks.

- `PS_EXT_EDGE_LF.TRIM_DOOR_CASING`
  **Meaning:** Total linear feet of exterior door casing/trim surround on all exterior doors in scope.
  **UOM:** LF
  **Source:** Measured or derived from door opening perimeters.
  **Used for:** Exterior door casing application tasks.

- `PS_EXT_EDGE_LF.SILL`
  **Meaning:** Total linear feet of exterior window sills in scope.
  **UOM:** LF
  **Source:** Measured from window widths, all windows in scope.
  **Used for:** Sill application tasks. Sills often receive a distinct coating (porch and floor enamel, or high-durability trim coat) due to exposure.

### Railing and Fence Edges (LF)

- `PS_EXT_EDGE_LF.DECK_RAILING`
  **Meaning:** Total linear feet of deck railing run (measured as linear run of railing section including top rail, bottom rail, and balusters within that run). Balusters within the LF run are included in this measure for production rate purposes — individual baluster count is not tracked separately in this catalog.
  **UOM:** LF
  **Source:** Measured from deck perimeter railing take-off.
  **Used for:** Deck railing application tasks. Production rates for railing are significantly lower per LF than open surfaces due to baluster complexity.

> Note: `PS_EXT_EDGE_LF.FENCE_POST` is listed in the key definition below but routed to `PS_EXT_ASSET_EA.FENCE_POST` (EA) — see Exterior Asset Keys section.

---

## Section: Exterior Opening Keys

Exterior opening keys count apertures (doors, windows) as discrete units. These drive deduction quantities for field surfaces and count-based tasks (hardware masking, glass protection).

### Doors (EA)

- `PS_EXT_OPENING_EA.DOOR_EXT`
  **Meaning:** Count of exterior entry and exit doors in scope (man doors, service doors, French doors). Does not include garage doors.
  **UOM:** EA
  **Source:** Manual count during scope capture.
  **Used for:** Door casing take-off derivation, hardware masking count, glass masking count, field surface deductions.

- `PS_EXT_OPENING_EA.DOOR_GARAGE`
  **Meaning:** Count of garage doors in scope (single or double, any width).
  **UOM:** EA
  **Source:** Manual count during scope capture.
  **Used for:** Garage door panel application tasks (typically distinct strategy from man door — spray or roll by section). Drives separate deduction from field surface SF if garage door faces are in scope.

### Windows (EA, Size Bucket Method)

Exterior windows use the same Size Bucket Method as interior windows. Visual categorization by glass area at walkthrough. See `PaintScope_Window_Counting_System.md` for full specification.

- `PS_EXT_OPENING_EA.WINDOW_S`
  **Meaning:** Count of small exterior windows (glass area < 6 SF). Examples: jalousie, hopper, small casement.
  **UOM:** EA
  **Source:** Visual categorization during exterior walkthrough.
  **Used for:** Window casing LF derivation, glass SF deduction from field surfaces, glass masking count.

- `PS_EXT_OPENING_EA.WINDOW_M`
  **Meaning:** Count of medium exterior windows (glass area 6–15 SF). Examples: standard double-hung, sliding window, mid-size casement.
  **UOM:** EA
  **Source:** Visual categorization during exterior walkthrough.
  **Used for:** Window casing LF derivation, glass SF deduction, glass masking count.

- `PS_EXT_OPENING_EA.WINDOW_L`
  **Meaning:** Count of large exterior windows (glass area > 15 SF). Examples: picture window, large casement, sliding glass doors counted as windows.
  **UOM:** EA
  **Source:** Visual categorization during exterior walkthrough.
  **Used for:** Window casing LF derivation, glass SF deduction, glass masking count.

---

## Section: Exterior Asset Keys

Asset keys count discrete exterior items that are not painted but require protection management and drive masking/covering tasks.

- `PS_EXT_ASSET_EA.FENCE_POST`
  **Meaning:** Count of standalone fence posts in scope requiring individual treatment (painting or protection). Use when fence posts are a distinct element from the fence field panels.
  **UOM:** EA
  **Source:** Manual count during scope capture.
  **Used for:** Per-post application tasks where posts are a distinct scope item from fence field SF.

- `PS_EXT_ASSET_EA.DOOR_HARDWARE`
  **Meaning:** Count of exterior door hardware sets (lockset, handleset, deadbolt, knocker — per door) in scope. One count per door.
  **UOM:** EA
  **Source:** Manual count or derived from `PS_EXT_OPENING_EA.DOOR_EXT` (one hardware set per exterior door unless scope notes indicate otherwise).
  **Used for:** Hardware masking/removal task counts.

- `PS_EXT_ASSET_EA.LIGHT_FIXTURE`
  **Meaning:** Count of wall-mounted exterior light fixtures (sconces, post-mount lanterns at wall, security lights) requiring protection during painting.
  **UOM:** EA
  **Source:** Manual count during scope capture.
  **Used for:** Fixture masking/covering task counts.

- `PS_EXT_ASSET_EA.HOUSE_NUMBERS`
  **Meaning:** Count of address number groupings (one EA per mounting location, regardless of individual digit count).
  **UOM:** EA
  **Source:** Manual count during scope capture (typically 1 per structure, occasionally 2 if dual-entry).
  **Used for:** Address number masking or removal task counts.

- `PS_EXT_ASSET_EA.HVAC_UNIT`
  **Meaning:** Count of ground-level or wall-mounted HVAC condensers, heat pump units, mini-split heads, or through-wall HVAC units within the painting work zone.
  **UOM:** EA
  **Source:** Manual count during scope capture.
  **Used for:** HVAC unit full-coverage tarping task counts. Units adjacent to spray work require full covering.

- `PS_EXT_ASSET_EA.UTILITY_PANEL`
  **Meaning:** Count of exterior electrical panels, gas meter enclosures, or utility access panels mounted on the building exterior.
  **UOM:** EA
  **Source:** Manual count during scope capture.
  **Used for:** Utility panel covering task counts. Panels within spray range require full covering.

- `PS_EXT_ASSET_EA.SATELLITE_DISH`
  **Meaning:** Count of satellite dishes, antenna mounts, or similar roof or wall-mounted signal equipment within the painting work zone.
  **UOM:** EA
  **Source:** Manual count during scope capture.
  **Used for:** Satellite/antenna masking task counts.

---

## Section: Exterior Protection Keys

Exterior protection keys measure what must be covered, masked, or protected during exterior painting. They are semantically distinct from surface keys (which measure what is being painted) and edge keys (which measure where paint is applied). Protection keys drive material and time estimates for masking, tarping, and covering tasks.

Three key categories:
- **`PS_EXT_PROTECT_SF.*`** — area-based protection (square feet)
- **`PS_EXT_PROTECT_EA.*`** — count-based protection (each item)

### Landscape and Site Surface Protection (SF)

- `PS_EXT_PROTECT_SF.LANDSCAPE_ADJACENT`
  **Meaning:** SF of planted bed, ground cover, or mulch areas within approximately 4 feet of the building structure requiring light protection (drop cloth or plastic sheeting).
  **UOM:** SF
  **Source:** Measured from site take-off or estimated from perimeter LF x average bed depth.
  **Used for:** Landscape adjacent protection tasks (drop placement and removal).

- `PS_EXT_PROTECT_SF.LANDSCAPE_FULL`
  **Meaning:** SF of full landscape zone requiring heavier coverage/tarping (e.g., spray operations where overspray reach exceeds the adjacent bed zone).
  **UOM:** SF
  **Source:** Measured from spray zone overspray radius applied to landscape areas.
  **Used for:** Full landscape tarp coverage tasks during spray operations.

- `PS_EXT_PROTECT_SF.HARDSCAPE_PATIO`
  **Meaning:** SF of patio or hardscape surface (concrete, pavers, stone) within the work zone requiring drop cloth coverage.
  **UOM:** SF
  **Source:** Measured from patio polygon.
  **Used for:** Hardscape patio protection tasks.

- `PS_EXT_PROTECT_SF.HARDSCAPE_WALK`
  **Meaning:** SF of walkway surface (concrete, brick, stone pavers) adjacent to the structure requiring drop cloth coverage during work.
  **UOM:** SF
  **Source:** Measured from walkway polygon adjacent to work zone.
  **Used for:** Walkway protection tasks.

- `PS_EXT_PROTECT_SF.DRIVEWAY`
  **Meaning:** SF of driveway surface within the overspray or drip zone during painting operations.
  **UOM:** SF
  **Source:** Measured from driveway area within assessed overspray reach.
  **Used for:** Driveway protection tasks. Typically triggered when painting occurs near garage or driveway-adjacent elevation.

- `PS_EXT_PROTECT_SF.VEHICLE_ADJACENT`
  **Meaning:** SF of protection required for a parked vehicle within the spray zone that cannot be relocated.
  **UOM:** SF
  **Source:** Standard vehicle footprint estimate (typically 120–160 SF) x count of vehicles.
  **Used for:** Vehicle tarping tasks when vehicle removal is not possible.

- `PS_EXT_PROTECT_SF.STORED_PROPERTY`
  **Meaning:** SF estimate of outdoor furniture, equipment, or stored property requiring tarping in the work zone.
  **UOM:** SF
  **Source:** Assessed estimate during scope capture.
  **Used for:** Outdoor property tarping tasks.

### Asset Protection (EA)

- `PS_EXT_PROTECT_EA.GLASS_WINDOW`
  **Meaning:** Count of exterior window panes requiring masking (glass only, not frame).
  **UOM:** EA
  **Source:** Derived from `PS_EXT_OPENING_EA.WINDOW_S + WINDOW_M + WINDOW_L` — one pane per opening by default. If a multi-pane flag is set at the project level (e.g., divided-lite windows), pane count may be overridden by explicit capture.
  **Used for:** Window glass masking tasks.

- `PS_EXT_PROTECT_EA.GLASS_DOOR`
  **Meaning:** Count of glass panes in exterior doors requiring masking.
  **UOM:** EA
  **Source:** Derived from `PS_EXT_OPENING_EA.DOOR_EXT` — one pane per door by default. Override with explicit capture for multi-lite door designs.
  **Used for:** Door glass masking tasks.

- `PS_EXT_PROTECT_EA.DOOR_HARDWARE`
  **Meaning:** Count of exterior door hardware sets requiring masking (locksets, deadbolts, handlesets).
  **UOM:** EA
  **Source:** Derived from `PS_EXT_ASSET_EA.DOOR_HARDWARE` unless explicitly overridden.
  **Used for:** Hardware masking tasks. One task per hardware set.

- `PS_EXT_PROTECT_EA.LIGHT_FIXTURE`
  **Meaning:** Count of exterior light fixtures requiring masking or covering during painting.
  **UOM:** EA
  **Source:** Derived from `PS_EXT_ASSET_EA.LIGHT_FIXTURE` unless explicitly overridden.
  **Used for:** Fixture masking/covering tasks.

- `PS_EXT_PROTECT_EA.HOUSE_NUMBERS`
  **Meaning:** Count of address number groupings requiring masking or removal.
  **UOM:** EA
  **Source:** Derived from `PS_EXT_ASSET_EA.HOUSE_NUMBERS` unless explicitly overridden.
  **Used for:** Address number masking or removal/reinstall tasks.

- `PS_EXT_PROTECT_EA.HVAC_UNIT`
  **Meaning:** Count of HVAC/condenser units requiring full tarping/covering during spray operations.
  **UOM:** EA
  **Source:** Derived from `PS_EXT_ASSET_EA.HVAC_UNIT` unless explicitly overridden.
  **Used for:** HVAC unit full-covering tasks.

- `PS_EXT_PROTECT_EA.UTILITY_PANEL`
  **Meaning:** Count of exterior utility panels requiring covering.
  **UOM:** EA
  **Source:** Derived from `PS_EXT_ASSET_EA.UTILITY_PANEL` unless explicitly overridden.
  **Used for:** Utility panel covering tasks.

- `PS_EXT_PROTECT_EA.SATELLITE_DISH`
  **Meaning:** Count of satellite dishes or antenna mounts requiring masking during spray operations.
  **UOM:** EA
  **Source:** Derived from `PS_EXT_ASSET_EA.SATELLITE_DISH` unless explicitly overridden.
  **Used for:** Satellite/antenna masking tasks.

---

## Key Derivation Rules

### Explicitly Measured Keys (not computed — require field capture)

The following keys must be directly measured or counted during scope capture. PaintScope cannot auto-derive them from other keys:

| Key | Why explicit capture is required |
|---|---|
| `PS_EXT_SURFACE_SF.SIDING_FIELD` | Net area after deductions — requires elevation take-off |
| `PS_EXT_SURFACE_SF.STUCCO_FIELD` | Net area — requires elevation take-off |
| `PS_EXT_SURFACE_SF.MASONRY_WALL` | Net area — requires elevation take-off |
| `PS_EXT_SURFACE_SF.SOFFIT_FIELD` | Requires eave depth measurement |
| `PS_EXT_SURFACE_SF.DECK_FIELD` | Requires deck polygon measurement |
| `PS_EXT_SURFACE_SF.FENCE_FIELD` | Requires fence length and height |
| `PS_EXT_EDGE_LF.FASCIA` | Requires roofline perimeter measurement |
| `PS_EXT_EDGE_LF.DECK_RAILING` | Requires railing run measurement |
| All `PS_EXT_META.*` flags and ENUMs | Collected assessments — not computable |

### Auto-Derived Keys

The following keys can be derived by PaintScope from other keys, provided the derivation logic is explicitly defined and published:

| Derived Key | Derivation |
|---|---|
| `PS_EXT_PROTECT_EA.GLASS_WINDOW` | `= PS_EXT_OPENING_EA.WINDOW_S + WINDOW_M + WINDOW_L` (one pane per opening; override with multi-pane flag) |
| `PS_EXT_PROTECT_EA.GLASS_DOOR` | `= PS_EXT_OPENING_EA.DOOR_EXT` (one pane per door; override for multi-lite) |
| `PS_EXT_PROTECT_EA.DOOR_HARDWARE` | `= PS_EXT_ASSET_EA.DOOR_HARDWARE` (1:1 unless overridden) |
| `PS_EXT_PROTECT_EA.LIGHT_FIXTURE` | `= PS_EXT_ASSET_EA.LIGHT_FIXTURE` (1:1 unless overridden) |
| `PS_EXT_PROTECT_EA.HOUSE_NUMBERS` | `= PS_EXT_ASSET_EA.HOUSE_NUMBERS` (1:1 unless overridden) |
| `PS_EXT_PROTECT_EA.HVAC_UNIT` | `= PS_EXT_ASSET_EA.HVAC_UNIT` (1:1 unless overridden) |
| `PS_EXT_PROTECT_EA.UTILITY_PANEL` | `= PS_EXT_ASSET_EA.UTILITY_PANEL` (1:1 unless overridden) |
| `PS_EXT_PROTECT_EA.SATELLITE_DISH` | `= PS_EXT_ASSET_EA.SATELLITE_DISH` (1:1 unless overridden) |
| `PS_EXT_ASSET_EA.DOOR_HARDWARE` | `= PS_EXT_OPENING_EA.DOOR_EXT` (one set per door; override allowed) |

### Key Dependencies

The following dependencies must be resolved before derived keys are published:

```
PS_EXT_OPENING_EA.WINDOW_S
PS_EXT_OPENING_EA.WINDOW_M       ──►  PS_EXT_PROTECT_EA.GLASS_WINDOW
PS_EXT_OPENING_EA.WINDOW_L

PS_EXT_OPENING_EA.DOOR_EXT       ──►  PS_EXT_PROTECT_EA.GLASS_DOOR
                                  ──►  PS_EXT_ASSET_EA.DOOR_HARDWARE
                                  ──►  PS_EXT_PROTECT_EA.DOOR_HARDWARE

PS_EXT_ASSET_EA.LIGHT_FIXTURE    ──►  PS_EXT_PROTECT_EA.LIGHT_FIXTURE
PS_EXT_ASSET_EA.HVAC_UNIT        ──►  PS_EXT_PROTECT_EA.HVAC_UNIT
PS_EXT_ASSET_EA.UTILITY_PANEL    ──►  PS_EXT_PROTECT_EA.UTILITY_PANEL
PS_EXT_ASSET_EA.SATELLITE_DISH   ──►  PS_EXT_PROTECT_EA.SATELLITE_DISH
PS_EXT_ASSET_EA.HOUSE_NUMBERS    ──►  PS_EXT_PROTECT_EA.HOUSE_NUMBERS
```

**Flag:** PaintScope team must confirm which asset-to-protect derivations are auto-published vs. require explicit capture to override. Default 1:1 mapping applies unless project-level override is declared.

---

## Validation Rules

### Minimum Required Keys for a Minimal Exterior Siding Scope

A spec for exterior siding field coat MUST NOT proceed unless all of the following keys are present and non-null:

| Required Key | Reason |
|---|---|
| `PS_EXT_META.EA.ELEVATIONS_TOTAL` | Validates that all elevations have been accounted for |
| `PS_EXT_META.ENUM.ACCESS_TYPE` | Required to select access strategy and time modifier |
| `PS_EXT_SURFACE_SF.SIDING_FIELD` (or other primary field surface key) | The quantity being estimated — no geometry, no estimate |
| `PS_EXT_META.FLAG.NEW_CONSTRUCTION` | Determines substrate state path (new vs. existing) |
| `PS_EXT_META.ENUM.WIND_CONDITION` | Required to gate spray eligibility |
| `PS_EXT_META.ENUM.SURFACE_TEMPERATURE` | Required to gate application timing |

If any of these keys are missing, the Estimation Engine must fail the spec application and return:
- List of missing keys
- Recommended PaintScope capture action for each missing key

### Optional Keys (Zero = Not Present in Scope)

The following keys are optional. A value of zero (or absent) means the element is not present in scope and no tasks are generated:

- All `PS_EXT_SURFACE_SF.*` keys except the primary field surface declared by the spec
- All `PS_EXT_EDGE_LF.*` trim keys (absent if no trim is in scope)
- All `PS_EXT_OPENING_EA.*` keys (absent if no openings in scope)
- All `PS_EXT_ASSET_EA.*` keys (absent if no assets present)
- All `PS_EXT_PROTECT_SF.*` keys (absent if no protection zones in scope)
- `PS_EXT_META.EA.STORIES_TOTAL` (optional if `ACCESS_TYPE` is explicitly provided)
- `PS_EXT_META.ENUM.DEW_POINT_RISK` (optional; absence is treated as `safe` with a logged warning)
- `PS_EXT_META.ENUM.SUN_EXPOSURE` (optional; absence is treated as `partial_shade` with a logged warning)

> Note: Optional keys with absent values must not silently default inside spec logic. If a spec module requires a key and the key is absent, the module must fail or explicitly fall back to a declared default and log the fallback. Silence is not acceptable.

### Relationship to Substrate State Keys (SS_EXT_*)

Exterior substrate state codes are defined in `Exterior_Substrates_Doctrine.md` (SS_EXT_* namespace). These codes are consumed by specs alongside PS_EXT_* quantity keys. Key relationships:

- `PS_EXT_META.FLAG.NEW_CONSTRUCTION` feeds the substrate state routing decision — new construction skips condition assessment branches.
- `PS_EXT_META.ENUM.SURFACE_TEMPERATURE` and `PS_EXT_META.ENUM.DEW_POINT_RISK` may activate substrate-state-dependent application restrictions (e.g., `SS_EXT_COLD_SURFACE` blocking latex application).
- Substrate state codes are NOT published as PS_EXT_* keys. They are a separate domain. Specs that require substrate state must declare SS_EXT_* dependencies independently.

---

## Cross-References

- `PaintScope_Quantity_Key_Catalog.md` — interior key catalog; interior keys do NOT apply to exterior scopes
- `Exterior_Substrates_Doctrine.md` — substrate state taxonomy (SS_EXT_* codes)
- `Exterior_Modifiers_Doctrine.md` — factor keys (FAC_EXT_*) that consume PS_EXT_META.ENUM keys
- `Exterior_Protection_Doctrine.md` — protection zone IDs that map to PS_EXT_PROTECT_* keys
- `Surface_Vocabulary_Reference.md` — surface identifiers used to define PS_EXT_SURFACE_* keys
- `Site_Condition_Vocabulary_Reference.md` — site condition terms used in PS_EXT_META.ENUM keys

---

## Change Log

| Version | Date | Summary |
|---|---|---|
| 0.1 | 2026-02-20 | Initial exterior key catalog — elevation meta, field surfaces, trim edges, openings, assets, protection |
