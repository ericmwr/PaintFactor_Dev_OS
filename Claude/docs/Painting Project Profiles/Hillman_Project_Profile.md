# Example Project Profile: Hillman Residence

**Project ID:** PROJ_HILLMAN_001  
**Type:** New Construction — Modular Home (Interior Only)  
**Status:** Reference / Pressure Test  
**Version:** 1.0.0  
**Created:** 2026-02-26  

---

## 1. Project Summary

| Field | Value |
|-------|-------|
| Structure Type | Modular home, two-module assembly |
| Stories | 1 (single floor + basement access stairway) |
| Approximate Footprint | 44' × 28' (1,232 SF footprint) |
| Construction Phase | Fully fitted out — trim, fixtures, cabinets, plumbing, finished floor installed |
| Scope | Full interior paint — ceilings, walls, window jambs, plus stain-grade trim/door maintenance |
| Exterior Scope | None (exterior doors excluded) |

### Module Assembly Context

The home arrived in two halves on semi-trailers and was crane-set and joined on-site. This assembly method produces characteristic conditions that affect the painting scope:

- Drywall seams at the module join line, taped and mudded flush/feathered after assembly
- Systematic nail pops throughout from transport vibration and crane-set stress
- Factory-applied primer on most drywall surfaces (manufacturer priming)
- Factory-applied stain and clear coat on all trim and interior doors (manufacturer finishing)
- Overspray and drip contamination on trim from the manufacturer's drywall priming process

---

## 2. Site Conditions

| Condition ID | Value | Notes |
|--------------|-------|-------|
| `occupancy_state` | `vacant_with_fixtures` | Unoccupied new construction; all fixtures, cabinets, plumbing, shelving installed |
| `floor_type` | `finished` | Finished flooring installed throughout at time of painting |
| `access_constraint` | `scaffold` | Vaulted living room/kitchen requires scaffold for ceiling and upper gable work |
| `lead_status` | `not_applicable` | New construction |
| `moisture_condition` | `dry` | Standard new construction |
| `temperature_condition` | `normal` | Climate-controlled interior |
| `time_constraint` | `normal` | Standard timeline |

---

## 3. Room Inventory

### 3.1 Vaulted Zone

| Room ID | Room Name | Length | Width | Ceiling Type | Peak Height | Low Point | Pitch | Ceiling SF | Gable SF | Wall SF | Trim LF |
|---------|-----------|--------|-------|-------------|-------------|-----------|-------|-----------|----------|---------|---------|
| RM_01 | Living Room / Kitchen | 28' | 18' | Tru-Vault (8/12) | 18' | 8' | 8/12 | 753 | 260 | 920 | 92 |

