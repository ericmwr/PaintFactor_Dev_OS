# PaintFactor DevOS + SpecFactory

This repository contains the development infrastructure for PaintFactor — a data-first estimating and production intelligence system for professional painting contractors.

---

## Critical Understanding

**AI agents in this repository operate at DEVELOPMENT time only.**

They:
- Design schemas, specs, and SOPs
- Research standards and best practices
- Validate outputs against doctrine
- Assist human review

They do NOT:
- Estimate real jobs
- Make pricing decisions
- Run production logic at runtime

The runtime Estimation Engine consumes the artifacts produced here. Agents never replace it.

---

## Canonical Doctrine

All development must align to these authoritative documents:

| Document | Purpose |
|----------|---------|
| [docs/PaintFactor_OS.md](docs/PaintFactor_OS.md) | System architecture and operating doctrine |
| [docs/PaintScope_EdgeLF_Mapping.md](docs/PaintScope_EdgeLF_Mapping.md) | Geometry sourcing rules for edge work |
| [docs/Conventions.md](docs/Conventions.md) | ID prefixes, naming, versioning standards |

Agent prompts must reference and comply with doctrine. Outputs that violate doctrine are invalid.

---

## Folder Structure

```
Claude/
├── agents/          # AI agent system prompts
├── docs/            # Canonical doctrine and system documentation
├── skills/          # Reusable workflow skills for agents
├── specs/           # Spec family artifacts (JSON + changelogs)
│   ├── _schemas/    # JSON schemas for validation
│   └── _templates/  # Starter templates for new specs
└── scripts/         # Validation and utility scripts
```

---

## Spec Artifacts

Each spec family folder (e.g., `specs/SF_DRYWALL_WALL_NC_FINISH/`) contains:

| File | Description |
|------|-------------|
| `spec.json` | Core spec definition |
| `research.json` | Domain research and findings |
| `materials.json` | Material systems and coverage |
| `sop_modules.json` | Modular SOP tasks and rounds |
| `production.json` | Production rates and factors |
| `qa_report.json` | Critic review output |
| `CHANGELOG.md` | Version history |

All artifacts must validate against schemas in `specs/_schemas/`.

---

## Pilot Run Flow

A typical spec development workflow:

```
1. Dev Orchestrator         → Sets goal, delegates to SpecFactory
2. SpecFactory Orchestrator → Coordinates specialist agents
3. Spec Researcher          → Produces research.json
4. SOP Librarian            → Produces sop_modules.json
5. Materials Manager        → Produces materials.json
6. Estimation Engineer      → Produces production.json
7. System Critic            → Produces qa_report.json (pass/fail gate)
```

The Critic enforces doctrine. Specs that violate doctrine are failed, not warned.

---

## Validation

Before any spec is approved:

1. Run schema validation:
   ```bash
   python scripts/validate_specs.py
   ```

2. Review `qa_report.json` for Critic status

3. Human review required for all production rates and material systems

---

## Rules

1. **PaintScope is the sole source of geometry** — specs consume SF/LF/EA, they never compute it
2. **Data first, AI second** — all intelligence collapses into structured data
3. **AI proposes, humans approve, the system enforces**
4. **Modular everything** — SOPs are composable, specs are not monoliths
5. **No silent assumptions** — if geometry is required and missing, fail loudly

---

## Contributing

1. Read the doctrine documents first
2. Follow ID conventions in `docs/Conventions.md`
3. Use templates in `specs/_templates/`
4. All changes require Critic review before approval
