# Exterior Substrates Doctrine

**Spec Family ID:** SF_EXT_SUBSTRATES
**Status:** DRAFT
**Version:** 0.1.0
**Effective Date:** 2026-02-20
**Source:** PaintFactor_OS.md, Quality_Tiers_and_Surface_Condition.md

---

## 1. Scope

### 1.1 What This Doctrine Covers

This doctrine governs exterior substrate types used in residential and light commercial painting scopes. It covers:

- Identification and classification of exterior substrate types
- Substrate-appropriate prep sequences (cleaning, scraping, sanding, caulking)
- Primer requirements by substrate type and substrate state
- Material system guidance by substrate type
- Quality tier behavior for exterior painting scopes
- Coat count requirements by substrate state and quality tier
- Escalation rules for non-fixed-price conditions

Substrate types covered: wood siding and trim, fiber cement (HardiePlank and equivalents), engineered wood (LP SmartSide and equivalents), masonry (brick, CMU, stucco, EIFS), metal (ferrous and non-ferrous), and composite/PVC trim.

### 1.2 What Is Excluded

- **Interior substrates** — covered by interior doctrine documents
- **Deck and fence stain** — future doctrine (not yet authored)
- **Roofing materials** — outside painting scope
- **FAC_* modifier values** — defined in `Exterior_Modifiers_Doctrine.md`
- **SYS_* material system IDs** — defined in `materials.json` per spec
- **Deck boards and horizontal exposed surfaces** — treated as separate scope from vertical siding

### 1.3 Key Terminology

These definitions follow the canonical language of `Substrate_State_Reference.md` §1:

| Term | Definition |
|------|------------|
| **Substrate Type** | The physical material (wood, fiber cement, masonry, metal, PVC). Describes what the surface is made of. |
| **Substrate State** | The starting condition of a surface's coating system — what exists on the substrate before the painting scope begins. Identified by `SS_EXT_*` IDs. |
| **Surface Condition** | The physical state of what exists on the substrate (Good, Fair, Poor). Independent of substrate state. Both dimensions must be captured by PaintScope and declared in specs. |
| **Quality Tier** | The expected outcome standard (`QT2` through `QT6`). Controls thoroughness, process steps, and material grade. |
| **Field Prime** | Primer applied on-site by the painter, as distinct from factory-applied primer. |
| **Factory Prime** | Primer applied at the manufacturing facility. For fiber cement and engineered wood, factory prime is transit and weather protection only — not finish-ready. |

---

## 2. Substrate Classification

### 2.1 Wood Substrates

**Types:**
- Clapboard siding (bevel siding)
- Shiplap
- Board and batten
- Cedar siding and trim
- Pine siding and trim
- Redwood siding and trim
- Fascia boards (wood species vary)
- Soffit (wood, not fiber cement)
- Exterior door and window trim

**Characteristics:**
- Porous; absorbs moisture readily, especially at end grain
- Checks, grays, and oxidizes when left unprotected or when coating fails
- Variable grain density (cedar and redwood are more stable than pine)
- Knots and resin pockets bleed tannins and resin through water-based primers
- Subject to dimensional movement with seasonal humidity changes

**Valid SS_EXT_* States:**

| State ID | Typical Condition |
|----------|-------------------|
| `SS_EXT_BARE_WOOD` | New siding installed without coating; stripped surfaces |
| `SS_EXT_PRIMED_FIELD` | Field-primed and ready for topcoat |
| `SS_EXT_SOUND_PAINT` | Existing coating intact, adhered, repaint candidate |
| `SS_EXT_CHALKING` | Coating chalky but adhered; chalk transfers on touch |
| `SS_EXT_FAILING_PAINT` | Cracking or peeling in localized areas |
| `SS_EXT_PEELING` | Active peeling; coating lifting from substrate |
| `SS_EXT_WEATHERED` | Uncoated substrate exposed and gray/oxidized |

**Primer Requirements:**
- Knots and resin pockets: oil-based or shellac-based spot prime before field prime (prevents bleed-through)
- Field prime for `SS_EXT_BARE_WOOD` and `SS_EXT_WEATHERED`: 100% acrylic exterior primer
- Spot prime on scraped bare areas in `SS_EXT_FAILING_PAINT` and `SS_EXT_PEELING` states

---

### 2.2 Fiber Cement

**Types:**
- HardiePlank lap siding
- HardieSoffit panels
- HardieTrim boards
- HardieShingle

