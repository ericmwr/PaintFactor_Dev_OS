# Exterior Caulking & Sealants Doctrine

> **Topic 20** — Tier 4 (Cross-Surface Systems)
> Sources: NotebookLM fast research (10 web sources), imported references
> Generated: 2026-03-07

---

## 1. Sealant Types and Properties

| Type | Movement Class (ASTM C920) | Paintable | Lifespan | Best For |
|------|---------------------------|-----------|----------|---------|
| **Acrylic latex** | Low (+-7.5% to +-12.5%) | Yes — immediately after skinning | 5-10 years | Low-movement trim joints, painted wood |
| **Siliconized acrylic** | Low (not for expansion joints) | Yes | 10-15 years | Improved water resistance over straight acrylic |
| **Polyurethane** | Class 25 or 50 (+-25% to +-50%) | Yes — after 3-7 day cure | 15-25 years | Expansion joints, concrete, high-movement joints |
| **Silicone** | Class 50 (+-50%) | **No** — repels paint | 20-50+ years | Non-painted joints; apply after painting |
| **Hybrid (MS Polymer/SPUR)** | Class 25 (+-25%) | Yes — after skin forms | 20-30 years | Premium: combines silicone durability + paintability |

### Critical Rules
- **Silicone is never paintable** — if painting is required, use a different sealant or paint surfaces before applying silicone
- **Polyurethane requires 3-7 day cure before painting** — water from paint can cause "flash cure" and surface bubbling
- **Acrylic latex can be painted immediately** after skinning

---

## 2. Joint Design and Backer Rod

### Width-to-Depth Ratio
- Ideal ratio: **2:1** (joint twice as wide as deep); minimum 1:1
- Example: 1/2" wide joint requires 1/4" sealant depth

### Backer Rod
- Diameter: **25% larger than joint width** (width x 1.25) for proper compression fit
- **Closed-cell foam**: Most common; does not absorb water
- **Open-cell foam**: Allows vapor transmission; faster curing for moisture-cure sealants
- **Bi-cellular (SOF Rod)**: Prevents outgassing and bubbling if rod skin is punctured

### Three-Sided Adhesion Prevention
- Backer rod acts as bond-breaker on bottom of joint
- **Three-sided adhesion causes premature failure** — sealant must bond only to two opposing sidewalls

---

## 3. Sequencing Relative to Primer and Finish Coats

### Correct Sequence
1. Clean and dry substrate
2. Apply **substrate primer** if required for sealant adhesion
3. Apply caulk/sealant
4. Allow full cure (varies by type — see cure times above)
5. Apply paint primer and finish coats over cured caulk

### Why Cure Time Matters
- Caulk beads are ~40 mils thick vs. paint films at 1-3 mils
- Uncured caulk shrinks as it cures → **paint film cracks** if applied too early

---

## 4. Failure Modes

| Failure Mode | Description | Root Cause |
|-------------|-------------|-----------|
| **Adhesive failure** | Sealant pulls away cleanly from substrate; sealant intact | Poor surface prep (dirt, oil, moisture); missing substrate primer; incompatible sealant |
| **Cohesive failure** | Sealant tears/splits down the middle; both sides remain bonded | Joint movement exceeded sealant rating; joint too narrow; UV-aged brittle sealant |

---

## 5. Production Rates

- Caulking is estimated by **linear feet per man-hour**
- Typical exterior residential rates: **75-150 LF/hr** (varies by joint complexity, access, and backer rod requirements)
- Complex joints (backer rod + tooling): slower end of range
- Simple trim joints (gun-and-tool): faster end of range

---

## PaintFactor Integration Notes

### Modifier Keys
- `SEALANT_TYPE`: [Acrylic_Latex, Siliconized_Acrylic, Polyurethane, Silicone, Hybrid_MS]
- `JOINT_LOCATION`: [Trim_to_Siding, Window_Perimeter, Corner_Board, Penetration, Expansion]
- `JOINT_COMPLEXITY`: [Simple_Bead, Backer_Rod_Required, Multi_Material]

### Decision Logic

| Condition | Action |
|-----------|--------|
| Joint requires painting | **Block** silicone sealant — use polyurethane or hybrid |
| Joint movement > +-12.5% | Require polyurethane (Class 25/50) or hybrid — acrylic insufficient |
| Sealant = Polyurethane | Enforce minimum 3-day cure before primer/paint |
| Joint width > 3/8" | Auto-add backer rod task |
| Any exterior caulk scope | Auto-add as line item (separate from painting labor) |

### Production Rate Keys
- `RATE_CAULK_SIMPLE` = 100-150 LF/hr
- `RATE_CAULK_BACKER_ROD` = 75-100 LF/hr
