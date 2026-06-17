# Spec Brief & Generation System

This document explains how specs move from the backlog catalog through brief creation to full SpecFactory generation.

---

## System Overview

Every spec must have an **approved brief** before the SpecFactory pipeline runs. Briefs are doctrine-driven research documents that define scope, PaintScope keys, protection zones, and acceptance criteria. They prevent "vibe specs" built on general knowledge instead of established system rules.

**Key principle:** Dev Orchestrator coordinates but does not author briefs. Spec Researcher loads doctrine and creates briefs.

### Workflow

```
1. Human requests spec generation
2. Dev Orchestrator checks for existing brief
3. If no brief → delegates to Spec Researcher
4. Spec Researcher loads doctrine, creates draft brief
5. Dev Orchestrator presents brief to human for approval
6. Human approves (or requests corrections)
7. Brief saved to specs/_backlog/<SF_ID>/brief.md
8. Dev Orchestrator delegates to SpecFactory Orchestrator with approved brief
9. Pipeline runs: Researcher → Materials → SOP → Estimation → Critic → Assembly
10. Output lands in specs/<SF_ID>_v1/
```

---

## How to Start

### Generate a specific spec

```
"Generate SF_DOOR_FRAME_NC"
```

Dev Orchestrator will look for a brief at `specs/_backlog/SF_DOOR_FRAME_NC/brief.md`. If found, it proceeds to the pipeline. If not, it delegates brief creation to Spec Researcher.

### Generate the next spec in the catalog

```
"Generate next spec"
```

Dev Orchestrator reads `specs/_backlog/_catalog.md`, finds the first entry with status `queued`, and checks for a brief. Currently the next queued spec needing a brief is **SF_DRYWALL_CEILING_NC_FINISH** (#2 in Phase 1).

### Check what's available

```
"What's in the backlog?"
```

Dev Orchestrator reads and summarizes the catalog, showing status, brief availability, and blockers for each spec family.

### Request a brief only (without running the pipeline)

```
"Create a brief for SF_CLOSET_SHELF_NC"
```

Dev Orchestrator delegates to Spec Researcher, who loads all relevant doctrine and returns a draft brief for your review. You can approve or request corrections before any pipeline work begins.

---

## Directory Structure

```
specs/_backlog/
├── README.md              ← this file
├── _brief_template.md     ← template for authoring new briefs
├── _catalog.md            ← master list, priority order, status
│
├── SF_DRYWALL_CEILING_NC_PRIME/
│   └── brief.md
├── SF_DOOR_SLAB_INT_NC/
│   └── brief.md
└── ...
```

---

## Brief Lifecycle

| Stage | Location | Status in Catalog |
|-------|----------|-------------------|
| No brief exists | — | `queued` (blocker: needs brief) |
| Brief drafted by Spec Researcher | Presented to human for review | — |
| Brief approved | `specs/_backlog/<SF_ID>/brief.md` | `queued` (brief: authored) |
| Generation in progress | `specs/_backlog/<SF_ID>/brief.md` | `in_progress` |
| Generation complete | `specs/<SF_ID>_v1/brief.md` (provenance copy) | `generated` |

---

## Brief Sections

Every brief follows the template at `specs/_backlog/_brief_template.md` with 10 sections:

1. **Identity** — Spec family ID, domain, context
2. **Scope Boundaries** — Explicit includes and excludes with routing
3. **Configuration Dimensions** — Quality tier, application method, sheen, substrate
4. **Paintable Items** — Items, UOM, counting rules
5. **Required PaintScope Inputs** — Verified keys from the PaintScope catalog
6. **Adjacency Declarations** — Adjacent surfaces and edge types
7. **Relationships** — Sibling specs, sequencing, finish groups
8. **References** — Domain doctrines (8a) and standing references (8b)
9. **Special Notes / Constraints** — Anything agents need beyond the template
10. **Acceptance Criteria** — Measurable quality gates for Critic validation

---

## Rules

1. **No brief, no generation.** The SpecFactory pipeline will not run without an approved brief.
2. **Dev Orchestrator never drafts briefs.** It delegates to Spec Researcher, who loads doctrine first.
3. **Human approval required.** Every brief must be reviewed and approved before the pipeline runs.
4. **Briefs are doctrine-driven.** Spec Researcher loads 10+ doctrine documents before writing any brief content.
5. **Brief becomes provenance.** After generation, the brief is copied into the spec output folder as a permanent record.
6. **One brief per spec family.** The brief is the single source of truth for what the spec covers.

---

## Agents Involved

| Agent | Role in Brief/Spec Generation |
|-------|-------------------------------|
| **Dev Orchestrator** | Coordinates workflow, checks for briefs, delegates, manages approval gate |
| **Spec Researcher** | Loads doctrine, creates draft briefs, performs domain research |
| **SpecFactory Orchestrator** | Runs the 6-agent pipeline once a brief is approved |
| **Critic** | Validates generated spec against brief Section 10 acceptance criteria |

---

## Current Backlog Summary

### Phase 1 — Core Coverage

| # | Spec Family ID | Brief | Status |
|---|----------------|-------|--------|
| 1 | SF_DRYWALL_CEILING_NC_PRIME | authored | generated |
| 2 | SF_DRYWALL_CEILING_NC_FINISH | needed | queued |
| 3 | SF_DOOR_SLAB_INT_NC | authored | in_progress |
| 4 | SF_DOOR_FRAME_NC_FINISH | authored | queued |
| 5 | SF_CLOSET_SHELF_NC | needed | queued |
| 6 | SF_DRYWALL_WALL_NC_PRIME | authored | queued (redo) |
| 7 | SF_DRYWALL_WALL_NC_FINISH | authored (old) | queued (redo) |
| 8 | SF_TRIM_NC_PRIME | needed | queued |
| 9 | SF_TRIM_NC_PAINT | authored (old) | queued (redo) |

### Phase 2 — Extended Coverage

| # | Spec Family ID | Brief | Status |
|---|----------------|-------|--------|
| 10 | SF_WINDOW_INT_NC | needed | queued |
| 11 | SF_STAIR_RISER_NC | needed | queued |
| 12 | SF_STAIR_RAILING_NC | needed | queued |

### Phase 3 — Custom/Architectural

| # | Spec Family ID | Brief | Status |
|---|----------------|-------|--------|
| 13–18 | SF_WAINSCOT_PANEL_NC through SF_CABINET_NC_PAINT | all needed | queued |

---

## Catalog Status Definitions

| Status | Meaning |
|--------|---------|
| `queued` | Ready or waiting for brief |
| `in_progress` | Pipeline running |
| `generated` | Artifacts created, pending review |
| `approved` | Human reviewed and approved |
| `blocked` | Cannot proceed (see Blocker column) |
