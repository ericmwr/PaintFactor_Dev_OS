# NC Interior — Complete Atomic Spec Family Catalog

**Created:** 2026-02-01  
**Purpose:** Full inventory of spec families needed for 100% new construction interior coverage  
**Architecture:** Atomic composition with finish group resolution at project assembly  

---

## Design Principles Applied

1. **Atomic specs** — one spec per distinct paintable surface type
2. **Config dimensions absorb variation** — door_type, profile_type, substrate_condition within a spec
3. **Finish groups handle inter-spec edges** — masking/optimization resolved at project assembly
4. **Prime vs. finish separation for drywall only** — because prime and finish happen at different construction phases (prime before trim install, finish after)
5. **Fine finish specs include primer as conditional coat** — factory-primed surfaces skip it, bare wood includes it. One continuous workflow, not separate phases.

---

## Existing Specs

| # | Spec Family ID | Status |
|---|----------------|--------|
| — | SF_DRYWALL_WALL_NC_PRIME | ✅ Exists (v0.1.0) |
| — | SF_DRYWALL_WALL_NC_FINISH | ✅ Exists (v0.1.0) |
| — | SF_TRIM_NC_PAINT | ✅ Exists (v0.1.0) |

---

## TIER 1 — Standard (Every NC Interior Project)

These specs cover what every new construction interior requires. A production builder's 
base scope pulls from this tier only.

### Drywall

| # | Spec Family ID | Surface | UOM | Config Dimensions | Notes |
|---|----------------|---------|-----|-------------------|-------|
| 1 | SF_DRYWALL_WALL_NC_PRIME | Wall field prime | SF | QT, method (roll/spray_backroll) | ✅ EXISTS |
| 2 | SF_DRYWALL_WALL_NC_FINISH | Wall field finish | SF | QT, method, sheen, coat_count | ✅ EXISTS |
| 3 | SF_DRYWALL_CEILING_NC_PRIME | Ceiling field prime | SF | method (spray/roll) | NEW |
| 4 | SF_DRYWALL_CEILING_NC_FINISH | Ceiling field finish | SF | QT, method, sheen | NEW |

> **Why separate prime/finish for drywall?** Prime happens early in the construction sequence 
> (before trim install). Finish happens after trim is installed and painted. Different crews, 
> different days, different protection setups. They compose at project assembly.

### Linear Trim

| # | Spec Family ID | Surface | UOM | Config Dimensions | Notes |
|---|----------------|---------|-----|-------------------|-------|
| 5 | SF_TRIM_NC_PAINT | All linear trim | LF | profile_type, QT, method, sheen, condition_class | ✅ EXISTS |

Profile types handled within this one spec:
- Baseboard
- Door casing
- Window casing
- Crown molding
- Chair rail
- Picture rail
- Window stool (horizontal return trim)
- Window apron
- Wainscot cap rail
- Shoe mold / quarter round

> **Window stool and apron** are trim pieces measured in LF and painted with the same 
> process as casings. They belong in the trim spec, not a window spec. The window spec 
> (Tier 2) covers the window unit itself — sash, jamb, muntins.

### Door System

| # | Spec Family ID | Surface | UOM | Config Dimensions | Notes |
|---|----------------|---------|-----|-------------------|-------|
| 6 | SF_DOOR_SLAB_INT_NC | Door slab face | EA_SIDE | door_type, QT, method, substrate_condition | DESIGNED |
| 7 | SF_DOOR_FRAME_NC | Door frame/jamb + stop | EA or LF | domain (int), QT, method, substrate_condition | DESIGNED |

Door type config values: flush, panel (4/6), French, bifold, louvered  
Substrate condition: factory_primed, bare_wood (controls conditional primer coat)  
Door casing → covered by SF_TRIM_NC_PAINT

### Closet Shelving

| # | Spec Family ID | Surface | UOM | Config Dimensions | Notes |
|---|----------------|---------|-----|-------------------|-------|
| 8 | SF_CLOSET_SHELF_NC | Wood closet shelves | LF or SF | shelf_type, substrate_condition | NEW |

Covers: shelf top surface, leading edge, support cleats/brackets  
Excludes: wire shelving (not painted), closet rod (typically not painted)  
Common in every NC project — nearly every closet has painted wood shelving

