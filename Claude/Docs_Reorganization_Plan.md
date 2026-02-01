# Docs Folder Reorganization Plan

**Status:** Executed
**Executed:** 2026-02-01  
**Created:** 2026-02-01  
**Purpose:** Clean up the `Claude/docs/` folder structure and fix all cross-references  

---

## 1. The Problem

The `docs/` folder has grown organically and now has three issues:

1. **Doctrine files split between `docs/` (flat) and `docs/Doctrine/` (subfolder)** — agents can't reliably find them
2. **Duplicate files at different versions** — `Fine_Finish_Doctrine.md` exists in both locations (v1.1 flat, v1.2.0 in subfolder)
3. **Everything else dumped flat in `docs/`** — PaintScope specs, reference docs, system architecture, and doctrine all mixed together

Agent prompts universally reference `docs/<filename>` (flat paths), so anything in `docs/Doctrine/` is invisible to the SpecFactory pipeline unless an agent happens to know the subfolder exists.

---

## 2. Current State Audit

### Files Currently Flat in `docs/`

**System Architecture (not doctrines — these are system design docs):**
- `PaintFactor_OS.md` — System architecture and operating doctrine
- `Conventions.md` — ID prefixes, naming, versioning
- `README.md` — Docs index

**Doctrine Files (should be in Doctrine/):**
- `Fine_Finish_Doctrine.md` ← OLD v1.1 (newer v1.2.0 exists in Doctrine/)
- `Quality_Tiers_and_Surface_Condition.md`
- `Materials_and_Consumables_Doctrine.md`
- `Estimation_Modifiers_Doctrine.md`
- `Protection_and_Masking_Doctrine.md`
- `Material_Role_System.md`

**PaintScope Documents (should be grouped):**
- `PaintScope_EdgeLF_Mapping.md`
- `paintscope_quantity_key_catalog.md`
- `Spec_Input_to_PaintScope_Key_Mapping.md`
- `PaintScope_Asset_Catalog.md`
- `PaintScope_Adjacency_Schema.md`
- `PaintScope_Window_Counting_System.md`

**Reference Documents (quick-lookup docs, not doctrines):**
- `Protection_Zones_Reference.md`
- `Surface_Vocabulary_Reference.md`
- `Site_Condition_Vocabulary_Reference.md`

**Doctrine Files missed in original audit (confirmed via System_Directory_Audit):**
- `Spec_Completeness_Doctrine.md`
- `Modifier_Registry.md`
- `Interior_Protection_Doctrine.md`
- `Interior_Protection_Doctrine_Residential_Repaint.md`

**PaintScope Documents missed in original audit:**
- `PaintScope_Key_Mapping_Addendum.md`

**Doctrine/ files missed in original audit:**
- `interior_protection_doctrine_final.md` (renamed → `Interior_Protection_Doctrine_Final.md`)

**System/Changelog Documents:**
- `Schema_Alignment_Changelog.md`

### Files Currently in `docs/tasks/`

- `Doctrine_Authority_Addition.md`
- `Modifier_Registry_Creation.md`
- *(Keep as-is — no reorganization needed)*

### Files Currently in `docs/Future_Work/`

- `Engine_Design_Notes_Atomic_Composition_and_Finish_Groups.md`
- *(Keep as-is — no reorganization needed)*

### Files Currently in `docs/Doctrine/`

- `Fine_Finish_Doctrine.md` ← NEW v1.2.0 (reformatted to Doctrine Format Standard)
- `Millwork_NC_Paint_Doctrine.md` v1.0.0
- `Doctrine_Format_Standard.md` v1.0.0
- `DOCTRINE_Window_Systems_Painting.md` (renamed → `Window_Systems_Doctrine.md`)
- `doors_doctrine_final.md` (renamed → `Doors_Doctrine.md`)
- `interior_protection_doctrine_final.md` (renamed → `Interior_Protection_Doctrine_Final.md`)

### Files in `docs/SpecFactory_Enhancement_Rollout/`

- This subfolder is fine as-is — it's a project/feature folder, not doctrine

---

## 3. Proposed Clean Structure

