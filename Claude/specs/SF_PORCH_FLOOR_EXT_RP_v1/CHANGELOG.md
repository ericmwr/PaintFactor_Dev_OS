# SF_PORCH_FLOOR_EXT_RP_v1 — Changelog

## v0.1.0 — 2026-03-15

### Initial Draft — Exterior Porch Floor Repaint

**Pipeline**: SpecFactory 7-stage (Research -> Resolution -> Materials -> SOP -> Production -> QA -> Spec)

**Spec Summary**: Condition-dependent repaint of existing exterior porch, portico, and covered patio floor surfaces. Dual-substrate (concrete + wood T&G). Assessment-first workflow. Porch enamel satin as universal RP finish.

**Key Design Decisions**:
- **Context prefix**: PFRP (Porch Floor RePaint) — NC sibling uses PRFL
- **Coating system NOT a dimension**: RP converges on single product (porch enamel) regardless of original coating. Polyurea/epoxy excluded from standard RP scope.
- **Existing coating condition is primary RP dimension**: sound/worn/failing/peeling drives prep intensity and primer strategy
- **NO acid etch on RP**: Chemical degloss or mechanical abrasion replaces NC acid etch for concrete. Acid etch would damage intact existing coating.
- **QT2-QT3 only**: Utilitarian walking surface. QT2 = economy single-coat refresh (sound only). QT3 = standard 2-coat full repaint.
- **Anti-slip mandatory**: Silica sand on field, aluminum oxide on steps. Safety requirement.
- **Cure-time communication**: Dedicated task for customer impact management (48-72hr foot traffic, 7-day furniture)

**Artifact Counts**:
| Artifact | Count |
|---|---|
| Paintable items | 2 (floor SF, step EA) |
| SOP modules | 8 |
| Total tasks | 35 (all binary) |
| Material systems | 3 |
| Factor modifiers | 2 |
| Round configurations | 2 |
| Protection zones | 6 |
| Variants | 11 |
| PaintScope inputs | 9 |
| Compatibility rules | 10 |
| Risk flags | 4 |

**QA Result**: pass_with_warnings (2 minor — furniture return scheduling, QT2 single-coat aggregate adhesion)

**Sibling Spec**: SF_PORCH_FLOOR_EXT_NC_v1 (36 tasks, 4 coating systems, 2 substrates)

**RP-Specific Additions Over NC**:
- Assessment module (4 tasks: condition, coating ID, moisture test, MC test)
- Existing coating condition dimension (replaces NC coating_system)
- Condition-driven prep: degloss/scuff (sound/worn) vs scrape/feather (failing/peeling)
- Bonding primer for incompatible/unknown existing coatings
- Chemical degloss replaces acid etch
- Moisture assessment on peeling concrete (root cause identification)
- Cure-time customer communication task
- Spot/full/none primer strategy (vs NC mandatory prime)

**Modifier Stack**: Max 2.20x (peeling 2.00 x wood 1.10). Well under 4.0x cap.
