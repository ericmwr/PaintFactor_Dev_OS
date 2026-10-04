# Exterior Data Factory — Freeze (Step 3) — Design

**Date:** 2026-10-04
**Status:** Draft for Eric's review
**Parent spec:** `2026-07-19-exterior-data-factory-design.md` §3 "Freeze as a Skill"
**Inputs:** wood-lap pilot (`9e1fdcbc`), roadmap `~/.claude/plans/ok-thats-fine-for-cozy-quail.md`, shelved `2026-07-11-paintscope-data-pass-skills-design.md`

## 1. Goal

Turn the procedure proven by the wood-lap pilot into a repeatable factory, so every later item × material runs the same way: research → structured brief → Eric's review gate → engine data → gates. This step builds the factory. Running it across the remaining grid is Step 4 (Workflow), which is out of scope here. Data comes before UI: the factory produces engine data and records what the UI/adapter must supply (rewire needs). It does not wire the UI.

### What the pilot proved (evidence for this design)

| Pilot observation | Design consequence |
|---|---|
| Translating the approved brief into JSON was purely mechanical (one generator script, no judgement) | Translation is a **deterministic script**, not an AI skill |
| Research and brief-writing needed judgement, citations and source conflict calls | Research + brief writing is the **skill** |
| Eric's rate entry in a spreadsheet worked well | The rate sheet stays the rate gate, generated and read back by scripts |
| Eric corrected practice (windows, weathering, mill glaze) at review | These become **hard rules** in the skill, so later briefs start correct |
| Hand-checking the bundle diff caught nothing but proved the need | The translator verifies the bundle changed by exactly its own IDs |

### Decisions (Eric, 2026-10-04)

1. **Source of truth = JSON brief.** A rendered markdown review page and a rate sheet are generated from it.
2. **Per-material doctrine.** Findings live in one doctrine file per material, reviewed once. Briefs cite finding IDs.
3. **Guard rail = count check only.** No repo-wide convention linter and no baseline file. The brief checker enforces conventions before anything is written.
4. **One brief = one item × one material** (NC, QT3), covering all its states and conditions (pilot: 1 brief → 5 scenarios).
5. **No cross-cell consistency reviewer.** Shared doctrine covers it.
6. **No persistent agent definitions.** The Step 4 Workflow will run this same skill.

## 2. Layout

```
Claude/devos/exterior-factory/
  vocab.json                                   approved taxonomy, machine-readable
  doctrine/<material>.doctrine.json            findings + sources + reference notes (one per material)
  briefs/<item>.<material>.NC.QT3.brief.json   source of truth for one brief
  briefs/<item>.<material>.NC.QT3.brief.md     GENERATED review page
  briefs/<item>.<material>.NC.QT3.rates.xlsx   GENERATED rate sheet (Eric fills)
Claude/scripts/exterior-factory/
  validate-brief.mjs   render-brief.mjs   import-rates.mjs   translate-brief.mjs
  lib/                 shared loaders (vocab, doctrine, brief, existing data index)
.claude/skills/exterior-factory/SKILL.md       repo root; the written procedure
```

The pilot's hand-written files in `Claude/devos/exterior-briefs/` move into this layout as the back-filled pilot (§7).

## 3. Data formats

### 3.1 `vocab.json`

Machine-readable copy of `exterior-taxonomy.md` v1 (+ 2026-10-03 amendment). The markdown stays the human reference. Contents:

- `items` with valid materials per item
- `materials`, `states`, `conditions`, `methods` (each value tagged `nc`/`rp`)
- `coating_types`, `phases` (setup, prep, prime, apply, interstage, finish, cleanup)
- `uoms` (SF, LF, EA, FIXED)
- `id_patterns` (task `TSK_EXT_*`, module `MOD_<PHASE>_EXT_*`, scenario `SCN_EXT_*`, PS key `PS_EXT_<DOMAIN>_<UOM>.<NAME>`, consumable `CON_*`)
- `taxonomy_version` (git hash of the markdown it was taken from)

A vitest test checks that every value in `vocab.json` appears in `exterior-taxonomy.md`, so the two cannot silently diverge.

### 3.2 Doctrine — `<material>.doctrine.json`

```json
{
  "material": "wood_smooth",
  "status": "draft | approved",
  "approved_by": null, "approved_on": null,
  "sources": [{ "id": "FPL16", "title": "...", "url": "...", "kind": "government|standard|manufacturer|trade|field" }],
  "findings": [{ "id": "F1", "kind": "practice|reference", "text": "...", "sources": ["FPL16", "SW10833"] }],
  "notes": [{ "id": "N1", "text": "...", "sources": ["FPL16"] }]
}
```

- `practice` findings drive tasks.
- `reference` findings and `notes` are stored as data `doctrine` text only. They never gate, exclude or warn (rule H1).
- Source `kind: "field"` records Eric's field practice (e.g. E2).

### 3.3 Brief — `*.brief.json`

