# Changelog — SF_CLOSET_SHELF_NC

All notable changes to this spec family will be documented in this file.

---

## [0.1.0] — 2026-02-03

### Added
- Initial draft spec for New Construction Closet Shelf Paint
- Uses **Opening Count quantification method** per BuiltIns_Shelving Quantification System.md v2.0
- Opening tiers: S (small), M (medium), L (large), XL (extra large)
- Opening modifiers: depth, detail, access per quantification system
- Substrate states: SS_BARE, SS_PRIMED_FACTORY per Substrate_State_Reference.md
- Application methods: brush_roll, spray, spray_rolloff
- spray_rolloff method for working primer into bare wood grain
- MDF edge seal task (conditional on SS_BARE)
- Quality tiers: QT2, QT3, QT4, QT5 with appropriate coat counts
- Floor protection (floor_workzone) conditional on floor_type
- State declarations with valid_input_states and output_state
- Adjacency declarations for builtin_shelf → wall_field
- Site condition rules for floor_type

### Doctrine Alignment
- BuiltIns_Shelving Quantification System.md v2.0
- Substrate_State_Reference.md
- Modifier_Registry.md
- Millwork_NC_Paint_Doctrine.md
- Site_Condition_Vocabulary_Reference.md
- Protection_Zones_Reference.md

### Notes
- Simple spec with minimal modules
- This spec CAUSES COMP_CLOSET_SHELVING (1.5x) modifier on wall/ceiling specs in same closet
- Proposed new PaintScope keys: PS_OPENING_EA.CLOSET_SHELF.{S,M,L,XL}

---

## Status

| Version | Status | Review Required |
|---------|--------|-----------------|
| 0.1.0   | draft  | yes             |
