# Exterior Taxonomy — v1

**Status:** APPROVED 2026-10-03 (Eric) — walked through one axis at a time; decisions in §8.
**Spec:** `docs/superpowers/specs/2026-07-19-exterior-data-factory-design.md` (Step 1, greenfield per 2026-10-02 decision).
**Scope:** NC-first, QT3. Every identifier is designed so the later repaint pass reuses it unchanged; values marked **RP** exist for that pass and are not in the NC grid.

## 0. Design rules

1. **Every value earns its place by driving an engine decision** — which module/task fires, which material system is picked, or which method is valid. A value that only describes the house is dropped. Each value below states the decision it drives.
2. **Axes are orthogonal.** Material = what it's made of. State = what coating is on it (level only). Condition = what prep it needs (never a coating level). Method = how the coating goes on.
3. **Hierarchy (engine-wide):** Paintable Item → Category → Substrate (= Material) → State → Condition. Method is selected per item and per coat stage; every method is available (§4).
4. **Brand facts are not axes.** Topcoat deadlines (Hardie 180 d, Nichiha 12 mo, TruWood 90 d…), dark-colour LRV limits, and "never stain / never oil" rules live in per-material doctrine and the material-system choice, not in the identifier lists. [S1–S6, T1–T6]
5. **Naming:** paintable items `ext_<item>` (mirrors interior `int_<item>`); materials lowercase tokens under a new match key `material`; states `SS_*` (one namespace shared with interior — same value = same meaning; Q2 resolved); conditions `SC_*` (new prefix, unused today); methods lowercase (existing `application_method` values); PS keys `PS_EXT_<DOMAIN>_<UOM>.<NAME>`.
6. **Cure / weathering waits are advisories, not exclusions.** Manufacturer wait periods (new brick ≈1 yr, stucco/concrete 7–30 days, treated lumber dry-out) never remove a material from the grid. Expedited projects coat anyway when the owner accepts the liability; the engine surfaces the wait as a warning/assumption on the estimate. (Eric, 2026-10-02) **Amended 2026-10-03:** manufacturer topcoat/exposure windows (primer recoat deadlines, bare-wood sun exposure) are stored as reference notes in the data only — not warnings, not restrictions. They are largely liability language and do not match field scheduling (Eric).
7. **Prefer a material value over a modifier.** A modifier is only introduced when a factor has numerous values across many items; a two-way split (e.g. stucco smooth/rough) becomes two materials. (Eric, 2026-10-02)

---

## 1. Material

Match key: `material`. Replaces the old Siding Type + Substrate Material + Texture Profile dropdowns. Texture survives only where it changes the work (rough-sawn wood).

### 1a. Wall cladding (paintable item `ext_siding`)

