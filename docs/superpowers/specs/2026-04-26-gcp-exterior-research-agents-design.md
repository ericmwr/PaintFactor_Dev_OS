# Google Cloud Multi-Agent System: Exterior Task Research Pipeline

**Date:** 2026-04-26
**Status:** Design approved, awaiting user review before implementation plan

## Purpose

Stand up a multi-agent system on **Google Cloud Vertex AI Agent Builder** that researches and produces exterior painting work in the new task-library / modules / scenarios architecture. This replaces the old PaintFactor SpecFactory pipeline (which lives in `Claude/agents/`) for exterior-only work, with a sharper focus on **labor decomposition**, not paint chemistry, regulations, or environmental rules.

The system is also a deliberate test of Google Cloud Agent Builder as a platform.

## Why this is different from the old pipeline

The old pipeline (Researcher → Resolver → Materials → SOP → Estimation → Critic → Assembly) put heavy emphasis on regulations, environmental conditions, and paint product specifications. The new system intentionally drops that emphasis and focuses on:

- What **discrete work units** exist for exterior substrates
- **When** each unit applies (substrate state, condition triggers, scope)
- **How** they sequence within and across phases
- Producing tasks that are **trackable for time** in the field — small enough to measure, large enough not to drown trackers in tracking overhead

Production rates are explicitly **not** the goal. The Serene database is a reference for grounding ("this kind of work is minutes, not hours"), not the source of truth. Real rates come from in-app field tracking later.

## Initial scope: Pilot

Pilot the pipeline on **1-2 substrates** end-to-end before scaling to all ~22 exterior substrates. The pilot proves the pipeline, lets prompts get tuned cheaply, and surfaces design issues early. Recommended pilot substrates: wood siding RP and fiber cement RP (different enough to stress the pipeline, similar enough to be comparable).

## Architecture: Orchestrator + specialists (hierarchical)

```
Orchestrator (state, dispatch, HITL)
  ├─ Researcher          (Stage 1)
  ├─ Task Drafter        (Stage 2)
  ├─ Module Composer     (Stage 3)
  ├─ Scenario Builder    (Stage 4)
  └─ Critic              (called between every stage with stage-specific rubric)
        │
        └─ HITL gate after each stage's Critic pass
PR Opener (tool, terminal)
```

**Why this shape:** mirrors how Agent Builder's playbook pattern actually works (hierarchical dispatch), reuses one Critic across stages with prompt-swapping (fewer prompts to tune), and keeps the orchestrator dumb (no domain reasoning — pure routing and state).

## Knowledge base composition

### Mandatory (always available)
- **PaintFactor schema + conventions** — `id_registry.json`, `controlled_enums.json`, `structural_keys.json`, `agent_rules.json`, naming conventions
- **Existing interior task library** — all interior `MOD_*.json` plus task definitions, so exterior decomposition can mirror interior style
- **Substrate state + condition taxonomy** — controlled enums for `substrate_state`, condition triggers, phase values, plus the dimensional model (paintable item → category → substrate → state → condition)
- **Module architecture docs** — how scenarios reference modules reference tasks; orchestrator expectations

### Retrieval-only (RAG when needed)
- **Existing exterior specs** — the 22 SF_*_EXT_* specs as "what's already been considered" reference
- **Serene database extract** — rate references for grounding only
- **Domain notes** — Admin Notes, devos markdown, exterior philosophy/sequencing writeups

### Access pattern in Google Cloud
- **Vertex AI Search data store** for the corpus — agents query semantically
- **`read_repo_file` tool** (Cloud Run/Function backed by GitHub REST API + PAT) for targeted file reads when an agent needs a specific MOD ID
- **`open_pr` tool** for write-back of generated artifacts

## Agent roster

### 1. Orchestrator
**Role:** Pipeline conductor. No domain reasoning — pure routing, state persistence, HITL gate enforcement.

**Responsibilities:**
- Receive pilot input (`{substrate_ids, run_id}`)
- Dispatch stages in order: Researcher → Critic → [HITL] → Task Drafter → Critic → [HITL] → Module Composer → Critic → [HITL] → Scenario Builder → Critic → [HITL] → PR Opener
- Persist each stage's output to GCS (`runs/<run_id>/0N_<stage>.json`)
- Surface contested calls from the Critic to the human; collect responses; pass corrections back to the upstream specialist
- Halt on `blocking` Critic verdicts

**Inputs:** Pilot config, stage outputs from GCS, Critic verdicts.
**Outputs:** Final PR + run audit log.

**Instructions:** "You are a deterministic dispatcher. You do not reason about painting. You route artifacts between agents in fixed order. When a Critic returns a `blocking` verdict, halt. When a Critic returns `contested_calls`, present them to the user and resume only after response."

