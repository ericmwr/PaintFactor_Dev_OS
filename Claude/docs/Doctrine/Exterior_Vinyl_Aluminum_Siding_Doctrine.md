# Exterior Vinyl & Aluminum Siding Doctrine

> **Topic 8** — Later Tier
> Sources: NotebookLM deep research (103 web sources), imported references
> Generated: 2026-03-07

---

## 1. Vinyl Siding — Material Properties

Vinyl siding is a PVC thermoplastic installed as a "floating" system — panels are loosely nailed to allow thermal movement of up to 5/8" per 12-ft panel. The heat deflection temperature of standard PVC siding is approximately 165 degrees F.

### Binder Restrictions
- Only 100% acrylic latex binders are acceptable for vinyl siding
- Alkyd, oil-based, and hybrid formulations are prohibited — they lack the flexibility to accommodate the dimensional movement of PVC panels and will crack or delaminate within 12-24 months

### LRV Restrictions and IR-Reflective Pigments
- Vinyl siding must be painted with colors at LRV 55 or higher to prevent thermal warping and buckling
- Dark colors add 20-50 degrees F to surface temperature under direct sun, which can exceed the heat deflection threshold
- IR-reflective pigment technologies (e.g., VinylSafe, Colors for Vinyl) allow darker tones by reflecting near-infrared radiation
- These specialty pigments permit colors down to approximately LRV 35-40 without exceeding thermal limits

### Warranty Implications
- Painting vinyl siding voids the manufacturer's finish warranty
- CertainTeed, Mastic, and Westlake Royal explicitly void coverage for unauthorized alterations or thermal distortion caused by dark paint
- Contractors typically provide a 5-10 year workmanship warranty in lieu of manufacturer coverage
- A proper repaint extends siding service life by 7-15 years

---

## 2. Aluminum Siding — Material Properties

Aluminum siding forms an Al2O3 oxide film on exposure to atmosphere. This oxide layer is chemically stable and prevents adhesion of standard coatings. Successful coating requires deoxidation and etching of the surface.

### Prep Protocol
1. Pressure wash with alkaline cleaner — absolute removal of chalking is required (failure to remove chalk results in peeling within 12-24 months)
2. Scuff with synthetic steel wool or 180-320 grit abrasive pads to break the oxide layer
3. Apply self-etching primer (phosphoric acid + zinc chromate) at 0.5-1.0 mils DFT only — excessive thickness causes cohesive failure within the primer film
4. For marine or harsh coastal environments, add an epoxy primer intermediate layer between the etch primer and topcoat

### Cleaning — Chalking Removal
- Pressure wash in a downward direction using TSP or dedicated siding cleaner
- Chalking must be completely removed — any residual chalk powder acts as a bond-breaker between the existing surface and the new coating system

---

## 3. Adhesion Primers

### Vinyl Substrates
- High-solids adhesion primers (e.g., Insl-X STIX, Benjamin Moore Fresh Start) are required for vinyl
- These formulations "bite" into the PVC surface through solvent attack, creating a chemical bond rather than relying solely on mechanical adhesion

### Aluminum Substrates
- Self-etching primers containing phosphoric acid and zinc are the standard for aluminum
- The acid component etches the oxide layer while the zinc provides galvanic corrosion resistance
- DFT must be held to 0.5-1.0 mils — thicker films fail cohesively

---

## 4. Surface Preparation Standards

- PCA P14 governs surface preparation levels for exterior siding
- Level 2 (Standard) is the baseline for exterior siding repaints — washing, scraping of loose material, and light sanding

---

## 5. Production Rates

| Task | Rate (SF/hr) | Notes |
|------|-------------|-------|
| Pressure washing | 500-1000 | Downward spray pattern, alkaline cleaner |
| Masking / prep | 150-250 | Windows, trim, landscaping |
| Priming (spray) | 350-450 | Adhesion primer, single coat |
| Painting (spray) | 400-500 | 100% acrylic latex, single coat |
| Brush / roller detail | 125-175 | Cut-in, touch-up, J-channels |

### Multi-Story Modifier
- Multi-story access adds +50% labor to all tasks due to ladder setup, repositioning, and reduced production at height

### Multi-Coat Time Distribution (50-30-20 Rule)

| Coat | % of Total Labor | Rationale |
|------|-----------------|-----------|
| 1st coat | 50% | Full prep, first pass, learning the surface |
| 2nd coat | 30% | Familiar surface, better coverage |
| 3rd coat | 20% | Smooth surface, minimal touch-up |

---

## 6. Failure Modes

| Failure Mode | Cause | Prevention |
|-------------|-------|-----------|
| **Thermal warping** | LRV < 55 on vinyl without IR-reflective pigments | LRV restriction; VinylSafe colors |
| **Chalk-induced peeling** | Residual chalk on aluminum not fully removed | Complete chalk removal + adhesion verification |
| **Cohesive primer failure** | Self-etching primer applied too thick (>1.0 mil) | DFT verification at 0.5-1.0 mils |
| **Delamination** | Oil/alkyd binder on vinyl — insufficient flexibility | Lock binder to 100% acrylic latex only |
| **Buckling** | Dark paint on south/west exposure vinyl | IR-reflective coating + LRV check |

---

## PaintFactor Integration Notes

### Modifier Keys
- `SIDING_SUBSTRATE`: [Vinyl, Aluminum]
- `LRV_CLASS`: [Standard_55+, IR_Reflective_35-55]
- `CHALK_SEVERITY`: [None, Light, Heavy]
- `STORY_HEIGHT`: [Single, Multi]

### Decision Logic

| Condition | Action |
|-----------|--------|
| Substrate = Vinyl | Lock binder = 100% acrylic latex; require adhesion primer (STIX class) |
| Substrate = Vinyl AND LRV < 55 AND NOT IR-reflective | **Hard Stop**: Thermal distortion risk — reject color selection |
| Substrate = Vinyl AND LRV < 55 AND IR-reflective | Allow — IR-reflective pigment technology approved |
| Substrate = Aluminum | Require self-etching primer at 0.5-1.0 mil DFT; require chalk removal verification |
| Substrate = Aluminum AND Environment = Coastal | Add epoxy primer intermediate layer |
| Story > 1 | Apply 1.5x labor multiplier to all tasks |

### Production Rate Keys
- `RATE_SIDING_WASH` = 500-1000 SF/hr
- `RATE_SIDING_MASK` = 150-250 SF/hr
- `RATE_SIDING_PRIME_SPRAY` = 350-450 SF/hr
- `RATE_SIDING_PAINT_SPRAY` = 400-500 SF/hr
- `RATE_SIDING_DETAIL_BRUSH` = 125-175 SF/hr