```
Claude/docs/
├── README.md                              ← Updated index (master reference)
│
├── System/                                ← System architecture & standards
│   ├── PaintFactor_OS.md
│   ├── Conventions.md
│   └── Schema_Alignment_Changelog.md
│
├── Doctrine/                              ← All domain doctrine (authoritative)
│   ├── Doctrine_Format_Standard.md
│   ├── Fine_Finish_Doctrine.md            ← Keep v1.2.0, DELETE flat v1.1
│   ├── Quality_Tiers_and_Surface_Condition.md
│   ├── Materials_and_Consumables_Doctrine.md
│   ├── Estimation_Modifiers_Doctrine.md
│   ├── Protection_and_Masking_Doctrine.md
│   ├── Material_Role_System.md
│   ├── Millwork_NC_Paint_Doctrine.md
│   ├── Doors_Doctrine.md                  ← Renamed from doors_doctrine_final.md
│   ├── Window_Systems_Doctrine.md         ← Renamed from DOCTRINE_Window_Systems_Painting.md
│   ├── Spec_Completeness_Doctrine.md
│   └── Modifier_Registry.md
│
├── PaintScope/                            ← PaintScope contract & geometry docs
│   ├── PaintScope_EdgeLF_Mapping.md
│   ├── PaintScope_Quantity_Key_Catalog.md ← Renamed from lowercase
│   ├── Spec_Input_to_PaintScope_Key_Mapping.md
│   ├── PaintScope_Asset_Catalog.md
│   ├── PaintScope_Adjacency_Schema.md
│   └── PaintScope_Window_Counting_System.md
│
├── Reference/                             ← Quick-lookup reference docs
│   ├── Protection_Zones_Reference.md
│   ├── Surface_Vocabulary_Reference.md
│   └── Site_Condition_Vocabulary_Reference.md
│
├── tasks/                                 ← Unchanged (task tracking)
│   ├── Doctrine_Authority_Addition.md
│   └── Modifier_Registry_Creation.md
│
├── Future_Work/                           ← Unchanged (design notes)
│   └── Engine_Design_Notes_Atomic_Composition_and_Finish_Groups.md
│
└── SpecFactory_Enhancement_Rollout/       ← Unchanged (project folder)
    ├── SpecFactory_Enhancement_Rollout_Plan.md
    ├── Protection_and_Continuity_Agent_Prompts.md
    └── Validation_Error_Triage.md
```

### Naming Convention Applied

| Old Name | New Name | Reason |
|----------|----------|--------|
| `doors_doctrine_final.md` | `Doors_Doctrine.md` | Match `[Domain]_Doctrine.md` convention |
| `DOCTRINE_Window_Systems_Painting.md` | `Window_Systems_Doctrine.md` | Match convention, drop screaming prefix |
| `paintscope_quantity_key_catalog.md` | `PaintScope_Quantity_Key_Catalog.md` | Match PascalCase convention |

---

## 4. Files That Reference Doctrine Paths

Every file below contains path references that must be updated after the move.

### Agent Prompts (in `Claude/agents/`)

| Agent File | References to Update |
|------------|---------------------|
| `Dev Orchestrator (PaintFactor DevOS).md` | `docs/Fine_Finish_Doctrine.md` → `docs/Doctrine/Fine_Finish_Doctrine.md` |
| | `docs/PaintFactor_OS.md` → `docs/System/PaintFactor_OS.md` |
| | `docs/PaintScope_EdgeLF_Mapping.md` → `docs/PaintScope/PaintScope_EdgeLF_Mapping.md` |
| | `docs/paintscope_quantity_key_catalog.md` → `docs/PaintScope/PaintScope_Quantity_Key_Catalog.md` |
| | `docs/Spec_Input_to_PaintScope_Key_Mapping.md` → `docs/PaintScope/Spec_Input_to_PaintScope_Key_Mapping.md` |
| | `docs/PaintScope_Asset_Catalog.md` → `docs/PaintScope/PaintScope_Asset_Catalog.md` |
| | `docs/PaintScope_Adjacency_Schema.md` → `docs/PaintScope/PaintScope_Adjacency_Schema.md` |
| `critic.md` | Same pattern — all `../docs/<file>` refs need subfolder paths |
| `sop-librarian.md` | Same pattern |
| `materials-manager.md` | Same pattern |
| `estimation-engineer.md` | Same pattern |
| `spec-researcher.md` | Same pattern |
| `specfactory-orchestrator.md` | Same pattern |

