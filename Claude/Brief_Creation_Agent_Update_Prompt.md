# Claude Code Task: Doctrine-Driven Brief Creation

**Task Type:** Agent Prompt Updates  
**Created:** 2026-02-02  
**Priority:** High  
**Blocks:** Accurate spec generation from catalog  

---

## Objective

Update two agent prompts to implement doctrine-driven brief creation:

1. **Dev Orchestrator** — Add brief lookup + delegation to Spec Researcher when brief missing
2. **Spec Researcher** — Add brief creation capability with mandatory doctrine loading

---

## Problem Statement

Currently, when Dev Orchestrator can't find a brief for a spec family, it drafts one itself without loading doctrine — resulting in "vibe briefs" based on general knowledge instead of established system rules. These inaccurate briefs then poison the entire SpecFactory pipeline.

**Root Cause:** Dev Orchestrator's job is coordination, not deep domain research. It doesn't have (and shouldn't have) all 26 doctrine documents in its Required Reading.

**Solution:** Delegate brief creation to Spec Researcher, who already has research skills, doctrine access, and the analysis capabilities needed to create accurate briefs.

---

## Files to Update

| File | Path | Action |
|------|------|--------|
| Dev Orchestrator | `Claude/agents/Dev Orchestrator (PaintFactor DevOS).md` | Add Spec Brief System section |
| Spec Researcher | `Claude/agents/spec-researcher.md` | Add Brief Creation Mode + expand Required Reading |

---

## Target Workflow

```
User: "Generate SF_DOOR_SLAB_INT_NC"
         │
         ▼
Dev Orchestrator: Check for brief at specs/_backlog/SF_DOOR_SLAB_INT_NC/brief.md
         │
         ▼
    [Brief not found]
         │
         ▼
Dev Orchestrator → Spec Researcher: "Create brief for SF_DOOR_SLAB_INT_NC"
         │
         ▼
Spec Researcher: 
  1. Loads ALL required doctrine documents
  2. Researches the domain
  3. Outputs draft brief.md using template
         │
         ▼
Dev Orchestrator: Presents brief to human for approval
         │
         ▼
    [Human approves]
         │
         ▼
Dev Orchestrator: Saves brief to specs/_backlog/<SF_ID>/brief.md
         │
         ▼
Dev Orchestrator → SpecFactory Orchestrator: Run pipeline with approved brief
```

---

## Part 1: Dev Orchestrator Updates

### Location

Add a new section called `## Spec Brief System` **after** the existing `## Default Workflow` section.

### Content to Add

```markdown
---

## Spec Brief System

When SpecFactory work is requested, check for a pre-authored brief FIRST.

### Brief Lookup Order

1. **If human specifies a spec family ID** (e.g., "Generate SF_DOOR_SLAB_INT_NC"):
   → Look for `Claude/specs/_backlog/<SF_ID>/brief.md`

2. **If human says "generate next spec"**:
   → Read `Claude/specs/_backlog/_catalog.md`
   → Find first entry with status: `queued`
   → Check if brief exists for that SF_ID at `specs/_backlog/<SF_ID>/brief.md`

3. **If human says "what's in the backlog?"**:
   → Read and summarize `Claude/specs/_backlog/_catalog.md`

### If Brief Exists

- Read the brief COMPLETELY before delegating to SpecFactory Orchestrator
- The brief is AUTHORITATIVE for scope, config dimensions, paintable items, PaintScope keys, and constraints
- Do NOT re-derive scope from scratch — the brief already defines it
- Pass full brief content to SpecFactory Orchestrator as context
- After successful generation, update `_catalog.md` status to `generated`

### If Brief Does Not Exist

**CRITICAL: Do NOT draft the brief yourself.**

Dev Orchestrator is a coordinator, not a domain researcher. Brief creation requires loading doctrine documents that are outside Dev Orchestrator's Required Reading.

**Instead, delegate to Spec Researcher:**

1. Tell the human: "No brief found for `<SF_ID>`. I'll delegate to Spec Researcher to draft one based on doctrine."

2. Dispatch to **Spec Researcher** with:
   ```
   Task Type: brief_creation
   Spec Family ID: <SF_ID>
   Context: [Any context from catalog or human request]
   ```

3. Spec Researcher will:
   - Load all required doctrine documents (26 docs across System/, Doctrine/, Reference/, PaintScope/)
   - Research the specific domain
   - Output a complete draft brief using the template at `specs/_backlog/_brief_template.md`

4. When Spec Researcher returns the draft, present it to the human for approval

### Brief Approval Gate

After Spec Researcher returns a draft brief:

1. **Present the brief to the human** — Show the complete brief content
2. **Ask explicitly:** "Review this brief for `<SF_ID>`. Approve to proceed with spec generation, or provide corrections."
3. **If corrections provided:**
   - Send corrections back to Spec Researcher
   - Spec Researcher revises and returns updated brief
   - Repeat until approved
4. **If approved:**
   - Save brief to `Claude/specs/_backlog/<SF_ID>/brief.md`
   - Update `_catalog.md` to show brief exists
   - Proceed to delegate to SpecFactory Orchestrator

**NEVER run the SpecFactory pipeline without an approved brief.**

### After Successful Spec Generation

1. Copy `brief.md` into the output folder: `Claude/specs/<SF_ID>_v1/brief.md` (provenance)
2. Update `Claude/specs/_backlog/_catalog.md` status from `queued` to `generated`
3. Report completion to human

### SpecFactory Orchestrator Context

When delegating to SpecFactory Orchestrator, include:
- The full approved brief content
- Instruction to use brief Section 8 (Doctrine References) for agent context
- Instruction to validate against brief Section 9 (Acceptance Criteria)
```

---

## Part 2: Spec Researcher Updates

### Update 1: Expand Required Reading Section

Replace or expand the existing Required Reading section with the **complete master doctrine list**. This ensures Spec Researcher has access to all doctrine needed for brief creation.

#### Location

Near the top of the file, in the existing `### Required Reading` section.

#### Content

```markdown
### Required Reading — Master Doctrine List

Before ANY research or brief creation task, load relevant documents from this master list.

**Tier 1: Core System Doctrine (Always Load)**

| Document | Path | Purpose |
|----------|------|---------|
| PaintFactor_OS.md | `docs/System/PaintFactor_OS.md` | System architecture, doctrine authority hierarchy |
| Conventions.md | `docs/System/Conventions.md` | ID prefixes, naming standards, versioning |

**Tier 2: Domain Doctrine (Load Based on Spec Type)**

| Document | Path | Purpose |
|----------|------|---------|
| Quality_Tiers_and_Surface_Condition.md | `docs/Doctrine/Quality_Tiers_and_Surface_Condition.md` | QT definitions (QT2-QT6), surface conditions, sheen rules |
| Fine_Finish_Doctrine.md | `docs/Doctrine/Fine_Finish_Doctrine.md` | Fine finish workflow, scrutiny by tier (trim, doors, millwork) |
| Doors_Doctrine.md | `docs/Doctrine/Doors_Doctrine.md` | Door substrates, hardware, panel sequences, cycle times |
| Window_Systems_Doctrine.md | `docs/Doctrine/Window_Systems_Doctrine.md` | Window substrate treatment, height tiers, trim packages |
| Millwork_NC_Paint_Doctrine.md | `docs/Doctrine/Millwork_NC_Paint_Doctrine.md` | Millwork new-construction paint, PDCA standards |
| Materials_and_Consumables_Doctrine.md | `docs/Doctrine/Materials_and_Consumables_Doctrine.md` | Roller sizing, brush usage, consumable rates |
| Estimation_Modifiers_Doctrine.md | `docs/Doctrine/Estimation_Modifiers_Doctrine.md` | Height/complexity modifiers, spray/backroll coupling |
| Interior_Protection_Doctrine.md | `docs/Doctrine/Interior_Protection_Doctrine.md` | Protection zones, masking systems, floor/furniture protection |
| Protection_and_Masking_Doctrine.md | `docs/Doctrine/Protection_and_Masking_Doctrine.md` | Floor protection methods, masking materials |
| Spec_Completeness_Doctrine.md | `docs/Doctrine/Spec_Completeness_Doctrine.md` | Mandatory completeness requirements, validation rules |
| Material_Role_System.md | `docs/Doctrine/Material_Role_System.md` | Material role definitions for spec artifacts |
| Doctrine_Format_Standard.md | `docs/Doctrine/Doctrine_Format_Standard.md` | Standard format for doctrine documents |

**Tier 3: Reference Vocabularies (Load for Validation)**

| Document | Path | Purpose |
|----------|------|---------|
| Modifier_Registry.md | `docs/Doctrine/Modifier_Registry.md` | All modifier values (height, QT, condition, complexity) |
| Protection_Zones_Reference.md | `docs/Reference/Protection_Zones_Reference.md` | Valid protection zone IDs |
| Surface_Vocabulary_Reference.md | `docs/Reference/Surface_Vocabulary_Reference.md` | Valid surface IDs for adjacency |
| Site_Condition_Vocabulary_Reference.md | `docs/Reference/Site_Condition_Vocabulary_Reference.md` | Site condition IDs and values |

**Tier 4: PaintScope Contract (Load for Key Validation)**

| Document | Path | Purpose |
|----------|------|---------|
| PaintScope_Quantity_Key_Catalog.md | `docs/PaintScope/PaintScope_Quantity_Key_Catalog.md` | Canonical PS keys |
| Spec_Input_to_PaintScope_Key_Mapping.md | `docs/PaintScope/Spec_Input_to_PaintScope_Key_Mapping.md` | Input → key mapping |
| PaintScope_EdgeLF_Mapping.md | `docs/PaintScope/PaintScope_EdgeLF_Mapping.md` | Edge LF derivation rules |
| PaintScope_Asset_Catalog.md | `docs/PaintScope/PaintScope_Asset_Catalog.md` | Asset categories and subtypes |
| PaintScope_Adjacency_Schema.md | `docs/PaintScope/PaintScope_Adjacency_Schema.md` | Adjacency relationships |
| PaintScope_Window_Counting_System.md | `docs/PaintScope/PaintScope_Window_Counting_System.md` | Window quantification |
| PaintScope_Key_Mapping_Addendum.md | `docs/PaintScope/PaintScope_Key_Mapping_Addendum.md` | Additional mappings |

**Tier 5: Production Rates (Load for Rate Guidance)**

| Document | Path | Purpose |
|----------|------|---------|
| PaintFactor_Production_Rate_Reference.md | `production rates/PaintFactor_Production_Rate_Reference.md` | Task rates, modifiers, system rates |
```

---

### Update 2: Add Brief Creation Mode Section

Add a new section called `## Brief Creation Mode` after the Required Reading section.

#### Content

```markdown
---

## Brief Creation Mode

When dispatched by Dev Orchestrator with `task_type: brief_creation`, the Spec Researcher creates a doctrine-aligned brief for a new spec family.

### Why Spec Researcher Creates Briefs

Brief creation is fundamentally research work:
- "What surface type is this?" → Requires doctrine lookup
- "What protection zones apply?" → Requires Protection_Zones_Reference
- "What are the adjacent surfaces?" → Requires Surface_Vocabulary_Reference  
- "What doctrine governs this domain?" → Requires domain doctrine review
- "What PaintScope keys are needed?" → Requires catalog verification

Dev Orchestrator is a coordinator without deep doctrine access. Spec Researcher has the research skills and doctrine loading patterns to create accurate briefs.

### Mandatory Doctrine Loading

**BEFORE writing ANY brief content**, load and review the following documents:

#### Always Load (Every Brief)

```
docs/System/PaintFactor_OS.md
docs/System/Conventions.md
docs/Doctrine/Quality_Tiers_and_Surface_Condition.md
docs/Doctrine/Spec_Completeness_Doctrine.md
docs/Reference/Protection_Zones_Reference.md
docs/Reference/Surface_Vocabulary_Reference.md
docs/Reference/Site_Condition_Vocabulary_Reference.md
docs/Doctrine/Modifier_Registry.md
docs/PaintScope/PaintScope_Quantity_Key_Catalog.md
docs/PaintScope/Spec_Input_to_PaintScope_Key_Mapping.md
```

#### Load Based on Spec Domain

| If Spec Involves... | Load These Doctrines |
|---------------------|----------------------|
| Doors | `docs/Doctrine/Doors_Doctrine.md` |
| Trim, Baseboard, Casing | `docs/Doctrine/Fine_Finish_Doctrine.md` |
| Millwork, Built-ins | `docs/Doctrine/Fine_Finish_Doctrine.md`, `docs/Doctrine/Millwork_NC_Paint_Doctrine.md` |
| Windows | `docs/Doctrine/Window_Systems_Doctrine.md` |
| Walls, Ceilings | `docs/Doctrine/Materials_and_Consumables_Doctrine.md`, `docs/Doctrine/Estimation_Modifiers_Doctrine.md` |
| Any spray application | `docs/Doctrine/Estimation_Modifiers_Doctrine.md` (spray/backroll coupling) |
| Any protection work | `docs/Doctrine/Interior_Protection_Doctrine.md`, `docs/Doctrine/Protection_and_Masking_Doctrine.md` |

#### Load Sibling Specs

If the catalog lists sibling specs for structural consistency, load their `spec.json` files to understand patterns.

### Brief Template

Use the template at `Claude/specs/_backlog/_brief_template.md`. 

If the template doesn't exist, use this structure:

```markdown
# Spec Brief: [SF_ID]

**Status:** Draft  
**Created:** [DATE]  
**Author:** Spec Researcher  

---

## 1. Spec Family Identification

| Field | Value |
|-------|-------|
| Spec Family ID | SF_[DOMAIN]_[SURFACE]_[CONTEXT]_[ACTION] |
| Name | Human-readable name |
| Domain | interior / exterior |
| Version | 0.1.0 |

---

## 2. Scope Definition

### Includes
- [Explicit list of what this spec covers]

### Excludes
- [Explicit list of what this spec does NOT cover]
- [With pointers to correct specs where applicable]

---

## 3. Configuration Dimensions

| Dimension | Values | Default | Notes |
|-----------|--------|---------|-------|
| quality_tier | QT2, QT3, QT4, QT5 | QT3 | [Doctrine reference] |
| application_method | roll, spray_backroll, brush | [default] | [Doctrine reference] |
| [other dimensions] | | | |

---

## 4. Paintable Items

| Item ID | Name | UOM | Counting Rules | PaintScope Key |
|---------|------|-----|----------------|----------------|
| ITM_X | [Name] | SF/LF/EA | [How counted] | PS_SURFACE_X.Y |

---

## 5. Required PaintScope Keys

| Input Name | PaintScope Key | UOM | Required | Notes |
|------------|----------------|-----|----------|-------|
| IN_SF_X | PS_SURFACE_SF.X | SF | Yes | [Purpose] |
| IN_LF_EDGE_X | PS_EDGE_LF.TO_X | LF | Conditional | [When required] |

**Verification:** All keys above exist in `PaintScope_Quantity_Key_Catalog.md` ✅

---

## 6. Protection Zones

| Zone ID | Condition | Protection Level | Notes |
|---------|-----------|------------------|-------|
| floor_perimeter | always | edge_only | [From Protection_Zones_Reference] |
| [zone_id] | [when] | [level] | |

---

## 7. Sibling Specs

| Spec Family | Relationship | Notes |
|-------------|--------------|-------|
| SF_X_v1 | Structural reference | Use for module patterns |

---

## 8. Doctrine References

| Doctrine | Path | Sections Relevant |
|----------|------|-------------------|
| Quality Tiers | docs/Doctrine/Quality_Tiers_and_Surface_Condition.md | QT definitions, sheen restrictions |
| [Domain Doctrine] | docs/Doctrine/[Name].md | [Relevant sections] |
| Protection Zones | docs/Reference/Protection_Zones_Reference.md | Zone IDs |
| Surface Vocabulary | docs/Reference/Surface_Vocabulary_Reference.md | Surface IDs |
| PaintScope Catalog | docs/PaintScope/PaintScope_Quantity_Key_Catalog.md | Key verification |

**CRITICAL: Use full paths, not filenames.**

---

## 9. Acceptance Criteria

Measurable criteria for Critic validation:

- [ ] [Criterion 1 — specific and measurable]
- [ ] [Criterion 2]
- [ ] [Criterion 3]
- [ ] All PaintScope keys verified against catalog
- [ ] Protection zones match Protection_Zones_Reference
- [ ] Modifier values align with Modifier_Registry

---

## 10. Notes & Open Questions

### Assumptions
- [List assumptions made]

### Risks
- [List risks or uncertainties]

### Open Questions
- [Questions requiring human input]
```

### Section 8 Format (Critical)

Section 8 MUST list **full paths**, not just filenames. Agents loading doctrine from the brief need resolvable paths.

**WRONG:**
```markdown
| Fine_Finish_Doctrine.md | Workflow, scrutiny |
```

**CORRECT:**
```markdown
| Fine Finish | docs/Doctrine/Fine_Finish_Doctrine.md | Workflow, scrutiny by tier |
```

### Brief Creation Checklist

Before returning the brief to Dev Orchestrator, verify:

- [ ] **Doctrine loaded:** Loaded system doctrine (PaintFactor_OS, Conventions)
- [ ] **Domain doctrine loaded:** Loaded all domain-specific doctrine for this spec type
- [ ] **PS keys verified:** Every key in Section 5 exists in `PaintScope_Quantity_Key_Catalog.md`
- [ ] **PS keys mapped:** Every key has a corresponding entry in `Spec_Input_to_PaintScope_Key_Mapping.md`
- [ ] **Zones valid:** Every zone ID in Section 6 exists in `Protection_Zones_Reference.md`
- [ ] **Surfaces valid:** Every surface ID exists in `Surface_Vocabulary_Reference.md`
- [ ] **Full paths:** Section 8 uses complete paths (not filenames)
- [ ] **Scope explicit:** Section 2 has both Includes AND Excludes
- [ ] **Criteria measurable:** Section 9 has specific, verifiable acceptance criteria
- [ ] **ID format correct:** Spec Family ID follows Conventions.md pattern

### Output

Return the complete `brief.md` content to Dev Orchestrator for human review.

Include a summary note:
```
Brief created for [SF_ID].
- Loaded [N] doctrine documents
- Verified [N] PaintScope keys
- [N] protection zones declared
- Ready for human review.
```
```

---

## Acceptance Criteria

### Dev Orchestrator

- [ ] Has new `## Spec Brief System` section after Default Workflow
- [ ] Implements brief lookup order (specified ID → catalog → backlog check)
- [ ] **Never drafts briefs itself** — always delegates to Spec Researcher
- [ ] Has explicit brief approval gate before pipeline runs
- [ ] Updates catalog status after generation

### Spec Researcher

- [ ] Required Reading expanded to include all 26 master doctrine documents
- [ ] Has new `## Brief Creation Mode` section
- [ ] Mandates doctrine loading BEFORE any brief writing
- [ ] Brief template includes all 10 sections
- [ ] Section 8 explicitly requires full paths
- [ ] Has brief creation checklist for self-validation

### Integration

- [ ] Workflow: No brief → Dev Orchestrator delegates to Spec Researcher
- [ ] Workflow: Spec Researcher loads doctrine → creates brief → returns to Dev Orchestrator
- [ ] Workflow: Human approves brief → Dev Orchestrator saves brief → Pipeline runs
- [ ] No pathway exists to run SpecFactory without an approved brief

---

## Testing

After updating both agents, test with:

1. **Brief exists:** "Generate SF_DRYWALL_WALL_NC_PRIME" (brief should exist)
   - Expected: Dev Orchestrator finds brief, delegates to SpecFactory Orchestrator

2. **Brief missing:** "Generate SF_DOOR_SLAB_INT_NC" (brief likely missing)
   - Expected: Dev Orchestrator delegates to Spec Researcher
   - Spec Researcher loads doctrine, creates brief
   - Dev Orchestrator presents brief for approval

3. **Catalog query:** "What's in the backlog?"
   - Expected: Dev Orchestrator reads and summarizes catalog

---

## Notes

- Do NOT modify other sections of these agent prompts unless necessary for integration
- Preserve existing functionality in Spec Researcher (research.json generation, etc.)
- The brief template file (`_brief_template.md`) may need to be created if it doesn't exist
- If sibling spec references in the catalog point to non-existent specs, flag for human review
