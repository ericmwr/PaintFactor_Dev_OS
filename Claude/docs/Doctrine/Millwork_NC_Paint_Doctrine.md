# Painted Millwork — New Construction

**Spec Family ID:** SF_MILLWORK_NC_PAINT  
**Status:** CANONICAL  
**Version:** 1.0.0  
**Effective Date:** 2026-01-27  
**Source:** NotebookLM Research (44 sources) + PaintFactor Production Rate Reference  

This doctrine defines substrate classification, preparation requirements, primer systems, finish coat systems, quality tier behavior, and production benchmarks for painting millwork in new construction.

---

## 1. Scope & Definitions

### 1.1 Millwork Types Covered

| Component | UOM | PaintScope Key | Notes |
|-----------|-----|----------------|-------|
| Baseboards | LF | `PS_SURFACE_LF.TRIM_BASEBOARD` | Height: 3.5"-5.5" |
| Door casings | LF | `PS_SURFACE_LF.TRIM_CASING_DOOR` | Width: 2.25"-3.5" |
| Window casings | LF | `PS_SURFACE_LF.TRIM_CASING_WINDOW` | Per opening or LF |
| Crown molding | LF | `PS_SURFACE_LF.TRIM_CROWN` | Width: 4.25"-7.0" |
| Chair rail | LF | `PS_SURFACE_LF.TRIM_CHAIR_RAIL` | Standard profile |
| Wainscoting | SF | `PS_SURFACE_SF.WAINSCOTING` | Panel vs beadboard |
| Built-ins | SF+LF | `PS_SURFACE_SF.BUILTIN` | Hybrid measurement |

### 1.2 Excluded (Separate Spec Families)

| Component | Reason | Target Spec Family |
|-----------|--------|-------------------|
| Interior doors | Different workflow, EA-based | `SF_DOOR_NC_PAINT` |
| Windows | Glass masking complexity | `SF_WINDOW_NC_PAINT` |
| Cabinets | Specialized prep workflow | `SF_CABINET_REPAINT` |
| Exterior millwork | Weathering differences | `SF_MILLWORK_EXT_*` |

### 1.3 LF to SF Conversion

**Formula:** SF = LF × (Width in Inches ÷ 12)

> **Note:** Per PDCA standard, each LF of trim is counted as 1 SF regardless of actual width. For example, 1 LF of 0.6" base molding is still counted as 1 SF for estimation purposes.

| Trim Element | Typical Width | SF per 100 LF |
|--------------|---------------|---------------|
| Baseboard | 3.5" - 5.5" | 29 - 46 SF |
| Casing | 2.25" - 3.5" | 18 - 29 SF |
| Crown Molding | 4.25" - 7.0" | 35 - 58 SF |

---

## 2. Substrate Classification

### 2.1 MDF (Medium Density Fiberboard)

**Composition:** Sawdust, wood chips, and resin compressed under high pressure

- Uniform surface, no grain pattern or knots
- High face strength, stable dimensionally
- Edges require solvent-based sealer (prevents fiber raise)
- Highly susceptible to moisture if paint film breached

### 2.2 Finger-Joint Pine (FJP)

**Composition:** Defect-free pine pieces joined with interlocking finger joints

- Visible grain and joints
- Superior nail-holding vs MDF
- Requires stain-blocking primer (resin bleed potential)
- Joint telegraphing possible over time

### 2.3 Factory-Primed vs Field-Primed

| Condition | Additional Prep | Primer Required |
|-----------|-----------------|-----------------|
| Factory primed (intact) | Light sand, inspect | Often yes - factory primer thin |
| Factory primed (damaged) | Spot prime bare areas | Yes - full coat |
| Unprimed | Full prep per substrate | Yes - seal + build |

---

## 3. Surface Preparation

### 3.1 Preparation Matrix

| Substrate | Sanding | Filling | Caulking | Priming |
|-----------|---------|---------|----------|---------|
| MDF | 120 edges, 220 faces | Nail holes, defects | All joints | Solvent seal + latex build |
| FJP | 150-180 grit | Holes, joint voids | All joints | Stain-blocking |
| Solid wood | 150-180 grit | Nail holes, defects | All joints | Standard primer |
| Composite | Per mfr spec | Minimal | Joints only | Bonding primer if req |