### Docs That Cross-Reference Other Docs

| Document | Cross-References to Check |
|----------|--------------------------|
| `docs/README.md` | All links in the index table — full rewrite needed |
| `Fine_Finish_Doctrine.md` (v1.2.0) | Cross-refs to other doctrines (filename only — OK if in same folder) |
| `Millwork_NC_Paint_Doctrine.md` | Cross-refs to `Fine_Finish_Doctrine.md`, `Quality_Tiers_and_Surface_Condition.md`, etc. |
| `Doors_Doctrine.md` | Cross-refs to Fine Finish, Quality Tiers, etc. |
| `Window_Systems_Doctrine.md` | Cross-refs to multiple docs |
| `Doctrine_Format_Standard.md` | Cross-ref examples use filename only — OK |
| `Protection_and_Continuity_Agent_Prompts.md` | File location references for docs to create/update |
| `SpecFactory_Enhancement_Rollout_Plan.md` | File path references throughout |

### Skills (in `Claude/skills/`)

| Skill File | References to Update |
|------------|---------------------|
| `pf-specfactory-workflow.md` | `docs/Fine_Finish_Doctrine.md` |
| `fine-finish-workflow.md` | `Claude/docs/Fine_Finish_Doctrine.md`, `Claude/docs/Quality_Tiers_and_Surface_Condition.md`, `Claude/docs/Materials_and_Consumables_Doctrine.md` |

### Specs (JSON files with doc path refs)

| Spec File | References to Update |
|-----------|---------------------|
| `specs/_templates/sop_modules.json` | `docs/Protection_Zones_Reference.md`, `docs/Surface_Vocabulary_Reference.md` |
| `specs/SF_DRYWALL_CEILINGS_NC_PRIME_v1/research.json` | `docs/Materials_and_Consumables_Doctrine.md`, `docs/Site_Condition_Vocabulary_Reference.md` |

### Scripts

| Script | References to Check |
|--------|---------------------|
| `scripts/validate_specs.py` | Likely no doc path refs (validates JSON), but verify |

### Root Files

| File | References |
|------|-----------|
| `README.md` (repo root) | `docs/PaintFactor_OS.md`, `docs/PaintScope_EdgeLF_Mapping.md`, `docs/Conventions.md` |
| `Spec_Completeness_Rollout.md` | `Claude/docs/`, `Claude/docs/tasks/`, `Claude/specs/_schemas/` |
| `Zone_Key_Alignment_Rollout.md` | `docs/Protection_Zones_Reference.md`, `docs/Future_Work/Finish_Group_Declaration_System.md` |

---

## 5. Execution Plan

### Phase 1: Audit (Manual — Do First)

Before moving anything, list every file currently in `docs/` and `docs/Doctrine/` to catch anything not in project knowledge. Run in the repo:

```bash
find Claude/docs/ -type f -name "*.md" | sort
```

Compare output against this plan. Add any files not listed here.

### Phase 2: Create Folders + Move Files