| Value | Definition | Decision it drives | NC grid? |
|---|---|---|---|
| `wood_smooth` | Smooth-planed solid-wood boards: lap/bevel, board-and-batten, T&G — any species | Stain-blocking primer on bare; end-grain/cut sealing; sun-exposure window before priming (≈1–4 wk) [S1,S2] | ✓ |
| `wood_rough` | Rough-sawn / saw-textured solid-wood boards | Higher spread loss per coat; back-roll/back-brush methods; film finish harder to maintain [S1] | ✓ |
| `wood_shingle` | Wood shingles and shakes | Back-brushing after spray/roll is "essential"; slow cut-in per course [S3] | ✓ |
| `plywood_panel` | Grooved plywood panel siding (T1-11 / APA 303) | Edge sealing of all panel edges; groove cut-in; face grade gates stain later [S4] | ✓ |
| `fiber_cement` | Fiber-cement lap, panel, shingle (Hardie, Allura, Nichiha) | 100% acrylic only, no stain/oil; cut-edge sealing; wash ≤1,500 psi. Lap vs panel vs shingle did NOT change the system in any brand → one value [S5] | ✓ |
| `engineered_wood` | Resin-bonded wood-strand or hardboard siding (LP SmartSide, TruWood) | Cut/drip-edge sealing; 100% acrylic; no semi-transparent stain; hardboard 4-mil min film [S6,S7] | ✓ |
| `stucco_smooth` | Portland-cement stucco, smooth / fine-sand finish, 3-coat or 1-coat (no source distinguishes coat systems for painting) | Alkali-resistant primer; cure/pH gate; spray+back-roll [S8,S9] | ✓ |
| `stucco_rough` | Portland-cement stucco, rough finish (dash, heavy sand, lace) | As `stucco_smooth`, but primer spread drops from 200–300 to ≈80 SF/gal and back-rolling is mandatory → different material quantity and labour [S8] | ✓ |
| `brick` | Clay brick masonry | Alkali-resistant primer or masonry paint; efflorescence; vapour permeance limits coat build [S10] | ✓ (rule 6) |
| `cmu` | Concrete block | Block-filler step (distinct material + labour) before topcoat [S11,S12] | ✓ |
| `concrete` | Poured / precast concrete | Alkali-resistant primer; form-release removal; 28-day cure [S11,S9] | ✓ |
| `vinyl` | Vinyl siding | **RP** — not painted on NC (integral colour; warranty risk). Colour may not go darker than original unless vinyl-safe [S13,S14] | — |
| `aluminum` | Aluminum siding | **RP** — factory finished; chalk removal is the defining prep [S15] | — |
| `eifs` | Exterior insulation & finish system | **RP** — factory acrylic finish on NC; recoat needs mandatory cleaning + vapour-permeable system [S16] | — |
| `metal_sheet` | Steel / galvalume sheet-metal siding and metal-clad structures (coil-coated: Kynar, polyester, silicone-polyester) | Coating over the factory finish needs an adhesion system — bonding acrylic made for prefinished metal (SW Bond-Plex) or DTM acrylic; prep = TSP clean + power wash + scrub; spray typical. Prior improper paint that is peeling → water blast or chemical strip first [S17, T15, E1] | ✓ (client request) |

**Dropped:** stone / manufactured stone (not painted by convention; no authoritative source), separate hardboard value (same decisions as engineered wood), one-coat vs 3-coat stucco (no source distinguishes them), separate species values (primer choice is the same stain-blocking primer for all bare wood under current FPL guidance [S1]), lap/panel/shingle variants of fiber cement.

### 1b. Trim and standalone materials (valid lists per item in §5–§6)

| Value | Definition | Decision it drives |
|---|---|---|
| `wood` | Solid or finger-jointed wood trim/millwork, any species | Bare: stain-blocking prime; primed FJ pine arrives `SS_PRIMED_FACTORY` [T3,S1] |
| `pvc_cellular` | Cellular PVC trim (AZEK, Versatex, Kleer) | No primer; acrylic only; LRV limit on colour (brand-specific 50–57) [T1,T2] |
| `composite_polyash` | Poly-ash trim (TruExterior) | Primed; no cut-end priming; no dark-colour limit [T4] |
| `fiber_cement` | HardieTrim / HardieSoffit | Same rules as fiber-cement siding [S5] |
| `engineered_wood` | LP SmartSide trim/fascia/soffit | Same rules as engineered-wood siding [S6] |
| `polyurethane` | Polyurethane millwork (Fypon brackets, mouldings) | Arrives double-primed; no sanding/priming [T5] |
| `fiberglass` | Fiberglass columns; fiberglass entry doors | Bonding primer (columns); smooth doors never stained [T6,T7] |
| `steel` | Steel entry and garage doors, steel railings | Factory primer is temporary — finish within days; metal spot-prime [T7,T8] |
| `galvanized` | New galvanized steel (gutters, flashing, railings) | Degrease mill oil; latex metal primer, no alkyd [T9] |
| `aluminum_prefinished` | Coil-wrap trim, aluminum gutters/soffit | Usually not painted on NC; **RP** adhesion prep [S15] |
| `vinyl` | Vinyl soffit, shutters | **RP** only, vinyl-safe colours [S13] |
| `composite` | Composite/faux-wood garage doors, composite shutters | Factory finished; paint/stain allowed per maker [T8] |
| plus `concrete`, `cmu` | (foundations, porch floors) | as §1a |

