# SF_WINDOW_INT_RP_v1 — Changelog

## v1.0.0 — 2026-03-14

### Initial Release

**Scope**: Combined assessment + prep + prime + finish repaint spec for previously painted interior window units (frame, sash, muntins) and extension jambs in occupied residential homes. Fifth interior RP spec in the pipeline (after wall, ceiling, trim, door).

**Task Count**: 47 total (42 WNRP + 5 shared RRP)
- 22 DIRECT transfers from NC window spec (TSK_WIN_* re-issued under TSK_WNRP_*)
- 5 MODIFIED transfers (degloss replaces wood sand, rust treat targets breakthrough vs bare, prime uses state-driven selection, wall mask both methods, scuff sand broadened)
- 15 RP_NEW tasks (6 assessment, TSP wash, scrape/feather, mildew treatment, caulk assess/repair, glazing repair, furniture manage, customer walkthrough, sash break)
- 5 shared RRP lead-safe containment tasks (TSK_RRP_*)

**Key Decisions**:
- **Context prefix**: WNRP (WiNdow RePaint) — no collision with TSK_WIN_* (NC), TSK_XWIN_* (ext NC), TSK_WLRP_* (wall RP), TSK_CLRP_* (ceiling RP), TSK_TMRP_* (trim RP), TSK_DIRP_* (door RP)
- **QT modifiers**: GLOBAL values (1.0/1.3/1.5) — NOT door-specific (1.0/1.4/1.8). Windows are fine-finish but not as scrutinized as doors.
- **Assessment module**: 6 tasks covering condition, adhesion (ASTM D3359), coating ID, moisture, glazing, sash operation. Condition inspect is qt_scaled (time genuinely varies by tier). Other 5 assessments use fixed_time_minutes.
- **Wall masking**: Required for BOTH brush and spray in RP (walls are finished in occupied homes). NC only masked walls for spray.
- **Glass masking**: MANDATORY regardless of method. Largest single protection task (30-40% of total time for TDL windows).
- **Sash break**: RP-specific post-cure task at 24/48 hr — existing paint buildup increases blocking risk on operable sashes.
- **Glazing repair**: Scope-limited to <20% of glazing perimeter. Beyond 20% routes to glazier.
- **State-driven primer**: SS_INT_SOUND_PAINT skips prime (adhesion verified, latex over latex). Failing/peeling uses adhesion primer. Moisture damage uses mildew-resistant. Smoke damage uses shellac stain-blocker.
- **Modifier stacking**: Prep pool (condition x size x type x muntin x height, max 4.37x extreme). Coating pool (QT x size x type x muntin x height, max 3.28x). Pools never cross.
- **Round configurations**: 4 rounds covering condition (GOOD vs FAIR/POOR) x QT (standard vs QT5 brush 3-coat).
- **Protection zones**: 7 zones including RP-specific furniture_adjacent.

**Artifacts**: research.json, resolution.json, materials.json, sop_modules.json, production.json, qa_report.json, spec.json

**QA Result**: PASS (3 minor observations, zero major/critical issues, zero fixes needed)