```bash
# Create new subfolders
mkdir -p Claude/docs/System
mkdir -p Claude/docs/PaintScope
mkdir -p Claude/docs/Reference

# Move System docs
mv Claude/docs/PaintFactor_OS.md Claude/docs/System/
mv Claude/docs/Conventions.md Claude/docs/System/
mv Claude/docs/Schema_Alignment_Changelog.md Claude/docs/System/

# Move Doctrine docs from flat to Doctrine/
# (Fine_Finish already in Doctrine/ at v1.2.0 — just delete the old flat copy)
rm Claude/docs/Fine_Finish_Doctrine.md
mv Claude/docs/Quality_Tiers_and_Surface_Condition.md Claude/docs/Doctrine/
mv Claude/docs/Materials_and_Consumables_Doctrine.md Claude/docs/Doctrine/
mv Claude/docs/Estimation_Modifiers_Doctrine.md Claude/docs/Doctrine/
mv Claude/docs/Protection_and_Masking_Doctrine.md Claude/docs/Doctrine/
mv Claude/docs/Material_Role_System.md Claude/docs/Doctrine/
mv Claude/docs/Spec_Completeness_Doctrine.md Claude/docs/Doctrine/
mv Claude/docs/Modifier_Registry.md Claude/docs/Doctrine/

# Rename inconsistent doctrine files
mv Claude/docs/Doctrine/doors_doctrine_final.md Claude/docs/Doctrine/Doors_Doctrine.md
mv Claude/docs/Doctrine/DOCTRINE_Window_Systems_Painting.md Claude/docs/Doctrine/Window_Systems_Doctrine.md

# Move PaintScope docs
mv Claude/docs/PaintScope_EdgeLF_Mapping.md Claude/docs/PaintScope/
mv Claude/docs/paintscope_quantity_key_catalog.md Claude/docs/PaintScope/PaintScope_Quantity_Key_Catalog.md
mv Claude/docs/Spec_Input_to_PaintScope_Key_Mapping.md Claude/docs/PaintScope/
mv Claude/docs/PaintScope_Asset_Catalog.md Claude/docs/PaintScope/
mv Claude/docs/PaintScope_Adjacency_Schema.md Claude/docs/PaintScope/
mv Claude/docs/PaintScope_Window_Counting_System.md Claude/docs/PaintScope/

# Move Reference docs
mv Claude/docs/Protection_Zones_Reference.md Claude/docs/Reference/
mv Claude/docs/Surface_Vocabulary_Reference.md Claude/docs/Reference/
mv Claude/docs/Site_Condition_Vocabulary_Reference.md Claude/docs/Reference/
```

### Phase 3: Update Agent Prompts

For each agent file, find-and-replace all doc path references. The pattern is consistent:

| Old Path Pattern | New Path Pattern |
|------------------|------------------|
| `docs/PaintFactor_OS.md` | `docs/System/PaintFactor_OS.md` |
| `docs/Conventions.md` | `docs/System/Conventions.md` |
| `docs/Fine_Finish_Doctrine.md` | `docs/Doctrine/Fine_Finish_Doctrine.md` |
| `docs/Quality_Tiers_and_Surface_Condition.md` | `docs/Doctrine/Quality_Tiers_and_Surface_Condition.md` |
| `docs/Materials_and_Consumables_Doctrine.md` | `docs/Doctrine/Materials_and_Consumables_Doctrine.md` |
| `docs/Estimation_Modifiers_Doctrine.md` | `docs/Doctrine/Estimation_Modifiers_Doctrine.md` |
| `docs/Protection_and_Masking_Doctrine.md` | `docs/Doctrine/Protection_and_Masking_Doctrine.md` |
| `docs/Material_Role_System.md` | `docs/Doctrine/Material_Role_System.md` |
| `docs/PaintScope_EdgeLF_Mapping.md` | `docs/PaintScope/PaintScope_EdgeLF_Mapping.md` |
| `docs/paintscope_quantity_key_catalog.md` | `docs/PaintScope/PaintScope_Quantity_Key_Catalog.md` |
| `docs/Spec_Input_to_PaintScope_Key_Mapping.md` | `docs/PaintScope/Spec_Input_to_PaintScope_Key_Mapping.md` |
| `docs/PaintScope_Asset_Catalog.md` | `docs/PaintScope/PaintScope_Asset_Catalog.md` |
| `docs/PaintScope_Adjacency_Schema.md` | `docs/PaintScope/PaintScope_Adjacency_Schema.md` |
| `docs/PaintScope_Window_Counting_System.md` | `docs/PaintScope/PaintScope_Window_Counting_System.md` |
| `docs/Protection_Zones_Reference.md` | `docs/Reference/Protection_Zones_Reference.md` |
| `docs/Surface_Vocabulary_Reference.md` | `docs/Reference/Surface_Vocabulary_Reference.md` |
| `docs/Doctrine/DOCTRINE_Window_Systems_Painting.md` | `docs/Doctrine/Window_Systems_Doctrine.md` |
| `docs/Doctrine/doors_doctrine_final.md` | `docs/Doctrine/Doors_Doctrine.md` |
| `docs/Spec_Completeness_Doctrine.md` | `docs/Doctrine/Spec_Completeness_Doctrine.md` |
| `docs/Modifier_Registry.md` | `docs/Doctrine/Modifier_Registry.md` |
| `docs/Site_Condition_Vocabulary_Reference.md` | `docs/Reference/Site_Condition_Vocabulary_Reference.md` |
| `docs/Schema_Alignment_Changelog.md` | `docs/System/Schema_Alignment_Changelog.md` |

