---
title: "Painted Doors - Residential Research"
status: draft
researcher: NotebookLM + Claude
date_generated: 2026-01-27
sources_count: 47
requires_review: true
target_doctrine: doors_painted_residential
related_specs:
  - door_interior_flush
  - door_interior_panel
  - door_exterior_entry
  - door_specialty_french
  - door_specialty_bifold
version: 0.1.0
---

# Painted Doors - Residential
## Research Synthesis for PaintFactor Doctrine Development

> **Review Instructions**: This document was generated from NotebookLM research.
> Mark sections with (verified), (needs revision), or (reject) before
> promoting to doctrine.
>
> **PaintScope Integration Note**: Door specs consume geometry from PaintScope.
> Specs must NOT compute quantities--only reference surface types and apply
> labor/material factors.

---

## 1. Scope & Definitions

### 1.1 Door Types Covered

| Door Type | Complexity Factor | Measurement Unit | Notes |
|-----------|-------------------|------------------|-------|
| Flush (hollow core) | 1.0 | EA (2 sides) | Baseline reference; fragile, minimal sound insulation |
| Flush (solid core) | 1.0 | EA (2 sides) | Same paint complexity, heavier handling; better acoustics |
| Panel (2-panel) | 1.15 | EA (2 sides) | Detail work on panels, horizontal rails, vertical stiles |
| Panel (4-panel) | 1.25 | EA (2 sides) | |
| Panel (6-panel) | 1.35 | EA (2 sides) | Colonial style; most common residential |
| Raised panel | 1.4 | EA (2 sides) | Shadow lines, more detail work |
| French (10-lite) | 1.8 | EA (2 sides) | Glass masking/cutting in intensive |
| French (15-lite) | 2.2 | EA (2 sides) | |
| Bifold (flush) | 0.7 | EA per panel | Smaller panels, track work |
| Bifold (louvered) | 1.5 | EA per panel | Louver complexity; +10-15% labor |
| Louver/closet | 1.8 | EA (2 sides) | Spray preferred; slat surface area |
| Dutch door | 1.5 | EA (2 sides) | Two sections |
| Entry (decorative) | 1.5-2.5 | EA | Varies by detail level |

**Review Status**: [ ]

### 1.2 Measurement Conventions

| Convention | Definition | Use Case |
|------------|------------|----------|
| EA (per door) | Complete door, both sides, all edges | Standard bidding unit |
| Per side | One face only | When only one side accessible/required |
| Per face | Same as per side | Alternative terminology |
| SF | Square footage of door surface (~35 SF per standard door, both sides) | Large/unusual doors |

**Review Status**: [ ]

### 1.3 Interior vs Exterior Classification

| Attribute | Interior | Exterior |
|-----------|----------|----------|
| Coating system | Standard latex/waterborne alkyd | UV-resistant, flexible coatings |
| Prep intensity | Lower | Higher (weathering assessment) |
| Edge treatment | Standard | Critical (moisture barrier) |
| Hardware complexity | Lower | Higher (weatherstrip, threshold) |
| Quality floor | QT2 acceptable | QT3 minimum (durability requirements) |
| DFT requirement | 2.0-3.0 mils | 3.0-4.0 mils |
| Color restrictions | None | Dark colors increase thermal stress/warping risk |

**Review Status**: [ ]

---

## 2. Substrate Classification

### 2.1 Substrate Types

| Substrate | Common Applications | Key Considerations |
|-----------|--------------------|--------------------|
| Solid wood (pine, poplar) | Premium interior, entry | Grain filling, knot sealing required; dimensional instability |
| Solid wood (hardwood) | Stain-grade, high-end entry | Typically clear finish, not painted |
| MDF (molded panel) | Interior paint-grade | Edge sealing critical; homogeneous surface; no grain/knots |
| Hollow core | Budget interior | Light sanding only; fragile; honeycomb/foam core |
| Fiberglass (smooth) | Exterior entry | Adhesion primer required; waterproof; warp-resistant |
| Fiberglass (textured) | Exterior, wood-look | Can be stained or painted; realistic grain texture |
| Steel (20-24 gauge) | Exterior, fire-rated, security | Rust prevention critical; factory primed; prone to denting |
| Composite | Newer exterior options | Per manufacturer primer specs |