**Characteristics:**
- Non-porous cementitious composite — does not absorb moisture through face
- All products ship with factory primer applied (transit/weather protection)
- Cut ends are porous and absorb moisture; must be sealed before installation and before prime
- Extremely stable dimensionally relative to wood
- Surface profile is consistent and predictable

**Valid SS_EXT_* States:**

| State ID | Typical Condition |
|----------|-------------------|
| `SS_EXT_BARE_FIBERCEMENT` | Cut ends exposed or factory primer damaged/absent |
| `SS_EXT_PRIMED_FACTORY` | As-delivered with factory primer intact |
| `SS_EXT_PRIMED_FIELD` | Field primer applied over factory prime; ready for topcoat |

> **Critical Rule:** Factory prime on fiber cement is transit protection only — it is NOT finish-ready. A field prime coat is REQUIRED before topcoat application. Without field prime, topcoat adhesion and manufacturer warranty are void. Cut ends must be sealed (end-cut sealer or field primer) before installation or as early as possible after cutting.

---

### 2.3 Engineered Wood

**Types:**
- LP SmartSide panels and lap siding
- T1-11 plywood siding
- OSB-based siding products

**Characteristics:**
- Factory primed from LP and similar manufacturers (similar status to fiber cement factory prime)
- More moisture-sensitive at joints, edges, and cut ends than fiber cement
- T1-11 and OSB products are particularly vulnerable at vertical grooves and horizontal joints where water can penetrate
- Common substrate in residential construction in NC market
- LP SmartSide carries manufacturer warranty that requires specific approved paint systems

**Valid SS_EXT_* States:**

| State ID | Typical Condition |
|----------|-------------------|
| `SS_EXT_BARE_FIBERCEMENT` | Same prep logic applies — treat bare/damaged areas as bare substrate |
| `SS_EXT_PRIMED_FACTORY` | As-delivered factory prime intact |
| `SS_EXT_PRIMED_FIELD` | Field prime applied; ready for topcoat |

> **Note:** LP SmartSide warranty requires use of specific approved paint systems. Verify paint selection against LP warranty requirements before spec finalization. Factory prime on engineered wood requires field prime before topcoat — same rule as fiber cement.

---

### 2.4 Masonry

**Types:**
- Brick (common, face, and veneer)
- CMU (concrete masonry unit / block)
- Poured concrete
- Stucco (3-coat traditional portland cement)
- Synthetic stucco / EIFS (Exterior Insulation and Finish System)

**Characteristics:**
- Highly porous; absorbs primer and paint at higher rates than wood or fiber cement
- Alkaline pH (especially new concrete and stucco) can saponify oil-based binders, causing adhesion failure
- Subject to moisture migration from interior and capillary action from ground contact
- Efflorescence (white salt deposits) common on brick and CMU; must be removed before painting
- EIFS surfaces require elastomeric coatings capable of bridging hairline movement cracks
- Stucco cracks and hairline checks require flexible coating systems

**Valid SS_EXT_* States:**

| State ID | Typical Condition |
|----------|-------------------|
| `SS_EXT_BARE_MASONRY` | Unpainted masonry surface, new construction |
| `SS_EXT_SOUND_PAINT` | Existing coating adhered, repaint candidate |
| `SS_EXT_FAILING_PAINT` | Coating cracking or peeling in areas |
| `SS_EXT_PEELING` | Active peeling; coating lifting from masonry |

> **Critical Rule:** New masonry (concrete, stucco, CMU) must cure a minimum of 28 days before painting. Painting before cure is complete traps moisture and causes adhesion failure. Use masonry-specific primer or alkaline-tolerant primer. Do NOT use oil-based primers on new or recently cured masonry.

---

### 2.5 Metal

**Types:**
- Ferrous metal (steel framing, iron railings, steel doors)
- Aluminum trim and flashing
- Galvanized metal (gutters, flashing, drip edges, metal roofline components)

**Characteristics:**
- Ferrous metal rusts rapidly when bare surface is exposed to moisture; barrier primer required same day as prep
- Galvanized metal has a zinc coating that inhibits adhesion of standard primers; requires galvanized primer or etching
- Aluminum requires adhesion primer; will not hold standard primer reliably without surface preparation
- Previously painted metal in `SS_EXT_SOUND_PAINT` state can receive direct topcoat with proper prep

**Valid SS_EXT_* States:**

