# Dev Orchestrator Patch: Spec Brief System

**Purpose:** Add this section to the Dev Orchestrator prompt to enable brief-driven spec generation.

---

## Addition to Dev Orchestrator Prompt

Add after the "Default Workflow" section:

```markdown
---

## Spec Brief System

When SpecFactory work is requested, check for a pre-authored brief FIRST:

### Lookup Order
1. If human specifies a spec family ID (e.g., "Generate SF_DOOR_SLAB_INT_NC"):
   → Look for `Claude/specs/_backlog/SF_DOOR_SLAB_INT_NC/brief.md`
2. If human says "generate next spec":
   → Read `Claude/specs/_backlog/_catalog.md`
   → Find first entry with status: `queued` and brief: `✅ authored`
   → Read that brief
3. If human says "what's in the backlog?":
   → Read and summarize `Claude/specs/_backlog/_catalog.md`

### If Brief Exists
- Read the brief COMPLETELY before starting the pipeline
- The brief is AUTHORITATIVE for scope, config dimensions, items, PaintScope keys, and constraints
- Pass brief content to each SpecFactory agent as context
- Do NOT re-derive scope from scratch — the brief already defines it
- After generation, copy brief.md into the spec output folder as provenance

### If Brief Does Not Exist
- Tell the human: "No brief found for SF_X. Want me to draft one for review?"
- If yes: draft a brief using the template at `Claude/specs/_backlog/_brief_template.md`
- Present draft for human approval BEFORE running the pipeline
- Never run the pipeline without an approved brief

### SpecFactory Agent Context
When dispatching to each pipeline agent, include:
- The full brief content
- Domain doctrine documents (listed in brief Section 8a)
- All standing references (listed in brief Section 8b) — these are always loaded regardless of spec
- Existing sibling specs (listed in brief Section 7) for structural consistency

### After Generation
1. Copy `brief.md` into `Claude/specs/<SF_ID>_v1/brief.md`
2. Update `Claude/specs/_backlog/_catalog.md` status to `generated`
3. Optionally remove the backlog folder (or leave for audit trail)
```

---

## Addition to SpecFactory Orchestrator Prompt

Add to the "Mandatory SpecFactory pipeline" section:

```markdown
### Brief-Driven Generation

If a `brief.md` is provided as input:
- Sections 2-3 (Scope, Config) → govern spec.json structure
- Section 4 (Paintable Items) → govern paintable_items in spec.json
- Section 5 (PaintScope Inputs) → govern required_paintscope_inputs
- Section 6 (Adjacency) → govern adjacency_declarations
- Section 8a (Domain Doctrines) → determine which doctrine docs each agent must read
- Section 8b (Standing References) → always loaded for every spec (PaintScope catalog, schemas, vocabularies)
- Section 9 (Notes) → pass to all agents as constraints
- Section 10 (Acceptance Criteria) → pass to Critic as additional validation gates

The brief does NOT replace agent expertise — agents still research, validate, and 
fill in details. The brief prevents scope drift and re-invention.
```

---

## Addition to Critic Prompt

Add to validation rules:

```markdown
### Brief Compliance

If a brief.md exists in the spec folder:
- Verify all acceptance criteria from brief Section 10
- Verify scope boundaries match brief Section 2 (no scope creep or omission)
- Verify all config dimensions from brief Section 3 are present in spec.json
- Verify all paintable items from brief Section 4 are present
- Verify all PaintScope keys from brief Section 5 are declared
- Flag any deviation from brief as a WARN (not ERROR — agents may have good reason)
```