### 2.2 Substrate Performance Matrix

| Substrate | Dimensional Stability | Paint Receptivity | Maintenance Needs |
|-----------|----------------------|-------------------|-------------------|
| MDF (Solid) | High | Excellent (very smooth) | Low |
| Hollow Core | Moderate | Good | High (fragile) |
| Fiberglass | Exceptional | High (requires prep) | Very Low |
| Steel | High | High (requires DTM) | Moderate (rust risk) |
| Solid Wood | Low (prone to warp) | Variable (grain/tannins) | High |

**Review Status**: [ ]

### 2.3 Factory Primed Assessment

| Factory Prime Condition | Required Action |
|------------------------|-----------------|
| Intact, clean | Scuff sand 180-grit, proceed to finish (field primer recommended) |
| Damaged/scratched | Spot prime damaged areas, sand blend |
| Weathered/chalking | Full sand, full prime |
| Unknown origin | Test adhesion, bonding primer if doubtful |

> **Critical Note**: Factory primer is transit protection, not finish-ready primer.
> Always assess and typically apply field primer for quality work.

**Review Status**: [ ]

---

## 3. Surface Preparation Requirements

### 3.1 New Construction - By Substrate

| Substrate | Cleaning | Initial Sanding | Sealing | Notes |
|-----------|----------|-----------------|---------|-------|
| Solid wood | Dust removal | 150-grit | Shellac for knots; grain filler QT4+ | Grain raise risk with water-based |
| MDF | Dust removal | 120-150 edges, 220 faces | Seal all edges with shellac/oil | Edges highly porous |
| Hollow core | Dust removal | Light 180 only | Standard | No heavy pressure--core can telegraph |
| Fiberglass smooth | Degreaser/mineral spirits | Fine scuff pad | Bonding primer | Remove mold-release agents |
| Fiberglass textured | Degreaser/mineral spirits | Light scuff in grain direction | Bonding primer | Preserve texture |
| Steel | Degreaser | 120-150 grit | Rust converter if needed; alkyd primer immediately | Flash-rust prevention critical |

### 3.2 Repaint Preparation

| Existing Condition | Required Prep |
|-------------------|---------------|
| Sound paint, good adhesion | Clean with TSP/degreaser, scuff sand 150-220 grit |
| Peeling/flaking | Scrape loose, feather edges, spot prime |
| Multiple coats (buildup) | Assess for stripping or heavy sand |
| Unknown coating | Adhesion test, bonding primer if needed |
| Gloss/semi-gloss | Deglosser or thorough sand for tooth |

### 3.3 Contaminant Removal Protocol

Doors are high-touch surfaces accumulating oils, cleaning chemicals, and dust. Failure to remove contaminants causes "fisheying" or premature delamination.

**Standard Protocol:**
1. Wash with TSP solution or specialized degreaser
2. Rinse with clean water
3. Allow complete drying (TSP residue interferes with acrylic curing)

### 3.4 Preparation Grits by Substrate

| Material | Initial Sanding | Intermediate (after prime) | Final Sanding |
|----------|-----------------|---------------------------|---------------|
| New MDF | 120-150 grit | 220 grit | 320-400 grit |
| Repaint (wood) | 100-120 grit | 150 grit | 220 grit |
| Fiberglass | Fine scuff pad | N/A | N/A |
| Steel (primed) | 120-150 grit | 220 grit | N/A |

**Review Status**: [ ]

---

## 4. Primer Systems by Substrate

### 4.1 Primer Selection Matrix

| Substrate | Recommended Primer Type | Purpose | Notes |
|-----------|------------------------|---------|-------|
| Solid wood | Stain-blocking primer | Seal, block tannins/resins | Shellac for knots |
| MDF (edges) | Shellac-based or oil-based | Seal porous edges, prevent fiber raise | Water-based causes swelling |
| MDF (faces) | High-build latex after edge seal | Build film, level surface | Sand between coats |
| Hollow core | Standard latex primer | Seal, provide tooth | Light application |
| Fiberglass | Bonding primer | Adhesion to slick surface | Remove mold-release agents first |
| Steel | DTM (Direct-to-Metal) primer | Rust inhibition, adhesion | Alkyd-based preferred; apply immediately after sanding |
| Factory primed | High-build undercoat | Build adequate film thickness | Factory primers often thin |