```json
{
  "brief_version": 1,
  "status": "draft | approved",
  "approved_by": null, "approved_on": null,
  "cell": { "item": "ext_siding", "material": "wood_smooth", "context": "NC", "quality_tier": "QT3",
            "coating_type": "paint", "ps_key": "PS_EXT_SIDING_SF.FIELD", "output_state": "SS_PAINTED" },
  "doctrine": "wood_smooth",
  "scenarios": [{ "id": "SCN_...", "name": "Wood Siding (smooth) NC — QT3, Bare, New", "states": ["SS_BARE"], "conditions": ["SC_NEW"],
                  "modules": ["MOD_..."], "consumables": [{ "id": "CON_...", "usage": "..." }], "cites": ["F1"] }],
  "modules": [{ "id": "MOD_...", "reuse": false, "name": "...", "phase": "prep", "intent": "...",
                "tasks": [{ "task": "TSK_...", "applies_when": { "application_method": ["spray"] } }], "cites": ["F5"] }],
  "tasks": [{ "id": "TSK_...", "reuse": false, "name": "...", "uom": "SF", "skill_level": "general",
              "rate_per_hour": 750, "fixed_minutes": null, "rate_basis": "Eric|NPC|TBD", "note": "...", "cites": [] }],
  "rewire": [{ "id": "R1", "text": "..." }],
  "exclusions": ["..."]
}
```

- `reuse: true` means "this ID already exists in `Claude/{modules,tasks}`". The brief lists it so the review page shows the full sequence, but the translator never writes it.
- Coat counts are derived, never typed: `finish_coats` = number of `apply`-phase entries in the scenario's module list; `interstage_cycles` = `finish_coats − 1` (pilot: 2 coats → 1 cycle).
- `rate_basis: "TBD"` blocks approval (V8).

## 4. Scripts

All Node ESM, run from the repo root. Each script exits 0 on success and 1 on failure, with one line per problem. Shared loaders live in `lib/`.

### 4.1 `validate-brief.mjs <brief.json>`

| Rule | Check |
|---|---|
| V1 | Every `cell` value, scenario state/condition, method in `applies_when`, phase and uom is in `vocab.json`; material is valid for the item |
| V2 | IDs match `id_patterns`; the module ID's phase segment matches its `phase` |
| V3 | Every module/task reference resolves to the brief or to an existing file. `reuse: true` must exist on disk. `reuse: false` must either not exist yet, or match what the translator would write byte-for-byte (re-translation is idempotent; a differing file is an error, never overwritten) |
| V4 | Every `cites` ID exists in the named doctrine; the doctrine is `approved` before the brief can be `approved` |
| V5 | Scenario coverage: no two scenarios share a (state, condition) pair; every listed state/condition is NC-valid |
| V6 | `applies_when` keys are limited to `application_method`, `application_method_prime`, `substrate_state`, `substrate_condition`; values are arrays |
| V7 | SF/LF/EA tasks have `rate_per_hour > 0`; FIXED tasks have `fixed_minutes > 0` |
| V8 | `status: approved` requires no `rate_basis: "TBD"`, plus `approved_by` and `approved_on` set |
| V9 | No `SF_*` identifiers anywhere; no `rates_by_tier`, ranges or anchors (plain QT3) |

### 4.2 `render-brief.mjs <brief.json>`

