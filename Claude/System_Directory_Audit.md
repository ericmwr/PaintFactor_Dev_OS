# System Directory Audit

**Project Root:** `C:\Eric_AI_Playground\Claude Code Uni\Claude`
**Generated:** 2026-02-01

---

## Folder Structure

```
Claude/
├── .claude/
├── agents/
├── devos/
│   └── memory/
├── docs/
│   ├── Doctrine/
│   ├── Future_Work/
│   ├── research/
│   ├── SpecFactory_Enhancement_Rollout/
│   └── tasks/
├── production rates/
├── Research Resources/
│   └── Millwork/
├── scripts/
│   └── __pycache__/
├── skills/
└── specs/
    ├── _schemas/
    │   └── paintscope schema/
    ├── _templates/
    ├── SF_DRYWALL_CEILINGS_NC_PAINT_v1/
    ├── SF_DRYWALL_CEILINGS_NC_PRIME_v1/
    ├── SF_DRYWALL_FULL_NC_PRIME_v1/
    ├── SF_DRYWALL_WALL_NC_FINISH_v1/
    ├── SF_DRYWALL_WALL_NC_PRIME_v1/
    └── SF_TRIM_NC_PAINT_v1/
```

---

## Files Containing Path References

### Root Level

| File | Path References |
|------|----------------|
| `README.md` | `docs/System/PaintFactor_OS.md`, `docs/PaintScope/PaintScope_EdgeLF_Mapping.md`, `docs/System/Conventions.md`, `specs/SF_DRYWALL_WALL_NC_FINISH/`, `specs/_schemas/`, `scripts/validate_specs.py`, `specs/_templates/` |
| `.gitignore` | `docs/research/` |
| `Docs_Reorganization_Plan.md` | 100+ path references for proposed folder reorganization across `docs/`, `agents/`, `scripts/` |
| `Spec_Completeness_Rollout.md` | `Claude/docs/`, `Claude/docs/tasks/`, `Claude/specs/_schemas/`, `scripts/validate_specs.py` |
| `Zone_Key_Alignment_Rollout.md` | `docs/Reference/Protection_Zones_Reference.md`, `scripts/validate_specs.py`, `docs/Future_Work/Finish_Group_Declaration_System.md` |

### agents/

| File | Path References |
|------|----------------|
| `Dev Orchestrator (PaintFactor DevOS).md` | `docs/System/PaintFactor_OS.md`, `docs/PaintScope/PaintScope_EdgeLF_Mapping.md`, `docs/Doctrine/Fine_Finish_Doctrine.md`, `docs/PaintScope/PaintScope_Quantity_Key_Catalog.md`, `docs/PaintScope/Spec_Input_to_PaintScope_Key_Mapping.md`, `docs/PaintScope/PaintScope_Asset_Catalog.md`, `docs/PaintScope/PaintScope_Adjacency_Schema.md` |
| `critic.md` | `../docs/System/PaintFactor_OS.md`, `../docs/PaintScope/PaintScope_EdgeLF_Mapping.md`, `../docs/Doctrine/Protection_and_Masking_Doctrine.md`, `../docs/Doctrine/Materials_and_Consumables_Doctrine.md`, `../docs/Doctrine/Estimation_Modifiers_Doctrine.md`, `../docs/Doctrine/Quality_Tiers_and_Surface_Condition.md`, `../docs/Material_Role_System.md`, `../docs/Doctrine/Fine_Finish_Doctrine.md`, `../docs/Doctrine/Spec_Completeness_Doctrine.md`, `../docs/Reference/Site_Condition_Vocabulary_Reference.md`, `../docs/Doctrine/Modifier_Registry.md`, `../docs/Reference/Protection_Zones_Reference.md`, `../docs/Reference/Surface_Vocabulary_Reference.md`, `../docs/PaintScope/PaintScope_Quantity_Key_Catalog.md`, `../docs/PaintScope/Spec_Input_to_PaintScope_Key_Mapping.md`, `../docs/PaintScope/PaintScope_Asset_Catalog.md`, `../docs/PaintScope/PaintScope_Adjacency_Schema.md` |
| `specfactory-orchestrator.md` | Same `../docs/` pattern as `critic.md` |
| `spec-researcher.md` | `../docs/` references plus `../skills/deep_research_protocol.md`, `../docs/Doctrine/Window_Systems_Doctrine.md`, `../docs/PaintScope/PaintScope_Window_Counting_System.md` |
| `sop-librarian.md` | Multiple `../docs/` references |
| `estimation-engineer.md` | Multiple `../docs/` references |
| `materials-manager.md` | Multiple `../docs/` references |
| `product-architect.md` | `../docs/` references |
| `schema-engineer.md` | `../docs/System/PaintFactor_OS.md`, `specs/materials/SOP modules` |
| `ui-designer.md` | `../docs/System/PaintFactor_OS.md` |