### 3.2 PDCA P14: Levels of Surface Preparation

| Level | Description | Defect Threshold | PF QT Mapping |
|-------|-------------|------------------|---------------|
| Level 1 | Basic | Major defects only | QT2 |
| Level 2 | Standard | Visible defects | QT3 |
| Level 3 | Premium | Minor defects | QT4 |
| Level 4 | Supreme | Any defect > 1/32" | QT5 |

> **Note:** Level 4 required for semi-gloss and gloss finishes — these sheens reveal substrate imperfections.

---

## 4. Primer Systems

### 4.1 Primer Selection Matrix

| Substrate | Primer Type | Purpose |
|-----------|-------------|---------|
| MDF (edges) | Solvent-based sealer | Seal edges, prevent fiber raise |
| MDF (faces) | High-build latex | Build film, level surface |
| FJP | Stain-blocking primer | Block resin bleed |
| Solid wood | Standard primer-sealer | Seal, tooth, block stains |
| Factory primed | High-build undercoat | Build film thickness |

### 4.2 Primer Functions

- Seal the substrate — prevent uneven absorption
- Provide tooth — mechanical adhesion for topcoat
- Block stains/tannins — prevent bleed-through

---

## 5. Finish Coat Systems

### 5.1 Product Categories

| Coating Type | Benefits | Limitations | Recommended Use |
|--------------|----------|-------------|-----------------|
| Acrylic Latex | Fast dry, low odor | Lower hardness, fair leveling | QT2-QT3 |
| Waterborne Alkyd | Alkyd-like flow, latex cleanup | Longer dry, technique sensitive | QT4 |
| Waterborne Urethane | Self-leveling, durable | Premium cost | QT4-QT5 |
| Conversion Varnish | Max hardness | 2-part, spray required | QT5-QT6 |

### 5.2 Material System by Quality Tier

| Quality Tier | System ID | Finish Type |
|--------------|-----------|-------------|
| QT2-QT3 | `SYS_FF_STANDARD_ACRYLIC` | 100% Acrylic enamel |
| QT4 | `SYS_FF_MODIFIED_URETHANE` | Waterborne alkyd |
| QT5 | `SYS_FF_PREMIUM` | Premium urethane |
| QT5-QT6 | `SYS_FF_GALLERY` | Gallery/lacquer system |

### 5.3 Sheen Selection

| Sheen | Minimum QT | Rationale |
|-------|------------|-----------|
| Satin | QT3 | Hides minor imperfections |
| Semi-gloss | QT4 | Reveals more; requires better workmanship |
| Gloss | QT5 only | Magnifies every imperfection |

---

## 6. Quality Tier Matrix

### 6.1 PaintFactor Quality Tier Definitions

| Attribute | QT2 | QT3 | QT4 | QT5 | QT6 |
|-----------|-----|-----|-----|-----|-----|
| Prep - Sanding | Rough spots | Light full | 180-220 | 220-320 | 320-400 |
| Prep - Filling | Major defects | Visible | > 1/16" | > 1/32" | All |
| Primer Coats | 1 (factory OK) | 1 full | 1+1 build | 1+2 build | 2+2 build |
| Finish Coats | 1 | 2 | 2 | 2-3 | 3-4 |
| Sand Between | None | If needed | Yes, 220 | Yes, 320 | Yes, 400 |
| Application | Brush/roll or spray | Any | Spray pref | Spray req | HVLP req |
| Inspection Dist | 6 ft | 39" (P1) | 24" | 12" + light | 6" + light |

### 6.2 QT6 Showroom/Museum Grade

QT6 represents work that exceeds standard trade practice:

- Pre-spray inspection with angled light source
- Fill/sand/spot-coat cycle until defect-free
- Controlled environment (dust-free, humidity controlled)
- Gloved handling of finished surfaces
- Lacquer or conversion varnish systems typical

> **Note:** QT6 is economically unstable for most residential. Labor can be 3-4× QT5. Reserve for true showroom applications.