### 4.2 Primer Functions

1. **Seal the substrate** - Prevent uneven absorption
2. **Provide tooth** - Mechanical adhesion for topcoat
3. **Block stains/tannins** - Prevent bleed-through (especially wood species)

**Review Status**: [ ]

---

## 5. Finish Coat Systems

### 5.1 Interior Door Coatings

| Coating Type | Benefits | Limitations | Recommended Use |
|--------------|----------|-------------|-----------------|
| Standard Latex | Fast dry, low odor, easy cleanup | Lower hardness, blocking issues | QT2 budget applications |
| Waterborne Alkyd | Excellent leveling, hard finish, no yellowing | Longer cure time | QT3-QT4 standard trim |
| Urethane-Modified Acrylic | Superior durability, chemical resistance | Higher cost | High-traffic, QT4+ |
| Water-Based Urethane | Hardness of oil, water cleanup | More expensive | Kitchen/bath, high-wear |

### 5.2 Exterior Door Coatings

| Requirement | Specification |
|-------------|---------------|
| UV resistance | Titanium dioxide pigmentation; UV absorbers |
| Flexibility | Accommodate substrate movement |
| Moisture barrier | Sealed edges, adequate DFT |
| Total DFT | 3.0-4.0 mils minimum |

### 5.3 Sheen Recommendations

| Sheen | Typical Use | Durability | Touch-Up | Notes |
|-------|-------------|------------|----------|-------|
| Satin | Standard interior | Good | Moderate | Most forgiving; hides imperfections |
| Semi-gloss | Traditional, kitchens/baths | Very good | Moderate | Shows surface defects; cleanable |
| Gloss | High-end, entry doors | Excellent | Difficult | Requires Level 4 prep |

### 5.4 Blocking Prevention

Traditional latex paints are often too soft for doors, causing "blocking" (door sticks to weatherstripping or frame). Use:
- Urethane-alkyd hybrids
- Water-based urethanes
- Higher resin-to-pigment ratio products

**Review Status**: [ ]

---

## 6. Quality Tier Matrix

| Attribute | QT2 (Basic) | QT3 (Standard) | QT4 (Premium) | QT5 (Fine) | QT6 (Museum) |
|-----------|-------------|----------------|---------------|------------|--------------|
| **Primer coats** | 1 (may be factory) | 1 | 1-2 | 2 | 2 |
| **Finish coats** | 1 | 2 | 2 | 2-3 | 3+ |
| **Sand between coats** | No | Light scuff if needed | Yes 220 | Yes 320 | Yes 400+ |
| **Fill grain (wood)** | No | No | Optional | Yes | Yes, multiple |
| **Orange peel tolerance** | Visible OK | Slight OK | Minimal | None | None |
| **Brush marks (if brushed)** | Visible OK | Slight OK | Minimal | None | None |
| **Leveling standard** | Basic coverage | Good | Very good | Excellent | Mirror |
| **Application method** | Brush/roll | Brush/roll or spray | Spray preferred | Spray required | Spray, controlled environment |
| **Inspection distance** | 6 ft | 39" (P1 standard) | 24" | 12" | Raking light |

### 6.1 Quality Tier Cost Impact

| Quality Tier | Relative Labor Factor vs QT3 |
|--------------|------------------------------|
| QT2 | 0.7x |
| QT3 | 1.0x (baseline) |
| QT4 | 1.4x |
| QT5 | 1.8x |
| QT6 | 2.5x+ |

**Review Status**: [ ]

---

## 7. Door Handling & Setup Methods

> **PaintFactor Domain Knowledge**: Setup method is contractor discretion based on
> project conditions--batch efficiency, ergonomics, available space, logistics.
> NOT a quality tier selection. METHOD DOES NOT CORRELATE TO QUALITY TIER.

### 7.1 Method Overview

| Method | Setup Intensity | Best For | Primary Considerations |
|--------|-----------------|----------|------------------------|
| In-Frame (On-Hinge) | Baseline | Any quantity, any color scenario | Most common; no door removal |
| Chevron Stand (Vertical) | Medium | Batch processing, doors removed | Requires removal/reinstall |
| Horizontal Handle Rack | High | Ergonomic prep, batch spray | Requires spray + drying areas |

