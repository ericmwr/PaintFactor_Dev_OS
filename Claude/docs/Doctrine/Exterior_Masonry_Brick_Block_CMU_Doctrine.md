# Exterior Masonry — Brick, Block & CMU Painting Doctrine

> **Topic 9** — Round 3
> Sources: NotebookLM deep research (82 web sources), imported references
> Generated: 2026-03-07

---

## 1. Substrate Types and Characteristics

### Clay Face Brick
- Sedimentary-based material fired at high temperatures
- Modern hard-fired bricks are dense; older historic bricks fired at lower temperatures are softer and highly "breathable"
- Applying impermeable coatings to historic brick is catastrophic — unit relies on vapor diffusion for moisture management

### Concrete Masonry Units (CMU) & Cast Concrete
- Cementitious binders give high alkalinity due to calcium hydroxide from Portland cement hydration
- High-porosity surface typically requires block fillers to create smooth, paintable grade
- PCA P12 block filler standard: Level 2 (Standard Fill) minimizes voids to max 10 per SF

### Natural Stone
- Varies by mineralogy:
  - **Granite** (igneous): Very low porosity, resists film-forming paints
  - **Limestone** (sedimentary, calcite): Highly porous, acid-sensitive, requires breathable coatings like mineral silicates

---

## 2. Cure Time Requirements and Moisture Testing

### The 28-Day Rule
- New concrete and masonry register pH 12-14
- Industry standard: **28-day cure cycle** to allow cement hydration to stabilize and surface pH to lower to 10-12 via carbonation
- **Accelerated coating**: Specialized high-pH primers (e.g., Sherwin-Williams Loxon) withstand pH up to 13, allowing application as early as 7 days

### Alkali Burn
- Standard acrylic paints designed for surfaces pH 9 or below
- Applying standard coatings to uncured masonry causes "alkali burn" — high alkalinity attacks pigments and binders
- Results: color loss, brittle films, total coating failure

### Moisture Testing
- Maximum moisture content before coating: **12%**
- Test methods:
  - Electronic moisture meters
  - ASTM D4263 (Plastic Sheet Method)
  - ASTM F1869 (Calcium Chloride Test)

---

## 3. Efflorescence Treatment

Efflorescence = white powdery deposits of water-soluble salts left as internal moisture evaporates. Moisture source must be corrected first.

### Cleaning Hierarchy

| Severity | Method | Notes |
|----------|--------|-------|
| Light | Plain water + stiff bristle brush | First approach |
| Moderate | TSP (Trisodium Phosphate) | Do not mix with acids |
| Severe | Phosphoric acid | Milder, safer — recommended first resort |
| Extreme | Muriatic acid (hydrochloric) | Last resort — highly corrosive |

### Muriatic Acid Protocol
1. Dilute 1:10 to 1:16 (acid to water) — **always add acid to water, never reverse**
2. Pre-dampen masonry to prevent deep acid penetration
3. Scrub and do not allow acid to dry on surface
4. Neutralize with alkaline solution (ammonia or baking soda)
5. Thorough rinse

---

## 4. Surface Preparation

### New Masonry
- Remove waxy form-release agents and curing compounds (bond-breakers)
- Methods: mechanical abrasion, abrasive blasting, chemical detergents
- CMU: apply block filler (PCA P12) to fill voids

### Previously Painted Masonry (PCA P14 Levels)

