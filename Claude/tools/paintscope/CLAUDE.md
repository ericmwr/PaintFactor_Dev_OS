# PaintScope Prototype — Direction Document

> Reference for any Claude session working on PaintScope.
> Last updated: 2026-02-18

---

## 1. Repository Layout

| Path | Role |
|------|------|
| `C:/Eric_AI_Playground/Claude Code Uni/` | Main checkout, branch `feature/datafactory-setup` |
| `.claude/worktrees/elastic-galileo/` | Claude worktree, branch `claude/elastic-galileo` |

Both point at the same Git repo (`github.com/ericmwr/PaintFactor_Dev_OS.git`).
All PaintScope work happens inside the worktree at:

```
.claude/worktrees/elastic-galileo/Claude/tools/paintscope/
```

**Do not** edit files in the main checkout; always use the elastic-galileo worktree.

---

## 2. Project Structure

```
paintscope/
  index.html              # Vite entry point
  vite.config.js          # Vite config (React plugin, port 5177)
  package.json            # deps: react 19, vite 7, @vitejs/plugin-react
  node_modules/           # local install (npm install)
  CLAUDE.md               # this file — auto-loaded by Claude Code
  src/
    main.jsx              # ReactDOM root
    App.jsx               # top-level routes/views
    state/
      initial-state.js    # createRoom, createCloset, enums, genId
      reducer.js          # useReducer actions (rooms, substrates, closets, etc.)
      migrations.js       # schema migration for localStorage state
      persistence.js      # localStorage save/load
    engine/
      derive-room.js      # deriveRoom(), deriveCloset() — geometry calcs
      quantity-lookups.js  # PS key roll-up per room (incl. closets)
      run-estimate.js      # runEstimate(state, db) — main pipeline
      spec-resolution.js   # spec activation from quantity keys
      modifier-stack.js    # rate modifiers (height band, texture, etc.)
      per-item-compute.js  # per-substrate hours computation
      derive-protection.js # floor/surface protection calcs
      floor-protection.js  # floor protection specifics
      spec-compatibility.js# spec↔substrate compatibility checks
      material-estimates.js# material quantity estimates
      export-project.js    # export project data to JSON
    data/
      db-bundle.js         # ~400KB production rate database (1825 rows, 11 tables)
      constants.js         # QUANTITY_KEY_LABELS, UI constants
      enums.js             # shared enums
      substrate-catalog.js # 30+ substrate definitions in 4 groups
      spec-maps.js         # spec↔substrate mapping
      modifiers.js         # modifier definitions
      fixture-catalog.js   # fixture types
      opening-types.js     # door/window types
      room-presets.js      # preset room configurations
    components/
      room-editor/
        RoomEditor.jsx     # 8-tab editor (Identity, Structure, Surfaces, Trim,
                           #   Openings, Specialty, Closets, Protection)
        tabs/
          IdentityTab.jsx
          StructureTab.jsx
          SurfacesTab.jsx
          TrimTab.jsx
          OpeningsTab.jsx
          SpecialtyTab.jsx
          ClosetsTab.jsx   # Phase 5 — closet sub-rooms
          ProtectionTab.jsx
      estimate/            # estimate dashboard views
      export/              # export views
      summary/             # summary views
      workorder/           # work order views
      layout/              # layout shell (nav, header)
      setup/               # project setup views
      shared/              # shared UI components
    hooks/                 # custom React hooks
    styles/
      variables.css        # CSS custom properties
      base.css             # resets, typography
      components.css       # component styles
      layout.css           # layout styles
      estimate.css         # estimate view styles
```

---

## 3. Key Architecture Patterns

### State Management
- **useReducer + Context** — no external state libraries
- Single `dispatch(action)` pattern; actions in `reducer.js`
- State persisted to `localStorage` via `persistence.js`
- Schema migrations in `migrations.js` run on load

### Estimation Pipeline
```
state → quantity-lookups.js → spec-resolution.js → modifier-stack.js → per-item-compute.js → hours
```
- `quantity-lookups.js` emits PS keys (e.g., `PS_SURFACE_SF.WALL_FIELD`)
- Closet quantities roll up into the parent room's PS key map
- No structural changes needed to `run-estimate.js` for closets

### Substrate Model
- 30+ substrate types in 4 groups: Surfaces, Trim, Doors & Windows, Specialty
- Keyed by ID in `room.substrates`
- Each has: `state` (new/repaint/nc), `texture`, `applicationMethod`, `coats`

### Closet Model (Phase 5)
- Closets are sub-rooms that inherit the parent room's substrate config
- Sparse `substrate_overrides` object — only stores explicit overrides
- Quantities merge into parent room totals
- Shelving types: none, wire, wood/melamine, built-in system

---

## 4. Editing Workflow

1. **Start dev server**: `npm run dev -- --port 5177` from the paintscope directory
2. **Edit React files** directly in the `src/` tree
3. **Vite HMR** provides instant hot reload on save
4. **Build check**: `npx vite build` to verify production build (81+ modules)
5. **Browser verify**: Open `localhost:5177` (or next available port) to test

### Do NOT edit the legacy HTML file
The monolithic `PaintScope_Proto_v2.html` in the parent directory is the old version.
All development happens in the React app under `src/`.

---

## 5. Installed Tools & Plugins

### Claude Code Plugins (via /plugin)
| Plugin | Purpose |
|--------|---------|
| playwright | Browser automation and testing |
| context7 | Library documentation lookup |
| frontend-design | UI component generation |
| feature-dev | Guided feature development |
| code-review | PR code review |
| code-simplifier | Code refactoring |
| superpowers | Enhanced capabilities |
| claude-mem | Memory and context persistence |
| claude-code-setup | Setup recommendations |
| huggingface-skills | ML model integration |
| supabase | Database integration |