---

## 2. State — coating level only

Match key: `substrate_state`. Shares the `SS_*` namespace with interior where the meaning is identical (Q2).

| Value | Definition | Decision it drives | NC/RP |
|---|---|---|---|
| `SS_BARE` | No coating of any kind | Full prime module fires (primer type from material) | NC |
| `SS_PRIMED_FACTORY` | Manufacturer-applied primer (Hardie/LP primed, primed FJ pine, TruExterior, Fypon, steel doors) | Prime module skipped; cut-edge / damage spot-prime task fires; topcoat deadline applies [S5,S6,T3] | NC |
| `SS_PRIMED_FIELD` | Primed on site by others or in an earlier phase | Prime skipped; no cut-edge task; recoat-window check (FPL ≈2 wk) [S1, P2] | NC |
| `SS_FACTORY_FINISH` | Manufacturer finish coat (coil-coated metal, ColorPlus, ExpertFinish, vinyl, aluminum, prefinished cedar, composite) | Coating over it is a valid client-requested scope (NC or RP) that always fires the adhesion system: degloss/scuff or a bonding coating made for the finish (e.g. Bond-Plex on coil-coated metal), with an adhesion test before commitment [S17, P2, E1] | NC, RP |
| `SS_PAINTED` | Existing paint **or solid stain**, flat through satin (refinished the same way [P3]) | Enters Condition axis; film-over-film allowed; no bond step | RP |
| `SS_PAINTED_GLOSS` | Existing paint, **semi-gloss or higher** | Mechanical bond must be established before the system: sand/degloss, or a bonding primer (XIM, SW Extreme Bond) adhesion-tested on the substrate before commitment [P2, E1] | RP |
| `SS_STAINED` | Existing penetrating finish: semi-transparent / transparent stain, water repellent | Re-stain: no scraping. Film coat over it: weathered surface must be removed first [P3] | RP |
| `SS_CLEAR_FILM` | Existing varnish / clear film (mainly doors) | Full removal before any re-finish [P3] | RP |

**Dropped:** "weathered bare wood" (a prep need → Condition `SC_WEATHERED`), finer sheen splits (flat vs eggshell vs satin need the same prep; only the semi-gloss+ threshold changes it — Eric 2026-10-03), separate solid-stain state (same as painted per FPL), stucco "integral colour vs acrylic finish" (only matters for fog-coat vs paint — stain/fog-coat is out of scope).

---

## 3. Condition — prep need only

Match key: `substrate_condition` (new for exterior; drives **module selection**, not just a multiplier — interior currently uses good/fair/poor only as `FAC_CONDITION`). Values map to MPI Degree of Surface Degradation (DSD) and PCA P14 prep levels [P1,P2].

| Value | Definition | Decision it drives | DSD / P14 | NC/RP |
|---|---|---|---|---|
| `SC_NEW` | As installed — clean, intact, within any coating window | NC prep only (fill, caulk, cut-edge prime); wash conditional | — | NC default |
| `SC_WEATHERED` | Bare or primed surface visibly weathered — greyed, dirty, or chalky/eroded primer. User-selected; no time window (amended 2026-10-03) | Clean + spot-sand worst areas + spot-prime. No full sanding or full re-prime. Exposure/topcoat windows are reference notes only [S1,P4,E2] | — | NC, RP |
| `SC_SOUND` | Existing coating intact; dirt, light chalk, mildew only | Wash + mildew treatment + spot-prime bare spots (gloss bond step comes from State `SS_PAINTED_GLOSS`, not here). Metal: TSP clean + power wash + scrub | DSD 0–1 / P14 L1–L2 | RP |
| `SC_CHALKING` | Chalk that does not rinse off (ASTM D4214 rating) | Scrub/extra wash pass; bonding primer; slower power-wash rate (spec §2.4) | DSD 1–2 | RP |
| `SC_PEELING` | Localized peeling, flaking, cracking, blistering; loose rust on metal | Scrape, sand, feather, spot-prime (metal: SSPC-SP2/SP3 + spot metal prime) | DSD 2 / P14 L2 | RP |
| `SC_FAILING` | Widespread peeling, alligatoring, intercoat adhesion failure | Full scrape/strip + full prime coat. Metal: water blast or chemical strip before the coating system [E1] | DSD 3 / restoration | RP |
| `SC_EFFLORESCENCE` | Salt deposits / high-pH on masonry or stucco | Salt removal + alkali-resistant primer; moisture source flagged [P1,S10] | — | RP (masonry only) |
| `SC_DAMAGED` | Substrate damage — rot, delaminated panel, deep cracks | Triggers minor-repairs module (fill only, spec §2.5) or exclusion | DSD 4 | RP |