| State ID | Typical Condition |
|----------|-------------------|
| `SS_EXT_BARE_METAL` | Raw ferrous, aluminum, or galvanized — no coating |
| `SS_EXT_SOUND_PAINT` | Existing coating intact and adhered |
| `SS_EXT_FAILING_PAINT` | Existing coating cracking or peeling |

> **Critical Rule:** Bare ferrous metal MUST be primed on the same day as surface preparation. Rust begins forming within hours on bare steel in humid conditions. Any delay between prep and prime voids the surface prep and requires re-prep.

---

### 2.6 Composite / PVC Trim

**Types:**
- Cellular PVC trim boards (Azek, Versatex, and equivalents)
- Composite trim boards

**Characteristics:**
- Non-porous; does not absorb moisture
- Smooth, consistent surface — good adhesion with proper preparation
- Requires mechanical or chemical adhesion activation (light scuff sand or adhesion primer) before prime
- PVC expands and contracts significantly with temperature variation — larger than wood movement
- Factory surface may have release agents or processing residue that inhibits adhesion if not cleaned

**Valid SS_EXT_* States:**

| State ID | Typical Condition |
|----------|-------------------|
| `SS_EXT_BARE_WOOD` | Same prep logic applies — treat as bare substrate requiring prime |
| `SS_EXT_PRIMED_FIELD` | Field prime applied; ready for topcoat |

> **Note:** All caulked joints on PVC trim must use a flexible paintable caulk rated for PVC movement (polyurethane or high-quality siliconized acrylic). Standard painter's caulk will crack as PVC moves. Joint movement must be accommodated at every board-to-board and board-to-substrate joint.

---

## 3. Substrate State Assessment Protocol

### 3.1 Visual Inspection Criteria

A 3-minute field assessment is sufficient to assign an `SS_EXT_*` state to most exterior surfaces. Use the following criteria:

**Chalk Rub Test (for `SS_EXT_CHALKING` identification):**
- Drag a clean rag or gloved hand firmly across the surface
- If white or colored chalk powder transfers readily to the rag, state is `SS_EXT_CHALKING`
- If no transfer occurs, surface is not chalking

**Knife Adhesion Test (for borderline `SS_EXT_SOUND_PAINT` vs. `SS_EXT_FAILING_PAINT`):**
- Press the tip of a putty knife flat against the surface and attempt to lift the coating
- If coating cannot be lifted, it is tightly adhered — assign `SS_EXT_SOUND_PAINT`
- If coating lifts with minimal pressure, assign `SS_EXT_FAILING_PAINT`

**Scrape Test (for `SS_EXT_PEELING` confirmation):**
- Observe whether coating is actively lifting from the substrate without tool pressure
- Areas where coating is visibly curling, blistering, or separating in sheets = `SS_EXT_PEELING`
- If peeling is localized to specific runs or areas, note percentage of elevation affected for escalation assessment

**Visual Pattern for `SS_EXT_WEATHERED`:**
- Bare wood (no paint) that has turned gray, checked, or shows surface oxidation
- Distinct from `SS_EXT_BARE_WOOD` (new uncoated wood with no weathering)

### 3.2 Escalation Rules

The following conditions escalate from fixed-price to hourly billing:

| Condition | Escalation Trigger |
|-----------|--------------------|
| `SS_EXT_PEELING` at QT4 or higher | Prep scope is unpredictable; bare area percentage unknown until scraping complete |
| Moisture intrusion active | Source must be corrected before painting; scope undetermined |
| Substrate rot present | Rot must be removed or consolidated; scope undetermined |
| Efflorescence present (masonry) | Source investigation and treatment required before prime |
| More than 30% of elevation is `SS_EXT_PEELING` | Full scrape scope is not estimable at fixed price |

When escalation conditions are present: document the condition in PaintScope, flag for hourly billing, and note that prep is charged as time-and-material with finish tasks at standard fixed pricing once prep is complete.

### 3.3 Moisture Protocol

Wood substrate moisture content must be within acceptable range before painting:

- **Maximum moisture content for painting:** 15% MC (measured with a moisture meter)
- Substrate above 15% MC must not be painted; defer until moisture drops
- Sources of elevated moisture: recent rain, condensation, ice melt, ground splash, unvented crawlspace

**Protocol for wet or borderline substrates:**
1. Measure MC with pin-type or pinless moisture meter at representative locations
2. If MC exceeds 15%, delay painting and identify moisture source
3. Re-measure at next scheduled visit; paint only when MC is within range
4. Document MC readings in project notes