**Vaulted Zone Notes:**
- The vaulted modification spans the full living room/kitchen open-plan area
- Gable walls (260 SF total, both ends) are the exterior-wall-facing triangular sections above the 8' plate line
- Ceiling is sloped on both sides of the ridge, calculated at true slope length (13' slope run per side)
- Wall SF (920) represents the perimeter walls below the 8' plate line only
- The gable wall on the exterior side contains the primary window array (see § 5)

### 3.2 Standard Rooms (8' Ceiling)

| Room ID | Room Name | Length | Width | Height | Wall SF | Ceiling SF | Trim LF |
|---------|-----------|--------|-------|--------|---------|------------|---------|
| RM_02 | Utility / Mud Room | 13' | 9' | 8' | 352 | 117 | 44 |
| RM_03 | Bath #2 (Guest) | 13' | 7' | 8' | 320 | 91 | 40 |
| RM_04 | Bedroom #2 (Guest) | 13' | 11' | 8' | 384 | 143 | 48 |
| RM_05 | Hallway | 3' | 21' | 8' | 384 | 63 | 48 |
| RM_06 | Master Bedroom | 13' | 13' | 8' | 416 | 169 | 52 |
| RM_07 | Bath #1 (Master) | 8' | 10' | 8' | 288 | 80 | 36 |
| RM_08 | Stairway (to basement) | 4' | 13' | 13' | 442 | 52 | 34 |

### 3.3 Closets

| Room ID | Room Name | Length | Width | Height | Wall SF | Ceiling SF | Trim LF | Shelving |
|---------|-----------|--------|-------|--------|---------|------------|---------|----------|
| RM_09 | Walk-In Closet (Master) | 6' | 4' | 8' | 160 | 24 | 20 | Wire rack |
| RM_10 | Closet (Bedroom #2) | 3' | 4' | 8' | 112 | 12 | 14 | Wire rack |
| RM_11 | Closet (Hallway) | 3' | 3' | 8' | 96 | 9 | 12 | Wire rack |
| RM_12 | Closet (Utility) | 3' | 4' | 8' | 112 | 12 | 14 | Wire rack |
| RM_13 | Pantry | — | — | — | — | — | — | Wire rack |

### 3.4 Project Totals

| Metric | Value |
|--------|-------|
| Total Wall SF (Standard 8') | 3,986 |
| Total Wall SF (Stairway) | 442 |
| Total Gable Wall SF | 260 |
| **Grand Total Wall SF** | **4,246** |
| Total Ceiling SF (Flat) | 772 |
| Total Ceiling SF (Vaulted) | 753 |
| **Grand Total Ceiling SF** | **1,525** |
| Total Interior Doors | 12 |
| Total Exterior Doors | 2 (excluded from scope) |
| Total Windows | 12 |
| Total Closets | 5 |
| Total Trim LF | 454 |

---

## 4. Surface Inventory by Substrate State

### 4.1 Drywall — Ceilings

| Substrate State | Condition | Rooms | SF | Scope |
|----------------|-----------|-------|-----|-------|
| `SS_BARE` | New / uncoated | RM_01 (vaulted ceiling only) | 753 | Prime + 2 coats finish |
| `SS_PRIMED_FACTORY` | Good w/ nail pops | RM_02 through RM_13 (flat ceilings) | 772 | Nail pop repair, spot prime, 2 coats finish |

### 4.2 Drywall — Walls

| Substrate State | Condition | Location | SF | Scope |
|----------------|-----------|----------|-----|-------|
| `SS_BARE` | New / uncoated | RM_01 gable walls (above plate line) | 260 | Prime + 2 coats finish |
| `SS_PRIMED_FACTORY` | Good w/ nail pops + assembly seams | All rooms, below plate line | 3,986 | Nail pop repair, seam spot-prime, 2 coats finish |

**Assembly Seam Detail:** The module join line runs longitudinally through the center of the home. Every room that the seam crosses has taped/mudded/feathered drywall patches where the two module halves were joined. These seams are bare joint compound over factory primer — they require spot priming before finish coats to prevent flashing.

### 4.3 Trim — Stain Grade (Clear Coated)

| Substrate State | Condition | Components | LF | Scope |
|----------------|-----------|------------|-----|-------|
| `SS_CLEAR` | Fair — overspray/drip contamination from manufacturer primer + fastener holes exposed | Baseboard, door casing, window casing | 454 | Clean overspray/drips, putty fastener holes (stain-match), touch up clear coat |

### 4.4 Door Frames

| Substrate State | Condition | Count | Scope |
|----------------|-----------|-------|-------|
| `SS_CLEAR` | Fair — same issues as trim | 12 interior frames | Clean, putty, touch up clear coat |

### 4.5 Interior Door Slabs

| Substrate State | Condition | Count | Scope |
|----------------|-----------|-------|-------|
| `SS_CLEAR` | Fair — minor clear coat damage from installation | 12 interior slabs | Touch up clear coat where damaged |

### 4.6 Window Jambs

| Substrate State | Condition | Count | Scope |
|----------------|-----------|-------|-------|
| `SS_PRIMED_FACTORY` | Good | 12 windows | 2 coats finish paint on pre-primed wood jambs |

### 4.7 Exterior Doors

| Substrate State | Count | Scope |
|----------------|-------|-------|
| N/A | 2 | **Excluded from painting scope** |

---

## 5. Window Detail

### 5.1 Gable Wall Window Array (RM_01 — Exterior Wall)

The exterior-facing gable wall of the living room/kitchen contains a complex window arrangement spanning from floor level to the upper gable:

| Window ID | Type | Size | Height Tier | Location | Notes |
|-----------|------|------|-------------|----------|-------|
| W_01 | Double Slider Door | O (Oversized) | H1 | Gable wall, ground level | Sliding glass door — jambs only, door excluded |
| W_02 | Fixed / Picture | L (Large) | H1 | Gable wall, ground level, left | Lower window flanking slider |
| W_03 | Fixed / Picture | L (Large) | H1 | Gable wall, ground level, right | Lower window flanking slider |
| W_04 | Fixed / Trapezoid | M (Medium) | H3 | Gable wall, upper left | Above W_02, in gable triangle |
| W_05 | Fixed / Trapezoid | M (Medium) | H3 | Gable wall, upper center-left | Upper gable area |
| W_06 | Fixed / Trapezoid | M (Medium) | H3 | Gable wall, upper center-right | Upper gable area |
| W_07 | Fixed / Trapezoid | M (Medium) | H3 | Gable wall, upper right | Above W_03, in gable triangle |

**Access Note:** The four upper trapezoid windows (W_04–W_07) are located in the gable above the 8' plate line. Scaffold or equivalent staging is required to reach jambs for painting. Height modifier H3 (1.50x) applies.

### 5.2 Standard Windows (Ground Level)

| Count | Type | Size | Height Tier | Rooms | Notes |
|-------|------|------|-------------|-------|-------|
| 5 | Various | M (Medium) | H1 | RM_02, RM_03, RM_04, RM_06, RM_07 | Standard bedroom/bath windows at ground level |

**Substrate for all windows:** Pre-primed wood jambs (`SS_PRIMED_FACTORY`), condition Good.  
**Trim Package:** Casing (interior casing included in trim LF totals; jamb painting is the window-specific scope).

---

## 6. Color Schedule

### 6.1 Color Assignments

| Color Name | SW Code | Rooms | Surface | Notes |
|------------|---------|-------|---------|-------|
| Pure White | SW 7005 | All rooms | Ceilings | Flat sheen, ceiling throughout |
| Pure White | SW 7005 | RM_05 (Hallway) | Walls + Ceiling | Same color ceiling and walls |
| Halcyon Green | SW 6213 | RM_01 (Living Room / Kitchen) | Walls | Below plate line only; gable walls are part of ceiling system |
| Sea Salt | SW 6204 | RM_02 (Utility / Mud Room) | Walls | |
| Quietude | SW 6212 | RM_03 (Bath #2), RM_04 (Bedroom #2) | Walls | Same color for guest bath and guest bedroom |
| Jasper Stone | SW 9133 | RM_06 (Master Bedroom) | Walls | |
| Rainwashed | SW 6211 | RM_07 (Bath #1 / Master Bath) | Walls | |
| Pure White | SW 7005 | RM_08 (Stairway) | Walls | |
| Pure White | SW 7005 | RM_09–RM_13 (Closets, Pantry) | Walls | Assumed — closets typically match hallway/adjacent room |

### 6.2 Color Complexity Summary

| Metric | Value |
|--------|-------|
| Distinct wall colors | 6 (Pure White, Halcyon Green, Sea Salt, Quietude, Jasper Stone, Rainwashed) |
| Distinct ceiling colors | 1 (Pure White) |
| Color level classification | Color Level II |
| Minimum wall paint SKUs | 6 |
| Minimum ceiling paint SKUs | 1 |

### 6.3 Color Transition Points

Notable cut-in transitions where adjacent rooms have different wall colors:

| Transition | Color A | Color B | Location |
|------------|---------|---------|----------|
| Living Room → Hallway | Halcyon Green (SW 6213) | Pure White (SW 7005) | Open transition at hall entry |
| Hallway → Guest Bath | Pure White (SW 7005) | Quietude (SW 6212) | Door frame transition |
| Hallway → Guest Bedroom | Pure White (SW 7005) | Quietude (SW 6212) | Door frame transition |
| Hallway → Master Bedroom | Pure White (SW 7005) | Jasper Stone (SW 9133) | Door frame transition |
| Master Bedroom → Master Bath | Jasper Stone (SW 9133) | Rainwashed (SW 6211) | Door frame transition |
| Living Room → Utility | Halcyon Green (SW 6213) | Sea Salt (SW 6204) | Door frame transition |

---

## 7. Spec Family Assignments

### 7.1 Painted Drywall Surfaces

| Spec Family | Surface | Rooms | Substrate State | QT | Coat System |
|-------------|---------|-------|----------------|-----|-------------|
| `SF_DRYWALL_CEILING_NC_PRIME` | Ceiling (vaulted) | RM_01 | `SS_BARE` | QT3 | 1 coat PVA primer |
| `SF_DRYWALL_CEILING_NC_FINISH` | Ceiling (vaulted) | RM_01 | `SS_PRIMED_FIELD` (after prime) | QT3 | 2 coats flat finish |
| `SF_DRYWALL_CEILING_NC_FINISH` | Ceiling (flat) | RM_02–RM_13 | `SS_PRIMED_FACTORY` | QT3 | Spot prime repairs + 2 coats flat finish |
| `SF_DRYWALL_WALL_NC_PRIME` | Gable walls | RM_01 (gable only) | `SS_BARE` | QT3 | 1 coat PVA primer |
| `SF_DRYWALL_WALL_NC_FINISH` | Walls | All rooms | `SS_PRIMED_FACTORY` / `SS_PRIMED_FIELD` | QT3 | Spot prime seams + 2 coats eggshell finish |

### 7.2 Stain-Grade Trim & Doors (Clear Coat Maintenance)

| Spec Family | Surface | Quantity | Substrate State | QT | Scope |
|-------------|---------|----------|----------------|-----|-------|
| `SF_TRIM_CLEAR_TOUCHUP` | Baseboard, door casing, window casing | 454 LF | `SS_CLEAR` | QT3 | Clean, putty fastener holes, touch up clear |
| `SF_DOOR_FRAME_CLEAR_TOUCHUP` | Interior door frames | 12 EA | `SS_CLEAR` | QT3 | Clean, putty, touch up clear |
| `SF_DOOR_SLAB_CLEAR_TOUCHUP` | Interior door slabs | 12 EA | `SS_CLEAR` | QT3 | Touch up clear coat damage |

### 7.3 Window Jambs

| Spec Family | Surface | Count | Substrate State | QT | Coat System |
|-------------|---------|-------|----------------|-----|-------------|
| `SF_WINDOW_INT_NC` | Window jambs (ground level) | 8 EA | `SS_PRIMED_FACTORY` | QT3 | 2 coats finish on pre-primed jambs |
| `SF_WINDOW_INT_NC` | Window jambs (upper gable) | 4 EA | `SS_PRIMED_FACTORY` | QT3 | 2 coats finish — H3 height modifier applies |

### 7.4 Closet Shelving

| Spec Family | Surface | Count | Notes |
|-------------|---------|-------|-------|
| `SF_CLOSET_SHELF_NC` | Wire shelf racks | 5 EA | Not painted — masking/protection scope only |

---

## 8. Modifier Stack by Zone

### 8.1 Vaulted Zone (RM_01)

**Ceiling and Gable Walls — Above 8' Plate Line:**

| Modifier | ID | Value | Applies To |
|----------|----|-------|-----------|
| Quality Tier | QT3_STANDARD | 1.00 | All tasks |
| Height | H3_HIGH | 1.50 | All tasks above plate line (scaffold required) |
| Surface Condition | COND_GOOD | 1.00 | Prep tasks (bare drywall, no defects) |

**Effective modifier (ceiling/gable work):** 1.00 × 1.50 × 1.00 = **1.50**

**Walls — Below 8' Plate Line:**

| Modifier | ID | Value | Applies To |
|----------|----|-------|-----------|
| Quality Tier | QT3_STANDARD | 1.00 | All tasks |
| Height | H1_STANDARD | 1.00 | All tasks |
| Surface Condition | COND_GOOD | 1.00 | Prep tasks |

**Effective modifier (wall work):** 1.00 × 1.00 × 1.00 = **1.00**

### 8.2 Standard Rooms (RM_02–RM_07)

| Modifier | ID | Value | Applies To |
|----------|----|-------|-----------|
| Quality Tier | QT3_STANDARD | 1.00 | All tasks |
| Height | H1_STANDARD | 1.00 | All tasks |
| Surface Condition | COND_GOOD | 1.00 | Prep tasks |

**Effective modifier:** 1.00 × 1.00 × 1.00 = **1.00**

**Room-specific complexity modifiers:**

| Room | Modifier | ID | Value | Reason |
|------|----------|----|-------|--------|
| RM_03 (Bath #2) | Bathroom complexity | COMP_BATHROOM | 2.00 | Hardware, fixtures, toilet, shower — all installed |
| RM_07 (Bath #1) | Bathroom complexity | COMP_BATHROOM | 2.00 | Hardware, fixtures, toilet, shower — all installed |
| RM_01 (Living/Kitchen) | Cabinets present | COMP_CABINETS | 1.50 | Kitchen cabinets installed, require masking |

### 8.3 Stairway (RM_08)

| Modifier | ID | Value | Applies To |
|----------|----|-------|-----------|
| Quality Tier | QT3_STANDARD | 1.00 | All tasks |
| Height | H2_TALL | 1.30 | Ceiling and upper wall tasks (13' ceiling) |
| Surface Condition | COND_GOOD | 1.00 | Prep tasks |

**Effective modifier (upper work):** 1.00 × 1.30 × 1.00 = **1.30**

### 8.4 Closets (RM_09–RM_13)

| Modifier | ID | Value | Applies To |
|----------|----|-------|-----------|
| Quality Tier | QT3_STANDARD | 1.00 | All tasks |
| Height | H1_STANDARD | 1.00 | All tasks |
| Closet Shelving | COMP_CLOSET_SHELVING | 1.50 | Wall and ceiling tasks (wire rack obstruction) |

**Effective modifier:** 1.00 × 1.00 × 1.50 = **1.50**

---

## 9. Protection Requirements

### 9.1 Floor Protection

| Zone | Floor Type | Protection Level | Method |
|------|-----------|-----------------|--------|
| All rooms | Finished flooring | `full_cover` | Rosin paper on hard surfaces; tape at edges |

### 9.2 Asset Protection

| Asset | Rooms | Protection Level | Method |
|-------|-------|-----------------|--------|
| Kitchen cabinets | RM_01 | `full_cover` | Plastic sheeting over cabinet faces, tape at edges |
| Countertops | RM_01, RM_03, RM_07 | `full_cover` | Rosin paper or plastic sheeting |
| Plumbing fixtures (toilets, sinks) | RM_02, RM_03, RM_07 | `partial_cover` | Plastic wrap / tape |
| Shower enclosures | RM_03, RM_07 | `partial_cover` | Plastic sheeting |
| Light fixtures | All rooms | `item_mask` | Bag or tape as needed |
| Wire shelf racks | RM_09–RM_13 | `light_mask` | Tape at wall contact points, work around |
| Stain-grade trim | All rooms | `edge_only` | Tape at wall-to-trim junction during wall painting |
| Sliding glass door | RM_01 | `partial_cover` | Mask glass and frame during wall/ceiling painting |
| Window glass | All windows | `light_mask` | Tape at jamb-to-glass edge during jamb painting |

### 9.3 Trim Protection During Wall Painting

Because the stain-grade trim has a factory clear coat finish and is NOT being painted (only touched up), all trim requires edge protection during wall and ceiling painting operations. This is a tape-line cut at every wall-to-trim junction throughout the house.

---

## 10. Prep Task Summary

### 10.1 Nail Pop Repair (Project-Wide)

Systematic nail pop repair across all factory-primed drywall surfaces (walls and ceilings). This is a transport/assembly artifact affecting the entire home.

| Task | Surface | Scope | Method |
|------|---------|-------|--------|
| Set protruding fasteners | All drywall | Project-wide | Drive with screw gun, countersink |
| Spot compound | All nail pop locations | Project-wide | Lightweight spackle, feather edges |
| Sand repairs | All patched locations | Project-wide | 150-grit, blend to surrounding surface |
| Spot prime repairs | All patched locations | Project-wide | Primer over bare compound to prevent flashing |

### 10.2 Assembly Seam Spot-Prime

The module join seams have been taped, mudded, and feathered by the assembly crew, but the bare joint compound requires spot priming to match the factory primer absorption rate and prevent flashing through finish coats.

| Task | Location | Method |
|------|----------|--------|
| Spot prime assembly seams | Center join line, all affected rooms | Roller or brush prime over exposed compound, feather to factory primer edge |

### 10.3 Bare Drywall Prime (Vaulted Zone)

Full prime coat on the vaulted ceiling (753 SF) and gable walls (260 SF) — the only bare drywall in the project. These surfaces were not part of the factory module and were constructed on-site during the vaulted ceiling modification.

### 10.4 Stain-Grade Trim Cleaning

All trim surfaces require cleaning to remove primer overspray and drips from the manufacturer's drywall priming process before putty and clear coat touch-up work can proceed.

| Task | Method | Notes |
|------|--------|-------|
| Clean overspray/drips | Mineral spirits on rag, or careful scraping with plastic scraper | Must not damage existing stain/clear coat |

### 10.5 Fastener Hole Putty (Trim)

All exposed fastener holes in stain-grade trim require filling with color-matched stain putty (not spackle or standard wood filler).

| Task | Product Type | Notes |
|------|-------------|-------|
| Fill fastener holes | Stain-match wood putty | Color must match surrounding stain; overfill slightly and wipe flush |

---

## 11. Material Estimates

### 11.1 Paint

| Product | Sheen | Coverage Rate | Total SF | Coats | Gallons (Calculated) | Gallons (Adjusted) | Color / Notes |
|---------|-------|--------------|----------|-------|---------------------|-------------------|---------------|
| Ceiling paint | Flat | 400 SF/gal | 1,525 | 2 | 7.6 | 8 | Pure White SW 7005 |
| Wall paint — Halcyon Green | Eggshell | 350 SF/gal | 920 | 2 | 5.3 | 6 | SW 6213, RM_01 |
| Wall paint — Pure White | Eggshell | 350 SF/gal | ~1,500 | 2 | 8.6 | 9 | SW 7005, RM_05, RM_08, closets |
| Wall paint — Sea Salt | Eggshell | 350 SF/gal | 352 | 2 | 2.0 | 2 | SW 6204, RM_02 |
| Wall paint — Quietude | Eggshell | 350 SF/gal | 704 | 2 | 4.0 | 4 | SW 6212, RM_03 + RM_04 |
| Wall paint — Jasper Stone | Eggshell | 350 SF/gal | 416 | 2 | 2.4 | 3 | SW 9133, RM_06 |
| Wall paint — Rainwashed | Eggshell | 350 SF/gal | 288 | 2 | 1.6 | 2 | SW 6211, RM_07 |

### 11.2 Primer

| Product | Coverage Rate | Total SF | Coats | Gallons (Calculated) | Gallons (Adjusted) | Notes |
|---------|--------------|----------|-------|---------------------|-------------------|-------|
| PVA drywall primer | 400 SF/gal | 1,013 | 1 | 2.5 | 3 | Bare drywall: vaulted ceiling 753 + gable walls 260 |
| Spot primer | 350 SF/gal | ~200 | 1 | 0.6 | 1 | Nail pops + assembly seams (estimated coverage area) |

### 11.3 Trim / Door Products

| Product | Quantity | Notes |
|---------|----------|-------|
| Stain-match wood putty | 1–2 tubes | Color-matched to existing stain; for fastener holes in all trim |
| Clear coat (touch-up) | 1 quart | Match existing manufacturer clear; for trim and door touch-ups |
| Mineral spirits | 1 quart | For cleaning primer overspray from stain-grade surfaces |

### 11.4 Consumables

| Item | Quantity | Notes |
|------|----------|-------|
| Rosin paper | 2–3 rolls | Floor protection throughout |
| Painter's tape (1.5") | 8–10 rolls | Trim edge protection, window masking, fixture masking |
| Plastic sheeting | 2–3 rolls | Cabinet masking, fixture protection, shower protection |
| Drop cloths (canvas) | 4–6 | Supplemental floor protection, furniture draping |
| Caulk (painter's) | 4–6 tubes | Trim-to-wall junctions, gap sealing |
| Sandpaper (150 grit) | 1 pack | Nail pop repair sanding, spot prep |

---

## 12. Architectural Notes from Plans

Based on the floor plan, the following architectural features are relevant to scope:

- **Open floor plan:** Living room and kitchen share the vaulted space as one continuous zone with no dividing wall
- **Tru-Vault ceiling:** 8/12 pitch, structural ridge with (1) 1.75"×14"×18'-0" LVL shiploose beams noted on plans
- **Module join line:** Runs approximately along the 20' dimension mark on the plan, bisecting the home east-west
- **Pocket doors:** Bath #2 has a pocket door notation (2/0 pocket door); affects trim scope for that opening
- **Shower doors:** Chrome shower doors in both bathrooms (not painting scope, but protection/masking scope)
- **Stairway:** 4'×13' with 13' ceiling height — basement access; standard straight-run configuration
- **Sliding glass door:** 5'-0" sliding glass door on the gable wall (noted on plans as "5'-0" SLIDING GLASS DOOR")

---

## 13. Pressure Test Notes

This project is designated as a reference example for PaintFactor system validation. When running this project through the estimation engine:

### Key Validation Points

1. **Mixed substrate state handling:** The engine must correctly resolve different substrate states within the same room (RM_01 has both bare gable walls and factory-primed lower walls)
2. **Height modifier application:** Vaulted zone tasks above the plate line should receive H3 modifier; tasks below plate line should receive H1
3. **Bathroom complexity stacking:** RM_03 and RM_07 should show COMP_BATHROOM × QT3 modifier stacking
4. **Closet shelving modifier:** All closets should show COMP_CLOSET_SHELVING applied
5. **Color-per-room material calculation:** Material estimates must calculate per-color, not aggregate — minimum purchase quantities apply
6. **Assembly seam spot-prime:** Spot priming of module join seams should be captured as a prep task modifier, not a full prime scope
7. **Stain-grade trim as separate workflow:** Clear coat touch-up scope must not be confused with painted trim scope — different spec family, different materials, different tasks
8. **Window height tier split:** The 12 windows must split into ground-level (H1) and upper gable (H3) groups for accurate labor calculation
9. **Protection of stain-grade trim during wall painting:** Tape-line edge protection is required at every wall-to-trim junction because the trim carries a finish that must be preserved
10. **Sliding glass door jamb scope:** The slider door jambs are paintable (pre-primed wood) but the door itself is excluded — the spec must handle partial-opening scope