### 7.2 In-Frame Method (On-Hinge) -- BASELINE

**When Used:**
- Any number of doors--frequently used for entire houses
- Same OR different color/finish as frames
- Spray, brush, or roll application (spray requires experienced painter)

**Color/Finish Scenarios:**

| Scenario | Application | Masking Requirement |
|----------|-------------|---------------------|
| Same color as frame | Brush/roll | Minimal |
| Same color as frame | Spray | Standard overspray protection |
| Different color than frame | Brush/roll | Minimal (cut in) |
| Different color than frame | Spray | Mask/protect door OR frame (whichever painted first) |

**Hinge Handling Options:**

| Option | Method | Time per Hinge |
|--------|--------|----------------|
| **Option A** | Mask hinges | ~5 min |
| **Option B** | Swap to dummy hinges (pre-painted sacrificial set) | ~5 min |

**Dummy Hinge System:**
- Maintain set of matching dummy hinges per common size/style
- Dummy hinges accumulate paint over time (acceptable)
- Clean hinges stored safely during painting
- Swap back after final coat cures

**Time Factors:**

| Task | Time | Notes |
|------|------|-------|
| Floor protection | Shared | Across doors in room |
| Hinge handling (mask or swap) | ~15 min/door | ~5 min x 3 hinges typical |
| Hinge swap back to clean | ~15 min/door | Option B only |

### 7.3 Chevron Stand Method (Vertical)

**When Used:**
- Contractor preference for batch processing
- Doors removed and staged vertically

**Setup Sequence:**
1. Remove door from frame (note hinge side, swing direction)
2. Remove hardware if installed--**bag and label**
3. Install buttons on door bottom (or use shims)
4. Stand doors at angles, connect with L-brackets
5. Pattern forms chevron shape when viewed from above
6. Prep, prime, paint all accessible surfaces
7. Allow dry time
8. Disconnect brackets, return to field for install

**Setup Components:**

| Item | Quantity per Door | Reusable |
|------|-------------------|----------|
| Door buttons | 2-4 | Yes |
| L-brackets | 1 per door connection | Yes |
| Screws | 2-4 per bracket | Consumable |
| Hardware bags + labels | 1 per door | Consumable |

### 7.4 Horizontal Handle Rack Method

**When Used:**
- Contractor preference for ergonomic prep (waist-level work reduces labor intensity)
- Requires adequate space for spray area AND separate drying/staging area

**Advantages:**
- Prep at waist level--less labor intensive
- Doors dry perfectly flat (no sag, no drip migration)
- Stackable during dry time (handles act as spacers)

**Disadvantages:**
- Highest setup time
- Requires significant space (work area + drying area)
- Handle install/removal adds labor

**Setup Components:**

| Item | Quantity per Door | Reusable |
|------|-------------------|----------|
| Edge handles (oversized) | 2 | Yes |
| Screws | 4-8 | Consumable |
| Sawhorses/workbench | Shared | Yes |
| Hardware bags + labels | 1 per door | Consumable |

**Review Status**: [ ]

---

## 8. Application Methods

### 8.1 Hand-Painting: Brush and Roller Technique

In occupied residential settings, brushing and rolling remain the most practical methods.

**Panel Door Sequence (PCA recommended):**
1. **Panels first**: Cut in edges with brush, fill flat areas with small roller
2. **Horizontal rails**: Tie in brush marks to panels
3. **Vertical stiles**: Continuous vertical pattern
4. **Edges**: Edge visible when door open matches adjacent face

**Coat Requirements:** Two coats high-quality semi-gloss or satin enamel for full hiding and durability.

### 8.2 Spray Application: Factory-Grade Finishes

Preferred for new construction or high-end renovations requiring "level 5" finish.

| Spray Type | Use Case | Overspray | Control |
|------------|----------|-----------|---------|
| HVLP | Interior doors, fine finish | Lower | Higher |
| Airless | High-volume production, new construction | Higher | Lower |

**Primary Advantage:** Absence of brush/roller marks; perfectly smooth, uniform film.

**Primary Challenge:** Masking time often offsets application speed. One day of spraying may involve 6 hours masking and 1 hour painting.

### 8.3 Total Cycle Time Comparison