---

## 4. Preparation Standards

### 4.1 Cleaning

**Pressure Washing:**

| Surface | Pressure Range | Notes |
|---------|---------------|-------|
| Siding (wood, fiber cement, engineered wood) | 1500–3000 PSI | Lower end for older or softer surfaces |
| Soffit and trim | 800–1200 PSI | High pressure damages soffit edges and thin trim |
| Masonry (brick, CMU, stucco) | 1500–2500 PSI | Adjust for mortar joint condition |
| Metal surfaces | 1000–2000 PSI | Avoid creating flash rust; prime promptly |

**TSP or TSP-Substitute Wash:**
- Required for `SS_EXT_CHALKING` — removes chalk residue that prevents adhesion
- Required for `SS_EXT_SOUND_PAINT` at QT3 and above — removes dirt, oxidation, and surface contamination
- Required for `SS_EXT_FAILING_PAINT` — cleans loose material before scraping

**Mildewcide Treatment:**
- Required when mold or mildew is present on any substrate
- Apply mildewcide solution (sodium hypochlorite or commercial mildewcide per PDS)
- Allow 10-minute dwell time before rinsing
- Rinse thoroughly; do not allow dried mildewcide residue to remain under coating

### 4.2 Scraping and Sanding

| State | Scraping | Sanding |
|-------|----------|---------|
| `SS_EXT_CHALKING` | None | Light scuff sand after wash |
| `SS_EXT_FAILING_PAINT` | Scrape loose and lifting areas | Feather edges at all scraped areas |
| `SS_EXT_PEELING` | Full scrape to bare substrate | Heavy sand; feather all edges smooth |
| `SS_EXT_WEATHERED` | None (no coating present) | Sand with 80-grit to remove gray oxidized surface layer |
| `SS_EXT_SOUND_PAINT` | None (spot exceptions) | Light scuff sand for adhesion at QT3+ |
| `SS_EXT_BARE_WOOD` | None | Minimal sand; smooth any rough grain if needed |

**Edge feathering standard:** Scraped edges must be feathered smooth so there is no hard ledge visible through primer. Hard edges telegraph through to the finish coat.

### 4.3 Caulking

**Required locations:**

| Location | Product | Notes |
|----------|---------|-------|
| Siding joints at trim (corner boards, casings) | Flexible paintable caulk (polyurethane or siliconized acrylic) | Apply before prime |
| Trim board end-to-end joints | Flexible paintable caulk | Fill before prime |
| Window perimeter (siding-to-window casing) | Flexible paintable caulk | Critical moisture control point; inspect and re-caulk at every repaint |
| Door perimeter | Flexible paintable caulk | Same as window protocol |

> **Do NOT caulk lap joints on clapboard siding.** Lap joints are intentional moisture release points. Caulking them traps moisture behind the siding and causes accelerated substrate rot and paint failure. This prohibition applies regardless of quality tier.

### 4.4 Priming

**Spot Prime (required):**
- Bare wood repairs (any state where wood is exposed after scraping)
- Knots and resin pockets on wood substrates (use oil-based or shellac-based spot prime)
- Any location where existing coating has been removed to bare substrate

**Full Prime (required):**
- `SS_EXT_BARE_WOOD` — full field prime with 100% acrylic exterior primer
- `SS_EXT_WEATHERED` — full field prime after sanding
- `SS_EXT_BARE_MASONRY` — full prime with masonry-specific primer
- `SS_EXT_BARE_METAL` — full prime with substrate-appropriate rust-inhibiting or adhesion primer
- All bare sections in `SS_EXT_PEELING` after full scrape

**Field Prime Over Factory Prime (required):**
- `SS_EXT_PRIMED_FACTORY` (fiber cement and engineered wood) — always field prime before topcoat
- This is not optional; it is a system requirement for both adhesion and manufacturer warranty

**Not required:**
- `SS_EXT_SOUND_PAINT` — properly prepped surface receives topcoat direct
- `SS_EXT_PRIMED_FIELD` — ready for topcoat without additional prime

### 4.5 Coat Count by Substrate State and Quality Tier

| Substrate State | QT2 | QT3 | QT4 |
|-----------------|-----|-----|-----|
| `SS_EXT_BARE_WOOD` (field primed) | 2 | 2 | 2 |
| `SS_EXT_PRIMED_FACTORY` (field primed) | 2 | 2 | 2 |
| `SS_EXT_SOUND_PAINT` | 1 | 2 | 2 |
| `SS_EXT_CHALKING` | 1 | 2 | 2 |
| `SS_EXT_FAILING_PAINT` | 2 | 2 | 2 |
| `SS_EXT_WEATHERED` (field primed) | 2 | 2 | 2 |