**Dropped / collapsed (per MPI prep lists [P1]):** dirt and mildew (same wash labour; only the chemical differs → material, not condition), cracking/checking/blistering/slight alligatoring (same DSD-2 prep → `SC_PEELING`), heavy alligatoring and intercoat failure (→ `SC_FAILING`), tannin/sap bleed (changes primer *type* → material system), rust as its own value (metal reading of `SC_PEELING` / `SC_FAILING`). Gloss is not a condition — it is State `SS_PAINTED_GLOSS`.

**Not a condition — separate project flag:** EPA RRP lead-safe (pre-1978, >20 SF exterior disturbed). It adds containment and method restrictions on top of any condition [P5].

---

## 4. Method — selected per coat, every method available everywhere

Match key: `application_method` (existing values), **chosen per coat stage** — the prime-coat method and the finish-coat method are separate user selections (user preference; Eric 2026-10-03). **All five methods are selectable for every material and item** so outlier jobs are never blocked; the table below only gives the typical default per material.

| Value | Definition | Decision it drives |
|---|---|---|
| `brush` | Brush only | Slowest; trim, doors, shingles, small items |
| `roll` | Roll with brush cut-in | Siding and masonry without spray; no overspray masking |
| `spray` | Airless spray, no back-work | Fastest; overspray protection/masking scope |
| `spray_backroll` | Spray then back-roll | Recommended on porous/rough masonry and stucco [S8,P6]; MPI requires it for sprayed primers on wood, fiber cement, stucco, masonry [P1]; second-pass labour |
| `spray_backbrush` | Spray then back-brush | Recommended on shingles/shakes [S3], rough wood and stains; second-pass labour |

**Dropped:** `brush_roll` (exterior `roll` already includes cut-in), HVLP (equipment, not a labour decision; no source), `spray_rolloff` / `wipe` (interior-only cases).

**Engine implication (rewire / pilot):** today a scenario matches one `application_method`. Per-coat selection means the prime module is chosen by the prime method and the apply modules by the finish method. The pilot brief template must carry both.

| Material | Typical prime method | Typical finish method | Source |
|---|---|---|---|
| `wood_smooth`, `engineered_wood` | spray_backbrush | spray | [S1,S6,P1] |
| `wood_rough`, `plywood_panel` | spray_backroll | spray_backroll | [S1,S4,P1] |
| `wood_shingle` | spray_backbrush | spray_backbrush | [S3] |
| `fiber_cement` | (factory primed) / spray_backroll | spray | [S5,P1] |
| `stucco_smooth`, `stucco_rough`, `cmu`, `concrete`, `brick` | spray_backroll | spray_backroll | [S8,S10,P6] |
| `metal_sheet` | spray | spray | [S17,E1] |
| `vinyl`, `aluminum` (RP) | spray | spray | [S13] |
| `eifs` (RP) | spray_backroll | spray_backroll | [S16] |
| Trim items, doors, shutters, railings | brush | brush | convention (no authoritative source) |

