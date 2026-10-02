# Exterior Trim Systems Doctrine

> **Topic 11** — NC Priority
> Sources: NotebookLM deep research (70+ web sources), imported references
> Generated: 2026-03-07

---

## 1. Trim Substrate Types and Profiles

### Substrate Materials

| Material | Key Properties | Paint Required? | Recoat Interval |
|----------|---------------|----------------|-----------------|
| **Traditional Wood** | Porous, hygroscopic, workable | Yes (rot prevention) | 3-7 years |
| **Cellular PVC** (AZEK, VERSATEX) | Impervious to moisture/rot/insects; high thermal expansion | Recommended (seals edges, prevents dirt) | As needed |
| **Engineered Wood** (LP SmartSide) | Wood strands + zinc borate + resins; superior dimensional stability | Yes (mandatory edge sealing) | Per warranty |

### Key Trim Profiles

| Profile | Function | Location |
|---------|----------|----------|
| **Fascia** | Horizontal trim unifying eaves; gutter mounting surface | Eave line |
| **Soffit** | Horizontal underside enclosure; attic ventilation + pest exclusion | Under eaves |
| **Frieze** | Horizontal transition where siding meets eave/soffit | Siding-to-eave junction |
| **Rake** | Inclined boards protecting exposed roof decking | Gable ends |
| **Casings/Surrounds** | Vertical frames around windows and doors | Opening perimeters |
| **Corner Boards** | Wall intersection management; siding termination | Building corners |

---

## 2. Surface Preparation by Condition

### General Cleaning
- Pressure wash fascia, soffits, and siding to remove dirt, mildew, chalky residue
- Allow 24-48 hours drying before coating

### Paint Failure Mitigation
- Scrape flaking/peeling paint
- "Feather-edge" sand to minimize profile difference between substrate and intact paint layers

### Substrate-Specific Prep

| Substrate | Prep Protocol |
|-----------|---------------|
| **Cellular PVC** | If glossy: scuff-sand with 220-grit. Wipe cut edges with acetone or denatured alcohol to seal open cells and remove static charge |
| **Engineered Wood** | Seal every field-cut edge with primer + 100% acrylic latex paint (warranty requirement) |
| **Wood** | Prime to seal tannins and ensure topcoat adhesion |

---

## 3. Primer and Coating Systems for Trim

### Coating Formulation
- **Standard**: 100% acrylic latex or acrylic latex blends with urethane
- Superior UV resistance and flexibility for thermal movement (PVC) and moisture movement (wood)
- Brittle coatings (lacquers, inflexible oil-based enamels) prone to alligator cracking — not recommended

### LRV Constraints for Cellular PVC

| Color Range | LRV | Coating Requirement |
|------------|-----|-------------------|
| Light colors | 55+ | Standard acrylic latex acceptable |
| Dark colors | < 55 | **Solar-reflective coatings required** (e.g., VinylSafe, Colors for Vinyl) |

Dark standard paints on PVC cause excessive heat absorption → warping, buckling, voided warranties.

### Sheen Selection
- Satin, semi-gloss, or high-gloss recommended for trim
- Durable, dirt/stain-resistant, accentuates architectural details

---

## 4. Production Rates for Trim Painting

### Base Rates

| Method | Rate | Notes |
|--------|------|-------|
| Brush and roll | 40 LF/hr | Exterior trim average |
| Spray (including masking) | 200 SF/hr | Production spraying |

### Cost Benchmarks

| Component | Cost Range (per LF) |
|-----------|-------------------|
| Fascia, eaves, soffits | $2-$10 |
| Standard exterior trim | $1.50-$4.00 |

### Complexity Multiplier
- Built-up trim profiles (stacked crown systems): **+30% to +60%** labor increase

### Height/Accessibility Multipliers