> **Note:** Coat counts shown are for the finish/topcoat stage. Prime coats are additional and required as specified in §4.4. For `SS_EXT_SOUND_PAINT` and `SS_EXT_CHALKING`, a single finish coat at QT2 is acceptable only when the existing coating provides sufficient hiding and the surface is properly prepped. At QT3 and above, two finish coats are standard.

---

## 5. Quality Tier Behavior (Exterior)

### 5.1 QT2 — Economy Exterior

**Process:**
- Scrape obvious peeling areas only (passes putty knife test = leave it)
- Light pressure wash; no TSP required unless mold present
- Spot prime scraped bare areas
- Single finish coat acceptable on `SS_EXT_SOUND_PAINT` and `SS_EXT_CHALKING`
- Two finish coats on bare or heavily prepped surfaces

**Materials:** Economy-grade 100% acrylic exterior; single-grade products acceptable

**Edge work:** Acceptable coverage; no tape requirement; crisp cut-in not required

**Typical use cases:** Rental property maintenance, pre-sale refresh on low-value structures, insurance/HUD, budget-constrained

### 5.2 QT3 — Standard Residential

**Process:**
- Full pressure wash of all surfaces
- TSP or TSP-substitute wash on `SS_EXT_SOUND_PAINT`, `SS_EXT_CHALKING`, `SS_EXT_FAILING_PAINT`
- Scrape all loose and lifting paint; feather edges
- Spot prime all bare areas
- Caulk windows, doors, and siding-to-trim joints
- Two finish coats on all surfaces

**Materials:** Mid-grade 100% acrylic exterior; substrate-rated products

**Edge work:** Professional; clean cut-in at trim lines; minimal wobble acceptable at distance

**Typical use cases:** Standard homeowner repaint, new construction standard spec, most residential exterior

### 5.3 QT4 — Premium Exterior

**Process:**
- Full pressure wash
- TSP wash on all previously coated surfaces
- Full scrape and feather all failing areas; sand all edges smooth
- Prime all bare areas; spot prime knots and repairs
- Re-caulk all window and door perimeters; caulk all siding-to-trim joints
- Two finish coats with premium materials
- Light sand between coats where surface texture warrants
- Thorough inspection under raking light before second coat

**Materials:** Premium 100% acrylic exterior (SW Emerald Exterior, BM Aura Exterior, or equivalent)

**Edge work:** Crisp cut-in at all trim lines; no visible wobble at 3 feet; tape used as needed to maintain lines

**Typical use cases:** High-end residential exterior, street-facing elevations, showcase homes, homes where curb appeal is priority

### 5.4 QT5 — Showcase Exterior Elements

QT5 is not typically used for field siding applications. QT5 is reserved for:
- Fine exterior millwork (decorative cornices, columns, detailed trim assemblies)
- Showcase front entry elements (entry door surround, pilasters, decorative brackets)
- Ornamental metalwork requiring maximum finish quality

**Condition Gate:** QT5 at fixed price is only applicable when substrate state is `SS_EXT_PRIMED_FACTORY` or `SS_EXT_SOUND_PAINT` (Good condition). Any other state at QT5 expectations escalates to hourly billing per the condition gate rule in `Quality_Tiers_and_Surface_Condition.md`.

**Typical use cases:** Landmark homes, museum-quality showcase elements, fine millwork details

### 5.5 Sheen / Quality Tier Gate (Exterior)

| Finish | Minimum QT | Applicable Surfaces |
|--------|------------|---------------------|
| Flat / Matte | QT2 | Siding fields, rough masonry |
| Satin | QT3 | Siding (standard), soffit |
| Semi-Gloss | QT3 | Trim, fascia, doors |
| Gloss | QT4 | Fine trim, entry doors |

> **Gloss on large siding fields is not recommended** regardless of quality tier. High-gloss sheen on large vertical surfaces amplifies surface irregularities and UV degradation proceeds faster than on satin or low-sheen products. Reserve gloss finishes for trim, doors, and small decorative elements.

---

## 6. Material System Guidance

### 6.1 Wood Siding and Trim

