# SF_SIDING_ENGINEERED_EXT_RP_v1 — CHANGELOG

## v1.0.0 — 2026-03-15

### Initial Release

Full 7-stage SpecFactory Pipeline execution for Exterior Engineered Wood Siding Repaint.

**Context Prefix:** EWRP (Engineered Wood RePaint)
**Domain:** exterior / repaint
**Quality Tiers:** QT2, QT3, QT4
**Substrate States:** SS_EXT_SOUND_PAINT, SS_EXT_CHALKING, SS_EXT_FAILING_PAINT, SS_EXT_PEELING
**Application Methods:** spray_backroll (primary), brush_roll (fallback)
**Siding Profiles:** lap (1.00x), panel (0.90x)
**Surface Textures:** smooth (1.00x), textured (1.15x)

### Files Generated

| File | Stage | Description |
|------|-------|-------------|
| research.json | 1 - Research | NC task classification (15 DIRECT, 9 MODIFIED, 5 NOT_APPLICABLE), 13 RP_NEW tasks, 5 SHARED_RRP, 15 findings, 5 condition drivers |
| resolution.json | 2 - Resolution | Pre-resolved registry values, 14 PaintScope keys, 8 zones, 6 factor modifiers, 4 round configs, 8 registry additions |
| materials.json | 3 - Materials | 5 material systems, 5 coverage profiles, 20 consumables, 8 compatibility rules |
| sop_modules.json | 4 - SOP | 8 modules, 43 tasks (7 setup + 6 assess + 9 prep + 2 prime + 4 finish + 4 interstage + 6 cleanup + 5 RRP) |
| production.json | 5 - Production | 43 task production rates, 6 factor modifiers with stacking partition, quality effects, stacking examples |
| qa_report.json | 6 - QA | 20 validation checks, all pass. 3 minor warnings documented. |
| spec.json | 7 - Assembly | Master spec with all sections assembled |
| CHANGELOG.md | 7 - Assembly | This file |

### Key Design Decisions

1. **spray_backroll as primary RP method** — existing paint film has weathering/micro-cracking; backroll works product into surface irregularities for maximum adhesion. spray-only NOT valid for RP.

2. **Power wash 500-1000 PSI allowed** — KEY departure from both NC (garden hose only) and FC RP (rinse only). EW resin-bonded wood strand surface tolerates gentle power washing. NEVER exceed 1000 PSI.

3. **NO alkali-resistant primer** — KEY departure from FC RP. Engineered wood is neutral pH (wood-based, not cementitious). Standard acrylic stain-block primer for exposed substrate.

4. **Edge seal is assessment, not application** — NC seals ALL cut edges during installation. RP checks edge seal integrity and addresses failures through scraping, repair, and spot priming.

5. **T1-11 dropped from RP** — rare repaint scenario. If encountered, T&M consideration.

6. **2 textures instead of 3** — smooth/textured (1.15x) replaces smooth/cedarmill (1.20x)/roughsawn (1.30x). Existing paint film obscures original texture differences.

7. **Panel modifier 0.90x (faster)** — RP panel is faster than lap because spray_backroll on large flat areas is efficient. NC panel was 1.10x (slower) due to spray-only overlap management.

8. **Butt joints: remove failed caulk, do NOT re-caulk** — maintains NC moisture trap prohibition. Siding-to-trim joints are fully assessed and replaced.

9. **RP spray_backroll rates faster than NC** — 225 SF/hr vs NC 175 SF/hr. Previously painted surface provides more consistent absorption than NC factory-primed surface.

### Source Specifications

- **NC Sibling:** SF_SIDING_ENGINEERED_EXT_NC_v1 (ENSD prefix, 29 tasks)
- **FC RP Sibling:** SF_SIDING_FIBERCEMENT_EXT_RP_v1 (FCRP prefix, 45 tasks)
- **Wood RP Reference:** SF_SIDING_WOOD_EXT_RP_v1
- **Trim RP Reference:** SF_TRIM_EXT_RP_v1
