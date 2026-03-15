# SF_STUCCO_EXT_RP_v1 Changelog

## v1.0.0 — 2026-03-15

**Initial Release** — Full 7-stage SpecFactory pipeline generation.

### Spec Identity
- **Spec Family**: SF_STUCCO_EXT_RP (Exterior Stucco/EIFS Repaint)
- **Context Prefix**: SCRP (StuCco RePaint)
- **NC Sibling**: SF_STUCCO_EXT_NC_v1
- **Domain**: Exterior | Scope: Repaint | UOM: SF

### Pipeline Output (8 files)
1. `research.json` — Researcher stage output. NC task classification (41 tasks: DIRECT/MODIFIED/NOT_APPLICABLE), 21 RP_NEW tasks, 10 findings, 9 condition drivers.
2. `resolution.json` — Registry resolver output. SCRP prefix verified zero collisions. 16 PaintScope keys (all existing). 5 registry additions proposed.
3. `materials.json` — Materials manager output. 6 material systems (2 new RP-specific + 4 NC reuse). 5 coverage profiles. 23 consumables.
4. `sop_modules.json` — SOP librarian output. 10 modules, 52 tasks.
5. `production.json` — Estimation engineer output. 52 task rates. 9 factor modifiers. Stacking partition (prep vs coating pools).
6. `qa_report.json` — QA critic validation. 42 checks passed. 0 failures. 3 minor warnings.
7. `spec.json` — Assembly. 8 config dimensions. 10 compatibility rules. 5 round configs. 12 variants.
8. `CHANGELOG.md` — This file.

### Key Design Decisions
- **State-driven primer** (vs NC substrate-driven): Chalk-binding for SS_EXT_CHALKING, stain-block for FAILING/PEELING, alkali spot on bare traditional stucco. SOUND_PAINT skips prime entirely.
- **Condition scale**: GOOD/FAIR/POOR maps to prep intensity modifier (1.0x/1.5x/2.0x). Prep pool only — never coating.
- **Stacking partition**: Prep pool (condition x RRP x access x texture) and coating pool (QT x substrate_type x access x texture) never cross.
- **Texture DUAL modifier**: Applies to BOTH labor AND material rates. Smooth 1.0x through dash 2.0x. Dominant cost driver.
- **EIFS hard constraints**: Elastomeric PROHIBITED (catastrophic moisture entrapment), <500 PSI wash, LRV >20, insurance gate.
- **Elastomeric**: Traditional stucco only, QT3+, flat only, 2 coats mandatory.
- **RP-specific tasks**: Condition assessment, caulk assessment, scraping (light/heavy), degloss, chalk remediation, caulk removal, vehicle/driveway protection, ground cover for scraping debris, customer walkthrough.
- **Shared RRP module**: MOD_RRP_EXT_CONTAINMENT for pre-1978 buildings — deduplicate when running alongside other exterior RP specs.

### Task Summary (52 total)
| Module | Count | Phase |
|--------|-------|-------|
| MOD_SCRP_SETUP | 8 | setup |
| MOD_SCRP_ASSESS | 2 | prep |
| MOD_SCRP_PREP | 17 | prep |
| MOD_SCRP_PRIME | 6 | prime |
| MOD_SCRP_FINISH_1 | 5 | finish |
| MOD_SCRP_INTERSTAGE | 3 | interstage |
| MOD_SCRP_FINISH_2 | 5 | finish |
| MOD_SCRP_FINAL_INSPECT | 2 | cleanup |
| MOD_SCRP_CLEANUP | 4 | cleanup |
| MOD_RRP_EXT_CONTAINMENT | 5 | prep |

### Material Systems (6)
| System | Role | Status |
|--------|------|--------|
| SYS_EXT_SCRP_PRIMER_CHALK_BIND | primer | NEW |
| SYS_EXT_SCRP_PRIMER_ACRYLIC_RP | primer | NEW |
| SYS_EXT_STCO_PRIMER_ALKALI | primer | Reuse NC (spot only) |
| SYS_EXT_STCO_FINISH_ACRYLIC_STD | finish | Reuse NC (QT2/QT3) |
| SYS_EXT_STCO_FINISH_ACRYLIC_PREM | finish | Reuse NC (QT4) |
| SYS_EXT_STCO_FINISH_ELASTOMERIC | finish | Reuse NC (QT3/QT4, trad only) |

### QA Status
- **Result**: Pass (42/42 checks, 3 minor warnings)
- **Warnings**: Prep pool stacking can exceed 4.0x in extreme cases (documented), ground cover area approximation, condition-to-state mapping advisory only.
