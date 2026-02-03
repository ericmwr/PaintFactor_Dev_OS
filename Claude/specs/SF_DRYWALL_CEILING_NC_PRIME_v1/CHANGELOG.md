# Changelog — SF_DRYWALL_CEILING_NC_PRIME

## [0.1.0] — 2026-02-01

### Added
- Initial draft spec family for NC drywall ceiling priming
- Generated from brief: `specs/_backlog/SF_DRYWALL_CEILING_NC_PRIME/brief.md`
- Mirrors SF_DRYWALL_WALL_NC_PRIME (v0.1.1) structure with ceiling-specific adaptations

### Ceiling-Specific Design Decisions
- **Production rates 15-25% slower than wall equivalents** due to overhead work fatigue
- **Floor protection: floor_full for spray methods** (not floor_perimeter like walls)
- **Height modifiers per Modifier_Registry**: H1=1.0 (≤9ft), H2=1.3 (10-12ft), H3=1.5 (13-17ft), H4=2.0 (18ft+)
- **Edge key resolution**: Uses new `PS_EDGE_LF.TO_WALL` — each surface declares its own edge key (wall uses TO_CEILING, ceiling uses TO_WALL)
- **Wall protection conditional**: In NC sequence, walls are typically bare during ceiling prime — wall_adjacent zone declared but conditional
- **No quality_tier dimension**: Brief specified primer doesn't differentiate by QT. However, spec includes QT2/QT3/QT4 variants consistent with wall prime sibling (QT affects prep intensity and edge discipline, not primer application itself)

### Inherited from Wall Prime
- RC-001: No spot-priming NC drywall fasteners
- RC-002: PVA/acrylic primers are sealers, not stain blockers
- RC-003: Floor protection conditional on floor_type
- RC-004: No dry time references in specs
- Same material systems (PVA, acrylic latex, high-build)
- Same coverage profiles (same substrate absorption)
- Same consumable types with ceiling-specific notes

### Artifacts
- `research.json` — Ceiling-specific research with overhead considerations
- `materials.json` — Same material systems as wall prime + ceiling floor protection materials
- `sop_modules.json` — Ceiling task modules with TSK_CEIL_* prefix, floor protection module
- `production.json` — Ceiling rates with overhead fatigue reductions, height effects, coupling constraints
- `spec.json` — Master spec with all declarations
- `CHANGELOG.md` — This file

### Human Review Decisions (2026-02-01)
- [x] **Config dimensions**: Keep all 4 (application_method, ceiling_height, drywall_finish_level, surface_texture). Brief to be updated.
- [x] **Light sand task**: Removed from prime spec. Belongs in finish spec prep phase. Also removed from wall prime.
- [x] **Edge key**: Created `PS_EDGE_LF.TO_WALL` as distinct key. Updated all ceiling prime artifacts.

### Open Items
- [ ] Exact overhead fatigue factor needs field validation (15-25% range)
- [ ] Wall protection during ceiling prime: when is it actually needed in NC?
