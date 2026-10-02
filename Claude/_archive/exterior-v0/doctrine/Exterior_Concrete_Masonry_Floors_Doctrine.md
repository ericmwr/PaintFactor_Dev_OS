# Exterior Concrete & Masonry Floors Doctrine

> **Topic 18** — Later Tier
> Sources: NotebookLM deep research (80 web sources), imported references
> Generated: 2026-03-07

---

## 1. Coating Systems

| System | UV Stability | Vapor Permeability | Abrasion Resistance | Cure Time | Best For |
|--------|-------------|-------------------|--------------------|-----------|---------|
| Acrylic sealers | Excellent | High (breathable) | Low | 2-4 hours | Light residential use |
| Penetrating stains/dyes | Excellent | N/A (no film) | None (requires topcoat) | Varies | Decorative; acid stains react with Ca(OH)2 |
| Epoxy systems | Poor (yellows/chalks) | Zero | Very high | 24-72 hours | Interior only without UV topcoat |
| Polyurea/polyaspartic | Excellent | Moderate | Extreme | 1-6 hours | Quick return to service; freeze-thaw zones |

### Critical Rules
- **Standard epoxies outdoors**: Must have UV-stable topcoat (polyurethane or polyaspartic) — aromatic epoxies yellow and chalk rapidly
- **Breathability**: Acrylic sealers allow moisture vapor transmission; epoxies trap moisture → osmotic blistering risk

---

## 2. Surface Preparation

Surface preparation accounts for **~80% of coating longevity**.

### Concrete Surface Profile (CSP)

| Method | CSP Achieved | Production Rate | Best For |
|--------|-------------|----------------|---------|
| Acid etching | CSP 1 (light) | Manual process, varies | Thin acrylics and stains |
| Diamond grinding | CSP 2-3 | 500-1,000 SF/hr | Epoxy and polyaspartic systems |
| Shot blasting | CSP 3-5 (aggressive) | 1,500-3,000 SF/hr | Heavy-duty industrial coatings |

### Contaminant Removal
- Remove laitance (weak, dusty surface layer) — primary cause of delamination
- Remove form-release agents, oils, curing compounds

---

## 3. Moisture Testing

Hydrostatic moisture pressure is a leading cause of coating failure on concrete.

| Test | Standard | Acceptable Limit | What It Measures |
|------|----------|------------------|-----------------|
| Calcium Chloride | ASTM F1869 | < 3-5 lbs/1,000 SF/24 hrs | Moisture Vapor Emission Rate (MVER) at surface |
| In-Situ Relative Humidity | ASTM F2170 | < 75-85% RH | Internal equilibrium RH of slab |

- If moisture exceeds limits, specialized **moisture-mitigating primers** must be applied

---

## 4. Slip Resistance

| Standard | Metric | Minimum Value | Application |
|----------|--------|--------------|-------------|
| OSHA | Static COF (SCOF) | 0.5 (walkways), 0.8 (ramps) | Industrial |
| ANSI | Dynamic COF (DCOF) | 0.55 | Exterior wet areas |

### Anti-Slip Aggregates
- **Silica sand**: Level walkways
- **Aluminum oxide / carborundum**: Exterior entry steps and ramps — extreme hardness, long-term wear
- Application: Suspended in mix or broadcast to refusal

---

## 5. Failure Modes

| Failure Mode | Cause | Prevention |
|-------------|-------|-----------|
| **Delamination/peeling** | Insufficient surface profile (too smooth) or laitance not removed | Proper CSP per coating system |
| **Osmotic blistering** | Impermeable coating traps moisture vapor from subgrade | Use breathable sealers or moisture-mitigating primer |
| **Hot tire pickup** | Vehicle tire heat softens coating; cooling tire peels coating off concrete | Polyurea or high-solids epoxy (resist softening) |
| **Freeze-thaw spalling** | Water in cracks expands 9% when freezing → flakes surface and coating | Flexible elastomeric or polyurea coatings |

---

## PaintFactor Integration Notes

### Modifier Keys
- `CONCRETE_COATING`: [Acrylic_Sealer, Penetrating_Stain, Epoxy, Polyurea_Polyaspartic]
- `SURFACE_PREP`: [Acid_Etch, Diamond_Grind, Shot_Blast]
- `EXPOSURE`: [Covered_Porch, Open_Patio, Driveway, Pool_Deck]

### Decision Logic

| Condition | Action |
|-----------|--------|
| Coating = Epoxy AND Exposure = Exterior | **Require** UV-stable topcoat (polyurethane or polyaspartic) |
| MVER > 5 lbs OR RH > 85% | **Hard Stop**: Moisture-mitigating primer required before coating |
| Exposure = Pool_Deck or Ramp | Auto-add anti-slip aggregate task; verify DCOF >= 0.55 |
| Exposure = Driveway | Flag hot tire pickup risk; recommend polyurea or high-solids epoxy |
| Coating = Acrylic on freeze-thaw zone | **Warning**: Consider polyurea for freeze-thaw resistance |

### Production Rate Keys
- `RATE_CONCRETE_ACID_ETCH` = varies (manual)
- `RATE_CONCRETE_DIAMOND_GRIND` = 500-1,000 SF/hr
- `RATE_CONCRETE_SHOT_BLAST` = 1,500-3,000 SF/hr
