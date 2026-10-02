# Exterior Surface Assessment Doctrine

**Spec Family ID:** SF_EXT_SURFACE_ASSESSMENT
**Status:** DRAFT
**Version:** 0.1.0
**Effective Date:** 2026-03-06
**Source:** NotebookLM Research (49 sources) — Exterior Architectural Coating Systems Substrate Assessment

---

## 1. Scope

### 1.1 What This Doctrine Covers

This doctrine governs the forensic assessment of existing exterior coating systems for residential and light commercial repaint scopes. It covers:

- Mechanisms of exterior coating failure and film pathology
- Standardized adhesion testing protocols (ASTM D3359)
- Bond failure type classification (adhesive, cohesive, substrate)
- Wood substrate moisture dynamics and measurement
- The `SS_*` substrate state vocabulary (SS_1 through SS_5) with MPI DSD correlation
- PCA industry standards for surface assessment (P4, P8, P10)
- Production rate multipliers by degree of surface degradation
- Remediation protocols for chalking and degraded coatings

### 1.2 What Is Excluded

- **Interior substrates** — covered by interior doctrine documents
- **Substrate type classification and primer selection** — covered by `Exterior_Substrates_Doctrine.md`
- **Protection protocols** — covered by `Exterior_Protection_Doctrine.md`
- **FAC_* modifier values** — defined in `Exterior_Modifiers_Doctrine.md`
- **New construction substrate states** — this doctrine addresses repaint/existing coating assessment only
- **Roofing and below-grade waterproofing** — outside painting scope

### 1.3 Key Terminology

| Term | Definition |
|------|------------|
| **Substrate State (SS_*)** | The starting condition of a surface's existing coating system, classified SS_1 through SS_5. Integrates MPI Degree of Surface Degradation (DSD) levels with PCA preparation standards. |
| **Degree of Surface Degradation (DSD)** | MPI classification system (DSD-0 through DSD-4) quantifying the extent of coating system failure. |
| **Dry Film Thickness (DFT)** | The thickness of a cured coating measured in mils (1 mil = 25.4 microns). Loss of DFT through chalking or erosion exposes the substrate. |
| **Wet Film Thickness (WFT)** | The thickness of a coating at the moment of application, before solvent/water evaporation. Exceeding manufacturer WFT limits causes mud cracking. |
| **Adhesion Rating** | Quantified bond strength per ASTM D3359, rated 0 (total failure) to 5 (optimal adhesion). |
| **Moisture Content (MC)** | Percentage of water by weight in a wood substrate. The single most important variable in predicting exterior repaint success. |
| **Feather-Edging** | Sanding the perimeter of adhered paint to eliminate visible ridges where scraped areas meet intact coating. Required at PCA Level 3 and above. |
| **Chalk-Binding Primer** | High resin-to-pigment ratio, low viscosity primer formulated to penetrate residual chalk powder and wet out the solid substrate beneath. |

---

## 2. Coating Failure Mechanisms

### 2.1 Chemical Degradation

#### 2.1.1 Photoxidation and Chalking

Chalking is the gradual erosion of the paint binder triggered by prolonged UV exposure (UVA and UVB spectrums). UV radiation breaks the molecular bonds of the polymer chain, releasing pigment and extender particles (notably titanium dioxide) as a friable surface powder.

- **Oil-based/alkyd coatings** are significantly more susceptible — unsaturated fatty acids contain double bonds easily cleaved by UV light
- **100% acrylic latex formulations** resist UV-induced scission due to saturated polymer backbones
- Heavy chalking is a clinical sign of film erosion — protective DFT is being lost, eventually exposing the substrate to moisture and biological attack

#### 2.1.2 Oxidative Cross-Linking

Distinct from photoxidation, this process affects oil-based coatings. Alkyd paints cure through oxidative cross-linking, which continues indefinitely after initial cure. Over years of exposure to atmospheric oxygen and heat, the film becomes increasingly brittle, preventing accommodation of substrate thermal expansion and contraction. This leads to cracking and delamination.

### 2.2 Mechanical Failures

#### 2.2.1 Checking

