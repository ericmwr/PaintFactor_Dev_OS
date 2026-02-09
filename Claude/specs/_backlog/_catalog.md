# Spec Backlog Catalog

**Last Updated:** 2026-02-09
**Reference:** NC_Interior_Spec_Catalog.md  

---

## How to Use

- **Dev Orchestrator:** Read this file to determine priority order. Pick the first `queued` entry.
- **Human:** Update status as specs progress. Add notes for blockers.
- **"Generate next spec"** → first queued entry below.

---

## Phase 1 — Core Coverage (P1)

| # | Spec Family ID | Brief | Status | Blocker | Notes |
|---|----------------|-------|--------|---------|-------|
| 1 | SF_DRYWALL_CEILING_NC_PRIME | ✅ authored | generated | — | v0.1.0 draft, pending human review |
| 2 | SF_DRYWALL_CEILING_NC_FINISH | ✅ authored | generated | — | v0.1.0 draft. Mirror wall finish spec. Brief authored 2026-02-02. |
| 3 | SF_DOOR_SLAB_INT_NC | ✅ authored | in_progress | — | Atomic door architecture |
| 4 | SF_DOOR_FRAME_NC_FINISH | ✅ authored | generated | — | v1.0.0 complete. EA (frame set) as primary unit. All user corrections applied. |
| 5 | SF_CLOSET_SHELF_NC | ✅ authored | generated | — | v0.1.0 draft. Uses Opening Count method per BuiltIns Quantification System v2.0. |
| 6 | SF_DRYWALL_WALL_NC_PRIME | ✅ authored | generated | — | v1.0.0 complete. Pipeline complete 2026-02-04. All review corrections applied. |
| 7 | SF_DRYWALL_WALL_NC_FINISH | ✅ authored | generated | — | v0.1.0 draft. Pipeline complete 2026-02-04. Critic PASS WITH WARNINGS (DC-001 roller nap pending). |
| 8 | SF_TRIM_NC_PRIME | ✅ authored | generated | — | v0.1.0 draft complete 2026-02-04. Full SpecFactory pipeline. Critic PASS_WITH_WARNINGS. |
| 9 | SF_TRIM_NC_PAINT | ✅ authored | generated | — | v0.1.0 draft complete 2026-02-08. Full SpecFactory pipeline. |

## Phase 2 — Extended Coverage (P2)

| # | Spec Family ID | Brief | Status | Blocker | Notes |
|---|----------------|-------|--------|---------|-------|
| 10 | SF_WINDOW_INT_NC | ✅ authored | generated | — | v0.1.0 draft complete 2026-02-08. Combined prime+paint, EA-based with Size Bucket Method. |
| 11 | SF_STAIR_RISER_NC | ✅ authored | generated | — | v0.1.0 draft complete 2026-02-08. Dual UOM (EA risers, LF stringers). Combined prime+paint. |
| 12 | SF_STAIR_RAILING_NC | ✅ authored | generated | — | v0.1.0 draft complete 2026-02-08. 4 paintable items, iron/wood handling, 43 tasks, 7 modules. |

## Phase 3 — Custom/Architectural (P3)

| # | Spec Family ID | Brief | Status | Blocker | Notes |
|---|----------------|-------|--------|---------|-------|
| 13 | SF_WAINSCOT_PANEL_NC | ✅ authored | generated | — | v0.1.0 draft complete 2026-02-09. Combined prime+paint, SF-based. wainscot_type complexity modifier. 25 tasks, 7 modules. |
| 14 | SF_WOOD_WALL_NC | ✅ authored | generated | — | v0.1.0 draft complete 2026-02-09. Combined prime+paint, SF-based. 4 wall_style complexity modifiers. Height varies (PS_META.HEIGHT_BAND). 25 tasks, 7 modules. |
| 15 | SF_WOOD_CEILING_NC | ❌ needed | queued | needs brief | Fine Finish + overhead |
| 16 | SF_ARCH_ELEMENT_NC | ❌ needed | queued | needs brief | Beams, columns, mantels |
| 17 | SF_BUILTIN_NC | ❌ needed | queued | needs brief | Fine Finish Doctrine |
| 18 | SF_CABINET_NC_PAINT | ❌ needed | queued | needs brief + doctrine | May need cabinet doctrine |

---

## Already Complete

| Spec Family ID | Version | Status |
|----------------|---------|--------|
| *(all legacy drafts moved back to Phase 1 for redo)* | — | — |

---

## Status Definitions

| Status | Meaning |
|--------|---------|
| `queued` | Ready or waiting for brief |
| `in_progress` | Pipeline running |
| `generated` | Artifacts created, pending review |
| `approved` | Human reviewed and approved |
| `blocked` | Cannot proceed (see Blocker column) |
