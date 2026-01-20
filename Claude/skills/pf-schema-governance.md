---
name: pf-schema-governance
description: Enforce schema/naming/versioning discipline across DevOS and SpecFactory outputs to avoid drift and duplication.
---

# Schema Governance

## Naming & IDs
- Require stable IDs for:
  - spec families
  - modules
  - tasks
  - material systems
  - factors
- Prefer readable deterministic IDs (not random GUIDs) where feasible.

## Versioning
Every artifact should contain:
- `version`
- `status` (draft/review_required/approved/deprecated)
- `change_log[]` (what changed, why, who)

## Determinism-first
For runtime PaintFactor:
- calculations should be database/function based
- AI is used for development support and later optional product features

## Reject drift
If two artifacts define the same concept differently:
- flag for critic review
- consolidate into a canonical master list
