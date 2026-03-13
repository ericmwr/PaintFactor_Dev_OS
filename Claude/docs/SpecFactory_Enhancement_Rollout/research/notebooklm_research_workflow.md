# PaintFactor Deep Research Workflow
## NotebookLM MCP Research Agent Protocol

**Version:** 1.0.0  
**Purpose:** Structured research workflow for generating PaintFactor doctrine using NotebookLM MCP in Claude Code  
**Based On:** Millwork and Doors research patterns

---

## Overview

This document provides the prompting framework for conducting deep research on painting trade topics using NotebookLM MCP. The workflow transforms industry knowledge into structured doctrine documents ready for domain expert review and SpecFactory consumption.

---

## Pre-Research Setup

### 1. Define Research Scope

Before starting, clearly define:

```
RESEARCH_TOPIC: [e.g., "Exterior Wood Siding - Residential"]
TARGET_SPECS: [e.g., "siding_wood_lap, siding_wood_shingle, siding_wood_board_batten"]
SURFACE_TYPES: [List specific surface/substrate types]
APPLICATION_CONTEXT: [New construction, repaint, or both]
```

### 2. Identify Source Categories

NotebookLM research should draw from:

| Priority | Source Type | Examples |
|----------|-------------|----------|
| 1 | Manufacturer Technical Data Sheets | Sherwin-Williams, Benjamin Moore, PPG, Behr |
| 2 | Industry Standards | PCA (Painting Contractors Association), PDCA |
| 3 | Trade Publications | Paint & Coatings Industry, JCT CoatingsTech |
| 4 | Productivity References | Resene Tables, RS Means, PDCA Labor Guidelines |
| 5 | Field Validation | Contractor interviews, job site observations |

---

## Phase 1: Notebook Creation

### Prompt Template

```
Create a new NotebookLM notebook for PaintFactor research.

NOTEBOOK NAME: "PF [Topic] - Residential Research"

Example: "PF Exterior Wood Siding - Residential Research"

Use: notebook_create tool
```

---

## Phase 2: Research Initiation

### Primary Research Queries

Use `research_start` with structured secondary queries covering these domains:

```
RESEARCH PROMPT:

Topic: [RESEARCH_TOPIC] painting specifications for professional residential contractors

Secondary Queries (adapt to topic):

1. SURFACE TYPES & CLASSIFICATION
   - "[Topic] types and classifications for painting"
   - "[Topic] substrate identification and characteristics"

2. SURFACE PREPARATION
   - "[Topic] surface preparation requirements by condition"
   - "[Topic] cleaning and contaminant removal protocols"
   - "[Topic] repair and patching standards"

3. PRIMER SYSTEMS
   - "[Topic] primer selection by substrate type"
   - "[Topic] specialty primers (stain-blocking, bonding, DTM)"

4. FINISH COAT SYSTEMS
   - "[Topic] finish coat product selection criteria"
   - "[Topic] coating compatibility and system builds"
   - "DFT requirements for [Topic] by exposure"

5. APPLICATION METHODS
   - "[Topic] spray vs brush vs roll application"
   - "[Topic] application sequence and technique"
   - "Environmental conditions for [Topic] coating application"

6. QUALITY STANDARDS
   - "[Topic] quality tier expectations (basic to fine finish)"
   - "[Topic] inspection criteria and defect standards"
   - "Sanding grit progression for [Topic] finishes"

7. PRODUCTIVITY & LABOR
   - "[Topic] painting production rates per unit"
   - "[Topic] labor hours by preparation level"
   - "Complexity modifiers for [Topic] painting"

8. COMMON DEFECTS
   - "[Topic] coating failures and causes"
   - "[Topic] defect prevention and remediation"

9. SPECIALTY CONSIDERATIONS
   - "[Topic] unique challenges and solutions"
   - "[Topic] weather exposure and durability factors"

10. SAFETY & COMPLIANCE
    - "[Topic] lead paint considerations (pre-1978)"
    - "[Topic] VOC and environmental requirements"
```

### Example for Exterior Trim

