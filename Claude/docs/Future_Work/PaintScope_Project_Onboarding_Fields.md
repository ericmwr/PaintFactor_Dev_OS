# PaintScope Project Onboarding Fields

**Document Type:** Future Work Specification
**Status:** Tracking
**Created:** 2026-01-31
**Priority:** Medium

---

## Overview

This document tracks requirements for project-level data capture fields that should be collected during PaintScope project onboarding. These fields provide inference inputs for the estimation engine.

---

## Proposed Fields

### year_built

**Purpose:** Determines default lead_status assumption

| Field | Details |
|-------|---------|
| Data Type | Integer (4-digit year) |
| Required | Yes |
| Default | None (must be captured) |
| Validation | 1800-current year |

**Inference Logic:**
- If year_built < 1978: Set lead_status default to `unknown_pre1978`
- If year_built >= 1978: Set lead_status default to `not_applicable`

**Notes:**
- Can be overridden by actual lead testing results
- Critical for RRP compliance

---

### last_painted_date

**Purpose:** Informs surface condition baseline and coating compatibility

| Field | Details |
|-------|---------|
| Data Type | Date or "unknown" |
| Required | No |
| Default | "unknown" |
| Validation | Cannot be future date |

**Inference Logic:**
- If last_painted_date > 10 years ago: Consider condition modifier increase
- If last_painted_date < 2 years: Check for coating compatibility issues
- If unknown: No inference, rely on visual assessment

**Notes:**
- Helps estimate prep time
- May affect primer requirements

---

### last_paint_professional

**Purpose:** Informs quality baseline expectation

| Field | Details |
|-------|---------|
| Data Type | Boolean or "unknown" |
| Required | No |
| Default | "unknown" |
| Values | true, false, "unknown" |

**Inference Logic:**
- If true: Assume reasonable surface prep, standard prep expected
- If false (DIY): Assume potential issues (drips, poor prep, incompatible coatings)
- If unknown: No inference

**Notes:**
- DIY history may increase prep time estimate
- Professional history suggests more predictable conditions

---

## Implementation Requirements

### PaintScope UI Changes
- Add fields to project creation form
- Add fields to project edit form
- Include in project summary display

### Database Schema
- Add columns to project table
- Add validation constraints
- Add indexes for reporting

### API Updates
- Include fields in project creation endpoint
- Include fields in project retrieval endpoint
- Add validation logic

### Estimation Engine Integration
- Read fields during estimate assembly
- Apply inference logic for defaults
- Allow override at estimate level

---

## Related Documents

- Spec_Completeness_Doctrine.md (references lead_status condition)
- Site_Condition_Vocabulary_Reference.md (defines lead_status values)

---

## Status

- [ ] Requirements documented (this document)
- [ ] UI mockups created
- [ ] Database schema designed
- [ ] API specification written
- [ ] Implementation scheduled
