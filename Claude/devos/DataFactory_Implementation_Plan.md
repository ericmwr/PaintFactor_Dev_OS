# DataFactory Implementation Plan

**Status:** PLANNING  
**Version:** 0.1.0  
**Created:** 2026-02-09  
**Authority:** PaintFactor_OS.md  
**Doctrine Level:** 1 (System)

---

## 1. What DataFactory Is

DataFactory is a development-time agent pipeline that transforms completed SpecFactory artifacts (JSON files) into a populated, validated SQLite database. It is the bridge between Layer 2 (Specification Domain) and Layer 3 (Estimation Engine) of the PaintFactor architecture.

**DataFactory is to the database what SpecFactory is to specifications.**

SpecFactory: Domain Knowledge → Spec Artifacts (JSON)  
DataFactory: Spec Artifacts (JSON) → Populated Database (SQLite)

### What DataFactory Is NOT

- It is not a runtime system — it runs at development time only
- It does not estimate jobs or make pricing decisions
- It does not modify or generate spec artifacts — it consumes them read-only
- It does not replace the Estimation Engine — it feeds it

### Why It Exists

The Spec → Database Mapping Guide (`specs/_templates/Spec → Database Mapping Guide.md`) defines the conceptual mapping between JSON artifacts and relational tables. DataFactory operationalizes that mapping through agents, scripts, and validation — turning a design document into an executable, repeatable pipeline.

---

## 2. Design Principles

### Universal by Design

DataFactory agents operate on **artifact structure, not domain content**. Every spec family — whether NC interior, exterior, residential repaint, or commercial — produces the same five artifact files conforming to the same JSON schemas. The import pipeline does not need to know whether a spec describes drywall walls or exterior siding. This means:

- Zero new agents needed when new painting categories are added
- The same pipeline handles SF_DRYWALL_WALL_NC_FINISH and a future SF_SIDING_EXT_REPAINT
- Domain-specific validation lives in SpecFactory (where it belongs); structural validation lives in DataFactory

### Deterministic and Auditable

Every import must be reproducible. Given the same spec artifacts at the same version, the database state must be identical. No AI improvisation during import — the agents generate SQL and validation logic, they don't freestyle data transformation.

### Raw + Normalized (Belt and Suspenders)

Every import stores the original JSON in `spec_artifacts_raw` alongside the normalized table inserts. If the schema evolves, the raw JSON provides a reliable re-import source. This is the same "safety net" principle from the Spec → Database Mapping Guide.

### Schema Follows Specs (Not the Reverse)

The JSON schemas and spec templates are the source of truth. The database schema is derived from them. If specs evolve (new fields, new artifact structures), the database schema adapts — not the other way around.

---

## 3. Architecture Overview

