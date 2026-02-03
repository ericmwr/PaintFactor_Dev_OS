# SF_DOOR_FRAME_NC_FINISH Changelog

## v1.0.0 - 2026-02-03

### Initial Release

Full SpecFactory pipeline completion for interior door frame new construction finish painting.

### Spec Artifacts Created
- `research.json` - Research findings with protection zones, adjacency declarations, site conditions
- `materials.json` - Fine Finish material systems (4 systems: Standard Acrylic, Modified Urethane, Premium, Gallery)
- `sop_modules.json` - 8 modules with 25 tasks covering setup through cleanup
- `production.json` - Production rates using EA (frame set) as primary unit
- `qa_report.json` - QA validation with PASS_WITH_WARNINGS result
- `spec.json` - Assembled specification with all configuration dimensions

### Key Design Decisions

#### Primary Unit: EA (Frame Set)
- One frame set per door opening, includes jambs and stop
- Aligns with industry practice and estimating conventions

#### Frame Types Supported
- Standard (1.0x complexity)
- Pocket (0.85x - simpler, no stop)
- Cased opening (0.75x - no stop, no hardware)
- Bifold (0.90x - narrower jambs)

#### No Frame Width Modifier
- Per PCA Industry Standards, surfaces less than 1 foot in width are measured as 1 LF regardless of actual width
- Applies to all door frame profiles (4-9/16", 5-1/4", 6-9/16")

### Research Corrections Applied

| ID | Original Claim | Corrected To |
|----|----------------|--------------|
| RC-001 | Frame width modifier of 1.20x for wide frames (6-9/16"+) | No frame width modifier per PCA standards |
| RC-002 | Waterborne alkyd preferred for brush/roll due to longer open time | Modified urethane has SHORT open time (5-10 min). Oil-based has longest working time. |

### Material Systems

| System ID | Quality Tier | Key Characteristics |
|-----------|--------------|---------------------|
| SYS_FF_STANDARD_ACRYLIC | QT3 | Standard waterborne acrylic, good durability |
| SYS_FF_MODIFIED_URETHANE | QT4 | Harder finish, SHORT open time (5-10 min) |
| SYS_FF_PREMIUM | QT5 | High-end waterborne, excellent flow |
| SYS_FF_GALLERY | QT5 | Gallery Series with dedicated primer for ultimate compatibility |

### Protection Zones

| Zone ID | Application Method | Conditionality |
|---------|-------------------|----------------|
| floor_workzone | Brush/Roll | floor_type = finished OR partial |
| floor_full_8ft_radius | Spray | floor_type = finished OR partial |
| wall_adjacent_door | Spray | Project-level (wall_finish_state) |
| hardware_covers | Both | Always (hinges AND strike plate) |

### Adjacency Declarations

- **Primary Surface**: door_frame
- **Adjacent Surfaces**: door_casing, door_leaf_edge, wall_field, door_stop

### Project-Level Conditions (Not Site Conditions)

| Condition | Description | Handling |
|-----------|-------------|----------|
| wall_finish_state | Whether adjacent walls are primed or finished | Project-level sequencing decision; will migrate to adjacency declaration protection rules |
| installation_sequence | Whether doors installed before or after painting | Affects mortise touch-up requirement |

### Warnings from QA

| ID | Severity | Message |
|----|----------|---------|
| WARN-002 | Low | installation_sequence not in Site_Condition_Vocabulary_Reference.md |
| WARN-003 | Low | Door slab spec lacks qa_report.json for cross-spec validation |

### Doctrine Compliance
- Fine_Finish_Doctrine.md - PASS
- Spec_Completeness_Doctrine.md - PASS
- Quality_Tiers_and_Surface_Condition.md - PASS
- Modifier_Registry.md - PASS
- Protection_Zones_Reference.md - PASS
- Surface_Vocabulary_Reference.md - PASS
- Site_Condition_Vocabulary_Reference.md - PASS
- PCA Industry Standards - PASS
- Materials_and_Consumables_Doctrine.md - PASS
