# NotebookLM Knowledge Backend Plan

**Status:** PROPOSED — pending testing
**Date:** 2026-03-07

---

## 1. Problem Statement

NotebookLM notebooks are being used for doctrine research but:
- 33 notebooks exist, ~15 are empty/untitled cruft
- No naming convention enforced consistently
- No linkage between notebooks and the doctrines they produced
- Research notebooks sit idle after initial report extraction
- No automated pipeline from research topic to doctrine draft
- No way to query existing knowledge before authoring new doctrine

---

## 2. Proposed Architecture

### 2.1 Notebook Registry

A catalog file at `docs/notebooklm-registry.md` mapping notebooks to domains, doctrines, and status.

**Domain Tiers:**
- **Foundation** — cross-cutting (PCA standards, quality tiers, estimation methods)
- **Interior** — per-surface-family (millwork, drywall, doors, windows, cabinets)
- **Exterior** — per-surface-family (siding, trim, substrates, coatings)
- **Product** — PaintFactor system knowledge (PaintScope, SpecFactory, DevOS)

**Registry columns:** Notebook ID, Title, Domain, Doctrines Fed, Source Count, Status (ACTIVE / COMPLETE / ARCHIVE)

### 2.2 Skill: `notebooklm-research` (user-invocable)

Automates Phases 1–5 of the existing `SKILL_notebooklm_doctrine_research.md` workflow via MCP tools. Replaces the manual reference skill with an executable one.

**Invocation:** `/notebooklm-research "Exterior Wood Siding Priming and Painting"`

**Pipeline:**
1. Create notebook with `PF [Topic] - Research` naming convention
2. Run `research_start` in deep mode with domain-calibrated query
3. Poll `research_status` until complete
4. Import sources via `research_import`
5. Add existing PaintFactor doctrine as text sources (seeds notebook with PF vocabulary: QT2–QT6, SS_* states, SF/LF/EA units, PCA standards)
6. Run structured extraction queries (8 required artifacts from Phase 4 of existing skill)
7. Generate report via `report_create` with custom prompt tuned to doctrine structure
8. Save report to `Research Resources/`
9. Update the registry

**MCP Tools Used:**
- `notebook_create` → `research_start` → `research_status` → `research_import`
- `notebook_add_text` (seed existing doctrine)
- `notebook_query` (structured extraction)
- `report_create` with `"Create Your Own"` format + custom prompt

### 2.3 Skill: `notebooklm-query` (user-invocable)

Ad-hoc querying of any notebook before doctrine creation. The "ask the knowledge backend" interface.

**Invocation:** `/notebooklm-query "What are the production rate multipliers for SS_3 wood siding prep?"`

**Pipeline:**
1. Check registry for best notebook(s) matching the domain
2. Run `notebook_query` against matched notebook
3. Support follow-up conversation (pass `conversation_id` for multi-turn)
4. Can target specific sources within a notebook via `source_ids`

**Use Cases:**
- Pre-doctrine Q&A: interrogate research corpus before formalizing
- Cross-notebook lookup: find data across multiple research efforts
- Gap analysis: discover what existing research covers vs. what's missing
- Fact-checking: verify doctrine claims against source material

### 2.4 Skill: `notebooklm-organize` (user-invocable, maintenance)

Cleans up and maintains the notebook library.

**Invocation:** `/notebooklm-organize`

**Pipeline:**
- List all notebooks, identify empty ones for cleanup
- Rename notebooks to `PF [Domain] - [Context] Research` convention
- Run `notebook_describe` to auto-categorize
- Build/update the registry file
- Flag notebooks with no linked doctrine (research done but not formalized)

---

## 3. Current Notebook Inventory

### Named Research Notebooks (with sources)

| Notebook ID | Title | Sources | Domain |
|-------------|-------|---------|--------|
| `378e52c8` | PF Painted Millwork - New Construction Research | 45 | Interior/Millwork |
| `0e539f85` | Professional Painting Standards, Costs, and Best Practices | 47 | Foundation |
| `6d0446a2` | Professional Coating and Siding Application Standards | 37 | Exterior/Siding |
| `4bbd6f31` | Professional Exterior Coating and Substrate Maintenance Guide | 34 | Exterior/Substrates |
| `3d56951c` | PF Painted Windows - Residential Research | 11 | Interior/Windows |
| `38c28f64` | The Professional Painter's Guide to Business Growth and Technique | 9 | Foundation |
| `ac14a941` | Integrated Painting System Proposal | 9 | Product |
| `d71f64be` | PF Painted Doors - Residential Research | 1 | Interior/Doors |
| `fa3284bf` | PF Interior Staining Sealing Clear - Residential Research | 1 | Interior/Staining |
| `332058fa` | PF Interior Surface Protection - Residential Research | 1 | Interior/Protection |
| `ca332eac` | Forensic Pathology and Technical Analysis of Architectural Coating Systems | 1 | Exterior/Coatings |
| `ffb5d151` | Environmental Dynamics in Exterior Coating | 1 | Exterior/Coatings |
| `be63a5ea` | Mastery of Fine Architectural Finishing and Millwork Systems | 1 | Interior/Millwork |
| `fb863fdd` | Engineering Protocols for Wood-to-Opaque Coating Conversion | 1 | Interior/Staining |
| `303a9cc4` | Technical Standards for Professional Exterior Siding Production | 1 | Exterior/Siding |
| `3764bd9e` | Per4mance.io: Performance Pay for Contractor Productivity | 1 | Foundation |