### skills/

| File | Path References |
|------|----------------|
| `pf-specfactory-workflow.md` | `docs/Doctrine/Fine_Finish_Doctrine.md` |
| `fine-finish-workflow.md` | `Claude/docs/Doctrine/Fine_Finish_Doctrine.md`, `Claude/docs/Doctrine/Quality_Tiers_and_Surface_Condition.md`, `Claude/docs/Doctrine/Materials_and_Consumables_Doctrine.md` |
| `pf-rlm-controller.md` | General file/spec references |

### docs/

| File | Path References |
|------|----------------|
| `README.md` | Multiple references to documentation structure |
| `Conventions.md` | Spec structure and naming references |
| `Spec_Input_to_PaintScope_Key_Mapping.md` | `docs/PaintScope/PaintScope_Quantity_Key_Catalog.md`, `docs/PaintScope/PaintScope_EdgeLF_Mapping.md`, `docs/System/PaintFactor_OS.md` |
| `Schema_Alignment_Changelog.md` | `python scripts/validate_specs.py specs/` |
| `tasks/Doctrine_Authority_Addition.md` | `Claude/docs/System/PaintFactor_OS.md` |
| `tasks/Modifier_Registry_Creation.md` | `Claude/docs/Doctrine/Modifier_Registry.md` |
| `SpecFactory_Enhancement_Rollout/Protection_and_Continuity_Agent_Prompts.md` | `Claude/docs/Reference/Protection_Zones_Reference.md`, `Claude/docs/Reference/Surface_Vocabulary_Reference.md`, `docs/README.md` |
| `SpecFactory_Enhancement_Rollout/SpecFactory_Enhancement_Rollout_Plan.md` | Extensive references to `Claude/specs/_schemas/`, `Claude/docs/`, `Claude/agents/`, `Claude/scripts/validate_specs.py` |
| `SpecFactory_Enhancement_Rollout/Validation_Error_Triage.md` | `python scripts/validate_specs.py specs/` |

### specs/

| File | Path References |
|------|----------------|
| `_templates/sop_modules.json` | `docs/Reference/Protection_Zones_Reference.md`, `docs/Reference/Surface_Vocabulary_Reference.md` |
| `_templates/fine_finish_sop_modules_template.json` | `../_schemas/sop_modules.schema.json` |
| `SF_DRYWALL_CEILINGS_NC_PRIME_v1/research.json` | `docs/Doctrine/Materials_and_Consumables_Doctrine.md`, `docs/Reference/Site_Condition_Vocabulary_Reference.md` |

### .claude/

| File | Path References |
|------|----------------|
| `settings.json` | `bash .claude/statusline-command.sh` |

---

## Summary

| Category | Count |
|----------|-------|
| Total directories | 27 |
| Total files (non-binary) | ~120 |
| Files with path references | ~40 |
| Most-referenced path | `docs/System/PaintFactor_OS.md` |
| Most path-heavy folder | `agents/` (all 10 files reference `../docs/`) |

### Path Reference Patterns

- **Relative `../docs/`** — Used by all agent files
- **Project-rooted `Claude/docs/`** — Used by skills and rollout plans
- **Simple `docs/`** — Used by root-level files and specs templates
- **Script references** — `scripts/validate_specs.py` referenced from 10+ files
- **Schema `$schema`** — JSON schema pointers in spec templates