---

**Tier 1 Total: 8 spec families (3 exist, 2 designed, 3 new)**

A standard production builder NC interior estimate composes from these 8 specs.  
Project assembly: wall prime → ceiling prime → ceiling finish → trim → doors → wall finish.

---

## TIER 2 — Common (Most NC Projects Include Some of These)

These cover features present in most projects but not universal. A mid-range to 
custom builder includes selections from this tier.

### Windows

| # | Spec Family ID | Surface | UOM | Config Dimensions | Notes |
|---|----------------|---------|-----|-------------------|-------|
| 9 | SF_WINDOW_INT_NC | Window sash + jamb + muntins | EA | window_type, substrate, QT, method | NEW |

Covers: sash, extension jamb, muntins/grilles (if applicable)  
Config: window_type (single-hung, double-hung, casement, fixed, slider)  
Substrate: wood, hybrid (wood interior / vinyl or clad exterior)  
Key differentiator: **glass masking** — this is what makes windows a separate spec from trim  
Excludes: window casing (→ SF_TRIM_NC_PAINT), stool (→ SF_TRIM_NC_PAINT), apron (→ SF_TRIM_NC_PAINT)

> **Doctrine:** Window_Systems_Doctrine.md covers substrate treatment, height tiers, counting  
> **PaintScope:** PaintScope_Window_Counting_System.md covers size buckets, grouping, exceptions

### Stair System

| # | Spec Family ID | Surface | UOM | Config Dimensions | Notes |
|---|----------------|---------|-----|-------------------|-------|
| 10 | SF_STAIR_RISER_NC | Risers + stringers | EA_FLIGHT or SF | stringer_type (open/closed), substrate_condition | NEW |
| 11 | SF_STAIR_RAILING_NC | Newels, balusters, handrail | EA_SYSTEM or LF | railing_type (wood/iron+wood), baluster_count_method | NEW |

Separated because:  
- Risers/stringers are flat or simple panel surfaces (similar to trim/millwork process)  
- Railing systems are high-detail, multi-component assemblies with very different production rates  
- A project might have painted risers but stained/clear railing, or vice versa  
- Different finish groups likely (white risers, stained rail)

---

**Tier 2 Total: 3 new spec families**

---

## TIER 3 — Upgrade (Custom & High-End NC)

These cover architectural features in custom homes, renovated historic properties, 
and high-end builder upgrades. Each is optional scope that gets added when present.

### Millwork Assemblies

| # | Spec Family ID | Surface | UOM | Config Dimensions | Notes |
|---|----------------|---------|-----|-------------------|-------|
| 12 | SF_WAINSCOT_PANEL_NC | Wainscot panel field | SF | panel_style (raised, flat, beadboard, board-and-batten), substrate_condition | NEW |

Panel field surfaces only — rails, stiles, and cap are LF elements handled by SF_TRIM_NC_PAINT  
with profile_type config. Finish group system handles color matching between panels and rails.

### Wood Feature Walls

| # | Spec Family ID | Surface | UOM | Config Dimensions | Notes |
|---|----------------|---------|-----|-------------------|-------|
| 13 | SF_WOOD_WALL_NC | Wood paneled wall field | SF | wall_style (shiplap, tongue-and-groove, flat panel, library panel), substrate_condition | NEW |

Distinct from drywall walls: wood substrate, fine finish doctrine applies,  
different prep (no drywall mud, yes wood filler), different production rates.  
Distinct from wainscot: full wall coverage vs. lower-wall treatment.

### Wood Feature Ceilings

| # | Spec Family ID | Surface | UOM | Config Dimensions | Notes |
|---|----------------|---------|-----|-------------------|-------|
| 14 | SF_WOOD_CEILING_NC | Wood plank/beadboard ceiling | SF | ceiling_style (plank, beadboard, coffered panels), substrate_condition | NEW |

Distinct from drywall ceiling: wood substrate, fine finish doctrine, overhead wood-specific process.  
Coffered ceiling panels (the flat field between beams) live here.  
Coffered ceiling beams → SF_ARCH_ELEMENT_NC below.