```
Topic: Exterior wood trim painting specifications for professional residential contractors

Secondary Queries:
1. "Exterior trim wood types and profiles for painting"
2. "Exterior trim surface preparation weathered vs new"
3. "Exterior trim primer selection oil vs acrylic vs shellac"
4. "Exterior trim finish coat durability requirements"
5. "Exterior trim spray vs brush application production"
6. "Exterior trim quality standards fine finish vs standard"
7. "Exterior trim painting production rates linear foot"
8. "Exterior trim coating failures peeling chalking"
9. "Exterior trim caulking and joint treatment"
10. "Exterior trim height access productivity modifiers"
```

---

## Phase 3: Source Validation

### Validation Criteria

After research completes, validate sources:

```
ACCEPTABLE SOURCES:
✓ Manufacturer technical data sheets
✓ PCA/PDCA standards and guidelines
✓ Resene productivity tables
✓ Trade publication technical articles
✓ Academic/research papers on coatings
✓ Government specifications (EPA, HUD)

REJECT OR FLAG:
✗ DIY/homeowner content (unless corroborating)
✗ Product marketing without technical backing
✗ Unattributed forum posts
✗ Outdated specifications (>10 years without validation)
```

---

## Phase 4: Structured Extraction

### Synthesis Query Templates

Use `notebook_query` for targeted extraction:

```
EXTRACTION QUERIES:

1. SUBSTRATE MATRIX
   "Create a table of [topic] substrate types with key painting considerations, recommended primers, and preparation requirements"

2. PREP REQUIREMENTS
   "Summarize surface preparation requirements for [topic] organized by existing condition (new, sound repaint, failing, weathered)"

3. COATING SYSTEMS
   "List recommended coating systems for [topic] by quality tier (QT2 through QT6) including primer and topcoat specifications"

4. PRODUCTION RATES
   "Extract all productivity data for [topic] painting including man-hours per unit, coverage rates, and cycle times"

5. COMPLEXITY MODIFIERS
   "Identify factors that increase [topic] painting labor including height, access, detail level, and condition"

6. DEFECT PREVENTION
   "Summarize common [topic] coating defects with causes, prevention methods, and remediation procedures"

7. APPLICATION METHODS
   "Compare application methods for [topic] (spray, brush, roll) with advantages, limitations, and best-use scenarios"

8. QUALITY STANDARDS
   "Define quality inspection criteria for [topic] painting at each quality tier including acceptable defect levels"
```

---

## Phase 5: Report Generation

### Report Structure Template

Use `report_create` with custom prompt:

```
REPORT PROMPT:

Generate a comprehensive technical reference document for [RESEARCH_TOPIC] painting specifications suitable for a professional painting contractor estimation system.

REQUIRED SECTIONS:

1. SCOPE & DEFINITIONS
   - Surface types covered with complexity factors
   - Measurement conventions (SF, LF, EA)
   - Classification criteria (interior/exterior, new/repaint)

2. SUBSTRATE CLASSIFICATION
   - Substrate types and characteristics
   - Performance considerations
   - Factory finish assessment (if applicable)

3. SURFACE PREPARATION REQUIREMENTS
   - New construction prep by substrate
   - Repaint preparation by condition
   - Cleaning and contaminant removal protocols

4. PRIMER SYSTEMS
   - Primer selection matrix by substrate
   - Specialty primer applications
   - Primer functions and purposes

5. FINISH COAT SYSTEMS
   - Product categories and selection criteria
   - Sheen recommendations
   - DFT requirements
   - Coating compatibility

6. QUALITY TIER MATRIX
   - QT2 through QT6 specifications
   - Coat counts, sanding requirements
   - Inspection distances and defect tolerance
   - Application method preferences
   - Labor multipliers

7. SETUP & ACCESS METHODS (if applicable)
   - Work area preparation
   - Access equipment requirements
   - Staging considerations

8. APPLICATION METHODS
   - Technique by application type
   - Sequence recommendations
   - Environmental windows

9. PRODUCTIVITY BENCHMARKS
   - Production rates with sources
   - Complexity modifiers with percentages
   - Cycle time comparisons

10. COMMON DEFECTS & MITIGATION
    - Defect identification
    - Causes and prevention
    - Remediation procedures

11. SPECIALTY CONSIDERATIONS
    - Unique challenges for this surface type
    - Weather/exposure factors
    - Safety and compliance

12. SOURCES & CROSS-REFERENCES
    - Source documentation
    - Related doctrine references
    - Data gaps identified

FORMAT REQUIREMENTS:
- Use tables for matrices and comparisons
- Include specific numeric values where available
- Note data sources for productivity figures
- Flag areas requiring domain expert validation
- Identify gaps requiring field research

DO NOT INCLUDE:
- Pricing or cost estimates
- Specific bid calculations
- Brand recommendations without technical basis
```