Fine, superficial fissures that do not penetrate through the entire coating system to the substrate. Caused by differential shrinkage — the top layer loses volume faster than layers beneath. Common in thick coatings or those applied in high-heat, low-humidity environments.

#### 2.2.2 Cracking (Macro-Fissuring)

Deep breaks extending through at least one full layer of the coating system to the substrate. Frequently driven by mud cracking — coating applied at WFT exceeding manufacturer recommendations. The surface skins over while the bulk remains liquid; subsequent shrinkage pulls the film apart in a dried-mud-flat pattern.

#### 2.2.3 Alligatoring

Patterned, deep fissures caused by layer incompatibility. Tensile stress failure produces a distinctive reptilian-skin pattern, typically indicating incompatible coating layers or excessive film build.

### 2.3 Adhesion Failures

#### 2.3.1 Moisture Blisters

Liquid water enters the substrate (through unsealed end-grain or interior vapor migration) and is heated by the sun. Vapor pressure exceeds the adhesive bond, forming dome-shaped blisters.

#### 2.3.2 Temperature Blisters

Distinct from moisture blisters. Occur primarily in dark-colored, oil-based coatings applied in direct sunlight. Solar heating vaporizes solvents before they can escape the surface skin, creating small, dry bubbles in the topcoat.

#### 2.3.3 Peeling

Total failure of the interface. Two types:

- **Intercoat peeling** — failure between paint layers. Forensic indicator of critical recoat window violations (first coat cured too hard or became contaminated before second coat)
- **Substrate-level peeling** — entire system detaches from the substrate

### 2.4 Failure Mechanism Summary

| Failure Mechanism | Primary Cause | Chemical Outcome | Physical Manifestation |
|-------------------|---------------|------------------|----------------------|
| Chalking | UV photoxidation | Binder erosion | Friable surface powder |
| Oxidation | Atmospheric oxygen/UV | Excessive cross-linking | Brittleness, loss of gloss |
| Checking | Differential shrinkage | Internal film stress | Fine, superficial cracks |
| Alligatoring | Layer incompatibility | Tensile stress failure | Patterned, deep fissures |
| Leaching | High humidity/slow cure | Surfactant migration | Oily streaks or spots |
| Blistering (moisture) | Substrate water + solar heat | Vapor pressure buildup | Dome-shaped blisters |
| Blistering (temperature) | Direct sun on wet oil-based | Solvent vaporization | Small dry bubbles |
| Peeling (intercoat) | Recoat window violation | Bond contamination | Layer separation |
| Peeling (substrate) | Prep failure or moisture | Adhesive bond failure | Total system detachment |

---

## 3. Adhesion Diagnostics — ASTM D3359

### 3.1 Method A: X-Cut

Used for coating systems with DFT exceeding 125 microns (5 mils).

1. Make two intersecting cuts, each ~38mm long, into the coating down to the substrate
2. Intersection angle must be between 30 and 45 degrees
3. Apply standardized pressure-sensitive tape over intersection; smooth with pencil eraser
4. Recovery period: 90 +/- 30 seconds
5. Remove tape by pulling back upon itself at 180 degrees

### 3.2 Method B: Cross-Hatch Lattice

Used for thinner architectural films under 5 mils.

- Coatings up to 2 mils (50 microns): eleven incisions, 1mm apart
- Coatings 2–5 mils: six incisions, 2mm apart
- Tape application and removal identical to Method A

### 3.3 Adhesion Rating Scale

| Rating | Method A (X-Cut) | Method B (Lattice) | Forensic Interpretation |
|--------|------------------|--------------------|-----------------------|
| 5 (A/B) | No peeling or removal | Edges completely smooth | Optimal adhesion; surface ready for coating |
| 4 (A/B) | Trace peeling along incisions | Small flakes at intersections (<5%) | Good adhesion; standard prep required |
| 3 (A/B) | Jagged removal up to 1.6mm on sides | Flaking along edges and intersections (5–15%) | Marginal adhesion; risk of intercoat failure |
| 2 (A/B) | Removal from most of the X area | Flaking along edges and parts of squares (15–35%) | Poor adhesion; requires extensive scraping |
| 1 (A/B) | Removal from most of the X area | Large ribbons of flaking (35–65%) | Failed system; requires full removal |
| 0 (A/B) | Removal beyond area of incisions | Total flaking/detachment (>65%) | Substrate contamination or system failure |

