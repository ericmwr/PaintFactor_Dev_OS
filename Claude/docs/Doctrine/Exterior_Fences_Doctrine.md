# Exterior Fences Doctrine

> **Topic 16** — Later Tier
> Sources: NotebookLM deep research (73 web sources), imported references
> Generated: 2026-03-07

---

## 1. Substrate Types and Preparation

### Cedar & Softwoods
- Hygroscopic — continuously exchanges moisture with atmosphere
- MC must be below 19% (ideally 10-14%) before finishing
- New cedar requires 4-6 weeks weathering and light 80-grit sanding to break mill glaze

### Pressure-Treated (PT) Pine
- Saturated with water and chemical salts upon installation
- Requires **3-6 months seasoning** before coating — trapped moisture causes immediate coating failure
- Water bead test: spray drops on surface; if water beads up, wood is not ready

### Composite
- Low maintenance; faded composite can be painted
- Requires basic cleaning and sometimes adhesion primer before coating

### Vinyl
- Non-porous, designed to resist stains
- Must be thoroughly cleaned and prepped with **adhesion primer followed by acrylic or epoxy-based paint**

### Metal (Wrought Iron, Steel, Corrugated)
- Primary concern: rust
- Wire brushing or sandblasting to remove flaking paint and rust
- **Rust-inhibitive primer** required after mechanical prep
- Galvanized metal requires adhesion primer (no oil-based — causes saponification)

---

## 2. Weathering Assessment and Chemical Restoration

- Weathering breaks down lignin that binds cellulose fibers → gray, friable surface
- **Sodium Percarbonate (oxygen bleach)**: Professional standard to lift dirt and gray fibers without destroying lignin
- **Sodium Hydroxide (caustic stripper)**: Dissolves old paints and deep-seated oils
- Any high-pH caustic treatment must be followed by **Oxalic Acid** to neutralize pH and brighten wood
- Fiber Saturation Point (25-30% MC): "free water" in cell cavities completely blocks stain penetration

---

## 3. Coating System Selection

| System | Opacity | Maintenance | Best For | Failure Mode |
|--------|---------|------------|----------|-------------|
| Transparent/semi-transparent stain | 0-50% | 1-3 years | New, high-quality cedar | Gradual UV fade (no peeling) |
| Solid stain | 100% | 3-7 years | Weathered, mismatched wood | Peeling if moisture trapped behind film |
| Exterior paint | 100% (heavy film) | 5-10 years | **Least recommended for wood fences** | Severe blistering/cracking/peeling from moisture |

- **Paint on wood fences**: Fences absorb ground moisture and humidity from all sides → escaping moisture vapor creates pressure → paint blisters, cracks, peels
- **Cedar bleed**: Painting bare cedar without proper primer → natural tannins bleed through finish

---

## 4. Surface Area Estimation

### Geometric Multipliers

| Fence Style | Multiplier | Rationale |
|-------------|-----------|-----------|
| Base calculation | (LF x Height) x 2 | Both sides of fence |
| Shadowbox / Board-on-Board | 1.5x-1.7x | Overlapping edges, interior board faces |
| Spaced picket | 0.6x-0.8x | Empty space between boards (but edge saturation requires substantial material) |
| Split rail | Component-based | Calculate surface area of single post and rail, multiply by count |

### Material Yields
- Transparent/semi-transparent stains: 200-350 SF/gal
- Solid stains and paints: 250-400 SF/gal per coat (two coats required → effective 125-200 SF/gal)
- Spray applications: **15-30% material loss** due to overspray waste

---

## 5. Production Rates

| Method | Rate | Notes |
|--------|------|-------|
| Airless spraying (sealer/stain) | 215 SF/hr | Industry standard for large projects |
| Manual brush/roll | 120 SF/hr | Detail work |
| Spray — spaced picket fence | 200 LF/hr | Open profile |
| Spray — solid privacy fence | 100 LF/hr | Continuous surface |
| Pre-staining (gravity-fed machine) | 650 LF/hr | Two-person crew, unassembled lumber |

### Back-Brushing Mandate
- When spraying penetrating stains, immediately follow with a wide brush to work sprayed droplets into wood pores
- Breaks surface tension, ensures uniform penetration, prevents lap marks

---

## 6. Failure Modes

| Failure Mode | Cause | Prevention |
|-------------|-------|-----------|
| **Moisture-driven peeling** | Paint/solid stain film traps moisture from ground and humidity | Use penetrating stains; avoid paint on wood fences |
| **Cedar bleed** | Tannins bleed through paint without proper primer | Alkyd stain-blocking primer on cedar |
| **Immediate failure on PT** | Coating applied before 3-6 month seasoning | Water bead test; moisture meter verification |
| **Overstaining** | Too many coats trap moisture → stain peels | Follow manufacturer coat count limits |

---

## PaintFactor Integration Notes

### Modifier Keys
- `FENCE_SUBSTRATE`: [Cedar, PT_Pine, Composite, Vinyl, Metal_Iron, Metal_Steel, Metal_Galvanized]
- `FENCE_STYLE`: [Privacy_Solid, Shadowbox, Picket_Spaced, Split_Rail]
- `COATING_TYPE`: [Transparent, Semi_Transparent, Solid_Stain, Paint]

### Geometric Multipliers
- `MOD_FENCE_SHADOWBOX` = 1.5-1.7x
- `MOD_FENCE_PICKET` = 0.6-0.8x
- `MOD_FENCE_SPLIT_RAIL` = component-based

### Decision Logic

| Condition | Action |
|-----------|--------|
| Substrate = PT Pine AND Seasoning < 3 months | **Hard Stop**: Insufficient seasoning |
| Substrate = Cedar AND Coating = Paint | Auto-add alkyd stain-blocking primer; **Warning**: Cedar bleed risk |
| Substrate = Vinyl | Require adhesion primer + 100% acrylic topcoat |
| Substrate = Metal AND Coating = Oil/Alkyd | **Block**: Saponification risk on galvanized |
| Style = Shadowbox | Apply 1.5-1.7x geometric multiplier |
| Application = Spray AND Stain = Penetrating | Auto-add back-brushing labor task |

### Production Rate Keys
- `RATE_FENCE_SPRAY_STAIN` = 215 SF/hr
- `RATE_FENCE_BRUSH_ROLL` = 120 SF/hr
- `RATE_FENCE_SPRAY_PICKET` = 200 LF/hr
- `RATE_FENCE_SPRAY_PRIVACY` = 100 LF/hr
