# Exterior Decks & Horizontal Wood Surfaces Doctrine

> **Topic 15** — Later Tier
> Sources: NotebookLM deep research (72 web sources), imported references
> Generated: 2026-03-07

---

## 1. Coating Categories by Opacity

| Category | Opacity | UV Protection | Film Formation | Maintenance Cycle |
|----------|---------|--------------|----------------|-------------------|
| Clear sealers | 0-10% | Negligible | Hydrophobic barrier (wax/resin) | 12-18 months |
| Semi-transparent stains | 25-50% | Moderate (iron oxide pigments) | Penetrating, no film | 2-3 years |
| Semi-solid stains | 60-80% | Enhanced | Thin film | 3-4 years |
| Solid color stains | 100% | Maximum | Thick surface film | 5-7 years |

- **Semi-transparent stains** are the professional standard for residential horizontal decks — they penetrate the wood's cellular structure, allow vapor transmission, and prevent peeling/blistering
- **Solid stains** provide maximum UV protection but introduce significant risk of moisture-driven delamination on horizontal surfaces

---

## 2. Substrate Preparation

### New Wood
- **Mill glaze**: Glossy surface from high-speed planers that draws water-soluble extractives to surface, blocking pores
- Removal: Chemical mill glaze remover or aggressive sanding (60-grit)
- New pressure-treated softwoods require **3-6 months seasoning** before coating to allow internal moisture to evaporate

### Weathered Wood — Chemical Restoration Protocol
1. **Alkaline strippers** (Sodium Hydroxide, pH 12-14) or cleaners (Sodium Percarbonate) to emulsify old resins, dirt, and biological matter
2. **Acidic neutralization** (Oxalic or Citric Acid brighteners, pH 1.5-2.5) to return wood to natural pH of 3.5-4.5 and remove tannin/rust stains
3. Skipping neutralization leaves wood in highly basic state → premature coating failure

### Moisture Content Limits
- Wood must be at **15% MC or less** before application (verified by electronic moisture meter)
- Coating wood with excessive moisture traps water inside → destroys adhesive bond and promotes internal rot

---

## 3. UV Degradation

- UV radiation triggers **photodegradation of lignin** — the polymer that binds wood's cellulose fibers
- Broken-down lignin forms water-soluble compounds that wash away, leaving structurally weak, silvery-gray cellulose
- New stains applied over degraded gray layer without sanding or chemical removal will delaminate — coating bonds to loose, detached fibers

---

## 4. Horizontal Surface Wear Factors

Unlike vertical siding, horizontal deck surfaces face multi-axial assault:
- **Water pooling**: Horizontal boards do not shed water easily → chronic moisture saturation
- **Mechanical abrasion**: Constant friction from foot traffic, pets, patio furniture → worn "path of travel"
- **Direct solar impact**: Decks receive direct overhead sunlight, accelerating UV damage

---

## 5. Production Rates

| Task | Rate | Unit | Notes |
|------|------|------|-------|
| Deck flooring (staining) | 200-350 | SF/hr | Standard application |
| Deck flooring (sanding) | 40-60 | SF/hr | Mechanical prep |
| Standard railings | 10-15 | LF/hr | Complex profile |
| Individual spindles/balusters | 10-20 | EA/hr | Per unit |
| Stairs | 2-4 | Steps/hr | Per step |
| Chemical stripping + power wash | 2-4 hrs | per 300 SF deck | Full prep cycle |

---

## 6. Failure Modes

| Failure Mode | Cause | Prevention |
|-------------|-------|-----------|
| **Blistering/peeling** | Film-forming stain traps moisture; sun heats deck → hydrostatic pressure lifts film | Use penetrating stains; seal end-grains |
| **Freeze-thaw shearing** | Water in micro-cracks expands 9% when freezing → shatters coating | Penetrating stains; proper drainage |
| **Erosion** | Clear sealers/penetrating stains gradually fade and gray | Expected — reapply per maintenance cycle |
| **Tannin bleed** | Water-soluble polyphenols (Cedar/Redwood) migrate to surface | Oxalic acid neutralization; proper brightening |
| **Alligatoring** | Geometric cracking from thermal and moisture stress on thick films | Avoid excessive film build on horizontal surfaces |

---

## PaintFactor Integration Notes

### Modifier Keys
- `DECK_COATING_TYPE`: [Clear_Sealer, Semi_Transparent, Semi_Solid, Solid_Stain]
- `WOOD_CONDITION`: [New_Milled, New_PT_Seasoned, Weathered_Gray, Previously_Coated]
- `DECK_COMPONENT`: [Floor, Railing, Spindles, Stairs]

### Decision Logic

| Condition | Action |
|-----------|--------|
| Wood = New PT AND Seasoning < 3 months | **Hard Stop**: Insufficient seasoning — coating will fail |
| MC > 15% | **Hard Stop**: Do not coat until moisture reduced |
| Wood = Weathered gray | Auto-add chemical restoration task (strip + brighten + neutralize) |
| Coating = Solid stain on horizontal | **Warning**: Moisture-driven delamination risk on horizontal surfaces |
| Wood species = Cedar/Redwood | Auto-add oxalic acid brightener task for tannin management |

### Production Rate Keys
- `RATE_DECK_FLOOR_STAIN` = 200-350 SF/hr
- `RATE_DECK_FLOOR_SAND` = 40-60 SF/hr
- `RATE_DECK_RAILING` = 10-15 LF/hr
- `RATE_DECK_SPINDLE` = 10-20 EA/hr
- `RATE_DECK_STAIRS` = 2-4 Steps/hr