---

## Phase 6: Export & Review

### Export Process

```
1. Export report to markdown:
   /docs/research/[topic]_research_draft.md

2. Add YAML front matter:
   ---
   research_topic: "[Topic]"
   notebook_id: "[NotebookLM ID]"
   source_count: [Number]
   status: draft
   reviewed_by: null
   review_date: null
   ---

3. Prepare for domain expert review
```

### Review Checklist

Domain expert should validate:

```
□ Surface type classifications accurate
□ Complexity factors align with field experience
□ Prep requirements match real-world practice
□ Productivity benchmarks realistic
□ Quality tier descriptions match PaintFactor standards
□ Application methods reflect contractor practices
□ Defect causes/remediation accurate
□ No estimation formulas or pricing included
□ Data gaps identified for follow-up
```

---

## Domain-Specific Guidance

### PaintFactor Integration Requirements

```
CRITICAL RULES:

1. SPECS CONSUME, NEVER COMPUTE
   - Specifications reference geometry from PaintScope
   - Never include quantity calculations in doctrine
   - Labor/material factors only

2. QUALITY TIER ALIGNMENT
   - Use QT2-QT6 nomenclature
   - Align with existing PaintFactor QT definitions
   - Sanding grit progression: 220 (QT4) → 320 (QT5) → 400+ (QT6)

3. SETUP METHOD INDEPENDENCE
   - Setup/staging methods are contractor discretion
   - Methods do NOT correlate to quality tier
   - Document options, not prescriptions

4. MEASUREMENT CONVENTION
   - Default to per-side for doors/panels
   - SF for large surfaces
   - LF for linear elements (trim, base)
   - EA for discrete items

5. PRODUCTIVITY SOURCE ATTRIBUTION
   - Always cite source (Resene, PCA, Field)
   - Note if total cycle or application-only
   - Flag estimates vs measured data
```

### Common Research Topics Queue

```
SUGGESTED FUTURE RESEARCH:

INTERIOR:
- Ceilings (flat, textured, coffered)
- Base trim and crown molding
- Cabinets (paint-grade)
- Stair components (railings, balusters, stringers)
- Built-ins and shelving

EXTERIOR:
- Wood siding (lap, shingle, board & batten)
- Fiber cement siding
- Stucco and EIFS
- Exterior trim and fascia
- Decks and porches
- Fencing

SPECIALTY:
- Metal surfaces (railings, gates)
- Concrete/masonry
- Garage floors
- Wallpaper removal/prep
- Texture application
```

---

## Quick Start Prompt

Copy and adapt this prompt for Claude Code:

```
I need to conduct deep research for PaintFactor doctrine on [TOPIC].

Please use the NotebookLM MCP tools to:

1. Create notebook: "PF [Topic] - Residential Research"

2. Start research with these secondary queries:
   - [Topic] types and substrate classification
   - [Topic] surface preparation by condition
   - [Topic] primer selection and systems
   - [Topic] finish coat specifications
   - [Topic] spray vs brush vs roll production
   - [Topic] quality tier expectations
   - [Topic] productivity rates and labor hours
   - [Topic] common defects and remediation
   - [Topic] complexity modifiers
   - [Topic] specialty considerations

3. After research completes, run synthesis queries:
   - Substrate matrix with prep requirements
   - Coating systems by quality tier
   - Production rates with sources
   - Defect prevention table

4. Generate comprehensive report following PaintFactor doctrine structure:
   - 12 standard sections
   - No pricing/estimation formulas
   - Tables for matrices
   - Source attribution
   - Data gaps identified

5. Export to: /docs/research/[topic]_research_draft.md

Target specs: [list target spec names]
Application context: [new construction / repaint / both]
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-01-27 | Initial release based on millwork/doors patterns |

---

*PaintFactor Research Workflow | Paint_Factor_Dev_OS*
