# DataFactory Architecture

**Status:** DRAFT  
**Version:** 1.0.0  
**Last Updated:** 2026-02-09  
**Doctrine Level:** 1 (System)  
**Authority:** PaintFactor_OS.md

---

## 1. Purpose

DataFactory is a development-time agent pipeline that transforms completed SpecFactory artifacts into a populated, validated SQLite database. It bridges Layer 2 (Specification Domain) and Layer 3 (Estimation Engine) of the PaintFactor architecture.

SpecFactory produces deterministic, schema-validated JSON artifacts that encode painting knowledge. DataFactory decomposes those artifacts into normalized relational tables that the Estimation Engine can query at runtime. Without DataFactory, specs remain inert files. With it, they become queryable, joinable, calculable data.

```
SpecFactory          →   DataFactory          →   Estimation Engine
(domain knowledge)       (relational import)      (runtime queries)
JSON artifacts           SQLite tables             Labor/material calc
```

### What DataFactory Is NOT

DataFactory does not estimate jobs, make pricing decisions, or run production logic. It does not modify or generate spec artifacts — it consumes them read-only. It does not replace the Estimation Engine — it feeds it. Like all PaintFactor development systems, it operates at development time only.

---

## 2. Relationship to PaintFactor Architecture

PaintFactor OS defines four system layers. DataFactory operates between Layers 2 and 3:

```
Layer 1 — PaintScope (Geometry Capture)
           ↓ measurable facts (SF, LF, EA)
Layer 2 — Specification Domain (SpecFactory output)
           ↓ spec artifacts (JSON)
       ╔═══════════════════════════════════╗
       ║  DataFactory (this system)        ║
       ║  JSON → SQLite decomposition      ║
       ║  Validation and integrity gates   ║
       ╚═══════════════════════════════════╝
           ↓ populated database
Layer 3 — Estimation Engine (runtime queries)
           ↓ labor, material, time
Layer 4 — Calibration & Analytics (future)
```

DataFactory has no relationship to PaintScope or Layer 1. It does not touch geometry. It operates entirely on the output of Layer 2 and produces the input for Layer 3.

---

## 3. Design Principles

### 3A. Universal by Design

DataFactory agents operate on artifact structure, not domain content. Every spec family — NC interior, exterior, residential repaint, commercial — produces the same five artifact files conforming to the same JSON schemas:

- `spec.json` — scope, items, variants, inputs, protection, adjacency, state
- `materials.json` — material systems, coverage, consumables, compatibility
- `sop_modules.json` — modules, tasks, phase ordering, conditions
- `production.json` — rates, factors, quality effects, crew configurations
- `qa_report.json` — critic validation results

The import pipeline does not need to know whether a spec describes drywall walls or exterior siding. Domain-specific validation belongs in SpecFactory (Critic agent). Structural validation belongs in DataFactory (DB Validator agent).

This means zero new agents are needed when new painting categories are added.

### 3B. Deterministic and Auditable

Every import must be reproducible. Given the same spec artifacts at the same version, the database state must be identical. No AI improvisation during import — agents generate SQL and validation logic based on the schema contract.

Import operations are transactional: a spec family is either fully imported or not at all. Partial imports do not exist.

### 3C. Raw + Normalized (Belt and Suspenders)

Every import stores the original JSON in `spec_artifacts_raw` alongside normalized table inserts. If the schema evolves, raw JSON provides a reliable re-import source. This is the safety net that decouples schema iteration from data loss.

### 3D. Schema Follows Specs

The JSON schemas and spec templates are the source of truth for data structure. The database schema is derived from them. If specs evolve (new fields, new artifact structures), the database schema adapts — not the reverse.

The SQLite Schema Contract (docs/System/SQLite_Schema_Contract.md) is the binding translation between JSON artifact structure and relational table design.

### 3E. Specs Consume but Never Compute

Inherited from PaintFactor OS. Specs declare geometry requirements but never calculate geometry. DataFactory imports these declarations as-is. The Estimation Engine resolves actual values at runtime using PaintScope data.

---

## 4. Pipeline Architecture

### 4A. Pipeline Flow

```
Human Trigger
  │  "Import SF_TRIM_NC_PAINT_v1"
  │  "Import next spec"
  │  "Import all generated specs"
  ▼
Import Orchestrator
  │  1. Read import registry
  │  2. Read spec backlog catalog
  │  3. Validate prerequisites
  │  4. Check schema currency
  ▼
Schema Engineer (if needed)
  │  - Run migrations if schema has changed
  │  - Create tables if database is new
  ▼
Spec Importer (per spec family)
  │  1. Read 5 artifact files
  │  2. Store raw JSON in spec_artifacts_raw
  │  3. Decompose JSON → INSERT statements
  │  4. Execute within single transaction
  │  5. Output import report
  ▼
DB Validator (per spec family, then optionally full DB)
  │  1. FK integrity checks
  │  2. Cross-file threading validation
  │  3. Completeness checks
  │  4. Enum/vocabulary validation
  │  5. Duplicate detection
  │  6. Output validation report
  ▼
Import Orchestrator
  │  - Update import registry with results
  │  - Report summary to human
  ▼
Human Review
```