---

## 5. Trim — category; each type is its own paintable item

Mirrors interior trim: own `ext_*` item, own material/state/condition, own modules and scenarios. Profile (flat / ornate / beaded / dentil) is the universal **trim profile modifier** (spec §2.6), not a new item. Under-12″ rule applies to LF items.

| Item | Definition | Unit | Valid materials | Why it's its own item |
|---|---|---|---|---|
| `ext_fascia` | Vertical board on eave ends of rafters; gutter mount | LF | wood, pvc_cellular, composite_polyash, fiber_cement, engineered_wood, aluminum_prefinished (RP) | Roof-edge access; cut-in behind gutters |
| `ext_rake` | Sloped trim along gable edges | LF | same as fascia | Pitched, highest access on the house |
| `ext_frieze` | Horizontal board at top of wall under soffit | LF | wood, pvc_cellular, composite_polyash, fiber_cement, engineered_wood | Two-edge caulk/cut line (siding + soffit) |
| `ext_corner_board` | Vertical trim on outside corners | LF | same as frieze | Full-height run; two siding edges |
| `ext_water_table` | Horizontal board at base of siding | LF | same as frieze | Ground-level; drip-cap edge |
| `ext_belly_band` | Horizontal band between floors / siding changes | LF | same as frieze | Mid-height; two siding edges |
| `ext_cornice_mold` | Crown / bed moulding at the cornice (dentil via profile modifier) | LF | wood, pvc_cellular, polyurethane | Profiled — more cut-in than flat boards |
| `ext_soffit` | Closed/boxed soffit panel (vented, solid, beaded via profile) | SF | wood, fiber_cement, engineered_wood, pvc_cellular, vinyl (RP), aluminum_prefinished (RP) | Overhead plane; vents/beads slow it |
| `ext_soffit_open` | Open eave — exposed rafter tails and roof-deck underside | SF (eave plan) | wood | Many edges; far slower than a panel |
| `ext_porch_ceiling` | Ceiling under a porch roof (often beadboard/T&G) | SF | wood, fiber_cement, pvc_cellular, engineered_wood | Porch-floor access + protection, unlike eave soffit |
| `ext_window_casing` | Trim around window frames / brickmould | LF (Q4) | wood, pvc_cellular, composite_polyash, fiber_cement, engineered_wood | Glass/sash cut-in |
| `ext_door_casing` | Trim around door frames | LF (Q4) | same as window casing | Same, door perimeter |
| `ext_column` | Porch columns and posts | EA (height class) | wood, fiberglass, pvc_cellular | 3-D object; fiberglass bonding primer |
| `ext_bracket` | Brackets, corbels | EA | wood, polyurethane, pvc_cellular | Discrete 3-D pieces |
| `ext_gable_vent` | Louvered gable vent | EA | wood, pvc_cellular, vinyl (RP) | Louvers; material decides paintability |

Measurement units are trade convention — no PDCA/MPI measuring standard was found [T10].

---

## 6. Standalone items (not elevation-bound)

Items marked **parked** are listed so the vocabulary is complete but are not authored until the stain pass (they are stain-dominated; spec §5 stain gap — Eric 2026-10-03).