### Empty Notebooks (candidates for deletion)

15 notebooks with no title and 0 sources — likely created during testing or abandoned research attempts.

---

## 4. Key Design Decisions (To Validate)

### 4.1 Seed Knowledge Injection
Should new research notebooks get existing doctrine injected as text sources? This would let NotebookLM answer using PF terminology, but adds noise to source count.

**Test:** Add `Exterior_Substrates_Doctrine.md` as a text source to an existing exterior notebook, then query using PF terminology. Does it improve answer quality?

### 4.2 Deep vs. Fast Research Mode
- Deep: ~5 min, ~40 sources (web only)
- Fast: ~30 sec, ~10 sources (web or Drive)

**Test:** Compare source quality between deep and fast for a known topic. Is deep mode worth the wait?

### 4.3 Report Format: Custom vs. Briefing Doc
`report_create` supports "Create Your Own" with a custom prompt. This could produce output closer to doctrine format directly.

**Test:** Generate a "Create Your Own" report with a prompt that mirrors Doctrine_Format_Standard.md structure. Compare to Briefing Doc output.

### 4.4 Multi-Notebook Querying
NotebookLM queries target a single notebook. For cross-domain questions, the skill would need to:
- Query multiple notebooks sequentially
- Synthesize answers across them

**Test:** Does `notebook_query` return useful results when asked a question that spans the notebook's content? How specific vs. broad can queries be?

### 4.5 Registry as Source of Truth
Should the registry be auto-generated (scan notebooks on each run) or manually maintained? Auto-gen is lower friction but loses the domain/doctrine linkage metadata.

**Recommendation:** Hybrid — auto-scan for new notebooks, manual annotation for domain assignment and doctrine linkage.

---

## 5. Testing Plan

### Test 1: Query Existing Notebook
Pick the 47-source "Professional Painting Standards" notebook. Run 3–5 structured queries covering different extraction types (production rates, defect matrix, prep requirements). Evaluate answer quality and source attribution.

### Test 2: Seed Knowledge
Add `Exterior_Substrates_Doctrine.md` as a text source to an exterior notebook. Query using PF-specific terminology (SS_EXT_*, QT3, PCA Level 3). Compare answers before and after seeding.

### Test 3: Research Pipeline
Run `research_start` in fast mode for a narrow topic (e.g., "fiber cement siding primer systems"). Evaluate source quality, import flow, and time to usable corpus.

### Test 4: Custom Report
Generate a "Create Your Own" report with a doctrine-structured prompt. Assess how close the output is to production-ready doctrine format.

### Test 5: Cleanup
Delete the 15 empty notebooks. Rename inconsistently-named notebooks. Verify no data loss.

---

## 6. Implementation Order (After Testing)

1. **Registry** — catalog existing notebooks, clean up empties
2. **`notebooklm-query`** — highest immediate value, uses existing notebooks
3. **`notebooklm-research`** — full automated pipeline
4. **`notebooklm-organize`** — maintenance automation
5. **Retire** `SKILL_notebooklm_doctrine_research.md` (replaced by executable skills)

---

## 7. MCP Tool Reference

| Tool | Purpose | Used By |
|------|---------|---------|
| `notebook_create` | Create new notebook | research |
| `notebook_list` | List all notebooks | organize, registry |
| `notebook_get` | Get notebook details + sources | query, organize |
| `notebook_describe` | AI-generated summary + topics | organize |
| `notebook_query` | Ask questions about existing sources | query, research (extraction) |
| `notebook_rename` | Rename notebook | organize |
| `notebook_delete` | Delete notebook (irreversible) | organize (cleanup) |
| `notebook_add_text` | Add text as source | research (seed doctrine) |
| `notebook_add_url` | Add URL as source | research (manual sources) |
| `notebook_add_drive` | Add Drive doc as source | research (Drive integration) |
| `research_start` | Initiate web/Drive research | research |
| `research_status` | Poll research progress | research |
| `research_import` | Import discovered sources | research |
| `report_create` | Generate formatted report | research |
| `source_describe` | AI summary of single source | organize, query |
| `source_get_content` | Get source text content | query |
| `source_list_drive` | List sources with Drive freshness | organize |
| `source_delete` | Delete source (irreversible) | organize |