- **Finish system:** 100% acrylic exterior paint
- **Example products:** SW Emerald Exterior, BM Aura Exterior, PPG Timeless Exterior
- **Sheen range:** Flat to satin on siding fields; satin to semi-gloss on trim
- **Primer:** 100% acrylic exterior primer for field prime; oil-based or shellac for knot spot prime
- **Key attribute:** Excellent adhesion to primed wood; high flexibility accommodates wood movement

### 6.2 Fiber Cement and Engineered Wood

- **Finish system:** Manufacturer-approved 100% acrylic exterior
- **James Hardie warranty requirement:** SW Duration, SW Emerald, or other James Hardie-approved products; 2 coats required per warranty
- **LP SmartSide requirement:** Verify against LP-approved product list before spec finalization
- **Field prime:** 100% acrylic exterior primer applied over factory prime before any topcoat
- **Key attribute:** Consistent, non-porous surface responds well to high-quality acrylic systems with proper primer base

### 6.3 Masonry (Brick, CMU, Stucco, EIFS)

- **Primer:** Masonry-specific primer (SW Loxon Masonry Primer, BM Fresh Start Masonry Primer, or equivalent alkaline-tolerant formulation)
- **Finish system (brick, CMU, concrete):** 100% acrylic exterior or elastomeric topcoat
- **Finish system (stucco, EIFS):** Elastomeric coating strongly preferred — bridges hairline movement cracks that are endemic in stucco and EIFS surfaces
- **Key attribute:** High porosity requires masonry primer to seal surface and reduce material consumption; alkaline tolerance required for new masonry

### 6.4 Metal

- **Ferrous metal (steel, iron):** Rust-inhibiting primer (SW Pro Industrial DTM, Rust-Oleum Stops Rust, or equivalent) + 100% acrylic topcoat
- **Galvanized metal (gutters, flashing):** Galvanized metal primer or etching primer before topcoat; standard primers will not adhere to galvanized surfaces
- **Aluminum trim:** Adhesion primer before topcoat; clean surface thoroughly to remove manufacturing residue
- **Key attribute:** Barrier primer is the critical step; topcoat durability is dependent on primer adhesion and coverage

### 6.5 Coverage Rates

These rates are guidance for material quantity estimation. Verify against Product Data Sheet (PDS) and adjust for actual substrate state and porosity.

| Surface Type | Coverage Rate (SF/gal) | Notes |
|---|---|---|
| Smooth siding (fiber cement, PVC, smooth wood) | 250–350 | Per coat |
| Rough or weathered wood siding | 150–250 | Increased absorption on weathered surface |
| Masonry (brick, CMU, stucco) | 100–200 | Highly variable; porous masonry at low end |
| Fascia and trim (smooth) | 350–450 | Smooth substrate, brush application |

> **Note:** Coverage rates are for estimation guidance only. Actual yields depend on surface porosity, application method, film thickness, and ambient conditions. Always reference PDS for product-specific coverage. Rough or porous substrates will require significantly more material per coat than smooth surfaces.

---

## 7. Cross-References

### 7.1 Related Doctrine Documents

- `Substrate_State_Reference.md` §4 — Canonical `SS_EXT_*` IDs, production rate modifier table, and prep task implication matrix for exterior states
- `Quality_Tiers_and_Surface_Condition.md` v1.3 — QT framework, condition gate, sheen/QT gate, condition modifier values
- `Exterior_Modifiers_Doctrine.md` — `FAC_EXT_SUBSTRATE_CONDITION` and other exterior modifiers; modifier values referenced from this doctrine
- `Exterior_Protection_Doctrine.md` — Protection zones for exterior work; masking requirements adjacent to finished surfaces
- `Materials_and_Consumables_Doctrine.md` v1.2 — Material selection principles, caulk yield charts, consumable usage models

### 7.2 Reference Files

- `docs/Reference/Substrate_State_Reference.md` §4 — `SS_EXT_*` canonical IDs
- `docs/Reference/Surface_Vocabulary_Reference.md` §Exterior Surfaces — Exterior surface IDs used in PaintScope keys

### 7.3 Industry Standards

- PDCA P14 — Surface Preparation Levels (referenced for QT surface profile tolerances)
- James Hardie Application Instructions — Authoritative for fiber cement prime and topcoat requirements
- LP SmartSide Coating Warranty Requirements — Authoritative for engineered wood approved coating systems

---

## 8. Change Log

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 0.1.0 | 2026-02-20 | Claude | Initial draft |