| Application Factor | Hand-Painting (In Situ) | Spray Painting (Off-Site/Area) |
|-------------------|------------------------|--------------------------------|
| Masking/Setup | 10-20 mins per door | 60-90 mins per area |
| Application (2 coats) | 40-60 mins per door | 15-20 mins per door |
| Drying/Flip Time | 4-6 hours | 1-2 hours (with fans) |
| Cleanup | 10 mins | 30-45 mins |
| **Best For** | Occupied homes; 1-3 doors | New construction; 10+ doors |

**Review Status**: [ ]

---

## 9. Productivity Benchmarks

### 9.1 Industry Benchmarks (Resene/PCA)

| Task Description | Man-Hours (mhr) | Source |
|-----------------|-----------------|--------|
| Flush door (interior, new, 2 coats) | 3.60 | Resene Table |
| Flush door (interior, repaint, 2 coats) | 2.90 | Resene Table |
| Flush door (interior, sprayed) | 3.00 | Resene Table |
| 6-Panel door (brush/roll, 1 side) | 0.50-0.75 | Field Average |
| Exterior entry door (both sides) | 1.00-3.00 | Industry Average |
| Fire door (high complexity) | 4.90 | Resene Table |
| Bi-fold doors (paired) | 3.60 | Resene Table |

### 9.2 Complexity Modifiers

| Factor | Modifier | Description |
|--------|----------|-------------|
| Louvered door | +10-15% | Slat surface area, recessed edges |
| Overheight (>7 ft) | +18-25% | Ladder use, physical fatigue |
| French door (glazed) | +80-120% | Glass masking intensive |
| Panel door vs flush | +15-35% | Detail work per panel count |

### 9.3 Quality Tier Adjustment Factors

| Quality Tier | Productivity Factor vs QT3 |
|--------------|---------------------------|
| QT2 | 0.7x (faster) |
| QT3 | 1.0x (baseline) |
| QT4 | 1.4x |
| QT5 | 1.8x |
| QT6 | 2.5x+ |

### 9.4 Estimating Formula

```
Total Cost = ((Quantity x Production Rate) x Hourly Rate) + Material Costs
```

**Example:** 15 interior 6-panel doors, repaint, QT3
- Production rate: 3.2 hrs/door (including frame and prep)
- Hourly rate: $75/hr
- Materials: $300

```
15 x 3.2 = 48 man-hours
48 x $75 = $3,600 labor
$3,600 + $300 = $3,900 total bid
```

**Review Status**: [ ]

---

## 10. Hardware & Hinge Handling

### 10.1 Hinge Time Reference

| Hinge Count | Mask or Swap Time |
|-------------|-------------------|
| 2 hinges | ~10 min |
| 3 hinges (standard) | ~15 min |
| 4 hinges | ~20 min |
| 5+ hinges (heavy/tall doors) | ~5 min per hinge |

### 10.2 Hardware Handling (Removal Methods)

| Task | Time | Notes |
|------|------|-------|
| Hardware removal | 5-10 min | Lockset, strike plate |
| Bag and label | ~2 min | Per door |
| Hardware reinstall | 10-15 min | Alignment, adjustment |

### 10.3 Edges and Edge Painting Rule

Professional practice: Edge visible when door is open should match adjacent face.

| Door Position | Hinge-Side Edge | Lock-Side Edge |
|--------------|-----------------|----------------|
| Opens into room | Match hallway side | Match room side |
| Opens out of room | Match room side | Match hallway side |

**Review Status**: [ ]

---

## 11. Common Defects & Mitigation

| Defect | Cause | Prevention | Remediation |
|--------|-------|------------|-------------|
| Runs/sags | Over-application, vertical surfaces | Proper mil thickness, multiple light coats | Sand flat, recoat |
| Orange peel | Wrong tip/pressure, too far, material viscosity | Adjust equipment, proper distance, self-leveling enamel | Sand 320+, recoat |
| Brush marks | Wrong brush, poor technique, non-leveling paint | Quality brush, proper loading, lay-off strokes, self-leveling enamel | Sand, spray or re-brush |
| Edge failures | Poor edge sealing (MDF) | Seal edges before prime with shellac/oil | Strip, seal, reprime |
| Grain telegraph | Insufficient fill on wood | Multiple fill/sand cycles | Sand back, fill, recoat |
| Adhesion failure | Inadequate prep, contamination, wrong primer | Proper prep, degreasing, adhesion primer | Strip, start over |
| Lap marks | Working dried edges | Maintain wet edge | Sand, recoat |
| Blocking | Soft coating, inadequate cure | Use urethane-alkyd, allow full cure | Recoat with harder enamel |
| Surfactant leaching | Low temp, high humidity during cure | Apply in proper conditions (50-85F, <85% RH) | Wash off, allow full cure |
| Fisheying | Contamination (silicone, oils) | Thorough cleaning, TSP wash | Strip, clean, start over |
| Resin bleed | Heat drawing out wood resins | Shellac-based primer, avoid direct sun | Spot prime with shellac, recoat |