Writes `.brief.md` (the pilot's review layout: cell, cited findings pulled from doctrine, sequence table, modules → tasks, rates, materials, reference notes, rewire, exclusions) and `.rates.xlsx` (the pilot rate sheet: one row per non-reuse task, yellow entry column, sanity block). Rendered files carry a "GENERATED — edit the .brief.json" header. Uses **`exceljs`**, added to `Claude/scripts/package.json` (the only new dependency).

### 4.3 `import-rates.mjs <brief.json>`

Reads Eric's column from `.rates.xlsx` into the brief's `rate_per_hour` / `fixed_minutes`, sets `rate_basis: "Eric"`, and leaves blanks unchanged. Prints a changed-rates table.

### 4.4 `translate-brief.mjs <brief.json> [--write]`

- Refuses unless `validate-brief` passes and `status` is `approved`.
- Without `--write`, it is a dry run: it lists the files it would create.
- With `--write`, it writes task/module/scenario JSON in the pilot's exact shape, then:
  - fills each file's `doctrine` text from the brief note + cited reference findings/notes + a provenance line;
  - writes scenario `consumables[]` (inert until rewire);
  - leaves `material_systems: []` and `protection_zones: []`;
  - writes `coat_counts` as derived in §3.3;
  - matches on `paintable_item`, `material`, `substrate_state`, `substrate_condition`, `coating_type` (method is never matched).
- It then runs `node Claude/scripts/build-scenario-bundle.mjs` and the **count check**: bundle module/scenario/task counts must rise by exactly the number of new IDs it wrote, and every written ID must be present in the bundle. A mismatch exits 1.
- It prints the exact paths it wrote, for staging by explicit path.
- `--regenerate-doctrine` is the one narrow override of V3. It may rewrite existing `reuse: false` files only when the field-level diff touches nothing but `doctrine` text; any other difference still fails. It is used once, for the pilot back-fill (§7.1).

Output is deterministic: stable key order, two-space indent, LF line endings, trailing newline.

## 5. Skill — `.claude/skills/exterior-factory/SKILL.md`

The skill is the written procedure. It triggers when Eric asks to run the exterior data factory or author exterior data for an item × material. It does not write engine data until the gate is passed.

**Procedure (checklist):**

1. **Scope:** confirm item × material against `vocab.json`; list existing modules/tasks reusable from earlier briefs.
2. **Doctrine:** if `<material>.doctrine.json` is missing or draft, research it.
   - Source quality order: government (FPL), standards bodies (MPI, PCA, ASTM), manufacturer TDS/install guides, trade associations, estimating guides.
   - Cite every finding; record source conflicts as findings for Eric to decide.
   - **Doctrine gate:** Eric approves it once per material.
3. **Brief:** write `brief.json` in engine vocabulary, citing finding IDs.
   - Reuse modules/tasks whenever the work is identical (name them generically, e.g. `EXT_SIDING_WOOD` rather than `…_WOOD_SMOOTH`).
   - Rates: NPC "Medium" where a figure exists, otherwise `TBD`.
4. `validate-brief` → fix until clean → `render-brief`.
5. **STOP — brief gate.** Present the review page + rate sheet + rewire list. Nothing below runs without Eric's explicit approval.
6. After approval: `import-rates` → set status approved → `validate-brief` → `translate-brief --write`.
7. **Gates:** `npx vitest run` (from `Claude/tools/paintscope`) and NC-interior parity 21.13 EXACT.
   - Parity: `npx vite-node scripts/parity-estimate.mjs -- src/engine/__fixtures__/p2a-int.json`.
   - Show results to Eric before committing.
8. **Commit** by explicit path only (the translator's list + brief + doctrine + renders). Never stage unrelated working-tree files.

**Hard rules** (from Eric's pilot review — every brief):

- **H1** Manufacturer exposure/topcoat/cure windows are reference notes in `doctrine` text only — never warnings, exclusions or restrictions.
- **H2** `SC_WEATHERED` = clean + spot-sand + spot-prime; never whole-structure sanding or full re-prime; chemical brightening belongs to the stain pass.
- **H3** No mill-glaze sanding task.
- **H4** Plain QT3 rates only — no ranges, anchors or tier tables. Nothing `SF_*`. No geometry UI.
- **H5** Prefer identifier values over new modifiers (taxonomy rule 7).
- **H6** Estimating-guide coat rates already include normal prep; set coat rates net of separate prep tasks.
- **H7** Method is chosen per coat. Prime tasks gate on `application_method_prime`, finish tasks on `application_method`; scenarios never match method.
- **H8** Engine conventions: `CON_` consumables, uppercase units, `PS_EXT_<DOMAIN>_<UOM>.<NAME>` keys.
- **H9** Data first. Record what the adapter/UI must supply in `rewire`; do not wire UI inside a factory run.

## 6. Engine boundary

The factory writes data only. It touches no engine code. The pilot's rewire list (R1–R4: ctx keys, consumables wiring, PS key emission, `uses_spray`) is carried forward in each brief's `rewire` field and accumulates across briefs. The UI/adapter rewire is a separate project that consumes that list.

## 7. Verification

1. **Pilot regression.** Back-fill the pilot into the new format (`doctrine/wood_smooth.doctrine.json`, `briefs/ext_siding.wood_smooth.NC.QT3.brief.json`, approved). The pilot's hand-written `doctrine` strings cannot be reproduced by a generic composer, so the regression runs in two steps:
   - **One-time:** the translator regenerates the 39 pilot files. A field-level diff must show changes **only** in `doctrine` text. Every match key, module list, task ref, `applies_when`, rate, uom, coat count and consumable is unchanged. The regenerated files are committed with the freeze.
   - **Ongoing:** a vitest test re-runs the translator in compare mode and must reproduce the committed files **byte-for-byte**, plus pass the count check with zero delta (re-translation is idempotent). The pilot engine test (`ext-siding-wood-pilot.test.js`, 18.65 h) must stay green.
2. **Checker tests.** Fixture briefs that each break one rule (off-vocab material, phase mismatch in module ID, uncited finding, TBD rate on an approved brief, duplicate state/condition pair, `SF_` identifier) must each fail `validate-brief` with the expected rule ID.
3. **Vocab sync test.** Every `vocab.json` value appears in `exterior-taxonomy.md`.
4. **Render smoke test.** Rendering the pilot brief produces a `.brief.md` whose tables match the pilot's approved r2 content, and a rate sheet whose rows match the brief's tasks.
5. **Existing gates** stay green: vitest suite, parity 21.13 exact.

## 8. Out of scope

- The Step 4 Workflow script (built when the first scale run starts; needs Eric's explicit opt-in).
- UI/adapter rewire (R1–R4).
- Repaint (RP) cells and the stain pass.
- Openings model (dedicated session before window/door cells).
- Repo-wide convention linter and bundle baseline file (declined 2026-10-04).