### 4B. Prerequisites for Import

A spec family must meet ALL of these conditions before import:

1. Spec artifacts exist in `specs/<SF_ID>_v1/` (or appropriate version)
2. All 5 required artifact files are present (spec.json, materials.json, sop_modules.json, production.json, qa_report.json)
3. Spec status in backlog catalog is `generated` or higher
4. Critic has passed: qa_report.json status is `pass` or `pass_with_warnings`
5. Schema validation passes: `python scripts/validate_specs.py` reports no errors for this family
6. Database schema is current (no pending migrations)

### 4C. Transaction Model

Each spec family import is wrapped in a single SQLite transaction. If any INSERT fails, the entire import rolls back. This prevents partial data states that could corrupt Estimation Engine queries.

```sql
BEGIN TRANSACTION;
  -- Insert into spec_artifacts_raw (all 5 files)
  -- Insert into spec_families
  -- Insert into spec_configuration_dimensions
  -- Insert into spec_paintable_item_types
  -- ... all other tables ...
  -- Insert into import_log
COMMIT;
```

On any error: `ROLLBACK;` and report failure.

### 4D. Re-import Procedure

When a spec family is updated (new version, corrections applied):

1. Delete all existing data for that spec_family_id across all tables
2. Re-import from the updated artifact files
3. Re-run validation
4. Update import registry

This is a full replacement, not a merge. The raw JSON from previous imports remains in spec_artifacts_raw (marked with the old version) for audit purposes.

---

## 5. Agent Responsibilities

### 5A. Import Orchestrator

**File:** `agents/datafactory-orchestrator.md`

Owns the import pipeline sequence. Reads the import registry and spec backlog catalog to determine what needs importing. Validates prerequisites. Delegates to Schema Engineer, Spec Importer, and DB Validator in the correct order. Updates the import registry after each attempt. Does not perform imports or validation directly.

### 5B. Schema Engineer (Evolved)

**File:** `agents/schema-engineer.md`

Owns the SQLite schema: CREATE TABLE definitions, migrations, indexes, constraints. Operates only when the schema needs to change (new tables, altered columns, new indexes). Produces `database/schema/create_tables.sql` and migration scripts. Consults the SQLite Schema Contract as primary doctrine.

### 5C. Spec Importer

**File:** `agents/spec-importer.md`

The workhorse. Reads spec family artifact files and decomposes them into INSERT statements per the SQLite Schema Contract. Stores raw JSON first, then normalizes. Manages transaction boundaries. Reports rows inserted per table. Does not validate — that's the DB Validator's job.

### 5D. DB Validator

**File:** `agents/db-validator.md`

Post-import integrity checker. Runs FK consistency checks, cross-file threading validation, completeness checks, enum validation, and duplicate detection. Produces a validation_report.json. The DataFactory equivalent of the SpecFactory Critic — imports that fail validation are not approved.

### 5E. Ownership Boundaries

| Responsibility | Owner |
|---------------|-------|
| Import sequencing and registry | Import Orchestrator |
| Table design, migrations, indexes | Schema Engineer |
| JSON → SQL decomposition | Spec Importer |
| Post-import validation | DB Validator |
| Spec content correctness | SpecFactory Critic (NOT DataFactory) |
| Runtime query optimization | Estimation Engine (future) |
| Schema contract documentation | Schema Engineer + human review |

---

## 6. Import Lifecycle

Each spec family has an import status tracked in the import registry:

```
not_imported → importing → validating → imported → approved
                  │            │
                  ▼            ▼
               failed       failed
```

| Status | Meaning |
|--------|---------|
| `not_imported` | Spec exists but has never been imported |
| `importing` | Import in progress (transient) |
| `validating` | Import complete, validation in progress (transient) |
| `imported` | Import + validation passed, awaiting human review |
| `approved` | Human reviewed and confirmed |
| `failed` | Import or validation failed (see notes for details) |
| `outdated` | A newer version of the spec exists; re-import needed |

### Version Tracking

The import registry tracks the spec version that was imported. When a spec is updated to a new version, the existing import is marked `outdated` and a re-import is triggered.

---

## 7. Error Handling

### Import Errors

Any error during Spec Importer execution triggers a full transaction rollback. The import registry records the failure with:
- Error type (missing file, parse error, FK violation, constraint violation)
- Error details (which table, which row, which constraint)
- Timestamp

The human reviews the failure and either fixes the spec artifacts or adjusts the schema.

### Validation Errors

Validation errors do not roll back data (the import is already committed). Instead:
- CRITICAL errors block the import from being marked `imported` — status stays `failed`
- MAJOR errors allow `imported` status but block `approved`
- MINOR errors are logged as warnings and do not block any status transitions

### Schema Migration Errors

