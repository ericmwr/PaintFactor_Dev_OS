# SF_METAL_EXT_RP_v1 Changelog

## [0.1.0] - 2026-03-15

### Initial Draft
- **SpecFactory Pipeline**: Full 7-stage pipeline execution (Research, Resolution, Materials, SOP, Production, QA, Assembly)
- **RP Sibling**: Adapts SF_METAL_EXT_v1 (NC) to repaint context

### Key Features
- **Condition Assessment Module**: 4 mandatory assessment tasks (condition, adhesion, structural rust gate, lead test)
- **5 RP Substrate States**: SS_EXT_SOUND_PAINT_METAL, SS_EXT_FLASH_RUST, SS_EXT_MODERATE_RUST, SS_EXT_HEAVY_RUST, SS_EXT_FAILING_PAINT_METAL
- **Rust-Grade-Driven Prep**: Flash -> SP2, Moderate -> SP3, Heavy -> needle gun + SP3, Failing -> strip + SP3
- **Condition Modifier**: FAC_MTRP_CONDITION (1.0x sound - 2.25x heavy rust) on prep tasks only
- **4 Substrate Types**: carbon_steel, wrought_iron, aluminum, galvanized (unchanged from NC)
- **4 Paintable Items**: ITM_METAL_RAILING (LF), ITM_METAL_GUTTER (LF), ITM_METAL_ORNAMENTAL (EA), ITM_METAL_MISC (EA)
- **6 Material Systems**: 4 primers (DTM acrylic, DTM alkyd, etch, bonding) + 1 finish (DTM acrylic) + 1 specialty (rust converter)
- **41 Tasks**: 40 binary + 1 qt_conditional across 9 modules
- **4 Factor Modifiers**: profile_complexity, access, QT, condition (with stacking partition)
- **5 Round Configurations**: sound, flash_rust, moderate_rust, heavy_rust, failing
- **5 Protection Zones**: landscape, hardscape, siding, light fixture, roof edge
- **Context Prefix**: MTRP (no collision)

### RP Differences from NC
- QT range QT2-QT4 (NC was QT3-QT5) — QT2 for utility, QT5 excluded
- Gloss sheen excluded (satin/semi-gloss only)
- spray_backbrush dropped (brush/spray only)
- Environmental modifiers excluded (PaintFactor OS RC-003)
- Zinc-rich primer excluded (QT5 product)
- Epoxy primer excluded (specialty, impractical over existing)
- Power wash task added (RP metal needs washing, NC bare metal does not)
- Needle gun task added (heavy rust/scale removal)
- Interstage module separated (NC had it embedded in final inspect)

### QA Result
- **pass_with_warnings** (4 issues, 0 blockers)
- ISS-MTRP-001: Prep stack 9.32x for extreme scenario (accepted — recommend T&M)
- ISS-MTRP-002: Coating stack 4.14x slightly over cap (accepted — 3.5% overshoot)
- ISS-MTRP-003: 3 new substrate states pending registry addition (deferred)
- ISS-MTRP-004: 36 tasks within projected 30-40 range (accepted)

### Hard Stops
- Structural rust (section loss, perforation) = HARD STOP
- Galvanized + alkyd primer = BLOCKED (saponification)
- Roll application = PROHIBITED

### Compatibility Rules
- COMPAT-MTRP-001 through COMPAT-MTRP-008