| Item | Definition | Unit | Valid materials | Notes |
|---|---|---|---|---|
| `ext_entry_door` | Exterior swing door (slab; frame/jamb and both sides as options) | EA | wood, steel, fiberglass (smooth: paint only; woodgrain: maker's stain kit only) | Steel factory primer must be finished within days [T7] |
| `ext_garage_door` | Overhead garage door | EA (single/double) | steel, wood, composite | Steel: latex only, alkyd voids warranty; some makers void finish warranty on field paint [T8] |
| `ext_shutter` | Window shutter | EA | wood, composite, vinyl (RP, "paintable" SKUs only) | [T11] |
| `ext_deck_floor` | **Parked.** Deck boards and stair treads | SF | wood | Film paint/solid stain on horizontal boards not recommended → stain thread (parked) [T12,T13] |
| `ext_deck_rail` | **Parked.** Deck rails, balusters, posts | LF | wood | Verticals may take paint/solid stain [T12] |
| `ext_fence` | **Parked.** Fence | SF | wood | Treated-lumber dry-out before coating [T12] |
| `ext_porch_floor` | **Parked.** Porch floor | SF | wood, concrete | Concrete: 28-day cure, etch smooth [T14] |
| `ext_railing_metal` | Metal railings | LF | steel, galvanized | SSPC prep on RP; DTM acrylic [T9,T15] |
| `ext_gutter` | Gutters and downspouts | LF | galvanized, aluminum_prefinished | Usually not painted on NC [T9] |
| `ext_foundation` | Exposed foundation / parge coat | SF | concrete, cmu | Alkali-resistant primer, cure gate [S9] |
| `ext_metal_misc` | Utility boxes, metal doors, flashing | EA | steel, galvanized | Utility-box painting may be restricted (unverified) |

**Dropped:** chimney (masonry chimney = masonry wall surface; framed chase = siding), porch ceiling (is a trim item, §5), columns (trim item, §5).

**Later:** additional miscellaneous items get their taxonomy after the wood-lap pilot (Eric 2026-10-03).

**Not an item — phase:** power washing (spec §2.4) is a phase on every exterior job; its rate keys off Material × Condition.

---

## 7. Out of scope for this taxonomy (tracked elsewhere)

- **Coating type** (paint vs stain vs clear) — existing engine axis; NC grid is `paint`. Stain is the parked stain-gap thread (spec §5).
- **Openings model** — window/door sizes, deductions, sash complexity (spec §5; dedicated session after the pilot).
- **Rates, ranges, anchors** — deferred.
- **Access/height band, site conditions** — existing exterior inputs; modifiers redesigned with the rewire.

## 8. Review decisions

- ~~**Q1** Brick in the NC grid?~~ **Resolved:** NC-valid; weathering wait is an advisory (rule 6).
- ~~**Q2** Shared `SS_*` namespace?~~ **Resolved:** shared with interior; new exterior values (`SS_PAINTED`, `SS_PAINTED_GLOSS`, `SS_CLEAR_FILM`) join it.
- ~~**Q3** Method per coat?~~ **Resolved:** method per coat, user preference selection (§4).
- ~~**Q4** Casing unit~~ **Resolved:** LF for now; revisit in the openings session.
- ~~**Q5** `plywood_panel` vs `wood_rough`~~ **Resolved:** keep separate.
- ~~**Q6** `SC_CHALKING`~~ **Resolved:** keep.
- ~~**Q7** Stucco texture~~ **Resolved:** `stucco_smooth` + `stucco_rough` materials, no modifier (rule 7).
- ~~**Q8** Expired factory primer: own value or `SC_WEATHERED`?~~ **Resolved:** one value, `SC_WEATHERED`. **Amended 2026-10-03 (wood-lap pilot):** treatment is clean + spot work for every material, not sand vs re-prime.
- ~~**Q9** Keep `SC_DAMAGED`?~~ **Resolved:** keep — it is the trigger for the minor-repairs module.
- ~~**Q10** Merge frieze / corner board / water table / belly band?~~ **Resolved:** keep separate (spec §2.6).
- ~~**Q11** Deck, fence, porch floor in the NC grid?~~ **Resolved:** listed but parked until the stain pass.
- ~~**Q12** Missing items?~~ **Resolved:** none for v1; misc items after the pilot.

---

## Sources

**Siding / masonry**
- S1 USDA FPL *Wood Handbook* ch.16, Finishing of Wood (FPL-GTR-282) — https://research.fs.usda.gov/treesearch/62269
- S2 Western Red Cedar Lumber Assn., finishing & pre-installation — https://www.realcedar.com/siding/finishing-choices ; https://www.realcedar.com/siding/pre-installation/pre-building
- S3 FPL-GTR-202, wood shake & shingle siding (2011) — https://research.fs.usda.gov/treesearch/39748
- S4 APA Tech Note M335C, Finishing APA Rated Siding — https://www.socomi.com/wp-content/uploads/APA_TECH_Finishing.pdf
- S5 James Hardie TB #22 (2014) — https://inspectapedia.com/exterior/Finishing-Painting-Primed-James-Hardie-Siding.pdf ; Allura spec — https://allurausa.com/resources/allura-3-part-spec-sheet ; Nichiha install guide — https://www.nichiha.com/docs/Nichiha-Install-Guide-NichiProducts.pdf
- S6 LP SmartSide TB-001 FAQ (2024) — https://lpcorp.com/resources/product-literature/smartside/technical-bulletins/tb-001-frequently-asked-questions
- S7 TruWood lap siding instructions (2025) — https://truwoodsiding.com/wp-content/uploads/2025/08/72563_TruWood_PremiumLapSiding_Blue-2219_WEB.pdf
- S8 SW Loxon Concrete & Masonry Primer data sheet — https://www.sherwin-williams.com/document/PDS/en/035777488256/
- S9 Stucco Manufacturers Assn., *Painting Stucco* — https://stuccomfgassoc.com/wp-content/uploads/2020/02/Painting-STUCCO-SMA10777.pdf ; Benjamin Moore Ultra Spec Masonry TDS — https://media.benjaminmoore.com/WebServices/prod/assets/stage/datasheets/TDS_0359/20200113%200359%20TDS%20US%20OKF%20(1).pdf
- S10 Brick Industry Assn. Technical Note 6 (2025) — https://www.gobrick.com/media/file/TN%206_03242025.pdf
- S11 MPI Exterior Painting Guide Spec 099113 (2022) — https://www.mpi.net/assets/images/GuideSpec/Ext_Painting_099113_April2022.pdf
- S12 SW Loxon Block Surfacer — https://www.arcat.com/product/loxon-acrylic-block-surfacer-200252
- S13 SW, painting vinyl siding — https://www.sherwin-williams.com/en-us/project-center/paint/how-to-paint-vinyl-siding
- S14 Vinyl Siding Institute, cleaning & maintenance — https://polymericexteriors.org/vsi-resources/cleaning-and-maintenance
- S15 SW exterior surface-prep FAQ — https://www.sherwin-williams.com/property-facility-managers/products/resources/faqs/exterior-surface-preparation-faqs
- S17 SW Bond-Plex Waterbased Acrylic Coating (B71-200), for direct application to prefinished metal siding (Kynar, polyester, silicone-polyester) — https://sherlink.sherwin.com/sher-link/ViewHearsCountryCodeDoc?type=DP&sku=640347464&language=E
- S16 Sto recoat spec 80648R — https://www.stocorp.com/wp-content/content/Products_TechService/Coatings/Specifications/SPEC_80648_R_StoColor_Acryl_Plus_Recoat_EN.pdf ; Dryvit DS498 — https://www.dryvit.com/resource/download/ds498_dryvitcare_eifs_repair_procedures.pdf

**Prep / condition / method**
- P1 MPI Repaint Manual, general considerations & surface prep (RSP, DSD) — https://www.mpi.net/mpitraining/Level2_RSM/2Introduction/RSM%20Important%20Notes%20-%20General%20Considerations.pdf ; MPI REX 6.5 — https://www.mpi.net/mpitraining/Level2_RSM/document/Surface%20Prep/REX%20Wood%20Decks%20&%20Stairs%20surface%20prep.pdf
- P2 PCA P14 Surface Preparation (2022) — https://www.pcapainted.org/wp-content/uploads/2022/01/PCA-P14.pdf ; PCA P4 — https://pcapainted.org/wp-content/uploads/2019/11/PCA-Industry-Standard-P4.pdf
- P3 FPL-GTR-106, finishes for exterior wood (refinishing) — https://research.fs.usda.gov/download/treesearch/5989.pdf
- P4 FPL Williams, paint durability on weathered wood — https://research.fs.usda.gov/download/treesearch/22063.pdf ; SW Know Your Substrate — https://www.sherwin-williams.com/home-builders/products/resources/pro-tips/sw-article-pro-knowyrsubstrate
- P5 EPA RRP — https://www.epa.gov/lead/renovation-repair-and-painting-program-work-practices ; 40 CFR 745.85 — https://www.law.cornell.edu/cfr/text/40/745.85
- P6 PPG Perma-Crete TDB — https://buyat.ppg.com/rep_pafpainttools_files/Pghpaints/TDB/4-422.pdf

**Trim / standalone**
- T1 AZEK FAQ — https://azekexteriors.com/resources/faqs
- T2 Versatex painting guidelines — https://versatex.com/wp-content/uploads/2024/02/VERSATEX-Painting-Guidelines-Installation.pdf ; Kleer FAQ — https://www.westlakeroyalbuildingproducts.com/trim-and-mouldings/kleer/faqs
- T3 Woodgrain moulding finishing guide — https://woodgrain.com/moulding-finishing-guide/
- T4 TruExterior trim — https://www.westlakeroyalbuildingproducts.com/siding-and-accessories/truexterior/trimboard
- T5 Fypon FAQ — https://fypon.com/pages/faqs
- T6 HB&G column finishing — https://www.hbgcolumns.com/wp-content/uploads/2024/07/Finishing-Instructions-PVC-and-FRP.pdf
- T7 Therma-Tru finishing (2009) — https://www.thermatru.com/globalassets/customer-support/homeowner-resources/finishingpainting.pdf ; Pella wood door FAQ — https://mypella.com/PellaPortal/Support/Docs/FAQ-WoodDoor.pdf
- T8 Amarr painting garage doors — https://www.amarr.com/us/en/garage-doors/get-support/painting-your-garage-doors ; Clopay wood finishing — https://cdn.clopay.com/public/documents/Wood%20Finishing%20Instructions.pdf
- T9 Benjamin Moore, galvanized metal — https://www.benjaminmoore.com/en-us/contractors/job-solutions/professional-how-to-guides/galvanized-metal-painting
- T10 Cost-guide measuring conventions (unverified against PDCA/MPI) — https://homeguide.com/costs/cost-to-paint-soffit-and-fascia
- T11 Mid-America vinyl shutters — https://www.larsonshutter.com/mid-america-williamsburg-master-raised-panel-exterior-vinyl-shutters.html
- T12 Southern Forest Products Assn., deck finishing — https://www.southernpine.com/using-southern-pine/decks-and-porches/finishing-maintenance-and-inspection/
- T13 FPL Wood Handbook ch.16 (decks) — https://www.fpl.fs.usda.gov/documnts/fplgtr/fplgtr190/chapter_16.pdf
- T14 SW, painting concrete — https://www.sherwin-williams.com/en-us/project-center/paint/how-to-paint-concrete
- T15 SW Pro Industrial DTM — https://industrial.sherwin-williams.com/na/us/en/protective-marine/catalog/product/products-by-industry.11543396/pro-industrial-dtm-acrylic-primer-finish.9177192.html

**Field practice**
- E2 Eric (contractor) field experience, 2026-10-03 — weathered wood is cleaned (chemical brightening for stain/clear) with spot sanding of small areas; whole-structure sanding and strict manufacturer windows are not field practice.
- E1 Eric (contractor) field experience, 2026-10-03 — sheet-metal structures: TSP clean + power wash + scrub, spray Bond-Plex or DTM acrylic; improperly painted peeling metal water-blasted or chemically stripped first; semi-gloss+ existing paint needs mechanical bond or adhesion-tested bonding primer (XIM, SW Extreme Bond).

Known gaps: PDCA standards beyond P4/P14 and the full MPI manual were not accessible; vinyl numeric LRV rule, aluminum siding repaint system, stone, and the Nichiha coat count are unverified.