### Architectural Elements

| # | Spec Family ID | Surface | UOM | Config Dimensions | Notes |
|---|----------------|---------|-----|-------------------|-------|
| 15 | SF_ARCH_ELEMENT_NC | Beams, columns, mantels, niches | EA or SF | element_type, substrate_condition, QT | NEW |

Config: element_type (beam_wrap, column_wrap, mantel, fireplace_surround, niche, corbel)  
Each element type carries its own complexity factor and production rate within the spec.  
These are standalone architectural features — not assemblies like wainscot or cabinets.

### Built-Ins

| # | Spec Family ID | Surface | UOM | Config Dimensions | Notes |
|---|----------------|---------|-----|-------------------|-------|
| 16 | SF_BUILTIN_NC | Built-in shelving, bookcases, entertainment centers | SF (composite) | builtin_type, substrate_condition, QT, include_interior | NEW |

Items within spec:  
- ITM_BUILTIN_CARCASS (box exterior, SF)
- ITM_BUILTIN_FACE (face frame or face panels, SF)
- ITM_BUILTIN_SHELF (per shelf, SF)
- ITM_BUILTIN_TRIM (detail trim, LF)

> **Bundled intentionally.** Unlike doors where slab/frame/casing are distinct operations 
> at different times, a built-in is prepped and sprayed as a complete unit in one continuous 
> session. Atomic decomposition would create spec overhead without practical benefit.

### Cabinets (NC Paint)

| # | Spec Family ID | Surface | UOM | Config Dimensions | Notes |
|---|----------------|---------|-----|-------------------|-------|
| 17 | SF_CABINET_NC_PAINT | NC cabinet painting | SF (composite) or EA | scope (doors_only, full_exterior, full_with_interior), substrate_condition, QT | NEW |

For when the painter paints new cabinets on-site rather than factory finish.  
Items: face frame, doors, drawers, end panels, box interior (optional).  
Hardware removal/reinstall as conditional tasks.  
Different from SF_CABINET_REPAINT (future) which involves existing finish removal.

> **Note:** Many NC projects have factory-finished cabinets that painters don't touch.  
> This spec exists for jobs where on-site painting is specified.

---

**Tier 3 Total: 6 new spec families**

---

## Complete Catalog Summary

| Tier | Count | Description |
|------|-------|-------------|
| Tier 1 — Standard | 8 | Every NC interior project |
| Tier 2 — Common | 3 | Most projects include some |
| Tier 3 — Upgrade | 6 | Custom/high-end features |
| **Total** | **17** | **Complete NC interior coverage** |

### By Status

| Status | Count | Spec IDs |
|--------|-------|----------|
| ✅ Exists | 3 | SF_DRYWALL_WALL_NC_PRIME, SF_DRYWALL_WALL_NC_FINISH, SF_TRIM_NC_PAINT |
| 🔵 Designed | 2 | SF_DOOR_SLAB_INT_NC, SF_DOOR_FRAME_NC |
| 🆕 New | 12 | Everything else |
| **Total** | **17** | |

---

## How a Project Composes

### Example: Standard Production Builder (3BR/2BA, 1,800 SF)

Specs pulled:
1. SF_DRYWALL_CEILING_NC_PRIME (all ceilings)
2. SF_DRYWALL_CEILING_NC_FINISH (all ceilings, flat, QT2-3)
3. SF_DRYWALL_WALL_NC_PRIME (all walls)
4. SF_DRYWALL_WALL_NC_FINISH (all walls, eggshell, QT3)
5. SF_TRIM_NC_PAINT (baseboard + door casing + window casing, semi-gloss, QT4)
6. SF_DOOR_SLAB_INT_NC (interior doors, flush, QT3)
7. SF_DOOR_FRAME_NC (door frames, QT3)
8. SF_CLOSET_SHELF_NC (closet shelving)

Finish groups resolve edge optimization:
- Trim, door frames, closet shelves → same finish group (white, semi-gloss) → continuity optimization at shared edges
- Walls → different finish group from trim → standard masking at wall/trim edges
- Ceilings → different finish group from walls → standard cut-in at ceiling line

### Example: Custom Home (4BR/3.5BA, 4,200 SF + upgrades)

