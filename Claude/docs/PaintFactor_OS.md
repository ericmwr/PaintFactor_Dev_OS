# PaintFactor OS — System Architecture & Operating Doctrine

## 1. What PaintFactor Is (and Is Not)

PaintFactor is a **data-first estimating and production intelligence system** for professional painting contractors.

PaintFactor is NOT:
- A chatbot-based estimating tool
- A runtime AI decision-maker
- A generative proposal engine (initially)

PaintFactor IS:
- A structured database of paintable items, specifications, SOPs, materials, and production logic
- A rules-driven estimating engine powered by geometry and scope data
- A system designed for **consistency, auditability, and calibration**

AI agents exist to **design, build, validate, and maintain** PaintFactor — not to replace its runtime logic.

---

## 2. System Layers (High Level)

### Layer 1 — Geometry & Scope Capture (PaintScope)
- Rooms, dimensions, perimeters, heights
- Openings (doors, windows)
- Trim types and finish intent
- Surface categorization (walls, ceilings, trim, doors, etc.)

This layer produces **measurable facts**, not opinions.

---

### Layer 2 — Specification Domain
- Spec Families (e.g., drywall prime, wall finish, door repaint)
- Modular SOPs
- Material systems
- Production logic

Specs translate geometry into **work definitions**.

---

### Layer 3 — Estimation Engine
- Converts Spec + Geometry into labor, material, and time
- Uses SF, LF, EA appropriately
- Applies quality tiers and modifiers
- Produces auditable estimates

No AI improvisation occurs here.

---

### Layer 4 — Calibration & Analytics (Future)
- Field production logs
- Variance tracking
- Rate calibration

---

## 3. Role of AI Agents

AI agents exist ONLY in the **development and maintenance layer**.

They:
- Research standards
- Propose schemas
- Generate draft specs
- Flag inconsistencies
- Assist human review

They DO NOT:
- Make pricing decisions
- Override production logic
- Estimate jobs directly for customers

---

## 4. Core Design Principles

### A. Data First, AI Second
All intelligence must collapse into structured data that survives without AI.

### B. Modular Everything
- SOPs are Lego blocks
- Tasks are repeatable and round-aware
- Specs are compositions, not monoliths

### C. Geometry Drives Labor
- SF for field work
- LF for edges
- EA for discrete items

### D. Human Authority Is Final
AI proposes.
Humans approve.
The system enforces.

---

## 5. Why This Matters for Specs

Specs are not instructions.
Specs are **contracts between geometry and labor**.

If a spec cannot be:
- Measured
- Reproduced
- Calibrated

…it does not belong in PaintFactor.

---

## 6. Agent Alignment Rule

Before generating or modifying any spec, SOP, or schema:

**Agents must ask:**
> “What geometry exists before this spec is applied?”

If that answer is unclear — stop.

---
