# Doctrine Format Standard

**Spec Family ID:** SYS_DOCTRINE_FORMAT  
**Status:** CANONICAL  
**Version:** 1.0.0  
**Effective Date:** 2026-01-27  
**Source:** PaintFactor Dev OS standardization  

This document defines the canonical structure for all PaintFactor doctrine documents. All doctrines MUST follow this format for consistency and agent parseability.

---

## 1. Metadata Block

Every doctrine begins with a metadata block immediately after the title:

```markdown
# [DOCTRINE TITLE]

**Spec Family ID:** SF_[IDENTIFIER]  
**Status:** DRAFT | REVIEW | CANONICAL  
**Version:** X.Y.Z  
**Effective Date:** YYYY-MM-DD  
**Source:** [Origin of domain knowledge]  
```

| Field | Description |
|-------|-------------|
| Spec Family ID | Unique identifier matching spec family naming convention |
| Status | DRAFT (work in progress), REVIEW (pending approval), CANONICAL (authoritative) |
| Version | Semantic versioning (MAJOR.MINOR.PATCH) |
| Effective Date | Date doctrine became/becomes effective |
| Source | Research origin (e.g., "NotebookLM Research (N sources)", "PDCA Standards", "Field validation") |

---

## 2. Section Numbering

All sections use hierarchical numbering:

```markdown
## 1. Top-Level Section
### 1.1 Subsection
### 1.2 Subsection
## 2. Next Top-Level Section
### 2.1 Subsection
```

---

## 3. Required Sections

Every doctrine MUST include these sections (order may vary by domain):

### 3.1 Scope & Definitions
- What the doctrine covers
- What is explicitly excluded (with pointers to correct doctrine)
- Key terminology and definitions

### 3.2 Domain-Specific Content Sections
- Substrate/surface classification
- Preparation requirements
- Material/product systems
- Process workflows
- Quality tier behavior
- Production benchmarks
- Defect identification and mitigation

### 3.3 Cross-References
- Related doctrine documents with version numbers
- Extracted reference files
- Industry standards referenced

### 3.4 Change Log
- Version history with dates, authors, and change summaries

---

## 4. Formatting Conventions

### 4.1 Tables

Use Markdown tables for structured data:

```markdown
| Column A | Column B | Column C |
|----------|----------|----------|
| Data 1   | Data 2   | Data 3   |
```

For complex matrices, use clear headers and consistent alignment.

### 4.2 Notes and Callouts

Use blockquotes for important notes:

```markdown
> **Note:** Important clarification or exception.
```

For warnings or critical information:

```markdown
> **⚠️ Critical:** Information that affects safety or quality.
```

### 4.3 Lists

Use bullets for unordered items:

```markdown
- Item one
- Item two
- Item three
```

Use numbers only for sequential/ordered processes:

```markdown
1. First step
2. Second step
3. Third step
```

### 4.4 Code and Identifiers

Use backticks for:
- Spec family IDs: `SF_TRIM_NC_PAINT`
- Task IDs: `TSK_FF_FILL_FASTENERS`
- Module IDs: `MOD_FF_INTERSTAGE`
- PaintScope keys: `PS_SURFACE_LF.TRIM_BASEBOARD`

---

## 5. Cross-Reference Format

When referencing other doctrines inline:

```markdown
Per `Fine_Finish_Doctrine.md` v1.1, Section 4.2...
```

When listing cross-references in the final section:

```markdown
## N. Cross-References

### N.1 Related Doctrine Documents
- `Fine_Finish_Doctrine.md` v1.1 — Workflow patterns, material systems
- `Quality_Tiers_and_Surface_Condition.md` v1.1 — QT definitions, condition classes
- `Estimation_Modifiers_Doctrine.md` v1.1 — Modifier stacking rules

### N.2 Industry Standards
- PDCA P1 — Properly Painted Surface (39" rule)
- PDCA P14 — Surface Preparation Levels

### N.3 Extracted Reference Files
- `millwork_pricing_reference.md` — Pricing data
- `millwork_material_coverage_reference.md` — Coverage rates
```

---

## 6. Change Log Format

```markdown
## N. Change Log

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-01-27 | SpecFactory | Initial canonical release |
| 0.2.0 | 2026-01-25 | SpecFactory | Added QT6 section, revised prep matrix |
| 0.1.0 | 2026-01-20 | SpecFactory | Initial draft |
```

---

## 7. File Naming Convention

```
[Domain]_[Context]_Doctrine.md
```

Examples:
- `Fine_Finish_Doctrine.md`
- `Millwork_NC_Paint_Doctrine.md`
- `Interior_Protection_Doctrine.md`
- `Quality_Tiers_and_Surface_Condition.md`

---

## 8. Version Numbering

Follow semantic versioning:

| Change Type | Version Bump | Example |
|-------------|--------------|---------|
| Breaking changes, major restructure | MAJOR | 1.0.0 → 2.0.0 |
| New sections, significant additions | MINOR | 1.0.0 → 1.1.0 |
| Clarifications, typo fixes, minor edits | PATCH | 1.0.0 → 1.0.1 |

---

## 9. Status Transitions

```
DRAFT → REVIEW → CANONICAL
```

- **DRAFT:** Work in progress, not authoritative
- **REVIEW:** Complete, awaiting stakeholder approval
- **CANONICAL:** Authoritative, specs MUST align to this version

Once CANONICAL, changes require version bump and change log entry.

---

## 10. Change Log

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-01-27 | PaintFactor Dev | Initial release establishing doctrine format standard |
