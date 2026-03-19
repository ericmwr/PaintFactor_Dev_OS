# PaintFactor Platform Plan

> Master plan for PaintFactor — a project management platform for residential painting contractors.
> PaintScope (scoping & estimation) is the first module; this document covers the full platform vision.
>
> Created: 2026-03-18

---

## 1. Platform Overview

PaintFactor is an integrated platform where every module shares a common data layer. The project record is the hub — all modules read from and write to the same project data.

```
PaintFactor (platform shell — nav, auth, dashboard)
│
├── PaintScope           Scope & estimate builder (current build)
├── Assembly Manager     Custom SOPs, rate overlays, modifier overrides
├── Time Tracker         Field logging by employee / room / substrate / task
├── Analytics            Estimated vs actual, rate confidence, P4P payouts
├── Client Portal        Project status, approvals, client-facing views
│
└── Shared Services
    ├── Project Database
    ├── Company Profile
    ├── Materials Database
    ├── Assembly Database
    ├── Rate Overlay Database
    ├── Base Database (read-only)
    └── Auth / Users / Roles
```

---

## 2. Module Descriptions

### 2.1 PaintScope (Current Build)

The scoping and estimation engine. An estimator walks through a project room-by-room (interior) or elevation-by-elevation (exterior), selecting substrates, conditions, and quantities. The engine calculates labor hours and generates work orders.

**Status:** Active development. React/Vite app with localStorage persistence. SQLite base database with 40+ spec families imported. Interior + exterior support.

**Key capabilities:**
- Room editor with 8 tabs (Identity, Structure, Openings, Surfaces, Trim, Specialty, Closets, Protection)
- Exterior elevation editor with siding, trim, openings, caulking, sub-elements
- Standalone exterior items (deck, fence, foundation, etc.)
- Estimation engine: spec resolution, modifier stacking, per-item hour computation
- Stain/clear coat support across all wood substrates
- Work order generation per room/elevation

### 2.2 Assembly Manager

A UI for creating reusable SOPs tied to specific substrate + condition combinations. Assemblies can range from a single spec family (e.g., "drywall repaint, poor condition") to a full room package (e.g., "master bedroom repaint").

**Key capabilities:**
- Select substrate + conditions as the assembly context
- Cherry-pick modules and/or individual tasks from the base database
- Set custom production rates per task within the assembly
- Optional flat rate for the entire assembly as a unit
- Two estimation modes:
  - **Mode A (Bottom-up):** Sum of individual task hours (with per-task overrides)
  - **Mode B (Flat rate):** Assembly-level hours override; task breakdown is for work order/SOP only
- Save and recall assemblies by name/category
- Assemblies are company-level (shared across all projects)

### 2.3 Time Tracker

Field-facing app for crew members to log actual hours against project scope. Designed for mobile-first use on job sites.

**Key capabilities:**
- Employee selects project from active project list
- Drills into rooms (interior) or elevations (exterior)
- Selects substrates/tasks being worked on
- Logs hours per task per substrate per room/elevation
- Sets completion percentage per substrate/task
- System calculates actual production rate per employee per task
- Data writes back to the Project DB for analytics

### 2.4 Analytics

Dashboard that compares estimated hours to actual hours logged by the Time Tracker. Surfaces discrepancies and recommends adjustments to the overlay database.

**Key capabilities:**
- Estimated vs actual comparison by task, substrate, modifier, crew, project
- Rate confidence scoring (e.g., "base rate 400 SF/hr, actual average 365 SF/hr across 12 projects")
- Crew-level performance tracking (e.g., "Crew A at 85% of estimate, Crew B at 110%")
- Modifier accuracy analysis (e.g., "poor condition prep consistently 30% under-estimated")
- Assembly validation (e.g., "kitchen repaint flat rate of 14 hrs validated across 8 projects")
- P4P bonus calculations per employee per project
- Recommendations are surfaced for review; user decides what to push into the overlay

### 2.5 Client Portal (Future)

Client-facing view of project status, approvals, and documentation. Scope TBD.

---

## 3. Database Architecture

Six database layers in a resolution cascade. Each layer is optional — if no override exists, the engine falls through to the next layer.

```
┌─────────────────────────────────────────────────────────────────────┐
│  1. PROJECT DB                                                       │
│  Per-project data: rooms, scopes, estimates, actuals,                │
│  client info, dates, status, P4P targets, completion tracking        │
├─────────────────────────────────────────────────────────────────────┤
│  2. COMPANY PROFILE                                                  │
│  Labor rates (per skill level), burden rate, overhead,               │
│  profit margin, crew configs, P4P ratios, business rules             │
├─────────────────────────────────────────────────────────────────────┤
│  3. MATERIALS DB                                                     │
│  Product catalog (brand, SKU, unit size, unit cost),                 │
│  coverage rates (SF/gal, LF/tube), preferred products per system,   │
│  vendor pricing tiers                                                │
├─────────────────────────────────────────────────────────────────────┤
│  4. ASSEMBLY DB                                                      │
│  Reusable SOPs at any scope (single spec family → room package),    │
│  assembly_modules, assembly_tasks, optional flat rate per assembly   │
├─────────────────────────────────────────────────────────────────────┤
│  5. OVERLAY DB                                                       │
│  Company-level rate overrides (task rates, modifier values).         │
│  Never deletes base rates — only adds a customization layer.        │
├─────────────────────────────────────────────────────────────────────┤
│  6. BASE DB (read-only, ships with app)                              │
│  Canonical production rates, spec families, tasks, modules,         │
│  modifiers, base material systems                                    │
└─────────────────────────────────────────────────────────────────────┘
```

