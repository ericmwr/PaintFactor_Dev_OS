# Exterior Primer Systems Doctrine

> **Topic 21** — Tier 4 (Cross-Surface Systems)
> Sources: NotebookLM fast research (10 web sources), imported references
> Generated: 2026-03-07

---

## 1. Primer Categories and Substrate Compatibility

| Primer Type | Compatible Substrates | Not Recommended For |
|------------|----------------------|-------------------|
| **Acrylic latex** | New/previously painted wood, laminate, drywall, galvanized metal (if cleaned) | — |
| **Alkyd (oil-based)** | Bare wood (exterior/interior), previously painted surfaces, drywall | Aluminum, brick, concrete, stucco, galvanized metal, PVC, fiberglass |
| **Bonding primers** | Glass, glazed brick/stone, tile, fiberglass, Formica, Kynar, existing high-gloss coatings | — |

### Key Distinctions
- **Acrylic latex**: Easy application, soap/water cleanup, remains flexible long-term — resists cracking, peeling, blistering
- **Alkyd**: Superior penetration into wood; better stain blocking; becomes brittle over time
- **Bonding primers**: "Peanut butter in a sandwich" — grips slick surfaces while providing bite for topcoat

---

## 2. Stain-Blocking Capabilities

### Tannin and Knot Bleed
- **Alkyd primers**: Superior stain blocking — highly effective at retarding extractive bleeding from cedar, redwood, Douglas fir
- **Acrylic primers**: Improved technology but severe tannin staining often requires **two coats** to successfully block bleed
- **Spot priming**: Prime visible wood knots with alkyd primer before applying acrylic primer over remaining surface

### Rust and Smoke Stains
- Alkyd primers effective for rust and smoke stain blocking
- Specialty acrylic metal primers (e.g., Ultra Spec HP) for metal substrates

---

## 3. Adhesion Promotion

### Chalky Surfaces
- Alkyd primers penetrate deeper into wood — better bond on surfaces with minor chalky conditions
- Standard acrylic primers bond only to sound surfaces — chalky/powdery substrates require extensive scraping and washing first

### Glossy Surfaces
- Bonding primers remain slightly flexible — grip dense, slick substrates while providing mechanical tooth for topcoat
- No sanding required on most glossy surfaces when using bonding primer

---

## 4. Coverage Rates and DFT

### Spread Rates
- Typical acrylic exterior primer: **400-450 SF/gal** on smooth surfaces
- Practical coverage depends on substrate porosity and texture profile
- **10-20% wastage allowance** standard for most coatings

### DFT Calculation
- **DFT = (% Solids by Volume x 1604) / Spreading Rate (SF/gal)**
- Typical primer DFT: 1.0-2.0 mils

---

## 5. Recoat Windows

| Primer Type | Dry to Touch | Recoat Time | Special Notes |
|------------|-------------|-------------|--------------|
| Acrylic latex | 30 min | 2-4 hours | Standard |
| Alkyd | 30 min | 2-4 hours | Tannin-rich wood may extend to 3-5 days for full cure |
| Bonding primer | Varies | Within 1 week | Left exposed too long → dries like "peanut brittle" — loses flexibility for topcoat bond |

---

## 6. When to Use Dedicated Prime Coat vs. Self-Priming Topcoat

### Dedicated Primer Required
- Bare, unpainted substrates (new wood, bare PVC, composite)
- Surfaces scraped or sanded to bare substrate
- Severe rust or tannin bleed stains present
- Dramatic color change
- Hard-to-coat, high-gloss, or non-porous surfaces

### Self-Priming Topcoat Acceptable
- Previously painted surface in good, sound condition
- Same or similar color application
- Standard substrate without stain-blocking needs

---

## PaintFactor Integration Notes

### Modifier Keys
- `PRIMER_TYPE`: [Acrylic_Latex, Alkyd_Oil, Bonding, DTM_Acrylic, DTM_Alkyd]
- `SUBSTRATE_CONDITION`: [Bare_New, Sound_Existing, Chalky, Glossy, Stained_Tannin, Stained_Rust]
- `PRIME_DECISION`: [Dedicated_Prime, Self_Priming_Topcoat]

### Decision Logic

| Condition | Action |
|-----------|--------|
| Substrate = Bare wood | Require dedicated primer coat |
| Wood species = Cedar/Redwood | Recommend alkyd primer OR two coats acrylic; add knot spot-priming task |
| Surface = Chalky/powdery | Require alkyd primer OR extensive scraping before acrylic |
| Surface = Glossy/slick | Require bonding primer (no sanding needed) |
| Substrate = Galvanized metal | **Block** alkyd primer — use acrylic or specialized galvanized primer |
| Color change = Dramatic (dark to light) | Require dedicated tinted primer |
| Existing paint = Sound, same color | Allow self-priming topcoat |

### Production Rate Keys
- `RATE_PRIME_SPRAY_SIDING` = 300-450 SF/hr
- `RATE_PRIME_BRUSH_TRIM` = 100-150 LF/hr
- `COVERAGE_PRIMER_SMOOTH` = 400-450 SF/gal
- `COVERAGE_PRIMER_POROUS` = 250-350 SF/gal