---

## 7. Productivity Benchmarks

### 7.1 Trim Production Rates

Cross-referenced with `PaintFactor_Production_Rate_Reference.md` v1.0

| Task | UOM | QT3 | QT4 | QT5 |
|------|-----|-----|-----|-----|
| Wipe/dust surfaces | LF/hr | 300 | 300 | 300 |
| Fill fastener holes | LF/hr | 120 | 100 | 80 |
| Caulk joints | LF/hr | 200 | 160 | 120 |
| Sand prep | LF/hr | 200 | 150 | 100 |
| Brush finish coat | LF/hr | 80 | 65 | 50 |
| Spray finish coat | LF/hr | 200 | 160 | 120 |
| Sand between coats | LF/hr | 400 | 250 | 150 |
| Final inspection | LF/hr | 1000 | 600 | 300 |
| Touch-up | LF/hr | 600 | 400 | 250 |

### 7.2 Complexity Modifiers

| Factor | Modifier | Description |
|--------|----------|-------------|
| Simple profile | 0.85× | Flat, square-edge trim |
| Standard profile | 1.0× | Typical ogee, cove |
| Complex profile | 1.25× | Multi-piece, built-up crown |
| Ornate profile | 1.40× | Dentil, egg-and-dart |
| Height 8-9' | 1.0× | Standard ladder work |
| Height 9-12' | 1.15× | Step ladder required |
| Height 12'+ | 1.25× | Extension ladder/scaffold |

---

## 8. Common Defects & Mitigation

| Defect | Cause | Prevention | QT Impact |
|--------|-------|------------|-----------|
| Grain raise | Water-based on raw wood/MDF | Solvent seal coat first | All - prevent |
| Telegraphing | FJP joint movement | High-build primer, multiple coats | QT4+ unacceptable |
| Orange peel | Spray technique/viscosity | Proper atomization | QT3 OK, QT4+ no |
| Brush marks | Manual application | Self-leveling enamel, technique | QT2-3 OK, QT4+ spray |
| Sags/runs | Over-application | Proper mil thickness | All - defect |
| Flash | Uneven absorption | Full seal coat, uniform build | QT3+ unacceptable |

---

## 9. PDCA Standards Reference

PDCA (Painting and Decorating Contractors of America) was formerly known as PCA. Standards retain "P" prefix from original nomenclature.

| Standard | Title | Application |
|----------|-------|-------------|
| P1 | Properly Painted Surface | Acceptance criteria — 39" rule |
| P5 | Benchmark Samples | Quality reference samples |
| P7 | Order of Work | Trade coordination sequence |
| P11 | Painter's Caulk | Application requirements |
| P14 | Surface Preparation Levels | Prep intensity definitions |
| P18 | Extra Work | Scope change documentation |
| P24 | Spot Repairs | Touch-up expectations |

### 9.1 PDCA P1 — The 39-Inch Rule

A surface is properly painted when uniform in appearance, free of defects when viewed:

- Without magnification
- At distance of 39 inches (1 meter) or more
- Under finished lighting conditions
- From normal viewing position

> **Note:** P1 applies at QT3. Higher tiers use closer inspection distances.

---

## 10. Cross-References

### 10.1 Related Doctrine Documents

- `Fine_Finish_Doctrine.md` v1.1 — Workflow patterns, interstage process, material systems
- `Quality_Tiers_and_Surface_Condition.md` v1.1 — QT definitions, condition classes
- `Estimation_Modifiers_Doctrine.md` v1.1 — Modifier stacking rules
- `Materials_and_Consumables_Doctrine.md` v1.1 — Consumable usage patterns

### 10.2 Industry Standards

- PDCA P1 — Properly Painted Surface
- PDCA P5 — Benchmark Samples
- PDCA P14 — Surface Preparation Levels

### 10.3 Extracted Reference Files

- `millwork_pricing_reference.md` — Pricing data
- `millwork_material_coverage_reference.md` — Coverage rates

---

## 11. Change Log

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-01-27 | SpecFactory | Initial canonical release. PDCA trim measurement standard clarified in Section 1.3. |