### 3.4 Bond Failure Types

| Failure Type | Where Failure Occurs | Forensic Indicator |
|-------------|---------------------|-------------------|
| **Adhesive** | Interface between two different materials (e.g., primer and substrate) | Substrate left clean — lack of chemical or mechanical bond |
| **Cohesive** | Within a single material (paint film splits in half) | Paint on both tape and substrate — internal strength lower than bond to substrate |
| **Substrate** | Substrate itself fractures | Common on weathered wood — paint pulls away degraded wood fibers |

---

## 4. Wood Substrate Moisture Dynamics

### 4.1 Dimensional Movement

Wood is biological, anisotropic, and hygroscopic. Dimension changes significantly as moisture content fluctuates:

- Wood shrinks roughly **twice as much tangentially** (parallel to growth rings) as radially (across rings)
- **Checks** — longitudinal fiber separations running across growth rings, caused by the exterior surface drying faster than the moist core
- **Splits** — through-checks extending from one surface to another, most common at board ends where end-grain moisture loss is rapid

From a coating perspective, checks and splits are high-risk areas. As wood expands and contracts, rigid paint films bridge the crack initially but eventually fracture, allowing liquid water entry and initiating decay and peeling.

### 4.2 Moisture Content Thresholds

| Wood State | Moisture Content (MC) | Coating Implications |
|------------|----------------------|---------------------|
| Kiln-Dried | 6%–9% | Optimal for interior; can be too dry for exterior (risk of rapid swelling) |
| Acceptable Exterior | 9%–14% | Ideal range for application of primers and stains |
| Maximum Threshold | 15%–16% | Limit for professional warranty; adhesion begins to drop above this |
| High Risk | 17%–19% | Significant risk of peeling and surfactant leaching |
| Failed State | >20% | Probability of rot/mildew; coating will not adhere |

> **Critical:** The maximum moisture content for applying exterior architectural coatings is 15%–16%. Applying paint to wood with MC of 20% or higher is a virtual guarantee of failure.

### 4.3 Moisture Measurement Instrumentation

| Meter Type | Technology | Advantages | Limitations |
|-----------|-----------|-----------|------------|
| **Pin-Type (Resistive)** | Two metal probes driven into wood; measures electrical resistance | Highly accurate for core moisture; localized readings | Causes minor surface damage |
| **Pinless (Capacitive/Electromagnetic)** | Sensor pad emits electromagnetic signal into wood | Non-destructive; covers broader area | Sensitive to wood specific gravity — requires species input for accuracy |

---

## 5. Substrate State Classification (SS_*)

The `SS_*` vocabulary integrates the MPI Degree of Surface Degradation (DSD) levels with PCA preparation standards.

### 5.1 SS_1 — Sound Substrate (DSD-0)

Structurally sound. Existing coating intact with no evidence of flaking, checking, or chalking. Only surface dust and pollutants require removal.

- **Prep Requirement:** PCA Level 1 (Basic Cleaning) — low-pressure washing or hand dusting

### 5.2 SS_2 — Slightly Deteriorated (DSD-1)

Early signs of weathering: light chalking or minor color fading. Film remains continuous. No substrate exposed.

- **Prep Requirement:** PCA Level 2 (Standard) — washing and potentially light scuff-sanding to improve mechanical profile

### 5.3 SS_3 — Moderately Deteriorated (DSD-2)

Localized failure. Small areas of peeling or cracking affecting 10%–25% of the area. Substrate may be exposed in small patches.

- **Prep Requirement:** PCA Level 3 (Superior) — thorough scraping of all loose material, feather-edging of remaining paint, spot priming of all exposed substrate

### 5.4 SS_4 — Severely Deteriorated (DSD-3)

Widespread failure. Peeling and flaking affect more than 25% of the surface. Remaining paint is often brittle with lost adhesive bond.

- **Prep Requirement:** PCA Level 4 (Supreme/Restoration) — total removal of existing coating system via chemical stripping, heat, or intensive mechanical abrasion