**Engine resolution order:** project-level override → assembly rate → overlay → base

---

## 4. Full Estimate Pipeline

The complete chain from scope to bid price:

```
Scope (PaintScope)
  → Labor Hours (Base DB + Overlay + Assembly rates)
  → Materials Cost (Materials DB × quantities derived from scope)
  → Labor Cost (hours × labor rate from Company Profile)
  → Burdened Labor (labor cost × burden rate)
  → Overhead Allocation
  → Subtotal
  → Profit Margin
  → Final Bid Price
```

Currently PaintScope produces labor hours. Materials DB and Company Profile complete the chain to a dollar bid.

---

## 5. Pay for Performance (P4P) System

An incentive system built into the estimation and time tracking workflow.

### Three Hour Values Per Line Item

| Value | Description | Visible To |
|-------|-------------|------------|
| **Bid Hours** | What the client pays for (includes overhead/profit buffer) | Estimator only |
| **P4P Target** | The "par" — what a good crew should hit (always ≤ bid hours) | Crew (via work order) |
| **Actual Hours** | What the crew logged via Time Tracker | Crew + management |

### Bonus Calculation

```
P4P Target - Actual Hours = Bonus Hours
Bonus Hours × Labor Rate = Incentive Pay

Example:
  P4P Target:   9 hrs
  Actual:       7 hrs
  Bonus:        2 hrs × $25/hr = $50 incentive
```

### P4P Configuration

- P4P ratio can be global (Company Profile: "P4P target = 90% of bid hours")
- Or set per substrate / per line item for fine-grained control
- Work orders display: substrate, quantity (SF/LF/EA), P4P target hours
- Crew uses the work order as a scorecard to self-manage pace

### P4P Analytics

- Bonus payouts per employee per project
- Which substrates crews consistently beat target on (rate may be too generous)
- Which substrates crews consistently miss (rate may need adjustment, or training needed)
- Crew efficiency rankings over time

---

## 6. Time Tracker → Analytics Feedback Loop

The system creates a continuous improvement cycle:

```
PaintScope estimates hours       →  Project DB stores estimate + P4P targets
Time Tracker logs actual hours   →  Project DB stores actuals
Analytics compares both          →  Surfaces rate discrepancies + P4P payouts
Overlay DB gets adjusted         →  PaintScope estimates improve
                                 →  Repeat
```

This feedback loop means production rates get more accurate over time based on real field data, rather than staying static estimates.

---

## 7. Integrations

### 7.1 Hover (Future)

- Hover app provides per-substrate image measurements from property photos
- Measurement data feeds directly into PaintScope to auto-populate project scope
- Room dimensions, surface SF, trim LF, openings, exterior elevations
- Eliminates manual measurement entry — estimator reviews and adjusts rather than builds from scratch

---

## 8. Build Phases

| Phase | Scope | Dependencies |
|-------|-------|-------------|
| **Phase 1** (current) | PaintScope with localStorage. Interior + exterior scoping, estimation engine, work orders. | None |
| **Phase 2** | SQLite Project DB. Migrate PaintScope from localStorage to persistent storage. Stand up Base DB + Overlay DB schema. | Phase 1 |
| **Phase 3** | Company Profile DB + Materials DB. Complete the estimate pipeline from hours → dollars. | Phase 2 |
| **Phase 4** | Assembly Manager UI. Separate view/route within the same app. | Phase 2 |
| **Phase 5** | Time Tracker UI. Potentially separate app (mobile-first). Writes actuals to Project DB. | Phase 2 |
| **Phase 6** | Analytics dashboard. Rate confidence, estimated vs actual, P4P bonus calculations, overlay recommendations. | Phase 5 |
| **Phase 7** | Migrate SQLite → hosted backend (Supabase / Firebase / other). All modules share one backend. Auth + roles. | Phase 2+ |
| **Phase 8** | Hover integration. Auto-populate scope from image measurements. | Phase 2 |
| **Phase 9** | Client Portal. Project status, approvals, client-facing views. | Phase 7 |

Phases 3-6 can be worked in parallel once Phase 2 (shared database layer) is in place. Phase 7 (hosted migration) can happen at any point after Phase 2 but is required before Phase 9 (Client Portal).

---

## 9. Architecture Decisions

| Decision | Rationale |
|----------|-----------|
| SQLite for development | Fast iteration, no infrastructure overhead. Schema designed for migration to hosted DB. |
| One Vite/React app with routes (initially) | PaintScope, Assembly Manager, Analytics share UI shell. Simpler than microservices at this stage. |
| Time Tracker may be a separate app | Mobile-first UX for field workers is fundamentally different from desktop estimator UX. |
| All modules share one database | No data silos. The project record is the hub that everything connects to. |
| Rate overlay pattern (never modify base) | Base DB is the canonical reference. Overlays are reversible. "Reset to default" is always possible. |
| P4P targets separate from bid hours | Crew incentives are decoupled from client pricing. Company controls the margin gap. |

---

## 10. Current State (as of 2026-03-18)

- **PaintScope:** Active development on `main` branch
  - 40+ spec families in Base DB (18 interior NC + 10 interior stain/clear + 22 exterior RP)
  - 8,129+ rows across 24 SQLite tables
  - React app with room editor, exterior editor, estimation engine
  - Stain/clear coat controls working across all wood substrates
  - Work order and estimate views functional
- **Everything else:** Planning stage (this document)
