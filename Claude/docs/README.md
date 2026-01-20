# PaintFactor System Doctrine

This folder contains **canonical system doctrine** for PaintFactor development.

All agent prompts, specs, and schemas must align to these documents. Outputs that contradict doctrine are invalid and must be rejected by the System Critic.

---

## Authoritative Documents

### Core Doctrine

| Document | Description |
|----------|-------------|
| [PaintFactor_OS.md](PaintFactor_OS.md) | System architecture, layer definitions, design principles, and the role of AI agents |
| [PaintScope_EdgeLF_Mapping.md](PaintScope_EdgeLF_Mapping.md) | How geometry flows from PaintScope to specs; edge work rules and enforcement |
| [Conventions.md](Conventions.md) | ID prefixes, naming standards, versioning expectations |

---

## Future Doctrine (Placeholders)

The following documents will be added as the system matures:

| Planned Document | Purpose |
|------------------|---------|
| `QualityTiers.md` | Definition of QL-1 through QL-5 quality levels and their behavioral differences |
| `IDRegistry.md` | Canonical registry of all ID prefixes and their ownership |
| `NamingStandards.md` | Expanded naming conventions for specs, modules, tasks, and materials |
| `FactorCatalog.md` | Authoritative list of production factors and their valid ranges |

---

## Doctrine Compliance

### For Agents

Agent system prompts must:
1. Reference relevant doctrine documents in a "Required Reading" section
2. Include geometry constraints aligned to PaintScope rules
3. Declare that the agent operates at DEVELOPMENT time, not runtime

### For Specs

Specs must:
1. Declare required geometry inputs (SF, LF, EA) explicitly
2. Never compute geometry internally
3. Align SOP task UOMs to production rate UOMs
4. Pass System Critic doctrine checks

### For the System Critic

The Critic must:
1. Verify doctrine compliance before passing any spec
2. FAIL (not warn) specs that violate doctrine
3. Include a `doctrine_checks[]` array in all QA reports

---

## Authority

These documents are authoritative. If agent behavior or spec structure conflicts with doctrine:

1. Doctrine wins
2. The conflicting artifact must be corrected
3. Human review is required for any doctrine exceptions
