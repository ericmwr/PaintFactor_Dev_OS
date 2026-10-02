# Exterior Engineered Wood & Fiber Cement Siding Doctrine

> **Topic 7** — NC Priority
> Sources: NotebookLM deep research (70+ web sources), imported references
> Generated: 2026-03-07

---

## 1. Substrate Types and Characteristics

### Fiber Cement (James Hardie)
- **Composition**: Portland cement, silica (ground sand), sustainable cellulose fibers
- **Manufacturing**: Cured under high-pressure steam in autoclave
- **Properties**: Dense (~2.3 lbs/SF), non-combustible (ASTM E136), classified ASTM C1186 Grade II Type A
- **Alkalinity**: Cementitious matrix can reach pH 13.0 — critical for coating compatibility
- Highly dimensionally stable, impervious to rot and termites, but brittle
- **HardieZone system**: Regionalized substrates (e.g., HZ5 for freeze-thaw zones)

### Engineered Wood (LP SmartSide)
- **Composition**: Wood strands/fibers treated with SmartGuard process (zinc borate for termite/fungal resistance) + exterior-grade resins and waxes
- **Properties**: Lighter (~1.5 lbs/SF), impact-resistant, higher flexural strength than fiber cement
- Combustible organic material susceptible to hygroscopic expansion
- Available in 16-foot lengths (fewer joints, faster handling)

### Treated Exterior Composite (MiraTEC)
- Engineered solid wood composite trim treated with zinc borate
- Single solid piece with uniform density — will not delaminate, split, or check

---

## 2. Factory Finish Considerations

### James Hardie ColorPlus Technology
- Multi-coat, oven-baked finish applied in controlled factory environment
- Consistent DFT and extreme UV resistance
- Protective laminate for handling
- Requires specialized color-matched touch-up kits for small blemishes

### LP SmartSide ExpertFinish
- Highly durable pre-finished system in curated colors
- Maintenance cleaning: diluted Simple Green (5:1 water to concentrate)
- Color-matched touch-up kits provided by manufacturer

---

## 3. Surface Preparation Protocols

### Cleaning
- Substrates must be completely clean, dry, free of dust, wax, grease, mildew
- Use low-pressure water spray (garden hose) + soft to medium bristle brush

### Prohibited Methods
- **High-pressure power washing**: Strips paint films, damages surface texture, forces water behind wall assembly
- **Acid washing**: Prohibited on both substrates

### Moisture Protocols
- Siding must not be painted or installed while saturated
- Wood substrates must dry to MC < 15% before painting

---

## 4. Primer and Coating System Selection

### Primer Constraints

| Substrate | Primer Requirement | Reason |
|-----------|-------------------|--------|
| Bare fiber cement (pH 13) | Alkali-resistant primer (2-component epoxy or specialized acrylic sealer) | Prevents saponification and "alkaline burn" |
| Unprimed fiber cement | Must be painted within 90 days | Exposure degradation |
| Factory-primed products | Must be top-coated within 180 days | Primer degradation |

### Topcoat Standards
- **Industry standard**: 100% premium acrylic exterior latex paint
- Stain, oil-based, and alkyd paints expressly discouraged on unprimed fiber cement
- Minimum two finish coats targeting total DFT of 1.5-3.0 mils
- LP SmartSide: field-applied paint must carry minimum 15-year warranty from paint manufacturer

---

## 5. Production Rates by Substrate and Method

### Installation Speed Comparison
- LP SmartSide installs up to 22% faster than fiber cement (lighter weight, longer lengths, standard tools)
- Fiber cement slower due to heavy weight, brittleness, and OSHA-mandated specialized tooling (HEPA-filtered saws, fiber-cement shears, score-and-snap)

### Coating Methods
- Airless spraying preferred for efficiency
- Back-rolling recommended on textured/wood-grain boards for optimal adhesion and uniform DFT
- Touch-ups and edge-seals: brush or roller only (not field sprayer)

---

## 6. Failure Modes Specific to Engineered Substrates

### Edge Wicking and Capillary Rise
- **Most critical failure mode** for both substrates
- Liquid water absorbs into unsealed cut ends
- Fiber cement: cellulose fibers act as capillaries, drawing water in, causing edge swelling that ruptures paint
- Engineered wood: moisture compromises resin bonds, releasing internal stresses, causing irreversible thickness swell ("springback")

### Joint Cracking
- "Tight-butted" siding without expansion gaps: thermal/hygroscopic movement buckles boards or cracks inflexible caulking

### Alkaline Burn & Efflorescence
- Unneutralized fiber cement chemically destroys latex binders
- Water evaporating from board leaves soluble white salts (efflorescence) that physically push paint film off wall

---

## 7. Moisture and Expansion Management

### Edge Sealing Protocol
- **Non-negotiable**: Seal, prime, and paint ALL field-cut edges to prevent water intrusion

### Joint Management
- Manufacturers recommend joint flashing (slipsheets) behind joints rather than relying on caulk at field butt joints
- Caulk frequently cracks under expansion stress
- Flashing manages water effectively while allowing boards to move

### Vapor Drive
- Proper wall assemblies must use Water Resistive Barrier (WRB) with appropriate perm rating (< 10 U.S. perms recommended)
- Allows outward drying without forcing moisture into sheathing

---

## PaintFactor Integration Notes

### Material Consumption Formula
```
Paint Required = Area_Wall x Surface_Factor x (1 / Coverage_Rate)
```

### Surface Geometry Modifier
- Deeply embossed textures (Cedarmill, roughsawn): `Surface_Factor` = 1.15-1.30 vs. smooth board
- Required to achieve correct DFT on textured profiles

### Substrate Chemistry Modifier
- If raw fiber cement detected: trigger alkali-resistant primer modifier
- Factory-primed fiber cement: moderate porosity, neutralization check required

### Decision Logic

| Condition | Action |
|-----------|--------|
| Material = ColorPlus or ExpertFinish | Disable field-spray estimating for cut edges; mandate localized brush/roll via proprietary touch-up kits; prohibit caulking nail heads |
| Substrate = bare fiber cement | Lock primer = alkali-resistant (2-component epoxy or specialized acrylic) |
| Unprimed fiber cement exposure > 90 days | Flag: substrate degradation risk |
| Factory-primed exposure > 180 days | Flag: primer degradation, may need re-prime |
| Any field-cut edge | Auto-add edge seal task (prime + paint) |
| Texture = embossed/roughsawn | Apply Surface_Factor 1.15-1.30 to material qty |

### Installation Speed Modifier
- `MOD_INSTALL_FIBER_CEMENT` = baseline
- `MOD_INSTALL_ENGINEERED_WOOD` = -22% labor (faster installation)

### Safety/Compliance
- Fiber cement cutting: OSHA requires HEPA-filtered dust-collecting saws or fiber-cement shears (silica hazard)