| Level | Name | Scope |
|-------|------|-------|
| 1 | Basic | Wash/power-wash; remove dust and loose paint |
| 2 | Standard | Level 1 + patching, filling, feather-edge sanding (defects > 1/8") |
| 3 | Superior | Level 2 + tape cracks, sand to eliminate profile differences > 1/16" |
| 4 | Supreme | Fill and sand to touch-and-feel smoothness (differences > 1/32") |
| R | Restoration | Widespread poor adhesion — full restoration/resurfacing |

---

## 5. Primer and Coating System Selection

### Vapor Permeability (Breathability)
Measured in perms (ASTM E96). Higher perms = more breathable.

| Coating Type | Permeability | DFT | Elongation | Best For |
|-------------|-------------|-----|------------|----------|
| **100% Acrylic Latex** | 10-20 perms | 6-8 mils | Standard | Structurally sound masonry; general use |
| **Elastomeric** | 5-15 perms | 20-30 mils | 300-500% | Cracked stucco/CMU; waterproofing |
| **Mineral Silicate** (Keim) | 77+ perms | Thin film | N/A | Historic masonry; maximum breathability |

### Key Distinctions
- **Acrylic**: Preserves texture, resists UV fading better than elastomerics, easier to apply/touch up
- **Elastomeric**: Bridges hairline cracks but high risk of catastrophic delamination if moisture enters from alternative sources
- **Mineral Silicate**: Chemically bonds via silicification — immune to peeling/blistering from hydrostatic pressure

---

## 6. Production Rates by Application Method

| Method | Rate (SF/hr) | Material Waste | Notes |
|--------|-------------|---------------|-------|
| Airless spray | 1,000-2,000 | 25-33% | Requires extensive masking |
| Spray + back-roll | 400-600 | 25% | Gold standard for masonry — forces paint into pores |
| Roller only | 150-400 | 5% | Excellent mechanical bond; minimal masking |
| Brush only | 50-100 | <1% | Detail work, trim, historic stone only |

---

## 7. Failure Modes

### Saponification
- **Trigger**: Oil-based or alkyd paints on alkaline masonry + moisture
- **Mechanism**: Alkaline hydroxides react with paint esters, hydrolyzing into soft, sticky, water-soluble soap
- **Cure**: Complete removal to bare masonry — no other remedy

### Moisture Entrapment & Delamination
- Non-breathable (impermeable) paints trap interior vapor behind film
- Hydrostatic and osmotic pressure buildup blows paint film off wall
- Critical on historic brick that relies on vapor diffusion

### Spalling
- Trapped moisture behind impermeable coating freezes — water expands ~9%
- Internal pressure shears off outer face of masonry unit
- Exposes soft interior to rapid structural deterioration

### Efflorescence Recurrence
- Salt deposits push paint film off surface
- Indicates ongoing moisture intrusion — coating alone cannot solve

---

## PaintFactor Integration Notes

### Modifier Keys
- `SUBSTRATE_TYPE`: [Clay_Brick, CMU, Cast_Concrete, Limestone, Granite]
- `SUBSTRATE_CONDITION`: [New_Uncured, New_Cured, Sound_Existing, Failed_Existing, Historic]
- `COATING_SYSTEM`: [Acrylic_Latex, Elastomeric, Mineral_Silicate]
- `APPLICATION_METHOD`: [Spray, Spray_BackRoll, Roll, Brush]

### Decision Logic

| Condition | Action |
|-----------|--------|
| New masonry < 28 days | Require high-pH primer (Loxon-type) OR halt until cured |
| New masonry 7-28 days | Allow only with alkali-resistant primer (pH 13 rated) |
| MC > 12% | **Hard Stop**: Do not coat until moisture reduced |
| Substrate = Historic brick | Lock coating = mineral silicate or high-perm acrylic (>10 perms) |
| Substrate = CMU | Auto-add block filler task (PCA P12) |
| Efflorescence present | Add acid wash + neutralization prep task; verify moisture source |
| Coating = Elastomeric | Flag: moisture entrapment risk if alternate water sources exist |
| Application = Spray on masonry | Auto-add back-roll labor action |

### Production Rate Keys
- `RATE_SPRAY_MASONRY` = 1,000-2,000 SF/hr (spray only)
- `RATE_SPRAY_BACKROLL_MASONRY` = 400-600 SF/hr
- `RATE_ROLL_MASONRY` = 150-400 SF/hr
- `RATE_BRUSH_MASONRY` = 50-100 SF/hr

### Material Consumption
- Acrylic on smooth masonry: 300-350 SF/gal
- Acrylic on textured/porous masonry: 150-250 SF/gal
- Elastomeric: significantly lower coverage due to 20-30 mil DFT requirement
- Block filler: coverage varies by void density

### Cure Time Logic
- `CURE_STANDARD` = 28 days (default)
- `CURE_ACCELERATED` = 7 days (with alkali-resistant primer)
- `MAX_MC_MASONRY` = 12%
