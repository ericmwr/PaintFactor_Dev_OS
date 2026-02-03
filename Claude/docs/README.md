# PaintFactor System Documentation

This folder contains **canonical system doctrine, PaintScope schemas, and reference materials** for PaintFactor development.

All agent prompts, specs, and schemas must align to these documents. Outputs that contradict doctrine are invalid and must be rejected by the System Critic.

---

## Directory Structure

```
docs/
├── System/          — Core system architecture, conventions, changelog
├── Doctrine/        — All painting doctrine (materials, protection, finishing, etc.)
├── PaintScope/      — PaintScope schemas, key catalogs, mappings
├── Reference/       — Vocabulary and zone reference tables
├── Future_Work/     — Design notes and future system concepts
├── SpecFactory_Enhancement_Rollout/  — SpecFactory rollout tracking
├── tasks/           — Task-specific tracking docs
└── research/        — Research drafts and source material
```

---

## System

| Document | Description |
|----------|-------------|
| [PaintFactor_OS.md](System/PaintFactor_OS.md) | System architecture, layer definitions, design principles, agent roles |
| [Conventions.md](System/Conventions.md) | ID prefixes, naming standards, versioning expectations |
| [Schema_Alignment_Changelog.md](System/Schema_Alignment_Changelog.md) | Schema change log across rollouts |
| [Engine_State_Coordination_Architecture.md](System/Engine_State_Coordination_Architecture.md) | How specs, database, and engine coordinate on substrate state tracking |

---

## Doctrine

| Document | Description |
|----------|-------------|
| [Fine_Finish_Doctrine.md](Doctrine/Fine_Finish_Doctrine.md) | Fine finish workflow, material systems, quality tier scrutiny for trim, doors, built-ins, millwork |
| [Doors_Doctrine.md](Doctrine/Doors_Doctrine.md) | Door finishing doctrine — substrates, hardware, prep, quality tiers |
| [Window_Systems_Doctrine.md](Doctrine/Window_Systems_Doctrine.md) | Window substrate treatment, height tiers, trim packages, quality tier behavior |
| [Millwork_NC_Paint_Doctrine.md](Doctrine/Millwork_NC_Paint_Doctrine.md) | Millwork new-construction paint doctrine |
| [Quality_Tiers_and_Surface_Condition.md](Doctrine/Quality_Tiers_and_Surface_Condition.md) | Quality tier definitions and surface condition classification |
| [Materials_and_Consumables_Doctrine.md](Doctrine/Materials_and_Consumables_Doctrine.md) | Material usage, coverage, consumable patterns |
| [Estimation_Modifiers_Doctrine.md](Doctrine/Estimation_Modifiers_Doctrine.md) | Estimation modifier rules and application |
| [Protection_and_Masking_Doctrine.md](Doctrine/Protection_and_Masking_Doctrine.md) | Protection and masking task doctrine |
| [Interior_Protection_Doctrine.md](Doctrine/Interior_Protection_Doctrine.md) | Protection strategies — floors, furniture, fixtures, adjacent surfaces |
| [Interior_Protection_Doctrine_Final.md](Doctrine/Interior_Protection_Doctrine_Final.md) | Finalized interior protection doctrine |
| [Interior_Protection_Doctrine_Residential_Repaint.md](Doctrine/Interior_Protection_Doctrine_Residential_Repaint.md) | Residential repaint protection specifics |
| [Spec_Completeness_Doctrine.md](Doctrine/Spec_Completeness_Doctrine.md) | Mandatory completeness requirements for spec generation |
| [Modifier_Registry.md](Doctrine/Modifier_Registry.md) | Centralized modifier registry with canonical values |
| [Doctrine_Format_Standard.md](Doctrine/Doctrine_Format_Standard.md) | Standard format for doctrine documents |

---

## PaintScope

| Document | Description |
|----------|-------------|
| [PaintScope_EdgeLF_Mapping.md](PaintScope/PaintScope_EdgeLF_Mapping.md) | Geometry flow from PaintScope to specs; edge work rules |
| [PaintScope_Quantity_Key_Catalog.md](PaintScope/PaintScope_Quantity_Key_Catalog.md) | Canonical quantity key catalog |
| [Spec_Input_to_PaintScope_Key_Mapping.md](PaintScope/Spec_Input_to_PaintScope_Key_Mapping.md) | Spec input → PaintScope key mapping |
| [PaintScope_Asset_Catalog.md](PaintScope/PaintScope_Asset_Catalog.md) | Asset definitions and catalog |
| [PaintScope_Adjacency_Schema.md](PaintScope/PaintScope_Adjacency_Schema.md) | Adjacency schema for surface relationships |
| [PaintScope_Window_Counting_System.md](PaintScope/PaintScope_Window_Counting_System.md) | Window data capture — size buckets, groups, exceptions |
| [PaintScope_Key_Mapping_Addendum.md](PaintScope/PaintScope_Key_Mapping_Addendum.md) | Key mapping addendum and extensions |

---

## Reference

| Document | Description |
|----------|-------------|
| [Protection_Zones_Reference.md](Reference/Protection_Zones_Reference.md) | Zone IDs for protection task metadata |
| [Surface_Vocabulary_Reference.md](Reference/Surface_Vocabulary_Reference.md) | Surface IDs for adjacency metadata and finish group assignments |
| [Site_Condition_Vocabulary_Reference.md](Reference/Site_Condition_Vocabulary_Reference.md) | Valid site condition IDs, values, and definitions |
| [Substrate_State_Reference.md](Reference/Substrate_State_Reference.md) | Substrate state IDs (SS_*), sub-states, modifiers, and state declaration format |

---

## Doctrine Compliance

### For Agents

Agent system prompts must:
1. Reference relevant doctrine documents in a "Required Reading" section
2. Include geometry constraints aligned to PaintScope rules
3. Declare that the agent operates at DEVELOPMENT time, not runtime

### For Specs

Specs must:
1. Declare required geometry inputs (SF, LF, EA) explicitly
2. Never compute geometry internally
3. Align SOP task UOMs to production rate UOMs
4. Pass System Critic doctrine checks

### For the System Critic

The Critic must:
1. Verify doctrine compliance before passing any spec
2. FAIL (not warn) specs that violate doctrine
3. Include a `doctrine_checks[]` array in all QA reports

---

## Authority

These documents are authoritative. If agent behavior or spec structure conflicts with doctrine:

1. Doctrine wins
2. The conflicting artifact must be corrected
3. Human review is required for any doctrine exceptions
