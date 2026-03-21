# SF_WOOD_GRAIN_FILL_NC Changelog

## v0.1.0 — 2026-03-20

**Initial draft** — Spec #19 in generation order.

### Summary
Standalone grain fill add-on spec for open-grain hardwoods being painted. First add-on spec in the system — inserts process steps between parent prime and parent finish specs.

### Key Features
- **Add-on architecture**: Chains between parent prime → grain fill → parent finish
- **User-activated toggle**: `grain_fill: true` on bare_wood + paint substrates
- **QT-driven coat count**: QT3=1 fill, QT4=2 fill, QT5=3 fill + final 400 grit sand
- **Surface profile modifier**: flat (1.0x) to heavy_profile (2.8x) — dominant cost driver
- **Wood species modifier**: deep_grain (1.0x, oak/hickory) vs moderate_grain (0.85x, ash/walnut)
- **Single SF item**: ITM_GRAIN_FILL_SURFACE (aggregated from parent substrates via UOM conversion)
- **No protection zones**: Runs within parent spec's protected workspace
- **New state**: SS_GRAIN_FILLED (output, ready for finish paint)

### Artifacts
- 6 tasks (4 binary, 2 qt_scaled) across 5 modules
- 3 round configurations (one per QT)
- 3 variants (one per QT)
- 1 material system (SYS_GRAIN_FILLER_WB)
- 2 coverage profiles
- 5 consumables (sandpaper 220/280/320/400, tack cloth)

### New IDs Proposed
- SF_WOOD_GRAIN_FILL_NC (spec family)
- ITM_GRAIN_FILL_SURFACE (paintable item)
- SYS_GRAIN_FILLER_WB (material system)
- SS_GRAIN_FILLED (substrate state)
- PS_SURFACE_SF.GRAIN_FILL (PaintScope key)
- IN_SF_GRAIN_FILL (input)
- TSK_GRAIN_SAND_PREP, TSK_GRAIN_FILL_COAT, TSK_GRAIN_SAND_BETWEEN, TSK_GRAIN_FINAL_SAND, TSK_GRAIN_PRIME_SEAL, TSK_GRAIN_SAND_PRIME (tasks)
- MOD_GRAIN_PREP, MOD_GRAIN_FILL, MOD_GRAIN_INTERSTAGE, MOD_GRAIN_FINAL, MOD_GRAIN_SEAL (modules)
- ROUND_GRAIN_QT3, ROUND_GRAIN_QT4, ROUND_GRAIN_QT5 (round configs)
- COV_GRAIN_FILLER, COV_GRAIN_SEAL_PRIMER (coverage profiles)

### QA Result
**pass_with_warnings** — 4 minor warnings, 0 blockers. Production rates need field calibration. Modifier stacking peaks at 4.2x (exceeds 4.0x threshold). Registry updates pending. Parent finish specs need SS_GRAIN_FILLED input state.

### Design Source
`docs/superpowers/specs/2026-03-20-wood-grain-fill-spec-design.md`