### Pipeline Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                     HUMAN TRIGGER                                   │
│  "Import SF_TRIM_NC_PAINT_v1" or "Import all generated specs"      │
└──────────────────────────────┬──────────────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                  IMPORT ORCHESTRATOR                                 │
│  1. Reads import registry (what's already imported, at what version)│
│  2. Reads spec backlog catalog (what's available to import)         │
│  3. Validates prerequisites (spec must be status: generated+)       │
│  4. Delegates to Schema Engineer if schema needs migration          │
│  5. Delegates to Spec Importer for each spec family                 │
│  6. Delegates to DB Validator for post-import integrity checks      │
│  7. Updates import registry with results                            │
└──────────────────────────────┬──────────────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    SCHEMA ENGINEER                                   │
│  (Only runs when schema changes are needed)                         │
│  - Owns CREATE TABLE definitions                                    │
│  - Produces migration scripts when schema evolves                   │
│  - Validates schema against current Spec → DB Mapping Guide         │
│  - Outputs: create_tables.sql, migration scripts                    │
└──────────────────────────────┬──────────────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    SPEC IMPORTER                                     │
│  (Runs once per spec family)                                        │
│  1. Reads all 5 artifact files from specs/<SF_ID>_v1/               │
│  2. Stores raw JSON in spec_artifacts_raw                           │
│  3. Decomposes JSON → INSERT statements per schema contract         │
│  4. Handles JSON-to-relational mapping:                             │
│     - Flattening applies_when objects                               │
│     - Exploding arrays into junction tables                         │
│     - Preserving JSON blobs where schema allows TEXT/JSON columns   │
│  5. Executes INSERTs within a transaction (all-or-nothing)          │
│  6. Outputs: import_report for this spec family                     │
└──────────────────────────────┬──────────────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    DB VALIDATOR                                      │
│  (Runs after each import, and optionally on full database)          │
│  1. Referential integrity checks (FK consistency)                   │
│  2. Cross-file threading validation:                                │
│     - Every task_id in production.json exists in sop_tasks          │
│     - Every material_system_id referenced exists in material_systems│
│     - Every module_id on tasks exists in sop_modules                │
│  3. Completeness checks:                                            │
│     - Every variant has ≥1 material system                          │
│     - Every task has a production rate                              │
│     - Every spec family has all 5 artifact types in raw table       │
│  4. Duplicate detection:                                            │
│     - No duplicate IDs within a spec family                         │
│     - No ID collisions across spec families (where applicable)      │
│  5. Enum validation:                                                │
│     - quality_tier values match controlled_enums                    │
│     - status values are valid                                       │
│     - unit_of_measure values are valid                              │
│  6. Outputs: validation_report.json (pass/pass_with_warnings/fail)  │
└─────────────────────────────────────────────────────────────────────┘
```

### Relationship to Existing Systems

```
SpecFactory                    DataFactory                 Estimation Engine
(generates specs)              (populates database)        (queries database)
                                                          
spec.json          ──────►    spec_families               ──────► Plan assembly
materials.json     ──────►    material_systems             ──────► Material calc
sop_modules.json   ──────►    sop_modules / sop_tasks      ──────► Task sequencing
production.json    ──────►    task_production_rates         ──────► Labor calc
qa_report.json     ──────►    spec_qa_reports               ──────► Quality gates
                              spec_artifacts_raw            ──────► Re-import safety
```

---

## 4. Deliverables Breakdown

This section describes every artifact that must be created, in dependency order. Each subsection is self-contained enough to be executed in a separate session.

---

### Phase 1: Foundation Documents

These establish the contracts and architecture before any code or agent prompts are written.

#### 1A. DataFactory_Architecture.md

**Location:** `docs/System/DataFactory_Architecture.md`  
**Purpose:** The system doctrine document for DataFactory, equivalent to PaintFactor_OS.md for the overall system.  
**Contains:**
- DataFactory's role in the PaintFactor architecture (Layer 2.5 — between Spec Domain and Engine)
- Design principles (universal, deterministic, auditable)
- Agent responsibilities and ownership boundaries
- Pipeline sequence and gates
- Relationship to SpecFactory, PaintScope, and Estimation Engine
- Import lifecycle: queued → importing → validating → imported → failed
- Re-import and version upgrade procedures
- Error handling doctrine (transaction rollback on any failure)

**Depends on:** PaintFactor_OS.md, Engine_State_Coordination_Architecture.md  
**Referenced by:** All DataFactory agent prompts, import scripts

#### 1B. SQLite_Schema_Contract.md

**Location:** `docs/System/SQLite_Schema_Contract.md`  
**Purpose:** The evolved, SQLite-specific version of the existing Spec → Database Mapping Guide. This becomes the Schema Engineer's primary doctrine.  
**Contains:**
- Complete table definitions adapted for SQLite (TEXT instead of jsonb, INTEGER PRIMARY KEY AUTOINCREMENT instead of bigserial, etc.)
- SQLite-specific decisions:
  - JSON storage strategy (TEXT columns with json_extract() for querying)
  - Date/time handling (TEXT in ISO 8601 format)
  - Boolean handling (INTEGER 0/1)
  - No native enum type — CHECK constraints or application-level validation
- Column-by-column mapping from each JSON artifact path to table.column
- Index strategy (which columns need indexes for Estimation Engine query patterns)
- Constraint definitions (NOT NULL, UNIQUE, CHECK, FK)
- The `spec_artifacts_raw` table definition
- Explicit mapping of every JSON path from each artifact type to its destination table and column
- SQLite JSON function usage patterns (json_extract, json_each, json_array_length)

**Depends on:** Spec → Database Mapping Guide, JSON schemas in specs/_schemas/  
**Referenced by:** Schema Engineer agent, Spec Importer agent, DB Validator agent

#### 1C. Import_Registry.md

**Location:** `database/imports/_import_registry.md`  
**Purpose:** Tracks which spec families have been imported, at what version, and their validation status. Analogous to `specs/_backlog/_catalog.md` for SpecFactory.  
**Contains:**
- Table format tracking: SF_ID, version, import_date, import_status, validation_status, notes
- Status definitions: queued, importing, imported, failed, outdated (newer spec version exists)
- Rules for re-import (version upgrade, schema migration, manual re-import)
- Relationship to spec backlog catalog statuses

**Depends on:** Spec backlog catalog (`specs/_backlog/_catalog.md`)  
**Referenced by:** Import Orchestrator agent

---

### Phase 2: Schema Definition

The actual SQL that creates the database structure.

#### 2A. create_tables.sql

**Location:** `database/schema/create_tables.sql`  
**Purpose:** The complete CREATE TABLE SQL for the PaintFactor SQLite database.  
**Contains:**
- All tables from the Spec → Database Mapping Guide, adapted for SQLite:
  - **Spec structure:** spec_families, spec_configuration_dimensions, spec_paintable_item_types, spec_variants, spec_variant_item_inclusions
  - **Materials:** material_systems, material_coverage_profiles, material_consumable_models, material_compatibility_rules
  - **SOP:** sop_modules, sop_tasks
  - **Production:** task_production_rates, factor_modifiers, factor_task_applicability, quality_effects
  - **QA/Governance:** spec_qa_reports, spec_qa_issues, spec_change_log
  - **Raw storage:** spec_artifacts_raw
  - **Import tracking:** import_log (database-side record of imports)
- Additional tables identified during implementation:
  - **Scope boundaries:** spec_scope_includes, spec_scope_excludes (from spec.json → scope_boundaries)
  - **Adjacency:** spec_adjacency_declarations (from spec.json → adjacency_declarations)
  - **Protection zones:** spec_protection_zones (from spec.json → protection_zones)
  - **State declarations:** spec_state_declarations (from spec.json → substrate_state_system)
  - **PaintScope inputs:** spec_required_inputs (from spec.json → required_paintscope_inputs)
- Foreign key definitions with ON DELETE/ON UPDATE behavior
- CHECK constraints for enum-like columns
- Indexes for Estimation Engine query patterns
- `PRAGMA foreign_keys = ON;` at top (SQLite doesn't enforce FKs by default)

**Depends on:** SQLite_Schema_Contract.md  
**Referenced by:** Schema Engineer agent, Spec Importer agent

#### 2B. seed_enums.sql (optional but recommended)

**Location:** `database/schema/seed_enums.sql`  
**Purpose:** Pre-populate reference/lookup tables with values from controlled_enums.json.  
**Contains:**
- Quality tier definitions (QT2-QT6)
- Valid status values
- Unit of measure values
- Phase sequence values
- Domain values (interior/exterior/specialty)
- Any other controlled vocabulary that should exist in the database before spec import

**Depends on:** specs/_registry/controlled_enums.json  
**Referenced by:** Schema Engineer agent

---

### Phase 3: Agent Prompts

Each agent prompt follows the established DevOS pattern: System Context, Required Reading, What You Own, What You Don't Own, Workflow, Deliverables.

#### 3A. datafactory-orchestrator.md

**Location:** `agents/datafactory-orchestrator.md`  
**Role:** Import Coordinator — the DataFactory equivalent of SpecFactory Orchestrator  
**What it owns:**
- Import sequencing and prioritization
- Reading import registry to determine what needs importing
- Reading spec backlog catalog to identify importable specs
- Prerequisite validation (is the spec status ≥ generated? Is the schema current?)
- Delegating to Schema Engineer, Spec Importer, DB Validator in correct order
- Updating import registry after each import attempt
- Re-import decisions (version upgrade, forced re-import)

**What it does NOT own:**
- Schema design (Schema Engineer)
- Import logic (Spec Importer)
- Validation logic (DB Validator)

**Required Reading:**
- docs/System/DataFactory_Architecture.md
- docs/System/PaintFactor_OS.md
- database/imports/_import_registry.md
- specs/_backlog/_catalog.md

**Trigger patterns (how human invokes it):**
- "Import SF_TRIM_NC_PAINT_v1" → import specific spec family
- "Import next spec" → check registry, find first unimported generated spec
- "Import all" → batch import all generated specs not yet imported
- "Re-import SF_DRYWALL_WALL_NC_FINISH" → force re-import (delete + reimport)
- "What's the import status?" → summarize registry
- "Upgrade schema" → delegate schema migration to Schema Engineer

**Pipeline sequence:**
1. Determine target spec family/families
2. For each spec family:
   a. Check prerequisites (spec exists, status ≥ generated, version check)
   b. Check if schema migration needed (Schema Engineer)
   c. Execute import (Spec Importer)
   d. Execute validation (DB Validator)
   e. Update import registry with result
3. Report summary to human

#### 3B. schema-engineer.md (EVOLVE EXISTING)

**Location:** `agents/schema-engineer.md` (already exists — needs significant update)  
**Current state:** Generic Postgres/Supabase prompt with minimal guidance  
**Evolved role:** SQLite schema authority for PaintFactor

**Changes needed:**
- Update from Postgres/Supabase to SQLite
- Add Required Reading: SQLite_Schema_Contract.md, Spec → Database Mapping Guide
- Add ownership of `database/schema/` directory
- Add migration workflow:
  1. Detect schema changes needed (new tables, altered columns, new indexes)
  2. Generate migration SQL with version numbering
  3. Apply migrations to existing database without data loss
  4. Update SQLite_Schema_Contract.md if structural changes are made
- Add SQLite-specific guidance:
  - `PRAGMA foreign_keys = ON;`
  - JSON handling via json_extract()
  - No ALTER TABLE DROP COLUMN in older SQLite — workarounds
  - WAL mode recommendation for development
- Define deliverables: create_tables.sql, migration scripts, schema documentation updates

#### 3C. spec-importer.md

**Location:** `agents/spec-importer.md`  
**Role:** The workhorse agent — reads spec artifacts, generates and executes INSERT statements  
**What it owns:**
- Reading spec family artifact files (spec.json, materials.json, sop_modules.json, production.json, qa_report.json)
- JSON → relational decomposition per the SQLite Schema Contract
- Transaction management (all-or-nothing per spec family)
- Raw JSON storage in spec_artifacts_raw
- Import report generation

**What it does NOT own:**
- Schema creation or modification (Schema Engineer)
- Validation (DB Validator)
- Import sequencing (Import Orchestrator)

**Required Reading:**
- docs/System/SQLite_Schema_Contract.md
- docs/System/DataFactory_Architecture.md
- specs/_schemas/ (all JSON schemas — to understand artifact structure)
- specs/_registry/structural_keys.json (to understand key patterns)

**Critical workflow rules:**
- ALWAYS store raw JSON first (spec_artifacts_raw), then normalize
- ALWAYS wrap per-family import in a single transaction
- NEVER modify spec artifacts — read-only consumption
- NEVER skip a required artifact file — if any of the 5 files is missing, abort
- Handle JSON arrays → junction table rows (e.g., applies_to_tasks[] → factor_task_applicability)
- Handle JSON objects stored as TEXT (e.g., applies_when, coat_sequence)
- Handle ID references across files (task_id must match between sop_modules.json and production.json)
- Generate import_report with: rows inserted per table, warnings, timing

**Decomposition mapping (the core logic):**
This agent must implement the column-by-column mapping defined in SQLite_Schema_Contract.md. High-level summary:

| Source File | Target Tables |
|-------------|---------------|
| spec.json → spec_family | spec_families |
| spec.json → configuration_dimensions[] | spec_configuration_dimensions |
| spec.json → paintable_items[] | spec_paintable_item_types |
| spec.json → variants[] | spec_variants, spec_variant_item_inclusions |
| spec.json → scope_boundaries | spec_scope_includes, spec_scope_excludes |
| spec.json → adjacency_declarations | spec_adjacency_declarations |
| spec.json → protection_zones | spec_protection_zones |
| spec.json → substrate_state_system | spec_state_declarations |
| spec.json → required_paintscope_inputs | spec_required_inputs |
| spec.json → change_log[] | spec_change_log |
| materials.json → material_systems[] | material_systems |
| materials.json → coverage_profiles[] | material_coverage_profiles |
| materials.json → consumables[] | material_consumable_models |
| materials.json → compatibility_rules[] | material_compatibility_rules |
| sop_modules.json → sop_modules[] | sop_modules |
| sop_modules.json → sop_modules[].tasks[] | sop_tasks |
| production.json → task_production_rates[] | task_production_rates |
| production.json → factor_modifiers[] | factor_modifiers, factor_task_applicability |
| production.json → quality_tier_effects[] | quality_effects |
| qa_report.json | spec_qa_reports, spec_qa_issues |

#### 3D. db-validator.md

**Location:** `agents/db-validator.md`  
**Role:** Post-import integrity checker — the DataFactory equivalent of the System Critic  
**What it owns:**
- Referential integrity validation (all FKs resolve)
- Cross-file threading checks (IDs consistent between artifact-sourced tables)
- Completeness checks (no orphan records, no missing required relationships)
- Enum/vocabulary validation against controlled_enums.json
- Duplicate detection within and across spec families
- Validation report generation

**What it does NOT own:**
- Domain correctness of spec content (that's the SpecFactory Critic's job)
- Schema design (Schema Engineer)
- Import execution (Spec Importer)

**Required Reading:**
- docs/System/DataFactory_Architecture.md
- docs/System/SQLite_Schema_Contract.md
- specs/_registry/controlled_enums.json (for enum validation)
- specs/_registry/id_registry.json (for ID pattern validation)

**Validation categories:**

| Category | What It Checks | Severity if Failed |
|----------|---------------|-------------------|
| FK Integrity | Every FK value exists in the referenced table | CRITICAL — blocks import approval |
| Cross-file Threading | task_id in production rates matches task_id in sop_tasks | CRITICAL |
| Completeness | Every spec family has all 5 raw artifact types stored | CRITICAL |
| Completeness | Every variant has ≥1 associated material system | MAJOR |
| Completeness | Every task has ≥1 production rate entry | MAJOR |
| Enum Values | quality_tier, status, unit_of_measure match controlled vocabulary | MAJOR |
| ID Patterns | All IDs follow prefix conventions (SF_, MOD_, TSK_, SYS_, etc.) | MINOR |
| Duplicates | No duplicate primary keys within a spec family | CRITICAL |
| Duplicates | No ID collisions across spec families for globally-unique IDs | MAJOR |
| Raw Integrity | Raw JSON in spec_artifacts_raw is parseable and version-matches | MAJOR |

**Deliverable:** `validation_report.json` following a structure similar to qa_report.json:
```json
{
  "spec_family_id": "SF_TRIM_NC_PAINT",
  "version": "0.1.0",
  "validated_at": "2026-02-09T...",
  "status": "pass | pass_with_warnings | fail",
  "summary": "...",
  "checks": [
    {
      "check_id": "DBV-001",
      "category": "fk_integrity",
      "severity": "critical",
      "status": "pass",
      "details": "..."
    }
  ]
}
```

---

### Phase 4: Scripts and Tooling

#### 4A. import_spec.py

**Location:** `database/scripts/import_spec.py`  
**Purpose:** The executable Python script that the Spec Importer agent produces/maintains. Reads a spec family's artifacts and executes INSERT statements.  
**Key behaviors:**
- Accepts spec family path as argument: `python import_spec.py specs/SF_TRIM_NC_PAINT_v1/`
- Connects to `database/paintfactor.db`
- Runs within a single transaction per spec family
- Stores raw JSON first, then normalizes
- Outputs import summary to stdout and optionally to `database/imports/<SF_ID>/import_report.json`
- Returns exit code 0 on success, 1 on failure

#### 4B. validate_db.py

**Location:** `database/scripts/validate_db.py`  
**Purpose:** The executable Python script that the DB Validator agent produces/maintains. Runs integrity checks on the database.  
**Key behaviors:**
- Accepts optional spec family filter: `python validate_db.py` (full DB) or `python validate_db.py SF_TRIM_NC_PAINT` (single family)
- Connects to `database/paintfactor.db`
- Runs all validation categories
- Outputs validation_report.json to `database/imports/<SF_ID>/validation_report.json`
- Returns exit code 0 on pass, 1 on fail, 2 on pass_with_warnings

#### 4C. query_examples.sql

**Location:** `database/scripts/query_examples.sql`  
**Purpose:** Reference queries that demonstrate the patterns the Estimation Engine will need. Used to validate that the schema supports required query patterns.  
**Contains:**
- "Given spec family + quality tier + application method, what's the material system?"
- "Given spec family + quality tier, what's the ordered task sequence?"
- "Given a task, what are the production rates and applicable factor modifiers?"
- "What protection zones does this spec family declare?"
- "What adjacency declarations exist for this spec family?"
- "What's the full bill of materials for a spec variant?"

These queries serve as acceptance tests for the schema — if they work cleanly, the schema supports the Estimation Engine's needs.

---

### Phase 5: Integration and Governance

#### 5A. Dev Orchestrator Update

**Location:** `agents/Dev Orchestrator (PaintFactor DevOS).md`  
**Changes needed:**
- Add DataFactory to the DevOS routing logic (alongside SpecFactory)
- Add trigger patterns: "import spec", "database status", "schema migration"
- Add delegation rules: DataFactory work → Import Orchestrator (never run DataFactory agents directly from Dev Orchestrator, same pattern as SpecFactory)
- Update "What you do NOT own" to include database import (Import Orchestrator owns)

#### 5B. DevOS Router Skill Update

**Location:** `skills/pf-devos-router.md`  
**Changes needed:**
- Add Category C: DataFactory intent (importing specs to database, schema work, validation)
- Add trigger examples: "import", "database", "schema", "validate DB", "import status"
- Route to: datafactory-orchestrator (lead) + DataFactory agents

#### 5C. SpecFactory → DataFactory Handoff

**Location:** Document in DataFactory_Architecture.md  
**Purpose:** Define when and how specs become eligible for database import.  
**Rules:**
- A spec must have status ≥ `generated` in the backlog catalog to be importable
- Critic must have passed (qa_report.json status: pass or pass_with_warnings)
- Human approval is recommended but not required for draft imports (development use)
- Human approval IS required before an imported spec is marked `approved` in the import registry
- Schema validation (validate_specs.py) must pass before database import

---

## 5. Directory Structure

```
Claude/
├── agents/
│   ├── datafactory-orchestrator.md     ← NEW
│   ├── spec-importer.md                ← NEW
│   ├── db-validator.md                 ← NEW
│   ├── schema-engineer.md              ← EVOLVE (Postgres → SQLite)
│   └── ... (existing agents unchanged)
│
├── database/                            ← NEW top-level directory
│   ├── README.md                        ← Overview, setup instructions
│   ├── schema/
│   │   ├── create_tables.sql            ← Complete table definitions
│   │   ├── seed_enums.sql               ← Reference data population
│   │   └── migrations/                  ← Versioned schema changes
│   │       └── 001_initial.sql
│   ├── scripts/
│   │   ├── import_spec.py               ← Import execution script
│   │   ├── validate_db.py               ← Validation execution script
│   │   └── query_examples.sql           ← Reference queries for Engine
│   ├── imports/
│   │   ├── _import_registry.md          ← Master import tracking
│   │   └── SF_TRIM_NC_PAINT/            ← Per-family import artifacts
│   │       ├── import_report.json
│   │       └── validation_report.json
│   └── paintfactor.db                   ← The SQLite database file
│
├── docs/
│   └── System/
│       ├── DataFactory_Architecture.md  ← NEW system doctrine
│       └── SQLite_Schema_Contract.md    ← NEW schema contract
│
└── specs/                               ← EXISTING (consumed by DataFactory)
```

---

## 6. Execution Order

This is the recommended build sequence. Each phase is a standalone work session.

| Phase | Deliverable | Depends On | Estimated Effort |
|-------|------------|------------|-----------------|
| 1A | DataFactory_Architecture.md | PaintFactor_OS.md (exists) | 1 session |
| 1B | SQLite_Schema_Contract.md | Mapping Guide (exists), JSON schemas (exist) | 1-2 sessions |
| 1C | Import_Registry.md | Backlog catalog (exists) | 30 min |
| 2A | create_tables.sql | SQLite_Schema_Contract.md | 1 session |
| 2B | seed_enums.sql | controlled_enums.json (exists) | 30 min |
| 3A | datafactory-orchestrator.md | DataFactory_Architecture.md | 1 session |
| 3B | schema-engineer.md (evolve) | SQLite_Schema_Contract.md | 1 session |
| 3C | spec-importer.md | SQLite_Schema_Contract.md, structural_keys.json | 1-2 sessions |
| 3D | db-validator.md | SQLite_Schema_Contract.md, controlled_enums.json | 1 session |
| 4A | import_spec.py | spec-importer.md, create_tables.sql | 1-2 sessions |
| 4B | validate_db.py | db-validator.md | 1 session |
| 4C | query_examples.sql | create_tables.sql | 30 min |
| 5A | Dev Orchestrator update | datafactory-orchestrator.md | 30 min |
| 5B | DevOS Router update | DataFactory_Architecture.md | 15 min |
| 5C | Handoff documentation | All above | included in 1A |

**Recommended first session:** 1A + 1B + 1C (establish all contracts before any code)  
**Recommended pilot:** After Phase 2, manually import one spec family by hand to validate the schema works before writing agent prompts.

---

## 7. Pilot Spec Family

**Recommended pilot:** `SF_DRYWALL_WALL_NC_PRIME`

**Why this one:**
- It's a completed, generated spec (status: generated in catalog)
- Walls are the simplest geometry (SF-based, straightforward protection zones)
- Prime-only is simpler than finish (fewer material systems, fewer quality tier effects)
- It exercises all 5 artifact files without unusual complexity
- Validates the basic pipeline before attempting complex specs like doors or stairs

**Pilot workflow:**
1. Run create_tables.sql to initialize empty database
2. Run seed_enums.sql to populate reference data
3. Run import_spec.py against SF_DRYWALL_WALL_NC_PRIME_v1/
4. Run validate_db.py to check integrity
5. Run query_examples.sql to verify Engine query patterns work
6. Review results, iterate on schema if needed

**Second import (validation of universality):** `SF_DOOR_FRAME_NC_FINISH` — structurally different (EA-based, fine finish, different protection zones) to confirm the schema generalizes.

---

## 8. Open Questions

These should be resolved during Phase 1 (foundation documents):

1. **ID uniqueness scope:** Are task IDs (TSK_) unique globally or only within a spec family? This affects PK design. Currently they appear to be globally unique via context prefix, but this should be formalized.

2. **Version coexistence:** Can two versions of the same spec family coexist in the database, or does importing v2 replace v1? The import registry needs to define this. Recommendation: replace (with raw JSON preserved for rollback).

3. **Cross-spec family references:** Some specs reference sibling specs (e.g., prime spec references corresponding finish spec). How should these relationships be stored? Likely a `spec_relationships` table.

4. **Controlled enums in DB vs. application:** Should controlled_enums.json values be stored as a reference table in SQLite (enabling FK enforcement), or validated only at import time? Recommendation: store as reference tables (seed_enums.sql) for maximum integrity.

5. **Resolution.json handling:** Resolution.json is generated per-spec-family by the Registry Resolver and consumed by downstream SpecFactory agents. Should it be imported into the database? Recommendation: store in spec_artifacts_raw only (it's a development artifact, not a runtime artifact).

6. **Database location in .gitignore:** The .db file itself shouldn't be in Git (binary, large). The schema, scripts, and registry should be. Add `database/paintfactor.db` to .gitignore, keep everything else tracked.

---

## 9. Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Schema designed before all spec families are complete | May need migrations when new specs reveal missing tables/columns | Raw JSON storage + migration workflow. Phase 3 specs (architectural) are most likely to surface new requirements |
| Spec artifact structure evolves after schema is built | Schema-spec misalignment | SQLite_Schema_Contract.md is the single source of truth; Schema Engineer owns migrations |
| SQLite JSON querying is slower than native Postgres jsonb | Engine query performance | Index strategy in schema contract; most JSON fields are stored as TEXT and extracted at import time into proper columns |
| Agent prompts become stale as schema evolves | Import failures | Schema contract version tracked in agent prompts; agents check contract version before operating |
| Overengineering the schema before real Engine queries are known | Wasted effort on unused tables/indexes | query_examples.sql validates schema against actual Engine needs; start minimal, add indexes as needed |
