# Brief — ext_siding × wood_smooth × NC × QT3 (paint)

**Status:** APPROVED r2 (Eric, 2026-10-03). Data authored: 24 tasks, 10 modules, 5 scenarios.
**r2 (2026-10-03, Eric):** coating/weathering windows are reference information, never restrictions or warnings; `SC_WEATHERED` = clean + spot-sand (no whole-structure sanding, no full re-prime); no mill-glaze sanding; rates are placeholders until Eric's rate sheet.
**Vocabulary:** `devos/exterior-taxonomy.md` v1 (ecf9b302) + §3 amendment below. **Spec:** Step 2 pilot.
**Template version:** v0 (this brief is the template under test; sections marked ⟦T⟧ are the fixed template fields).

---

## 1. Cell ⟦T⟧

| Field | Value |
|---|---|
| Paintable item | `ext_siding` |
| Material | `wood_smooth` |
| Context / QT / coating | NC / QT3 / `paint` |
| States in | `SS_BARE`, `SS_PRIMED_FACTORY`, `SS_PRIMED_FIELD` |
| Conditions | `SC_NEW` (default), `SC_WEATHERED` |
| Prime method (`application_method_prime`) | any of 5; typical `spray_backbrush` |
| Finish method (`application_method`) | any of 5; typical `spray` |
| Output state | `SS_PAINTED` |
| Quantity key | `PS_EXT_SIDING_SF.FIELD` (siding face SF, per siding-section input) |

## 2. Research findings ⟦T⟧

