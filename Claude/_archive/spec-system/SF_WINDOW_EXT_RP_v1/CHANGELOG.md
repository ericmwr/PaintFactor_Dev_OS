# SF_WINDOW_EXT_RP_v1 Changelog

## v1.0.0 (2026-03-15)

- Initial release: Exterior Window Repaint (Combined Assessment + Prep + Prime + Finish)
- 69 tasks across 8 modules (7 owned MOD_XWRP_* + 1 shared MOD_RRP_EXT_CONTAINMENT): 59 binary + 10 qt_scaled
- 38 DIRECT transfers from SF_WINDOW_EXT_NC_v1, 8 MODIFIED, 18 RP_NEW, 5 shared RRP
- Context prefix XWRP (eXterior Window RePaint) — no collision with XWIN (NC), WIN (interior NC), WNRP (interior RP)
- 3 paintable items: ITM_WINDOW_EXT_S / M / L (EA with Size Bucket Method)
- 3 cladding types: wood, aluminum_clad, vinyl_clad — drives primer chemistry on exposed substrate areas
- 4 exterior RP substrate states: SS_EXT_SOUND_PAINT, SS_EXT_CHALKING, SS_EXT_FAILING_PAINT, SS_EXT_PEELING
- 7 material systems: 4 state/cladding-driven primers + 3 QT-driven fine-finish enamels
- 4 round configurations: 2FINISH (GOOD), PRIME_2FINISH (FAIR/POOR QT3-4), 2PRIME_2FINISH (QT5 GOOD), PRIME_2PRIME_2FINISH (QT5 FAIR/POOR)
- 9 protection zones including RP-specific landscape/hardscape ground protection and RRP containment
- 7 factor modifiers with strict prep/coating pool separation (condition + RRP in prep pool; QT in coating pool)
- 11 representative variants covering QT3-QT5 x GOOD/FAIR/POOR x brush/spray + RRP variant
- EPA RRP lead-safe module (shared) for pre-1978 homes — windows are HIGH RISK friction surfaces
- Exterior-specific features: power wash per elevation, chalk test/remediation, rot probe, wood hardener, cladding-specific spot priming
- QA Critic: clean PASS — zero issues, 4 minor observations
- 16 proposed registry additions (1 SF_, 1 TSK_ prefix, 1 MOD_ prefix, 4 ROUND_, 5 COV_, 1 FAC_, 2 CON_)