If a migration fails, the database may be in an inconsistent state. Mitigation:
- Migrations are tested against a copy of the database first
- The .db file is backed up before any migration
- Failed migrations are rolled back and reported

---

## 8. File Organization

```
Claude/
├── database/                            ← DataFactory working directory
│   ├── README.md                        ← Setup, usage, overview
│   ├── schema/
│   │   ├── create_tables.sql            ← Complete table definitions
│   │   ├── seed_enums.sql               ← Reference data (quality tiers, etc.)
│   │   └── migrations/
│   │       └── 001_initial.sql          ← First migration = create_tables
│   ├── scripts/
│   │   ├── import_spec.py               ← Import execution script
│   │   ├── validate_db.py               ← Validation execution script
│   │   └── query_examples.sql           ← Reference queries for Engine
│   ├── imports/
│   │   ├── _import_registry.md          ← Master import tracking
│   │   └── <SF_ID>/                     ← Per-family import artifacts
│   │       ├── import_report.json
│   │       └── validation_report.json
│   └── paintfactor.db                   ← The SQLite database (gitignored)
│
├── docs/System/
│   ├── DataFactory_Architecture.md      ← This document
│   └── SQLite_Schema_Contract.md        ← Schema translation contract
│
└── agents/
    ├── datafactory-orchestrator.md      ← Import Orchestrator
    ├── spec-importer.md                 ← Spec Importer
    ├── db-validator.md                  ← DB Validator
    └── schema-engineer.md               ← Schema Engineer (evolved)
```

### Git Rules

- `database/paintfactor.db` → .gitignore (binary, reproducible from artifacts)
- `database/schema/` → tracked (source of truth for structure)
- `database/scripts/` → tracked (source of truth for import/validation logic)
- `database/imports/` → tracked (audit trail for import history)

---

## 9. Relationship to SpecFactory

### Handoff Contract

SpecFactory produces artifacts. DataFactory consumes them. The boundary is clean:

- SpecFactory writes to `specs/<SF_ID>_v1/`
- DataFactory reads from `specs/<SF_ID>_v1/`
- DataFactory NEVER writes to specs/
- SpecFactory has no knowledge of database tables

### Eligibility Rules

A spec becomes eligible for import when:
1. All 5 artifact files exist
2. Status in backlog catalog ≥ `generated`
3. qa_report.json status is `pass` or `pass_with_warnings`
4. `python scripts/validate_specs.py` passes for this family

### No Circular Dependencies

SpecFactory does not depend on DataFactory. Specs can be generated, reviewed, and approved without any database existing. DataFactory is purely additive — it creates a new consumption path for existing artifacts.

---

## 10. SQLite-Specific Architecture Decisions

### Why SQLite (Not Postgres)

- File-based: zero server infrastructure during development
- The spec catalog is a read-heavy reference dataset — SQLite's strength
- Single-user development workflow has no concurrency pressure
- Migration to Postgres later is straightforward when multi-user access is needed
- Python's `sqlite3` module is built-in — no dependencies

### SQLite Constraints

- `PRAGMA foreign_keys = ON;` must be set on every connection (SQLite doesn't enforce FKs by default)
- No native JSONB — use TEXT columns with `json_extract()` for querying
- No ALTER TABLE DROP COLUMN before SQLite 3.35 — use table rebuild for schema changes
- No native enum type — use CHECK constraints or validate at import time
- Dates stored as TEXT in ISO 8601 format
- Booleans stored as INTEGER (0/1)
- WAL mode recommended for development: `PRAGMA journal_mode=WAL;`

### JSON Storage Strategy

Some spec data is inherently nested (applies_when conditions, coat sequences, compatible substrates). Two approaches are used:

1. **Flatten into columns** — when the data is queried directly by the Engine (quality_tier, unit_of_measure, rate_per_hour)
2. **Store as JSON TEXT** — when the data is complex/variable and queried less frequently (applies_when, coat_sequence, compatible_substrates, tools_required)

The SQLite Schema Contract defines which approach each field uses.

---

## 11. Future Considerations

### Postgres Migration Path

When PaintFactor moves to multi-user (PaintScope + field app + estimator), the migration from SQLite to Postgres involves:
- `TEXT` JSON columns → `jsonb`
- `INTEGER PRIMARY KEY AUTOINCREMENT` → `bigserial` or `uuid`
- `PRAGMA foreign_keys` → default ON in Postgres
- `json_extract()` → `->` / `->>` operators
- CHECK constraints → enum types or domain types

The schema contract and import scripts are designed to make this migration mechanical.

### Additional Table Groups (Future)

The current schema covers spec artifact import only. Future table groups include:
- **Project tables** — PaintScope geometry data, room definitions, surface assignments
- **Estimate tables** — assembled estimates, line items, pricing
- **Production tables** — field time logs, variance tracking, calibration data
- **User/auth tables** — contractors, employees, clients

These are out of DataFactory's current scope but the schema is designed to coexist with them.