### MCP Servers (via claude mcp add)
| Server | Purpose |
|--------|---------|
| css-mcp | CSS inspection, variable resolution, specificity analysis |
| html-sync | Live HTML ↔ React synchronization |
| Notion | Workspace integration (notion-mcp) |
| NotebookLM | Research notebook integration |
| Figma | Design tool integration |
| Memory (knowledge graph) | Persistent entity/relation storage |
| Filesystem | File system access |
| Chrome (Claude in Chrome) | Browser automation via Chrome extension |

### Worth Investigating
| Server | Why |
|--------|-----|
| @anthropic/mcp-server-screenshot | Visual regression testing |
| lighthouse-mcp | Performance auditing |
| storybook-mcp | Component documentation (if we add Storybook) |

---

## 6. Conventions

- **No TypeScript** — plain JSX + JS
- **No Tailwind** — custom CSS with CSS custom properties in `variables.css`
- **Component naming** — PascalCase `.jsx` files
- **State actions** — SCREAMING_SNAKE_CASE strings
- **PS keys** — dot-separated: `PS_SURFACE_SF.WALL_FIELD`
- **ID generation** — `genId(prefix)` returns `prefix_###` (monotonic counter)
- **Tab pattern** — each RoomEditor tab is a standalone component in `tabs/`

---

## 7. Completed Phases

| Phase | Description | Status |
|-------|-------------|--------|
| 1 | Foundation — Vite scaffolding, state, engine port | COMPLETE |
| 2 | Room Editor UX — 7 tabs, substrates, openings | COMPLETE |
| 3 | Output Views — estimate dashboard, summary, work orders | COMPLETE |
| 4 | Visual Polish — theming, responsive, final styling | COMPLETE |
| 5 | Closets as Sub-Rooms — data model, UI tab, quantity rollup | COMPLETE |
| 6 | Exterior → Scenario Engine cutover — retired SF_EXT_* legacy pipeline | COMPLETE (2026-05-22) |

---

## 7a. Exterior Estimation Architecture (post-2026-05-22 cutover)

Exterior elevations and standalone items flow through the **scenario engine** (MOD_*/SCN_* in `Claude/modules/` + `Claude/scenarios/`), not the legacy SF_EXT_* spec pipeline (which has been removed).

**Pipeline:**
```
state.exterior.elevations[] + state.exterior.standalone
  → buildElevationScenarioInputs / buildStandaloneScenarioInputs  (context-adapter.js)
  → runScenarioEstimate                                            (run-estimate-scenario.js)
  → normalizeToSpecResults (tags domain:'exterior' via roomIndex)  (scenario-estimate.js)
  → resolveExteriorProtection + computeExteriorMaterialEstimates   (scenario-estimate.js)
```

**Conventions:**
- Negative `roomIndex` distinguishes exterior from interior in downstream consumers
  - Elevations: `-100` to `-999` (one per elevation)
  - Standalone items: `-1000` to `-1999`
- Exterior `specResults` items carry `domain: 'exterior'` for downstream filtering
- `computeExteriorMaterialEstimates` derives PS keys from scenario task `psKey` fields (NOT from `db.spec_required_inputs` — those exterior rows were stripped)
- `EXT_COVERAGE_DEFAULTS` (hardcoded in `material-estimates.js`) still drives primer/finish gallon math
- `SPEC_TO_PAINTABLE_ITEM` in `context-adapter.js` is the spec_id → scenario paintable_item bridge. **Wood/generic siding uses un-prefixed `'siding'`**; engineered/fc/vinyl/aluminum use `ext_eng_siding`/`ext_fc_siding`/etc.

**Deferred / backlog:**
- **Scenario coverage gap**: `spray_backbrush` (the default `IdentityTab.jsx:66` placeholder) has zero scenarios for wood siding / trim / door / window / porch_floor. Authoring those scenarios + a possible UI default change is a separate work stream.
- **No scenarios** for `ext_metal_railing` or `ext_deck_floor` — gap until authored.
- `computeExteriorMaterialEstimates` and `resolveExteriorProtection` are still wired at the `runEstimate` level. Could move into scenario interstage/cleanup phases as future cleanup.
- `EXT_UI_STATE_TO_SPEC_STATE` map (`spec-maps.js`) still in use for elevation state translation — kept intentionally.

**Plan reference:** `Claude/docs/superpowers/plans/2026-05-21-exterior-scenario-cutover.md`

**11 commits landed**: `a2e0114` → `e21a1ff` → `6abfbc1` → `60090c9` → `b0f90fc` → `f9cb562` → `c0530e6` → `2d333e3` → `88e66d9` → `c437760` → `985102d`.

---

## 8. Current Status & Next Steps

### Done
- Full React app running (81+ modules)
- 8-tab Room Editor with closet support
- Estimation pipeline handles closet quantities automatically
- Dev server on port 5177 (or next available)

### Pending
- `export-project.js` — add closet export logic (planned but not yet implemented)
- Browser verification of closet CRUD flow (add, edit dims, shelving, delete)
- No git commits made yet — all PaintScope React work (Phases 1-5) is uncommitted
- Consider committing current state as a checkpoint

### Future Possibilities
- Spec table viewer/editor
- Material cost estimation
- PDF export
- Multi-project support
- Room duplication with closets (already handled in reducer)


<claude-mem-context>

</claude-mem-context>