Two kinds of finding:
- **Practice** drives tasks.
- **Reference** is stored in the data as a `doctrine` note only. It never gates, excludes or warns. (Eric 2026-10-03: manufacturer windows are largely liability language, and field scheduling doesn't follow them.)

| # | Finding | Kind | Engine consequence | Source |
|---|---|---|---|---|
| F1 | Paint system for smooth wood = 1 primer + 2 topcoats (4–5 mil dry) | Practice | finish_coats = 2; prime is a full coat on bare wood | FPL ch.16; SW 108.33/109.31; MPI 099113 EXT 6.2 |
| F2 | Stain-blocking primer (alkyd; latex if a 4×4 ft test shows no bleed in 4 h) | Practice | One primer material | FPL; SW 108.33; WRCLA |
| F3 | Weathered wood is treated by **cleaning** plus **spot sanding** of the worst small areas. Whole-structure sanding is not done. Chemical brightening (oxalic/percarbonate) is the stain/clear treatment and belongs to the parked stain pass. | Practice (Eric) | `SC_WEATHERED` → wash/clean + spot sand + spot prime | Eric (E2); FPL ch.16 |
| F4 | Exposure windows: FPL says ~1 wk sun degrades cedar and 3–4 wk degrades dense species. Latex primer topcoat ≤14 d; factory primer ≤90 d. | Reference | `doctrine` note only | FPL; SW 108.33; WRCLA |
| F5 | Prime → fill/caulk → topcoat. Caulk butt joints and siding-to-trim joints; **never lap joints** | Practice | Fill/caulk = interstage after prime | SW 108.33 + SW FAQ; FPL GTR-169 |
| F6 | Spot-prime knots, nail heads, fills before topcoat | Practice | Interstage spot-prime task | SW FAQ; FPL |
| F7 | Seal field cuts / end grain; install-time end sealing is the installer's | Practice | `SS_PRIMED_FACTORY` → cut-edge spot prime | FPL; WRCLA |
| F8 | Back-brushing works the coating into the wood | Practice | Back-brush / back-roll = separate second-pass task | FPL; MPI |
| F9 | Conditions: MC ≤15%, RH ≤85%, 5 °F over dew point, latex ≥50 °F 24 h | Reference | `doctrine` note only | MPI; FPL; SW |
| F10 | Deep/bright colours may need extra coats | Reference | `doctrine` note only | MPI §3.3.7 |
| F11 | Mill glaze: SW says sand, FPL disputes the cause | Decided | **No sanding task** (Eric) | SW 108.33; FPL |
| F12 | NPC new-construction rates **already include normal prep** (caulk, putty, setup). Using NPC coat rates *plus* separate prep tasks double-counts. | Practice | Rate sheet must set coat rates net of prep | Craftsman NPC (p.9–10, smooth wood siding tables) |

## 3. Taxonomy amendment needed (§3 `SC_WEATHERED`)

| | Current v1 text | Proposed |
|---|---|---|
| Definition | "Bare or primed surface left exposed past its window (bare wood > ≈1–4 wk sun; factory primer past maker's deadline)" | "Bare or primed surface visibly weathered — greyed, dirty, or chalky/eroded primer. User-selected; no time window." |
| Decision it drives | "Sand/scuff to fresh surface (wood) or re-prime (expired primer)" | "Clean + spot-sand worst areas + spot-prime. No full sanding or full re-prime." |
| Q8 resolution | "the material decides sand vs re-prime" | "one value; treatment is clean + spot work for every material" |

Rule 6 is extended to cover manufacturer topcoat/exposure windows: they are reference only, not warnings.

## 4. Sequence by state × condition ⟦T⟧

| Scenario (proposed ID) | State / condition | Module sequence |
|---|---|---|
| `SCN_EXT_SIDING_WOOD_SMOOTH_NC_QT3_FROM_BARE` | `SS_BARE` / `SC_NEW` | SETUP · PREP_NEW · PRIME · FILL_CAULK · COAT · COAT_CHECK · COAT · FINISH · CLEANUP |
| `…_FROM_BARE_WEATHERED` | `SS_BARE` / `SC_WEATHERED` | SETUP · PREP_WEATHERED · PRIME · FILL_CAULK · COAT · COAT_CHECK · COAT · FINISH · CLEANUP |
| `…_FROM_PRIMED_FACTORY` | `SS_PRIMED_FACTORY` / `SC_NEW` | SETUP · PREP_NEW · CUT_EDGES · FILL_CAULK · COAT · COAT_CHECK · COAT · FINISH · CLEANUP |
| `…_FROM_PRIMED_FIELD` | `SS_PRIMED_FIELD` / `SC_NEW` | SETUP · PREP_NEW · FILL_CAULK · COAT · COAT_CHECK · COAT · FINISH · CLEANUP |
| `…_FROM_PRIMED_WEATHERED` | `SS_PRIMED_FACTORY`, `SS_PRIMED_FIELD` / `SC_WEATHERED` | SETUP · PREP_WEATHERED · FILL_CAULK · COAT · COAT_CHECK · COAT · FINISH · CLEANUP |

Notes:
- **Weathered primed wood gets no prime module.** The spot-prime work is inside PREP_WEATHERED.
- **`matches` for all five:** `paintable_item: ext_siding`, `material: [wood_smooth]`, `substrate_state`, `substrate_condition`, `coating_type: paint`.
- **Method is not matched.** Tasks are gated by method inside the modules, so 5 scenarios cover all 25 prime/finish method combinations.
- **`doctrine` notes:** each scenario carries the reference notes in §7.

## 5. Modules → tasks ⟦T⟧

Gate keys:
- **P** = `applies_when.application_method_prime`
- **F** = `applies_when.application_method`
- spray* = spray, spray_backbrush, spray_backroll

| Module | Phase | Tasks (gate) |
|---|---|---|
| `MOD_SETUP_EXT_SIDING` | setup | SETUP_SITE · PROTECT_GROUND · MASK_SPRAY (spray*, see R4) |
| `MOD_PREP_EXT_SIDING_WOOD_NEW` | prep | INSPECT · DUST_OFF |
| `MOD_PREP_EXT_SIDING_WOOD_WEATHERED` | prep | INSPECT · WASH_CLEAN · SPOT_SAND · SPOT_PRIME |
| `MOD_PREP_EXT_SIDING_WOOD_CUT_EDGES` | prep | SPOT_PRIME_CUTS |
| `MOD_PRIME_EXT_SIDING_WOOD` | prime | PRIME_SPRAY (P spray*) · BACKBRUSH (P spray_backbrush) · BACKROLL (P spray_backroll) · PRIME_ROLL (P roll) · PRIME_BRUSH (P brush) |
| `MOD_INTERSTAGE_EXT_SIDING_WOOD_FILL_CAULK` | interstage | FILL_HOLES · CAULK_JOINTS · SPOT_PRIME |
| `MOD_APPLY_EXT_SIDING_WOOD_COAT` | apply | COAT_SPRAY (F spray*) · BACKBRUSH (F spray_backbrush) · BACKROLL (F spray_backroll) · COAT_ROLL (F roll) · COAT_BRUSH (F brush) |
| `MOD_INTERSTAGE_EXT_SIDING_COAT_CHECK` | interstage | COAT_INSPECT |
| `MOD_FINISH_EXT_SIDING` | finish | DEMASK (spray*) · FINAL_TOUCHUP |
| `MOD_CLEANUP_EXT_SIDING` | cleanup | CLEAN_SPRAY_RIG (spray*) · SITE_CLEANUP |

Module names use `EXT_SIDING_WOOD`, not `…_WOOD_SMOOTH`, so the `wood_rough` and `plywood_panel` cells can reuse them.

## 6. Tasks ⟦T⟧ — QT3 rates (Eric's rate sheet, 2026-10-03)

All tasks use `ps_key: PS_EXT_SIDING_SF.FIELD` and `uom: SF` unless noted. Each rate is either **NPC** (the Craftsman "Medium" figure) or **TBD**. A TBD figure is a stand-in so the pilot runs; Eric replaces it from `exterior-briefs/ext_siding.wood_smooth.rates.xlsx`.

| Task ID (`TSK_EXT_SIDING_…`) | What | SF/hr | Basis |
|---|---|---|---|
| SETUP_SITE | Stage ladders/equipment | 1500 | Eric |
| PROTECT_GROUND | Drops at base; cover plants/hardscape | 2000 | Eric |
| MASK_SPRAY | Mask openings/fixtures/roof edge (SF proxy until openings model) | 600 | Eric |
| INSPECT | Readiness walk (moisture, defects) | 3000 | Eric |
| DUST_OFF | Brush/blow off construction dust | 2000 | Eric |
| WASH_CLEAN | Detergent wash + rinse (power-wash phase) | 800 | Eric |
| SPOT_SAND | Spot-sand worst weathered areas (allowance across whole SF) | 1500 | Eric |
| SPOT_PRIME_CUTS | Prime field cuts / damaged factory primer | 1500 | Eric |
| PRIME_SPRAY | Airless primer coat | 675 | Eric |
| PRIME_ROLL | Roll primer + brush lap edges | 225 | Eric |
| PRIME_BRUSH | Brush primer | 125 | Eric |
| BACKBRUSH | Back-brush pass after spray | 300 | Eric |
| BACKROLL | Back-roll pass after spray | 450 | Eric |
| FILL_HOLES | Fill nail holes/defects | 750 | Eric |
| CAULK_JOINTS | Butt + siding-to-trim joints, not laps (SF proxy) | 400 | Eric |
| SPOT_PRIME | Spot-prime knots, nails, fills, sanded spots | 2000 | Eric |
| COAT_SPRAY | Airless finish coat | 750 | Eric |
| COAT_ROLL | Roll finish coat + brush lap edges | 275 | Eric |
| COAT_BRUSH | Brush finish coat | 150 | Eric |
| COAT_INSPECT | Between-coat inspect + touch-up | 2000 | Eric |
| DEMASK | Remove masking | 1500 | Eric |
| FINAL_TOUCHUP | Final walk + touch-up | 1500 | Eric |
| CLEAN_SPRAY_RIG | Flush airless rig | FIXED 30 min | Eric |
| SITE_CLEANUP | Site cleanup | 1200 | Eric |

Removed in r2:
- **SAND_WEATHERED** became SPOT_SAND.
- **SCUFF_PRIMER** was dropped.
- **INSPECT_MOISTURE** became INSPECT, since moisture is reference only.

## 7. Materials ⟦T⟧

| ID | Material | Usage |
|---|---|---|
| `CON_PRIMER_EXT_WOOD_STAINBLOCK` | Exterior stain-blocking wood primer | 1 coat, 350 SF/gal (SW 350–400) |
| `CON_PAINT_EXT_ACRYLIC` | 100% acrylic exterior latex | 2 coats, 350 SF/gal/coat |
| `CON_CAULK_EXT_ACRYLIC` | Paintable ASTM C920 sealant | allowance |
| `CON_FILLER_EXT_WOOD` | Exterior wood filler | allowance |
| `CON_SANDPAPER` | Spot sanding | `SC_WEATHERED` only |
| `CON_MASKING_FILM_TAPE` | Masking film + tape | spray* only |
| `CON_DROP_CLOTH` | Drops | reusable |
| `CON_DETERGENT_EXT_WASH` | House-wash detergent (mildewcide if mildew) | `SC_WEATHERED` only |

## 8. Reference notes ⟦T⟧ — stored in `doctrine`, never warnings or restrictions

- N1: Exposure window. FPL measured paint-life loss after ~1 wk sun on cedar/low-density wood, and 3–4 wk on dense species.
- N2: Primer topcoat windows. SW latex wood primer ≤14 d; WRCLA says factory primers are not intended for >90 d exposure.
- N3: Application conditions. MC ≤15%, RH ≤85%, 5 °F over dew point, latex ≥50 °F for 24 h.
- N4: Tannin bleed. On cedar/redwood, bleed-test latex primer (4×4 ft, 4 h) or use alkyd.
- N5: Deep/bright colours may need extra coats; QT3 assumes primer + 2.
- N6: Lap joints are not caulked. End sealing at install is the installer's scope.
- N7: Chemical brightening of weathered wood is the stain/clear treatment (stain pass).

## 9. Engine requirements (rewire) ⟦T⟧

- **R1:** The exterior ctx lacks `material`, `substrate_condition`, `application_method_prime` and `paintable_item: ext_siding`.
- **R2:** No live home exists for `CON_*` consumables. Exterior materials use hardcoded `EXT_COVERAGE_DEFAULTS`.
- **R3:** `PS_EXT_SIDING_SF.FIELD` is not emitted. Today the engine emits `PS_EXT_SURFACE_SF.SIDING_FIELD`.
- **R4:** "Mask if *either* coat is sprayed" can't be expressed, because `applies_when` keys AND together. Needs a derived `uses_spray` ctx flag.

The advisory field from r1 is no longer needed, because the notes live in `doctrine`.

## 10. Assumptions / exclusions ⟦T⟧

- **Excluded:** carpentry, siding repair, and back-priming before install (the installer's scope).
- **Separate cells:** trim, soffit and openings. Caulk and masking are measured per SF of siding until those models exist.
- **Height/access:** handled by the existing modifiers; no new modifiers.