### 11.1 Environmental Application Windows

| Condition | Minimum | Maximum | Notes |
|-----------|---------|---------|-------|
| Temperature | 50F (10C) | 90F (32C) | Water-based coatings |
| Humidity | 20% RH | 85% RH | Affects cure time |
| Direct sunlight | Avoid | Avoid | Causes rapid dry, poor leveling |

**Review Status**: [ ]

---

## 12. Source Citations

| # | Source | Key Data Points |
|---|--------|-----------------|
| 1 | Manhattan Door - MDF Guide | MDF characteristics, edge sealing |
| 2-3 | Cofer Brothers, Badger Door | Solid vs hollow core comparison |
| 4-6 | Therma-Tru, Houzz, CDF Distributors | Fiberglass and steel door finishing |
| 7-14 | PCA Industry Standards | P1, P5, P23 standards; quality definitions |
| 15-24 | Benjamin Moore, Bob Vila, Mastercraft | Surface prep protocols, application techniques |
| 25-27 | Chris Loves Julia, My Three Sons, JMA | Hand-painting vs spray comparison |
| 28-30 | Express Doors, DIY Playbook, Canglow | Panel door technique, coating systems |
| 31 | Resene Productivity Tables | Production rate benchmarks |
| 32-36 | PCA Cost & Estimating Guide | Estimating methodology, labor metrics |
| 37-43 | Reddit, Angi, Field Sources | Real-world productivity validation |
| 44-47 | Fixr, CountBricks, Houzz | Cost data, replacement economics |

> **Full source list**: See NotebookLM notebook "PF Painted Doors - Residential Research"
> Notebook ID: d71f64be-ded4-4bc8-9cd4-7634f0149255

**Review Status**: [ ]

---

## Review Summary

| Section | Status | Reviewer Notes |
|---------|--------|----------------|
| 1. Scope & Definitions | [ ] | |
| 2. Substrate Classification | [ ] | |
| 3. Surface Preparation | [ ] | |
| 4. Primer Systems | [ ] | |
| 5. Finish Coat Systems | [ ] | |
| 6. Quality Tier Matrix | [ ] | |
| 7. Door Handling & Setup | [ ] | |
| 8. Application Methods | [ ] | |
| 9. Productivity Benchmarks | [ ] | |
| 10. Hardware & Hinge Handling | [ ] | |
| 11. Common Defects | [ ] | |
| 12. Source Citations | [ ] | |

---

## Data Gaps Identified

- [ ] Specific door removal/reinstall time per setup method (chevron, horizontal)
- [ ] Detailed bifold track painting considerations
- [ ] Louver door spray technique specifics
- [ ] Multi-color door scenarios (different color per side) productivity impact
- [ ] Sidelite and transom integration with entry door specs
- [ ] Garage entry door (fire-rated) specific requirements

## Cross-Reference Requirements

- [ ] Validate QT tier definitions align with existing PaintFactor tiers
- [ ] Confirm production rates align with `PaintFactor_Production_Rate_Reference.md`
- [ ] Verify complexity modifiers match existing height/profile modifiers
- [ ] Map door types to PaintScope quantity keys (PS_SURFACE_EA.DOOR_*, etc.)

## Ready for Doctrine Promotion

- [ ] All sections verified
- [ ] Corrections applied
- [ ] Productivity rates validated against Resene benchmarks
- [ ] Quality tier definitions align with existing PaintFactor doctrine
- [ ] PaintScope quantity keys identified

---
*Generated by NotebookLM Research Agent | PaintFactor Dev OS*
