# SF_SOFFIT_EXT_RP_v1 Changelog

## v1.0.0 (2026-03-15)

- Initial release: Exterior Soffit Repaint (Combined Assessment + Prep + Prime + Finish)
- 51 tasks across 8 modules (7 owned MOD_SFRP_* + 1 shared MOD_RRP_EXT_CONTAINMENT)
- Single paintable item: ITM_SOFFIT_FIELD (SF-based, eave depth x roofline perimeter)
- 3 substrate types: wood (T&G/plywood), fiber cement, vinyl
- 4 substrate states: SS_EXT_SOUND_PAINT, SS_EXT_CHALKING, SS_EXT_FAILING_PAINT, SS_EXT_PEELING
- QT2-QT4 quality tiers (QT5 excluded -- soffit is utilitarian overhead field surface)
- Flat/satin sheens only (overhead surfaces show imperfections at higher sheen)
- Brush/roll primary (all soffit types); spray conditional on non-vented only (FM-003)
- Overhead penalty (~25-35%) baked into all base rates -- not a stacking modifier
- 7 material systems: 2 RP-specific primers (chalk-binding, acrylic stain-block) + 3 NC-reused substrate-specific spot primers (acrylic wood, alkali FC, bonding vinyl) + 2 QT-driven finish systems + 1 conditional solar-reflective for vinyl LRV < 55
- 5 coverage profiles with overhead waste factor included
- 20 consumables (2 RP-specific: vent mask tape, wire brush for vent cleaning)
- 4 round configurations: GOOD/QT3-4 (2 finish), GOOD/QT2 (1 finish), FAIR-POOR/QT3-4 (prime + 2 finish), FAIR-POOR/QT2 (prime + 1 finish)
- 8 protection zones including RP-specific ext_soffit_vent masking and ext_rrp_containment
- 6 factor modifiers: condition scale (1.0/1.5/2.0x prep), RRP (2.0x prep), access (ground/ladder/scaffold/lift), vent complexity (1.15x vented), T&G joints (1.20x), QT (1.0/1.0/1.3x coating) + overhead (baked in)
- 10 representative variants covering QT x condition x method x RRP combinations
- Context prefix SFRP -- no collision with TSK_SFIT_* (NC soffit)
- Mildew is the #1 degradation concern for sheltered soffit -- biocide treatment mandatory before painting
- Sibling spec: SF_SOFFIT_EXT_NC_v1 (24 DIRECT transfers + 8 MODIFIED)
- QA result: pass_with_warnings (1 major: QT4 modifier 1.20 vs 1.30 discrepancy in production.json; 1 minor: ext_soffit_vent zone registry addition)
- 17 proposed registry additions (SF_, TSK_, MOD_, PS_, IN_, SYS_, ROUND_, COV_, FAC_, CON_ sections)
