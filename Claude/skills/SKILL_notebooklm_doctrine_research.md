---
name: notebooklm-doctrine-research
description: "Deep research workflow for generating PaintFactor doctrine documents using NotebookLM MCP. Use when creating new doctrine for surface types, application methods, or specialty painting scenarios."
version: 1.0.0
author: PaintFactor
requires:
  - NotebookLM MCP connection in Claude Code
  - Domain expert available for review
outputs:
  - Research draft markdown
  - Formalized doctrine document (docx + md)
---

# NotebookLM Doctrine Research Skill

## Purpose

This skill describes the process for conducting deep research to generate PaintFactor doctrine documents. It transforms industry knowledge from manufacturer specifications, trade standards, and productivity references into structured doctrine ready for SpecFactory consumption.

## When to Use

Use this skill when:
- Creating doctrine for a new surface type (e.g., exterior siding, ceilings, cabinets)
- Expanding coverage for existing doctrine (e.g., adding specialty substrates)
- Validating or updating productivity benchmarks with industry sources
- Researching application methods or quality standards for new spec families

Do NOT use for:
- Quick factual lookups (use web search)
- Pricing or cost research (out of scope for doctrine)
- Brand-specific product comparisons (doctrine is product-agnostic)

## Process Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  PHASE 1: SCOPE DEFINITION                                      │
│  Define topic, target specs, surface types, application context │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  PHASE 2: NOTEBOOK CREATION & RESEARCH                          │
│  Create notebook, initiate research with domain-specific queries│
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  PHASE 3: SOURCE VALIDATION                                     │
│  Review sources, reject DIY content, flag outdated data         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  PHASE 4: STRUCTURED EXTRACTION                                 │
│  Run synthesis queries to extract matrices, rates, standards    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  PHASE 5: REPORT GENERATION                                     │
│  Generate comprehensive report following doctrine structure     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  PHASE 6: DOMAIN EXPERT REVIEW                                  │
│  Present draft, incorporate feedback, resolve data gaps         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  PHASE 7: DOCTRINE FORMALIZATION                                │
│  Generate final doctrine in docx + md formats                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Scope Definition

### Objective
Clearly define what the research will cover before initiating NotebookLM queries.

### Required Inputs

| Input | Description | Example |
|-------|-------------|---------|
| Research Topic | The painting domain to research | "Exterior Wood Siding - Residential" |
| Target Specs | SpecFactory spec names this will inform | siding_wood_lap, siding_wood_shingle |
| Surface Types | Specific substrates/surfaces covered | Lap siding, shingle, board & batten |
| Application Context | New construction, repaint, or both | Both |

### Decision Point
If the topic is too broad (e.g., "all exterior surfaces"), split into multiple research efforts. Each research notebook should focus on a cohesive surface family.

---

## Phase 2: Notebook Creation & Research

### Objective
Create a dedicated NotebookLM notebook and initiate comprehensive research.

### Process

1. **Create Notebook**
   - Naming convention: `PF [Topic] - Residential Research`
   - Example: `PF Exterior Wood Siding - Residential Research`

2. **Initiate Research**
   - Use `research_start` with secondary queries covering all required domains
   - Allow NotebookLM to gather and index sources

### Research Domains (Required Coverage)

Every doctrine research effort must address these domains:

| Domain | What to Research |
|--------|------------------|
| **Surface Classification** | Types, substrates, profiles, characteristics |
| **Surface Preparation** | Prep by condition (new, sound, failing, weathered) |
| **Primer Systems** | Selection by substrate, specialty primers |
| **Finish Coat Systems** | Product types, DFT, sheen, compatibility |
| **Application Methods** | Spray vs brush vs roll, technique, sequence |
| **Quality Standards** | QT2-QT6 expectations, inspection criteria |
| **Productivity** | Production rates, labor hours, cycle times |
| **Complexity Modifiers** | Factors that increase labor (height, access, detail) |
| **Common Defects** | Failures, causes, prevention, remediation |
| **Specialty Considerations** | Unique challenges for this surface type |

### Source Priority

NotebookLM will gather various sources. Prioritize in this order:

1. Manufacturer technical data sheets (Sherwin-Williams, Benjamin Moore, PPG)
2. Industry standards (PCA, PDCA guidelines)
3. Productivity references (Resene Tables, RS Means)
4. Trade publications with technical content
5. Field validation data

---

## Phase 3: Source Validation

### Objective
Ensure research is based on professional-grade sources appropriate for contractor doctrine.

### Acceptance Criteria

**Accept:**
- Manufacturer TDS with technical specifications
- PCA/PDCA published standards
- Resene productivity tables (NZ/AU benchmarks)
- Peer-reviewed coatings research
- Government specifications (EPA, HUD)

**Reject:**
- DIY/homeowner tutorial content
- Product marketing without technical data
- Unattributed forum posts
- Content older than 10 years (unless validating historical practice)

**Flag for Review:**
- Conflicting data between sources
- Regional variations (US vs international)
- Productivity data without methodology disclosure

### Process
Review the source list in NotebookLM. If source quality is poor, add authoritative sources manually or note data gaps for domain expert input.

---

## Phase 4: Structured Extraction

### Objective
Extract specific data matrices and standards from the research corpus.

### Required Extractions

Run synthesis queries to build these artifacts:

| Artifact | Purpose |
|----------|---------|
| **Substrate Matrix** | Table of surface types with prep requirements, primers, considerations |
| **Prep Requirements Table** | Preparation steps organized by existing condition |
| **Coating Systems by QT** | Primer + topcoat specifications per quality tier |
| **Production Rate Table** | Man-hours per unit with source attribution |
| **Complexity Modifier List** | Factors and percentage adjustments |
| **Defect Prevention Matrix** | Defect → Cause → Prevention → Remediation |
| **Application Method Comparison** | Spray vs brush vs roll with use cases |
| **Quality Inspection Criteria** | Standards per quality tier |

### Data Gap Identification
During extraction, note where data is:
- Missing entirely
- Conflicting between sources
- Based on estimates vs measured data
- Requiring domain expert validation

---

## Phase 5: Report Generation

### Objective
Generate a comprehensive research report following PaintFactor doctrine structure.

### Required Sections

Every doctrine research report must include:

1. **Scope & Definitions** - Surface types, measurement conventions, classifications
2. **Substrate Classification** - Types, characteristics, performance factors
3. **Surface Preparation** - By substrate and condition
4. **Primer Systems** - Selection matrix and functions
5. **Finish Coat Systems** - Products, sheen, DFT, blocking prevention
6. **Quality Tier Matrix** - QT2-QT6 specifications
7. **Setup & Access Methods** - Work area prep, staging (if applicable)
8. **Application Methods** - Technique, sequence, environmental windows
9. **Productivity Benchmarks** - Rates with sources, complexity modifiers
10. **Common Defects & Mitigation** - Prevention and remediation
11. **Specialty Considerations** - Unique challenges, safety, compliance
12. **Sources & Cross-References** - Documentation, data gaps

### Exclusions

Research reports must NOT include:
- Pricing or cost estimates
- Bid calculation formulas
- Brand recommendations without technical basis
- Quantity computation methods (specs consume, never compute)

---

## Phase 6: Domain Expert Review

### Objective
Validate research findings against field experience and fill data gaps.

### Review Checklist

Domain expert validates:

- [ ] Surface classifications match field terminology
- [ ] Complexity factors align with actual labor experience
- [ ] Prep requirements reflect real-world practice
- [ ] Productivity benchmarks are realistic (not theoretical)
- [ ] Quality tier descriptions match PaintFactor standards
- [ ] Application methods reflect how contractors actually work
- [ ] Defect causes and remediation are accurate
- [ ] No estimation formulas or pricing leaked in

### Data Gap Resolution

For identified gaps, domain expert provides:
- Field-validated data from experience
- Clarification on contractor discretion items
- Correction of unrealistic benchmarks
- Additional specialty considerations

### Feedback Integration
Incorporate all domain expert edits before proceeding to formalization.

---

## Phase 7: Doctrine Formalization

### Objective
Produce final doctrine documents in standard formats.

### Output Artifacts

| Artifact | Format | Purpose |
|----------|--------|---------|
| Doctrine Document | .docx | Formal review/approval document |
| Doctrine Document | .md | Project knowledge integration |
| Research Archive | NotebookLM notebook | Source preservation |

### Document Standards

**Document ID Format:** `DOC-[SURFACE]-[CONTEXT]-###`
- Example: `DOC-SIDING-WOOD-001`

**Version:** Start at 1.0.0

**Status Progression:** Draft → Reviewed → Approved

**Required Metadata:**
```yaml
document_id: DOC-XXX-XXX-001
title: "[Surface Type] - [Context]"
version: 1.0.0
status: APPROVED
effective_date: YYYY-MM-DD
source: NotebookLM Research ([N] sources) + Domain Expert Review
target_specs: [list]
reviewed_by: [name]
```

---

## PaintFactor Integration Rules

### Doctrine Principles

These rules apply to all doctrine created through this process:

1. **Specs Consume, Never Compute**
   - Doctrine provides factors and standards
   - Geometry comes from PaintScope
   - No quantity calculations in specs

2. **Quality Tier Alignment**
   - Use QT2-QT6 nomenclature consistently
   - Sanding progression: 220 (QT4) → 320 (QT5) → 400+ (QT6)
   - Inspection distances per existing QT doctrine

3. **Setup Method Independence**
   - Methods are contractor discretion
   - Methods do NOT correlate to quality tier
   - Document options, not prescriptions

4. **Measurement Conventions**
   - Per-side for doors/panels (standard)
   - SF for large surfaces
   - LF for linear elements
   - EA for discrete items

5. **Productivity Attribution**
   - Always cite source
   - Note if total cycle or application-only
   - Flag estimates vs measured data

---

## Reference: Completed Research Examples

| Topic | Notebook | Doctrine ID | Notes |
|-------|----------|-------------|-------|
| Painted Millwork - Residential | PF Painted Millwork | DOC-MILL-RES-001 | First research using this process |
| Painted Doors - Residential | PF Painted Doors | DOC-DOORS-RES-001 | 47 sources, includes handling methods |

---

## Troubleshooting

### NotebookLM Returns Poor Results
- Add authoritative sources manually
- Narrow secondary queries to specific topics
- Use more technical terminology in queries

### Conflicting Productivity Data
- Prefer Resene tables (methodology documented)
- Note regional variations
- Flag for domain expert resolution

### Topic Too Broad
- Split into multiple research notebooks
- Focus each on cohesive surface family
- Cross-reference between related doctrines

### Domain Expert Unavailable
- Complete through Phase 5 (report generation)
- Mark status as "Draft - Pending Review"
- Document all identified data gaps
- Do not formalize until review complete

---

*PaintFactor Skill | Paint_Factor_Dev_OS | v1.0.0*
