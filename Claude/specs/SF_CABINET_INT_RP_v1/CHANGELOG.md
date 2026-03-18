# SF_CABINET_INT_RP_v1 Changelog

## v1.0.0 — 2026-03-14

### Initial Release

Interior cabinet repaint combined prime+finish spec. Highest-complexity interior RP spec in the pipeline.

**Scope**: Previously painted or factory-finished cabinets in occupied residential homes (kitchen, bathroom, laundry, utility).

**Key Features**:
- 80 tasks across 8 modules (75 TSK_CBRP_* + 5 shared TSK_RRP_*)
- 4 paintable items: door (EA), drawer (EA), frame (SF conditional), interior (SF conditional, always QT3)
- 7 configuration dimensions: quality_tier, application_method, sheen, substrate_state (5 SS_INT_*), condition_scale, scope (doors_only/full_exterior/full_with_interior), door_style
- 7 material systems: 4 RP primers (adhesion, bonding factory, stain-block shellac, mildew) + 3 fine-finish (QT3/QT4/QT5)
- Double-dimension primer routing: condition_scale + factory_finish_type
- Thermofoil go/no-go assessment gate
- Kitchen grease degreasing mandatory
- Post-primer adhesion test quality gate
- 10 protection zones (highest of any interior RP spec, adds contents_staging)
- 5 modifiers: condition_scale (GOOD/FAIR/POOR at 1.0/1.5/2.5x), door_style (slab/shaker/raised_panel/glass_frame), quality_tier, height, kitchen_complexity
- 4 round configurations (prime+2finish, 2finish, prime+3finish QT5 brush, 3finish QT5 brush)
- 12 variants covering condition x QT x method x factory finish combinations
- Two-mobilization workflow (paint visit + 5-7 day cure + reinstall visit)
- 22 PaintScope inputs (2 cabinet-specific: factory_finish_type, thermofoil_present)
- 12 calibration assumptions documented

**QA Result**: pass_with_warnings (0 critical, 1 major fixed, 0 minor)
- FIX-001: SOP task_count_summary declared binary=52/qt_scaled=28; actual is binary=55/qt_scaled=25. Fixed in sop_modules.json.

**Pipeline Artifacts**: research.json, resolution.json, materials.json, sop_modules.json, production.json, qa_report.json, spec.json