All Tier 1 specs, plus:
9. SF_WINDOW_INT_NC (wood windows throughout)
10. SF_STAIR_RISER_NC (open staircase, painted risers)
11. SF_STAIR_RAILING_NC (wood railing system)
12. SF_WAINSCOT_PANEL_NC (formal dining room)
13. SF_WOOD_WALL_NC (shiplap accent wall in master)
14. SF_BUILTIN_NC (library built-in bookcases)
15. SF_ARCH_ELEMENT_NC (decorative beams in great room, fireplace mantel)

---

## What This Doesn't Cover (Future / Out of Scope)

| Area | Why Excluded | Future Spec Family |
|------|-------------|-------------------|
| Exterior surfaces | Different doctrine, weathering, UV | SF_*_EXT_* family |
| Cabinet repaint | Strip/sand workflow, not NC | SF_CABINET_REPAINT |
| Metal surfaces | Different substrate, different coatings | SF_METAL_* family |
| Wallcovering / faux finish | Decorative, specialty | SF_DECORATIVE_* family |
| Texture application | Separate trade or pre-paint phase | SF_TEXTURE_* family |
| Garage epoxy / floor coating | Floor coatings, not wall/trim painting | SF_FLOOR_COATING_* |
| Repaint versions of all above | RP variants with condition assessment | SF_*_RP_* parallel set |

---

## Prioritized Generation Order

Based on market coverage (what % of NC projects need each spec):

### Phase 1 — Core Coverage (~95% of NC work)
1. SF_DRYWALL_CEILING_NC_PRIME ← pairs with existing wall prime
2. SF_DRYWALL_CEILING_NC_FINISH ← pairs with existing wall finish
3. SF_DOOR_SLAB_INT_NC ← designed, ready to generate
4. SF_DOOR_FRAME_NC ← designed, ready to generate
5. SF_CLOSET_SHELF_NC ← simple spec, quick to generate

### Phase 2 — Extended Coverage (~85% addressed → ~98%)
6. SF_WINDOW_INT_NC ← doctrine exists, complex due to glass masking
7. SF_STAIR_RISER_NC
8. SF_STAIR_RAILING_NC

### Phase 3 — Custom/Architectural
9. SF_WAINSCOT_PANEL_NC
10. SF_WOOD_WALL_NC
11. SF_WOOD_CEILING_NC
12. SF_ARCH_ELEMENT_NC
13. SF_BUILTIN_NC
14. SF_CABINET_NC_PAINT

---

## Doctrine Coverage

| Doctrine | Specs It Governs |
|----------|-----------------|
| Fine_Finish_Doctrine.md | #5-8, 10-17 (all fine finish surfaces) |
| Quality_Tiers_and_Surface_Condition.md | All 17 specs |
| Materials_and_Consumables_Doctrine.md | All 17 specs |
| Estimation_Modifiers_Doctrine.md | All 17 specs |
| Protection_and_Masking_Doctrine.md | All 17 specs |
| Millwork_NC_Paint_Doctrine.md | #5, 10, 12-16 (all wood surfaces) |
| Doors_Doctrine.md | #6, 7 |
| Window_Systems_Doctrine.md | #9 |
| Doctrine needed: Stairs | #10, 11 (stair-specific prep, access, sequencing) |

---

## Notes

### Trim Spec Expansion Needed
The existing SF_TRIM_NC_PAINT covers baseboard, door casing, and window casing. 
To serve as the universal linear trim spec, it needs profile_type config values added for:
- Crown molding (currently excluded → "see SF_CROWN_NC_PAINT")
- Chair rail
- Picture rail  
- Window stool
- Window apron
- Wainscot cap/rail
- Shoe mold / quarter round

This is a spec revision, not a new spec. The process is identical — only production 
rates and complexity factors differ by profile type.

### The RP Mirror Set
Every NC spec has a parallel RP (repaint) variant. The RP set adds:
- Condition assessment (existing finish evaluation)
- Prep differences (degloss, adhesion testing, patch/repair)
- Primer as condition-driven (not substrate-driven)
- Different production rates (existing surfaces are slower to prep)

The RP set is a separate catalog effort. NC first, then RP.