| Elevation | Labor Multiplier |
|-----------|-----------------|
| Above 8 ft (2nd story) | 1.30 (+30%) |
| Above 13 ft | 1.60 (+60%) |
| Above 17 ft (3rd story) | 1.90 (+90%) |
| Above 19 ft | 2.20 (+120%) |

---

## 5. Failure Modes Specific to Exterior Trim

| Failure Mode | Substrate | Cause |
|-------------|-----------|-------|
| **Rot/Decay** | Wood | High porosity + moisture cycling; improper caulking traps water; miter joints open across grain |
| **Thermal Distortion** | PVC | Extreme temperature swings or low-LRV dark paint without solar-reflective technology |
| **Edge Swelling** | Engineered Wood | Failure to prime/paint field-machined or cut edges before installation |
| **Adhesion Failure** | All | Painting over dirty/chalky surfaces; failing to scuff-sand glossy PVC; non-flexible coatings |

---

## 6. Joint and Transition Detailing

### "Think Like a Water Drop" Caulking Protocol
**Seal**: Corner joints, trim-to-siding gaps, door casing joints, wood window perimeters

**NEVER Caulk**:
- Window weep holes
- Bottom overlap of siding boards
- Metal-to-wood flashing transitions
- Bottoms of overlapping trim boards

### Sealant Compatibility

| Substrate | Recommended Sealant | Prohibited |
|-----------|---------------------|-----------|
| Cellular PVC | Solvent-based polymer (NPC Solar Seal #900, OSI Quad) or polyurethane | **Never silicone** — lacks compatibility, will fail |
| Wood | Same solvent-based or polyurethane | — |

### Joint Construction
- **Butt joints** preferred over miter joints for exterior casings (shed water effectively)
- Long PVC runs: shiplap joints + proper adhesives superior to scarf joints

---

## 7. Quality Standards for Trim Finish

### PCA P10 One-Foot Rule
- Trim with girth < 12 inches: quantify as **1 SF per LF** (compensates for detailed work difficulty)

### Material Waste
- Standard waste calculation for trim: **+15%**

### Sequencing (Top-Down)
1. Fascia, soffits, eaves
2. Siding/stucco walls
3. Trim accents, doors, casings

Trim should be painted before installation on new builds to prevent wall bleed.

### Spot Repair Acceptance (PCA P24)
- Color, gloss, texture must be "reasonable match"
- Viewed perpendicular to repair, no magnification, minimum 39 inches under finished lighting

---

## PaintFactor Integration Notes

### Decision Logic

| Condition | Action |
|-----------|--------|
| Substrate = Cellular PVC AND Color LRV < 55 | **Alert**: Solar-reflective coating required — standard paint voids warranty |
| Substrate = Engineered Wood (LP SmartSide) | Auto-add task: prime and seal all field-cut edges with 100% acrylic latex |
| Operation = Sealant AND Substrate = PVC | **Alert**: Use solvent-based or polyurethane sealant — DO NOT use silicone |

### Modifier Keys

| Modifier | Value | Application |
|----------|-------|-------------|
| `MOD_TRIM_HEIGHT_8FT` | 1.30 | Elevation > 8 ft |
| `MOD_TRIM_HEIGHT_13FT` | 1.60 | Elevation > 13 ft |
| `MOD_TRIM_HEIGHT_17FT` | 1.90 | Elevation > 17 ft |
| `MOD_TRIM_HEIGHT_19FT` | 2.20 | Elevation > 19 ft |
| `MOD_TRIM_COMPLEXITY` | 1.30-1.60 | Built-up/complex profiles |
| `MOD_TRIM_WASTE` | 1.15 | Standard material waste factor |

### Measurement Rules
- Trim width < 12": `SF = Linear_Footage x 1` (PCA P10)
- Window deduction: `Window_Count x 15 SF` from total wall area
- Door deduction: `Door_Count x 20 SF` from total wall area

### Production Rate Keys
- `RATE_BRUSH_TRIM` = 40 LF/hr
- `RATE_SPRAY_TRIM` = 200 SF/hr (including masking)