### 5.5 SS_5 — Substrate Failure (DSD-4)

Failure extends beyond the coating. Underlying wood is rotting, masonry is spalling, or metal is structurally corroded.

- **Requirement:** Substrate replacement. No amount of preparation can stabilize a failed substrate for coating.

---

## 6. PCA Industry Standards for Surface Assessment

### 6.1 PCA P4 — Responsibility for Surface Approval

The painting contractor is responsible for inspecting the surface prior to application. If a substrate is found in a condition that would compromise the coating (e.g., high moisture, structural damage), the contractor must notify the owner or general contractor **in writing** before proceeding. Proceeding without notification shifts liability for future failure to the painter.

### 6.2 PCA P8 — Maintenance and Aesthetic Degradation

Defines criteria for repainting based on aesthetic and protective decline. A surface is "properly painted" if it is uniform in appearance, color, and sheen when viewed from a distance of **39 inches (1 meter)** under finished lighting conditions.

### 6.3 PCA P10 — Surface Measurement for Estimating

Provides rules for quantifying work based on substrate condition. The **Linear Foot Rule** states that any item less than one linear foot wide (narrow trim, pipes) should be measured as one square foot per linear foot to account for the disproportionate labor required for cutting in and detail work.

---

## 7. Production Rate Multipliers by Degradation

The cost of an exterior repaint is determined not by square footage alone but by the Degree of Existing Surface Degradation. Professional estimators apply multipliers to base production rates to account for the exponential increase in labor as a surface moves from SS_1 to SS_4.

| Substrate State | Prep Intensity | Production Multiplier | Labor Impact |
|----------------|---------------|----------------------|-------------|
| SS_1 | Minimal | 1.00x | Washing and application only |
| SS_2 | Light | 1.25x–1.40x | Localized scraping, light sanding |
| SS_3 | Heavy | 2.00x–2.50x | Extensive scraping, feathering, spot priming |
| SS_4 | Extreme | 3.50x–5.00x | Total stripping, full priming, multiple coats |

> **Note:** If a base production rate for painting sound wood siding is 150 SF/hr, a surface in SS_3 condition may drop to 60 SF/hr due to scraping and sanding hours. Failure to account for these multipliers is the primary cause of budget overruns and shortcut preparation in the painting industry.

---

## 8. Remediation Protocols for Heavy Chalking

When SS_2 or SS_3 is identified due to heavy chalking, the following protocol must be strictly followed to prevent adhesion failure:

1. **Mechanical Removal** — Pressure washing is preferred, but heavy chalk must be supplemented by manual scrubbing using a trisodium phosphate (TSP) solution or specialized chalk-remover
2. **Tape Pull Verification** — Before priming, apply tape to the cleaned surface and pull. If the tape comes away with significant powder, the surface is not yet clean enough for coating
3. **Primer Selection** — For surfaces where light chalking persists despite cleaning, a chalk-binding primer is required (high resin-to-pigment ratio, low viscosity formulation that penetrates remaining powder and wets out the solid substrate)

---

## 9. Cross-References

### 9.1 Related Doctrine Documents

- `Exterior_Substrates_Doctrine.md` v0.1 — Substrate type classification, primer selection by substrate, quality tier behavior
- `Exterior_Protection_Doctrine.md` v0.1 — Protection protocols for exterior painting operations
- `Exterior_Modifiers_Doctrine.md` — FAC_* modifier values for exterior scopes
- `Quality_Tiers_and_Surface_Condition.md` — QT definitions, condition classes

### 9.2 Industry Standards

- ASTM D3359 — Standard Test Methods for Rating Adhesion by Tape Test
- MPI DSD — Degree of Surface Degradation (DSD-0 through DSD-4)
- PCA P4 — Responsibility for Surface Approval
- PCA P8 — Maintenance and Aesthetic Degradation (39" rule)
- PCA P10 — Surface Measurement for Estimating (Linear Foot Rule)

### 9.3 Source Research

- `Research Resources/Exterior Architectural Coating Systems Substrate Assessment.md` — Full research report (49 sources)

---

## 10. Change Log

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 0.1.0 | 2026-03-06 | SpecFactory | Initial draft from NotebookLM research report |
