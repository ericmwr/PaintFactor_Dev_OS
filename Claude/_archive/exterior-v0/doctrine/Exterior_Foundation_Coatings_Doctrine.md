# Exterior Foundation Coatings Doctrine

> **Topic 19** — Later Tier
> Sources: NotebookLM deep research (80 web sources), imported references
> Generated: 2026-03-07

---

## 1. Foundation Coating Types

The International Residential Code (IRC) distinguishes foundation coatings by hydrostatic pressure resistance.

### Damp-Proofing
- Prevents soil moisture from wicking into concrete via capillary action
- For relatively dry locations **without** hydrostatic pressure
- Typically unmodified asphalt or bituminous mixtures curing to thin, brittle film (< 10 mils DFT)

### Waterproofing
- Resists continuous hydrostatic pressure
- Required in areas with high water tables or severe soil-water conditions
- Elastomeric materials applied at **40-60+ mils DFT**
- Can bridge structural cracks as foundation settles

---

## 2. Material Categories

| Category | Properties | Best For |
|----------|-----------|---------|
| **Elastomeric / Fluid-Applied** | Polyurethane, rubberized asphalt; >300% elongation; spray or roller | Expansive clay soils; high hydrostatic pressure |
| **Bituminous** | Asphalt-based; brittle unless polymer-modified; UV-degradable | Basic damp-proofing only |
| **Cementitious & Crystalline** | Portland cement + active chemicals; forms insoluble crystals in capillaries | Positive-side waterproofing; Drylok withstands up to 15 PSI |
| **Penetrating Silicate Sealers** | Internal gel blocks pores (e.g., RadonSeal) | Vapor reduction; cannot bridge structural cracks |
| **Sheet Membranes** | Pre-formed modified bitumen, HDPE, or TPO; peel-and-stick or loose-laid | Highly consistent, high-pressure moisture barriers |

---

## 3. Below-Grade vs. Above-Grade Treatment

### Below-Grade
- Must withstand constant saturation and hydrostatic pressure (intensifies with depth)
- Integrate with drainage system (dimple mats, French drains, sump pumps)

### Above-Grade
- Primary threat: **UV radiation** — waterproofing membranes left exposed above grade line undergo photodegradation → brittle, lose adhesion
- Exposed sections must be shielded by:
  - Sacrificial UV-resistant coatings (PVDF paints)
  - Insulated protection boards
- Above-grade transitions must act as **termite barrier** (liquid-applied flashings or stainless-steel meshes)

### Grade-Line Transition
- Rigid Z-flashing must overlap foundation coating, leaving 3/8" gap below siding
- **Never caulk the 3/8" gap** — traps water against wood framing (catastrophic error)

---

## 4. Moisture Management and Drainage

- Waterproofing must not function in isolation — integrate with drainage system
- **HDPE dimple mats**: Mechanically fastened over waterproofing, direct water downward to perimeter drains
- Foundation drains (French drains) or sump pump systems handle collected water

---

## 5. Surface Preparation

**Insufficient surface roughness is responsible for approximately 83% of premature coating failures.**

### Concrete Surface Profile (CSP)
- Thin-film sealers: CSP 1-2 (acid etching or diamond grinding)
- High-build elastomeric membranes (40+ mils): CSP 3-5 (shot-blasting or light scarification)

### Contaminant Removal
- Form-release agents, oils, and laitance must be removed via high-pressure water jetting or mechanical profiling
- Efflorescence must be treated and removed — applying membrane over it causes osmotic blistering

### Crack Remediation
- **Poured concrete**: Structural cracks > 1/8" remediated by high-pressure injection (epoxy for structural "welding"; hydrophobic polyurethane for active water leaks)
- **CMU (block) foundations**: Injection ineffective due to hollow cores — use flexible surface sealants backed by interior drainage channels
- Bug holes and form-tie penetrations: Patch with fast-setting hydraulic cement before coating

---

## 6. Production Rates

| Method | Rate (SF/hr) | Notes |
|--------|-------------|-------|
| Airless spray | 500-800 | Requires specialized equipment; efficient for large footprints |
| Roller | 150-250 | Excellent for controlling high-build thickness |
| Brush | 50-100 | Working material into masonry pores and pinhole detailing |
| Sheet membrane | 75-125 | Highly labor-intensive per unit area |

### DFT Calculation
- To achieve required 60-mil DFT, wet-film thickness (WFT) must be calculated based on product's volume solids

---

## 7. Failure Modes

| Failure Mode | Cause | Prevention |
|-------------|-------|-----------|
| **Osmotic blistering/delamination** | Membrane over damp concrete (MC > 4%), laitance, or efflorescence | Proper surface prep; moisture testing |
| **Improper material selection** | Brittle damp-proofing used where waterproofing required; rigid sealers crack with settlement | Match material to hydrostatic conditions |
| **Grade-line transition failure** | Caulking the 3/8" gap below siding traps water against framing | Z-flashing with open gap; no caulk |
| **UV degradation** | Below-grade membrane exposed above dirt line without protection | UV-resistant coating or protection board |

---

## PaintFactor Integration Notes

### Modifier Keys
- `FOUNDATION_TYPE`: [Poured_Concrete, CMU_Block]
- `TREATMENT_CLASS`: [Damp_Proofing, Waterproofing]
- `COATING_MATERIAL`: [Elastomeric, Bituminous, Cementitious, Sheet_Membrane, Penetrating_Silicate]
- `ZONE`: [Below_Grade, Above_Grade, Grade_Transition]

### Decision Logic

| Condition | Action |
|-----------|--------|
| Water table = High OR Soil = Expansive clay | Require waterproofing class (elastomeric, 40-60 mil DFT) |
| Water table = Low AND Soil = Well-drained | Damp-proofing acceptable |
| Zone = Above_Grade | Auto-add UV-resistant coating or protection board |
| Foundation = CMU AND Cracks present | **Cannot use injection** — use flexible surface sealants + interior drainage |
| MC > 4% at coating surface | **Hard Stop**: Surface must dry before membrane application |
| Efflorescence present | Auto-add treatment/removal task before coating |

### Production Rate Keys
- `RATE_FOUNDATION_SPRAY` = 500-800 SF/hr
- `RATE_FOUNDATION_ROLL` = 150-250 SF/hr
- `RATE_FOUNDATION_BRUSH` = 50-100 SF/hr
- `RATE_FOUNDATION_SHEET` = 75-125 SF/hr
