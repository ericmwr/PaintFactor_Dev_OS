# Doctrine Authority Addition

**Task Type:** Documentation Update
**Status:** Pending
**Created:** 2026-01-31
**Priority:** High (Establishes governance for all doctrine)

---

## Objective

Add a Doctrine Authority Hierarchy section to PaintFactor_OS.md that establishes the precedence order for all system documentation.

---

## Location

**File:** `Claude/docs/PaintFactor_OS.md`

**Insertion Point:** After the system overview section, before any domain-specific sections. This establishes authority early in the document.

---

## Content to Add

```markdown
## Doctrine Authority Hierarchy

PaintFactor documentation follows a strict authority hierarchy. When documents conflict, higher-level documents take precedence.

### Authority Levels

| Level | Document Type | Description | Examples |
|-------|--------------|-------------|----------|
| 1 (Highest) | Core System Doctrine | Foundational architecture and principles | PaintFactor_OS.md, Quality_Tiers_and_Surface_Condition.md |
| 2 | Domain Doctrine | Domain-specific rules and requirements | Interior_Protection_Doctrine.md, Fine_Finish_Doctrine.md, Estimation_Modifiers_Doctrine.md, Spec_Completeness_Doctrine.md |
| 3 | Reference Vocabularies | Controlled vocabularies and registries | Protection_Zones_Reference.md, Surface_Vocabulary_Reference.md, Site_Condition_Vocabulary_Reference.md, Modifier_Registry.md |
| 4 | Agent Prompts | SpecFactory agent instructions | Spec_Researcher.md, SOP_Librarian.md, Estimation_Engineer.md, Critic.md, Materials_Manager.md |
| 5 (Lowest) | Spec Artifacts | Generated specification files | spec.json, sop_modules.json, production.json, materials.json |

### Conflict Resolution Rules

1. **Higher Level Wins:** When a lower-level document contradicts a higher-level document, the higher-level document's requirements apply.

2. **Escalation Required:** If a legitimate conflict is discovered that cannot be resolved by hierarchy:
   - Document the conflict in a GitHub issue
   - Flag for human review
   - Do not proceed with spec generation until resolved

3. **Reference, Don't Redefine:** Lower-level documents should reference higher-level definitions rather than redefining them. For example:
   - Agent prompts reference doctrine, not restate it
   - Specs reference vocabulary terms, not define new ones

4. **Version Control:** When doctrine is updated, all dependent documents must be reviewed for compliance.

### Authority Markers

Documents should include an authority marker in their header:

```
**Doctrine Level:** [1-5]
**Authority:** [Document name this reports to]
```

Example for a Level 2 document:
```
**Doctrine Level:** 2
**Authority:** PaintFactor_OS.md
```
```

---

## Acceptance Criteria

- [ ] Section added to PaintFactor_OS.md at appropriate location
- [ ] All five levels clearly defined with examples
- [ ] Conflict resolution rules documented
- [ ] Authority marker format established

---

## Notes

- After this is added, all existing doctrine documents should be audited for authority markers
- New documents must include authority markers going forward
- This section itself is Level 1 (Core System Doctrine)
