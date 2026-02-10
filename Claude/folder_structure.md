Based on the existing repo layout and what we just built:
Claude/
├── agents/
│   ├── datafactory-orchestrator.md    ← NEW
│   ├── spec-importer.md               ← NEW
│   ├── db-validator.md                ← NEW
│   ├── schema-engineer.md             ← REPLACE existing
│   ├── spec-researcher.md             (existing)
│   ├── materials-manager.md           (existing)
│   ├── sop-librarian.md               (existing)
│   ├── estimation-engineer.md         (existing)
│   ├── critic.md                      (existing)
│   └── ...
│
├── database/                           ← NEW top-level
│   ├── schema/
│   │   ├── create_tables.sql
│   │   ├── seed_enums.sql
│   │   └── migrations/                 (empty for now)
│   ├── scripts/
│   │   ├── import_spec.py
│   │   ├── validate_db.py
│   │   └── query_examples.sql
│   ├── imports/
│   │   ├── _import_registry.md
│   │   └── SF_DRYWALL_WALL_NC_PRIME/   (created on first import)
│   │       ├── import_report.json
│   │       └── validation_report.json
│   └── paintfactor.db                  ← .gitignore this
│
├── docs/
│   └── System/
│       ├── DataFactory_Architecture.md ← NEW
│       ├── SQLite_Schema_Contract.md   ← NEW
│       ├── PaintFactor_OS.md           (existing)
│       ├── Conventions.md              (existing)
│       └── ...
│
├── specs/                              (existing, unchanged)
│   ├── _schemas/
│   ├── _registry/
│   ├── _backlog/
│   ├── _templates/
│   ├── SF_DRYWALL_WALL_NC_PRIME_v1/
│   ├── SF_TRIM_NC_PAINT_v1/
│   └── ...
│
└── .gitignore                          ← add: database/paintfactor.db
The key decisions: database/ sits at the same level as agents/, docs/, and specs/ — it's a peer system, not nested under any of them. Doctrine docs go in docs/System/ where all system-level docs already live. Agent prompts go in agents/ alongside the existing SpecFactory agents. The imports/ subfolder grows organically as specs are imported, with per-family directories holding their reports.