**Files to update in `Claude/agents/`:**
1. `Dev Orchestrator (PaintFactor DevOS).md`
2. `critic.md`
3. `sop-librarian.md`
4. `materials-manager.md`
5. `estimation-engineer.md`
6. `spec-researcher.md`
7. `specfactory-orchestrator.md`
8. `product-architect.md`
9. `schema-engineer.md`
10. `ui-designer.md`

### Phase 3b: Update Skills Files

Skill files also contain doc path references that must be updated.

| Skill File | References to Update |
|------------|---------------------|
| `skills/pf-specfactory-workflow.md` | `docs/Fine_Finish_Doctrine.md` → `docs/Doctrine/Fine_Finish_Doctrine.md` |
| `skills/fine-finish-workflow.md` | `Claude/docs/Fine_Finish_Doctrine.md` → `Claude/docs/Doctrine/Fine_Finish_Doctrine.md` |
| | `Claude/docs/Quality_Tiers_and_Surface_Condition.md` → `Claude/docs/Doctrine/Quality_Tiers_and_Surface_Condition.md` |
| | `Claude/docs/Materials_and_Consumables_Doctrine.md` → `Claude/docs/Doctrine/Materials_and_Consumables_Doctrine.md` |

### Phase 3c: Update Specs Files

Spec templates and research files reference doc paths that will move.

| Spec File | References to Update |
|-----------|---------------------|
| `specs/_templates/sop_modules.json` | `docs/Protection_Zones_Reference.md` → `docs/Reference/Protection_Zones_Reference.md` |
| | `docs/Surface_Vocabulary_Reference.md` → `docs/Reference/Surface_Vocabulary_Reference.md` |
| `specs/SF_DRYWALL_CEILINGS_NC_PRIME_v1/research.json` | `docs/Materials_and_Consumables_Doctrine.md` → `docs/Doctrine/Materials_and_Consumables_Doctrine.md` |
| | `docs/Site_Condition_Vocabulary_Reference.md` → `docs/Reference/Site_Condition_Vocabulary_Reference.md` |

### Phase 3d: Update Root-Level Rollout Files

Root-level files also contain doc path references that should reflect the new structure.

| Root File | References to Update |
|-----------|---------------------|
| `Spec_Completeness_Rollout.md` | All `Claude/docs/<file>` refs → updated subfolder paths |
| `Zone_Key_Alignment_Rollout.md` | `docs/Protection_Zones_Reference.md` → `docs/Reference/Protection_Zones_Reference.md` |
| | `docs/Future_Work/Finish_Group_Declaration_System.md` — no change (Future_Work stays) |
| `Docs_Reorganization_Plan.md` | Self-update after execution to reflect final state |

### Phase 3e: Update Docs That Cross-Reference

| Doc File | References to Update |
|----------|---------------------|
| `docs/Spec_Input_to_PaintScope_Key_Mapping.md` | `docs/PaintScope_Quantity_Key_Catalog.md` → `docs/PaintScope/PaintScope_Quantity_Key_Catalog.md` |
| | `docs/PaintScope_EdgeLF_Mapping.md` → `docs/PaintScope/PaintScope_EdgeLF_Mapping.md` |
| | `docs/PaintFactor_OS.md` → `docs/System/PaintFactor_OS.md` |
| `docs/tasks/Doctrine_Authority_Addition.md` | `Claude/docs/PaintFactor_OS.md` → `Claude/docs/System/PaintFactor_OS.md` |
| `docs/tasks/Modifier_Registry_Creation.md` | `Claude/docs/Modifier_Registry.md` → `Claude/docs/Doctrine/Modifier_Registry.md` |
| `docs/SpecFactory_Enhancement_Rollout/Protection_and_Continuity_Agent_Prompts.md` | `Claude/docs/Protection_Zones_Reference.md` → `Claude/docs/Reference/Protection_Zones_Reference.md` |
| | `Claude/docs/Surface_Vocabulary_Reference.md` → `Claude/docs/Reference/Surface_Vocabulary_Reference.md` |
| `docs/SpecFactory_Enhancement_Rollout/SpecFactory_Enhancement_Rollout_Plan.md` | All `Claude/docs/<file>` refs → updated subfolder paths |