### 2. Researcher
**Role:** Decompose substrate work into discrete labor work units.

**Responsibilities:**
- For each pilot substrate, identify all work units across all states and conditions (no rates)
- For each work unit: name, phase, what triggers it (state/condition), what makes it different from a similar unit on another substrate, sequencing dependencies
- Reference the interior task library to mirror decomposition style
- Flag uncertainty as `contested_calls` rather than guessing

**Inputs:** Substrate IDs, KB (interior modules, schema, dimensional model, exterior devos notes).
**Output:** `research.json` — structured array of work units with metadata. Not task IDs yet.

**Instructions:** "You research labor work units, not paint chemistry, regulations, or environmental rules. You do not produce production rates — only confirm a unit is small enough to time in the field and large enough to be worth tracking. Mirror the decomposition pattern of interior modules. When a work unit could be split or merged, flag it as a contested call."

### 3. Task Drafter
**Role:** Convert research units into schema-conformant `TSK_*` library entries.

**Responsibilities:**
- One research unit → one or more TSK entries
- Apply naming conventions (TSK_EXT_*, phase prefixes, UOM uppercase)
- Assign phase, task_classification, condition triggers, substrate_state filters, item, UOM
- Reuse existing TSK IDs from the registry where work is genuinely identical

**Inputs:** `research.json`, id_registry, controlled_enums, structural_keys, agent_rules.
**Output:** `tasks.json` — array of TSK entries plus a delta to `id_registry`.

**Instructions:** "You translate research units into TSK entries. You never invent enum values, naming patterns, or schema fields — you only use what's in the registry. If a research unit doesn't fit existing schema, you flag it for the Critic rather than forcing it."

### 4. Module Composer
**Role:** Bundle tasks into modules with sequencing and conditional inclusion.

**Responsibilities:**
- Group tasks into MOD_* modules following interior patterns (one module ≈ one phase × one item-method combo)
- Define `applies_when` rules (substrate_state, condition, scope)
- Order tasks within each module
- Specify cross-module dependencies (prime modules block apply, etc.)

**Inputs:** `tasks.json`, interior MOD_* exemplars (RAG), module architecture docs.
**Output:** `modules.json` — array of MOD entries.

**Instructions:** "You bundle tasks into modules. You mirror interior module shape. You do not change task IDs. You flag a module as a contested call if its `applies_when` rule could go two ways. You explicitly note when an exterior module diverges in shape from its interior cousin and why."

### 5. Scenario Builder
**Role:** Compose modules into runnable scenarios for pilot combos.

**Responsibilities:**
- For each meaningful (substrate × state × condition × method × scope) combo in pilot, build a `SCN_*` listing modules to invoke
- Set scenario metadata, override hooks, scenario-level `applies_when`
- Avoid combinatorial explosion — produce only canonical pilot scenarios plus 1-2 boundary cases for the Critic

**Inputs:** `modules.json`, scenario architecture docs, dimensional model.
**Output:** `scenarios.json` — array of SCN entries.

**Instructions:** "You assemble modules into scenarios for the pilot substrates only. You do not generate every theoretically possible combination — you generate the canonical set plus boundary cases. You flag any scenario whose module list overlaps with another in confusing ways."

### 6. Critic (reused across stages)
**Role:** Stage-specific QA. Same agent, prompt swaps per stage.

**Responsibilities by stage:**
- **After Research:** coverage vs. interior pattern, missing work units, no rates leaked
- **After Tasks:** schema, naming, registry collisions, trackability sizing
- **After Modules:** sequencing, applies_when logic, cross-module deps, divergence-from-interior justification
- **After Scenarios:** module wiring, scenario uniqueness, missing boundary cases

**Output:** `critique.json` with three sections:
- `blocking` — schema/registry violations; Orchestrator must halt
- `contested_calls` — judgment calls surfaced to the human (HITL fuel)
- `notes` — non-blocking suggestions

**Instructions:** "You receive a stage output and a stage-specific rubric. You output exactly three lists: blocking, contested_calls, notes. You do not rewrite the artifact. You distinguish between hard violations and judgment calls — the human only sees contested_calls and the orchestrator only halts on blocking."

### PR Opener (tool, not agent)
**Role:** Push generated JSON files to a branch and open a PR for human merge.
**Implementation:** Cloud Function calling GitHub REST API with a PAT.

## Data flow

