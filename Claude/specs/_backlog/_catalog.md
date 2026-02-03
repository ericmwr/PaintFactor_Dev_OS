# Spec Backlog Catalog

**Last Updated:** 2026-02-01  
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
| 4 | SF_DOOR_FRAME_NC | ❌ needed | queued | needs brief | Pairs with door slab |
| 5 | SF_CLOSET_SHELF_NC | ❌ needed | queued | needs brief | Simple spec |
| 6 | SF_DRYWALL_WALL_NC_PRIME | ✅ authored | queued | redo in new format | Brief authored 2026-02-01. v0.1.0 exists but predates current spec format. |
| 7 | SF_DRYWALL_WALL_NC_FINISH | ✅ authored (old) | queued | redo in new format | v0.1.0 exists but predates current spec format. Note: if prime includes inspection/repair, finish eliminates one round. |
| 8 | SF_TRIM_NC_PRIME | ❌ needed | queued | needs brief | NEW — dedicated trim priming spec. Covers all substrate scenarios: pre-primed, bare wood, glossy/oil-based requiring bonding primer. Split from old SF_TRIM_NC_PAINT. |
| 9 | SF_TRIM_NC_PAINT | ✅ authored (old) | queued | redo in new format | Finish coats only. v0.1.0 exists; needs profile_type expansion + redo in new format. Priming scope moved to SF_TRIM_NC_PRIME. |

## Phase 2 — Extended Coverage (P2)

| # | Spec Family ID | Brief | Status | Blocker | Notes |
|---|----------------|-------|--------|---------|-------|
| 10 | SF_WINDOW_INT_NC | ❌ needed | queued | needs brief + doctrine review | Window Systems Doctrine exists |
| 11 | SF_STAIR_RISER_NC | ❌ needed | queued | needs brief + doctrine | No stair doctrine yet |
| 12 | SF_STAIR_RAILING_NC | ❌ needed | queued | needs brief + doctrine | No stair doctrine yet |

## Phase 3 — Custom/Architectural (P3)

| # | Spec Family ID | Brief | Status | Blocker | Notes |
|---|----------------|-------|--------|---------|-------|
| 13 | SF_WAINSCOT_PANEL_NC | ❌ needed | queued | needs brief | Millwork Doctrine covers |
| 14 | SF_WOOD_WALL_NC | ❌ needed | queued | needs brief | Fine Finish Doctrine |
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