### Phase 4: Update docs/README.md

Rewrite the index table to reflect new structure with subfolder paths.

### Phase 5: Update Root README.md

Update the Canonical Doctrine table paths.

### Phase 6: Verify Cross-References Within Doctrines

Doctrine-to-doctrine cross-references currently use filename only (per Doctrine_Format_Standard § 5):
```
Per `Fine_Finish_Doctrine.md` v1.1, Section 4.2...
```

Since all doctrines will now be in the same `Doctrine/` folder, filename-only references will work for humans. Agent prompts use full paths, so those are handled in Phase 3.

Check the SpecFactory Enhancement Rollout docs for any hardcoded paths that changed.

### Phase 7: Smoke Test

After all updates:
1. Grep the entire repo for old paths to catch stragglers:
   ```bash
   grep -rn "docs/Fine_Finish_Doctrine" Claude/ --include="*.md" --include="*.json"
   grep -rn "docs/PaintFactor_OS.md" Claude/ --include="*.md" --include="*.json"
   grep -rn "docs/paintscope_quantity_key_catalog" Claude/ --include="*.md" --include="*.json"
   grep -rn "docs/Spec_Completeness_Doctrine.md" Claude/ --include="*.md" --include="*.json"
   grep -rn "docs/Modifier_Registry.md" Claude/ --include="*.md" --include="*.json"
   grep -rn "docs/Site_Condition_Vocabulary_Reference" Claude/ --include="*.md" --include="*.json"
   grep -rn "docs/Protection_Zones_Reference.md" Claude/ --include="*.md" --include="*.json"
   grep -rn "docs/Surface_Vocabulary_Reference.md" Claude/ --include="*.md" --include="*.json"
   ```
2. Verify no broken relative links in agent prompts
3. Run `validate_specs.py` to make sure nothing broke in schemas/specs

---

## 6. Claude Code Task Prompt

Once the audit is complete and this plan is confirmed, use this prompt for Claude Code execution:

```
## Objective
Reorganize Claude/docs/ folder structure per the plan in [this file path].

## Constraints
- Do NOT modify file contents during moves (except README index updates and agent path updates)
- Do NOT rename files beyond what's listed in the plan
- Commit after each phase so changes can be reviewed

## Steps
1. Run `find Claude/docs/ -type f -name "*.md" | sort` and compare to the plan
2. Create subfolders: System/, PaintScope/, Reference/
3. Move files per Phase 2 commands
4. Update all agent prompts per Phase 3 path mapping table (all 10 agents)
5. Update all skill files per Phase 3b
6. Update specs JSON files per Phase 3c
7. Update root rollout files per Phase 3d
8. Update docs cross-references per Phase 3e
9. Rewrite docs/README.md index
10. Update root README.md
11. Grep for any remaining old paths (include *.json)
12. Run validate_specs.py

## Acceptance Criteria
- Zero grep hits for old flat paths in agents, skills, specs, or root files
- docs/README.md reflects new structure with working links
- validate_specs.py passes with same results as before (no regressions)
- All files accounted for — nothing lost
```

---

## 7. Risk Notes

- **Enhancement Rollout docs** reference some old paths in their "prompt templates" — these are copy-paste instructions that were already executed. They could be updated for accuracy but are low priority since those phases are complete.
- **Doctrine cross-references** within doctrine files use filename-only format. This is fine as long as all doctrines live in the same folder. If doctrines ever split across subfolders, the format standard would need to change.
- **Git history** will show moves as delete+add unless `git mv` is used. Recommend `git mv` for all moves to preserve history.

---

## Change Log

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-02-01 | Eric + Claude | Initial reorganization plan |
| 1.1.0 | 2026-02-01 | Eric + Claude | Updated from System_Directory_Audit: added 4 uncategorized docs (Spec_Completeness_Doctrine, Modifier_Registry, Site_Condition_Vocabulary_Reference, Schema_Alignment_Changelog); added 3 missing agents (product-architect, schema-engineer, ui-designer); added skills/ and specs/ path update phases (3b, 3c); added root rollout file updates (3d); added docs cross-reference updates (3e); documented tasks/ and Future_Work/ as unchanged; expanded smoke test greps to cover all moved files and JSON |