```
pilot config ──> Orchestrator
                     │
                     v
              Researcher ──> research.json (GCS)
                     │
                     v
                 Critic ──> critique_01.json
                     │
              [HITL Gate A]
                     │
                     v
              Task Drafter ──> tasks.json + id_registry delta
                     │
                     v
                 Critic ──> critique_02.json
                     │
              [HITL Gate B]
                     │
                     v
            Module Composer ──> modules.json
                     │
                     v
                 Critic ──> critique_03.json
                     │
              [HITL Gate C]
                     │
                     v
            Scenario Builder ──> scenarios.json
                     │
                     v
                 Critic ──> critique_04.json
                     │
              [HITL Gate D]
                     │
                     v
              PR Opener ──> GitHub PR
```

All artifacts live in GCS at `runs/<run_id>/`:
- `01_research.json`
- `02_tasks.json`
- `03_modules.json`
- `04_scenarios.json`
- `critique_0N.json`
- `gates/0N_decisions.json`

## HITL gate design

The hard requirement: **no 3000-line approval documents**. Each gate shows only what needs human judgment; full artifacts are linked for optional drill-in.

### Gate A — After Research (decision-only)
- 5-15 contested calls as yes/no items
- Coverage summary: "Researched 47 work units across 2 substrates. Interior cousin had 52 — 5 flagged as not applicable to exterior."
- Link to `research.json` for full review (optional)
- **User input:** Y/N per call + free-text overrides
- **Loop:** Researcher re-runs only on contested items

### Gate B — After Tasks (table review + decision sprinkles)
- Compact table: ~40-80 rows, columns = `task_id | phase | item | substrate_state | condition | classification | trackability_note`
- Decision callouts above the table for low-confidence calls
- Registry delta summary: "47 new IDs"
- **User input:** Inline approve/revise/reject per row + answer callouts
- **Loop:** Task Drafter re-runs only on flagged rows

### Gate C — After Modules (table review + sequencing diagram)
- Module table: `mod_id | phase | item | task_count | applies_when_summary`
- Auto-generated sequencing diagram (module dependency graph) for pilot substrates
- Decision callouts for divergences from interior pattern
- **User input:** Approve modules, mark sequencing issues, answer divergence questions

### Gate D — After Scenarios (diff review)
- Scenario table: `scn_id | substrate | state | condition | scope | module_count`
- Diff against existing exterior scenarios where overlap exists
- Boundary-case validation results from the Critic
- **User input:** Approve scenarios, mark diffs to revise

### Cross-gate behaviors
- Each gate is **resumable** (state in GCS)
- Each gate has an **"approve all without review"** button (use sparingly)
- Each gate logs decisions to `runs/<run_id>/gates/0N_decisions.json` for audit

## Error handling and validation

### Error categories
- **Schema violation** — Critic returns `blocking`. Orchestrator halts. User sees clear error and re-run option.
- **LLM timeout / quota** — Orchestrator retries failing agent up to 2× with exponential backoff. After that, halts and reports.
- **Tool failure** (GitHub API, GCS, search) — same retry pattern, but with a tool-specific surface so the failure mode is visible.
- **Critic disagreement loop** — same artifact flagged `blocking` 3× in a row → halt. No infinite loops.

### Re-run granularity
- After a HITL gate, the Orchestrator re-runs the upstream specialist with **only the flagged items**, not the whole stage. Saves tokens, preserves approved work.
- A full-stage re-run is a separate, explicit user action.

### Validation layers
- **Pre-write JSON schema validation** — every artifact validated before persisting to GCS
- **Registry conflict check** — Task Drafter and Module Composer both run a registry-collision check before emitting output
- **Critic rubric** — semantic validation (trackability, sequencing, divergence justification)

### Final-output validation (before PR)
- Dry-run new modules through the existing engine against a known scenario
- If totals diverge wildly from a comparable interior scenario, PR description flags for human review

### Observability
- Every agent invocation logs: input artifact, output artifact, token usage, latency, contested-call count
- Stored in BigQuery (or GCS as JSON)
- Enables later prompt-tuning based on which agents surface the most contested calls or hit the most retries

## Open questions for implementation phase

These do **not** block design approval but should be answered before/during implementation:

1. **Auth model** — service account scopes for the agent's GitHub PAT, GCS access, Vertex AI Search query permissions
2. **Cost ceiling** — per-run token budget; halt if exceeded
3. **Pilot substrate selection** — confirm wood siding RP + fiber cement RP, or pick others
4. **HITL UI** — Vertex AI Agent Builder's built-in chat surface, or a custom thin Cloud Run app reading gate state from GCS
5. **Engine dry-run** — exact scenario(s) to use as the regression check before PR

## Out of scope (explicitly)

- All ~22 exterior substrates (post-pilot, separate effort)
- Production rate research (deliberate de-emphasis; rates come from field tracking)
- Paint chemistry, regulations, environmental rule research (old pipeline focus, dropped)
- Replacement of interior task library (interior is reference, not target)
- Migration of old SpecFactory specs back into the new architecture (separate cleanup project)
