# Exterior Stucco & EIFS Painting Doctrine

> **Topic 10** — Round 3
> Sources: NotebookLM deep research (75 web sources), imported references
> Generated: 2026-03-07

---

## 1. Traditional 3-Coat Stucco vs. Synthetic Stucco (EIFS)

### Traditional Stucco (Cementitious)
- **Composition**: Portland cement, sand, lime, water applied over metal lath
- **Thickness**: 7/8" to 1"
- **Weight**: ~10 lbs/SF
- **R-value**: ~0.20 (negligible insulation)
- **Properties**: Excellent impact resistance; inherently prone to cracking due to rigidity

### EIFS (Exterior Insulation and Finish Systems)
- **Composition**: EPS insulation board + polymer-modified base coat with fiberglass mesh + 100% acrylic finish coat
- **Weight**: ~2 lbs/SF
- **R-value**: 3.0-5.6 per inch (highly energy-efficient)
- **Properties**: Flexible, resists hairline cracking, but vulnerable to dents/punctures

---

## 2. Crack Assessment and Repair

### Crack Classification

| Type | Width | Cause | Repair |
|------|-------|-------|--------|
| **Cosmetic/Hairline** | < 1/16" to 1/8" | Shrinkage, curing, thermal expansion | Masonry patch, flexible caulk, or elastomeric coating (300%+ elongation) |
| **Structural** | > 1/8"; diagonal, stair-step, or continuous patterns | Building settlement, structural stress | **Cannot paint over** — requires structural engineering assessment |

### EIFS Delamination Detection
- **"Knock test"**: Hollow sound indicates foam board has delaminated from substrate
- Requires mechanical refastening or replacement before any coating

---

## 3. Surface Preparation

### General Protocol
- Surface preparation accounts for **80% of job success**
- Pressure wash: 1,500-3,000 PSI for traditional stucco; lowest settings for delicate EIFS
- Eradicate mildew with bleach/water solution
- Severe chalking: specialized masonry conditioners to lock down loose powder

### Previously Painted Surfaces
- Conduct ASTM D3359 adhesion tape test
- Rating 2A or less = failing coating must be fully stripped or resurfaced

---

## 4. Primer Requirements and Alkali Resistance

### Alkalinity Hazards
- New cementitious stucco: pH up to 13
- Standard acrylic on high-pH surface = **saponification** (alkaline burn) → adhesion loss, color fading

### Cure Times
- Traditional specification: minimum **30 days** cure to allow pH to drop below 10
- Specialized coatings (e.g., Loxon XP): withstand pH up to 13, can apply as early as **7 days**

### Efflorescence Treatment
- pH neutralization wash + alkali-resistant primer to seal against further salt migration

---

## 5. Coating System Selection

### Elastomeric vs. 100% Acrylic

| Property | Elastomeric | 100% Acrylic |
|----------|-------------|-------------|
| **DFT** | 12-20 mils | 1.5-3.0 mils |
| **Elongation** | >300% | Standard |
| **Crack bridging** | Excellent (hairline) | Limited |
| **Best for** | Traditional stucco waterproofing | EIFS (mandatory) |
| **Risk** | Traps heat/moisture on EIFS | Lower crack bridging |

### Critical Rules
- **Elastomeric on EIFS**: **DO NOT USE** — extreme thickness traps heat and moisture, causes alligatoring and system failure
- **EIFS standard**: 100% acrylic only — provides flexibility + vapor permeability
- **LRV for EIFS**: Colors should have LRV 20+ (preferably >50) to prevent thermal stress

---

## 6. Production Rates by Texture Type

### Labor Rates

| Texture | Production Rate (SF/hr) | Notes |
|---------|------------------------|-------|
| Smooth (Santa Barbara) | 125-150 | Standard spray + back-roll |
| Sand / Float | 80-100 | Deeper texture slows application |
| Dash / Roughcast | 40-60 | Most labor-intensive |

### Material Consumption by Texture

| Texture | Coverage (SF/gal) | Surface Area Multiplier |
|---------|-------------------|----------------------|
| Smooth wall (baseline) | 350-400 | 1.00 |
| Smooth stucco (Santa Barbara) | 300-350 | 1.10 |
| Sand / Float | 200-250 | 1.25 |
| Spanish Lace | 150-200 | 1.50 |
| Dash / Roughcast | 75-125 | 2.00 |

---

## 7. EIFS Liability and Contractor Scope Limitations

### The EIFS Crisis (1990s)
- Non-breathable exterior barrier systems trapped water → massive structural rot
- Ongoing litigation legacy with "long tail" liability

### Insurance Implications
- Many CGL (Commercial General Liability) policies contain absolute **"EIFS Exclusions"**
- Contractors must secure specific liability riders or buybacks
- Without coverage, contractors are functionally self-insured

### Liability Dynamics
- Painter liable if wrong paint used (trapping moisture) or joints improperly caulked
- Water damage remains hidden behind insulation for years before discovery

### Risk Mitigation Protocol
- Maintain formal QC manual:
  - Daily site logs (ambient temp, humidity, substrate pH)
  - Step-by-step photo documentation of flashing/caulking phases
  - Recorded wet film gauge readings ensuring thickness specs met

---

## PaintFactor Integration Notes

### Modifier Keys
- `SUBSTRATE_TYPE`: [Stucco_Traditional, EIFS_Synthetic]
- `TEXTURE_PROFILE`: [Smooth, Sand_Float, Spanish_Lace, Dash_Roughcast]
- `COATING_SYSTEM`: [Elastomeric, Acrylic_100]
- `SUBSTRATE_CONDITION`: [New_Uncured, New_Cured, Sound_Existing, Cracked_Hairline, Cracked_Structural, Failed_Existing]

### Surface Area Multipliers (Texture)
- `MOD_TEXTURE_SMOOTH` = 1.10
- `MOD_TEXTURE_SAND` = 1.25
- `MOD_TEXTURE_LACE` = 1.50
- `MOD_TEXTURE_DASH` = 2.00

### Decision Logic

| Condition | Action |
|-----------|--------|
| Substrate = EIFS | Lock coating = 100% acrylic; prohibit elastomeric |
| Substrate = EIFS AND Color LRV < 20 | **Alert**: Thermal stress risk — recommend LRV > 50 |
| Substrate = Traditional stucco with hairline cracks | Recommend elastomeric (12-20 mils DFT) |
| Cracks > 1/8" | **Hard Stop**: Structural assessment required — outside painting scope |
| EIFS knock test = hollow | **Hard Stop**: Delamination repair required before coating |
| New stucco < 30 days | Require alkali-resistant primer OR specialized coating (Loxon XP type) |
| Application = Spray on stucco | Auto-add back-roll labor action |
| Texture = Dash/Roughcast | Apply 2.00x material multiplier; rate = 40-60 SF/hr |

### Production Rate Keys
- `RATE_STUCCO_SMOOTH` = 125-150 SF/hr
- `RATE_STUCCO_SAND` = 80-100 SF/hr
- `RATE_STUCCO_DASH` = 40-60 SF/hr

### Liability Flags
- `FLAG_EIFS_SCOPE` = contractor scope limitation warning
- `FLAG_EIFS_INSURANCE` = verify CGL coverage includes EIFS work
