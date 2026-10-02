# exterior-v0 — archived exterior data (2026-10-02)

**Why:** Greenfield decision 2026-10-02 — exterior data is rebuilt from scratch through
research + Eric's review gate (Data Factory, spec
`docs/superpowers/specs/2026-07-19-exterior-data-factory-design.md`). Nothing here is a
baseline for the new data. Do not mine or migrate it.

**Restore point:** annotated tag `archive/exterior-v0-final` @ `17d12454` (local).

## Manifest

| Folder | Count | Selection rule |
|---|---|---|
| `scenarios/` | 166 | every `Claude/scenarios/*.json` with `"domain": "exterior"` (71 NC, 95 RP) |
| `modules/` | 221 | 220 referenced only by those scenarios (0 shared with interior) + 1 unreferenced exterior orphan `MOD_PRIME_STAINBLOCK_EXT_SIDING_RP` |
| `tasks/` | 773 | tasks referenced only by archived modules (771 + 2 from the orphan module) |
| `modifiers/` | 16 | modifiers referenced only by exterior: `FAC_EXT_ACCESS`, `FAC_ALRP_*`, `FAC_ENSD_*`, `FAC_FCSD_*`, `FAC_FENCE_STYLE`, `FAC_FNDN_*`, `FAC_GRDR_*`, `FAC_METAL_PROFILE_COMPLEXITY`, `FAC_MSRY_*`, `FAC_SFIT_FACE_TYPE`, `FAC_STCO_TEXTURE_PROFILE` |
| `doctrine/` | 26 | `docs/Doctrine/Exterior_*.md` |
| `fixtures/` | 1 | `p2a-ext.json` — exterior parity baseline (1.73 h) retired |

**Kept in place (shared with interior):** tasks `TSK_DRRP_ASSESS_CONDITION`,
`TSK_DRRP_ASSESS_ADHESION`, `TSK_DRRP_ASSESS_COATING_ID`, `TSK_DRRP_FINISH_BRUSH`,
`TSK_DRRP_FINISH_SPRAY`, `TSK_DRRP_INTERSTAGE_INSPECT`, `TSK_DRRP_FINAL_INSPECT`;
modifier `FAC_CONDITION_SCALE`.

**Tests retired:** `scenario-estimate.test.js` exterior end-to-end guard;
`spec-for-scenario.test.js` ext_deck / ext_metal array-`paintable_item` cases (generic
array-resolution behavior now has no fixture — re-cover when new exterior data lands).

## Engine code still keyed to the old vocabulary (rewire after the taxonomy locks)

Left untouched on purpose. None of it fires today (no exterior scenarios match), so it
is dead-but-harmless until rewired.

| File | What is keyed to v0 |
|---|---|
| `state/exterior-state.js` | UI option lists: siding types, substrate states, texture profiles, materials, methods |
| `data/scenario-maps.js` | `EXT_UI_STATE_TO_SPEC_STATE` (UI value → `SS_EXT_*`), other ext routing constants |
| `engine/context-adapter.js` | exterior scenario inputs (`buildElevationScenarioInputs` / `buildStandaloneScenarioInputs`), `ext_*` paintable_item tokens (~100 refs) |
| `engine/run-estimate-scenario.js` | `EXT_ACCESS_MODIFIERS` + `DYNAMIC_MODIFIERS` tables for all 16 archived modifier IDs; exterior `CONDITION_MODIFIERS` (GOOD/FAIR/POOR) |
| `engine/modifier-registry.js`, `components/authoring/ModifierList.jsx` | `FAC_EXT_ACCESS` registration / display |
| `engine/spec-for-scenario.js` | `ext_*` → `SF_*_EXT` routing |
| `data/constants.js` | `SF_*_EXT_*` display labels |
| `data/product-catalog.js` | 266 `SYS_EXT_*` material-system → product rows |
| `engine/material-estimates.js` | `computeExteriorMaterialEstimates` (ext spec/PS-key lookups) |
| `engine/exterior-protection.js`, `engine/quantity-lookups-exterior.js` | exterior protection zones; exterior PS-key quantity lookups |
| `data/ps-key-catalog.js`, `data/enums.js` | exterior PS keys / enum values |
| `state/color-state.js`, `hooks/useColorSchedule.js`, `components/colors/RoomColorEditor.jsx` | exterior surface tokens in the color schedule |
| `components/exterior-editor/tabs/IdentityTab.jsx` | `spray_backbrush` method default (spec §5 open thread) |
| `components/authoring/qt-builder/__tests__/strip-qt-gates-core.test.js` | inline fixture mirrors `MOD_APPLY_EXT_PORCH_FLOOR_FINISH` shape (self-contained; still passes) |

Note: `scenario-rate-data.js` has **zero** exterior rows (no exterior spec families ever
reached it) — the `SYS_EXT_*` material systems live only in `product-catalog.js`.
