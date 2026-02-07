# Registry System & Resolver Agent — Rollout Fix Plan

**Created**: 2026-02-07
**Status**: Implemented — All fixes applied and validated (2026-02-07)
**Scope**: Reconcile `_registry/` files with `agents/registry_resolver_agent.md` before pipeline rollout

---

## P0 — Critical (Must Complete Before Rollout)

### Fix 1: Add Registry Resolver to `agent_rules.json`

**File**: `specs/_registry/agent_rules.json`
**Problem**: `agent_specific_rules` has no entry for `registry_resolver`. The pipeline doesn't acknowledge the agent exists. Other agents have no instruction to consume `resolution.json`.

**Changes**:

1. Add `registry_resolver` block to `agent_specific_rules`:
   - Assign primary rules: AR-001, AR-002, AR-003, AR-006, AR-007, AR-010
   - Define specific instructions:
     - Must check all ID prefixes against `id_registry.json` before proposing new ones
     - Must provide only `controlled_enums.json` valid_values to downstream agents
     - Must flag every proposed addition in `registry_additions_proposed`
     - Must not make domain decisions (materials, task sequencing, rates)

2. Update each existing agent's `specific_instructions` to reference consuming `resolution.json`:
   - `materials_manager`: Add instruction — "Consume `resolution.json` for pre-resolved SYS_, CON_, COV_ prefixes and applicable enum subsets. Do not load raw registry files. Do not re-derive from raw registries."
   - `sop_librarian`: Add instruction — "Consume `resolution.json` for pre-resolved TSK_ prefix, MOD_ prefix, zone_ids, and applicable enum subsets. Do not load raw registry files. Do not re-derive from raw registries."
   - `estimation_engineer`: Add instruction — "Consume `resolution.json` for pre-resolved cross-file threading rules and structural reminders. Do not load raw registry files. Do not re-derive from raw registries."
   - `qa_critic`: Add instruction — "Load BOTH `resolution.json` AND raw registry files (`controlled_enums.json`, `id_registry.json`, `structural_keys.json`). The Critic is the ONLY downstream agent that loads raw registries — its job is to verify the Resolver's decisions were correct and that downstream agents honored them."

3. Update `_meta.purpose` to mention the resolver's position in the pipeline.

---

### Fix 2: Add `resolution.json` to `structural_keys.json`

**File**: `specs/_registry/structural_keys.json`
**Problem**: `resolution.json` has no structural key definition. No canonical key validation or cross-file threading rules reference it.

**Changes**:

1. Add `"resolution.json"` to `_meta.file_types_covered` array.

2. Add new `resolution_json` top-level section with:
   - `filename`: `"resolution.json"`
   - `role`: `"Registry bridge — pre-resolves all IDs, enums, and structural patterns for downstream agents."`
   - `required_top_level_keys`:
     - `_meta` (object: spec_family_id, generated_by, generated_at, version, purpose, input_files)
     - `spec_identity` (object: spec_family_id, status, context_prefix)
     - `paintable_items` (array of item objects with item_id, name, unit_of_measure, surface_ref, status)
     - `task_prefix` (object: pattern, context, collision_check, naming_rule)
     - `module_prefix` (object: pattern, expected_modules array)
     - `paintscope_keys` (array of PS_/IN_ mapping objects)
     - `applicable_enums` (object of filtered enum subsets)
     - `surface_ids` (object: primary_surface, adjacent_surfaces)
     - `zone_ids` (array of zone objects)
     - `structural_reminders` (object of per-file key reminders)
     - `cross_file_threading` (array of rule strings)
     - `registry_additions_proposed` (array of proposal objects)
   - `optional_top_level_keys`:
     - `material_system_prefix`, `consumable_prefix`, `round_configurations`, `coverage_profiles`, `cross_spec_coordination`, `migration_warnings`
   - Source references to `id_registry.json` and `controlled_enums.json` for each key

3. Add threading rule to `cross_file_threading_rules`:
   - **Rule 9** (new): "Every pre-resolved ID prefix, enum subset, and structural reminder in `resolution.json` SHOULD be honored by downstream agents. The QA Critic validates that downstream outputs are consistent with resolver decisions."

---

### Fix 3: Reconcile `spec_status` Enum Conflict

**File**: `specs/_registry/controlled_enums.json` AND `specs/_registry/id_registry.json`
**Problem**: `id_registry.json` → SF_ entries use `"active"` and `"referenced_not_built"` as status values. `controlled_enums.json` → `spec_status` only allows `["draft", "review_required", "approved", "deprecated"]`.

**Recommended approach**: Expand the controlled enum. The id_registry values represent real lifecycle states that the current enum doesn't cover.

**Changes to `controlled_enums.json`**:

1. Add `"active"` to `spec_status.valid_values` with definition: `"Reviewed, approved, and in production use"`
2. Add `"referenced_not_built"` to `spec_status.valid_values` with definition: `"Referenced by other specs but spec files not yet created"`
3. Update sequence to reflect lifecycle: `draft → review_required → approved → active → deprecated` (with `referenced_not_built` as a parallel track)

**No changes needed to `id_registry.json`** — its values become valid once the enum is expanded.

---

## P1 — Major (Should Complete Before Rollout)

### Fix 4: Add Missing Enums to Resolver Step 6

**File**: `agents/registry_resolver_agent.md`
**Problem**: Step 6 "Filter Applicable Enums" omits `task_type`, `uom_input`, `yield_uom`, and `finish_group` — all needed by downstream agents.

**Changes**:

1. Add to "Always include" list:
   - `uom_input` — always (resolver resolves PS_ keys which use these UOM types)

2. Add to "Include if applicable" list:
   - `task_type` — if spec has task_type annotations in SOP modules (most specs do)
   - `yield_uom` — if spec has consumables with yield tracking (most specs do)
   - `finish_group` — if spec has `adjacent_state_protection_rules` in state_declarations

---

### Fix 5: Align `consumable_usage_models` Severity

**File**: `specs/_registry/structural_keys.json`
**Problem**: The resolver treats `consumable_usage_models` as prohibited. `structural_keys.json` treats it as a tolerated synonym. These must agree.

**Recommended approach**: Promote to hard prohibition in `structural_keys.json` to match the resolver and the existing migration checklist (which already flags this for migration in Door Frame spec).

**Changes to `structural_keys.json`**:

1. Move `consumable_usage_models` from `materials_json.optional_top_level_keys` description note to `materials_json.prohibited_key_names` (it's already in `prohibited_key_names` at line 314 — update the language from "Prefer" to "Use"):
   - Change: `"Prefer 'consumables' as the canonical key name. If used, treat as synonym but migrate to 'consumables'."`
   - To: `"Use 'consumables'. 'consumable_usage_models' is deprecated and must be migrated."`

2. Update `known_inconsistencies.consumables_vs_consumable_usage_models` to mark it as a migration-required issue, not a tolerated state.

---

### Fix 6: Add Resolution-to-Downstream Threading Rule

**File**: `specs/_registry/structural_keys.json`
**Problem**: No cross-file threading rules verify that downstream agents honor `resolution.json` decisions.

**Changes**:

1. Add to `cross_file_threading_rules`:
   - **Rule 9**: "Every TSK_ context prefix established in `resolution.json` MUST be used as the prefix for all TSK_ IDs in `sop_modules.json` and `production.json`."
   - **Rule 10**: "Every ITM_ ID marked as `existing` in `resolution.json` MUST use the exact registered ID in `spec.json`. No synonyms or re-derivations."
   - **Rule 11**: "Downstream agents (Materials Manager, SOP Librarian, Estimation Engineer) MUST use only enum values present in `resolution.json` → `applicable_enums`. If a value is needed that is not in the filtered set, the agent MUST flag it as an issue for the Resolver to address — never pull directly from raw registries to bypass the Resolver's filtering."

---

### Fix 7: Normalize `CON_` Registry Key Naming

**File**: `specs/_registry/id_registry.json` AND `agents/registry_resolver_agent.md`
**Problem**: CON_ section uses `entries_door_frame` (spec-specific) instead of `entries_in_active_use` (pattern used by PS_, IN_, surface_ids, zone_ids, ROUND_, COV_).

**Changes to `id_registry.json`**:

1. Rename `entries_door_frame` → `entries_in_active_use`
2. Merge the CONS_ migration items into a separate `pending_migration` key (keep them documented but separate from active entries)
3. Remove `entries_closet_shelf_NEEDS_MIGRATION` — convert to a `pending_migration` array with migration target IDs

**Changes to `registry_resolver_agent.md`**:

1. Step 9 (line 171): Change `"Check id_registry.json → CON_ → entries_door_frame"` to `"Check id_registry.json → CON_ → entries_in_active_use"`

---

## P2 — Minor (Improve Quality, Non-Blocking)

### Fix 8: Correct Example Output Enum Lists

**File**: `agents/registry_resolver_agent.md`
**Problem**: Example `applicable_enums` in output schema shows incomplete value lists (product_role missing 3 values, consumable_category missing "cleanup").

**Changes**:

1. Update `product_role.values` example to: `["primer", "finish", "sealer", "clear", "stain", "specialty"]`
2. Update `consumable_category.values` example to: `["applicator", "protection", "prep", "cleanup", "abrasive", "fill_material", "tool"]`
3. Add a comment note above applicable_enums: `"// NOTE: Values shown are examples for a specific spec. Resolver MUST pull full valid_values from controlled_enums.json and filter to spec scope."`

---

### Fix 9: Clarify `apply` Phase in Step 4

**File**: `agents/registry_resolver_agent.md`
**Problem**: Step 4 lists expected modules for full/prime-only/finish-only scopes but never addresses the `apply` phase or when to use `MOD_{CONTEXT}_APPLY` vs `MOD_{CONTEXT}_PRIME`/`MOD_{CONTEXT}_FINISH`.

**Changes**:

1. Add a note after the phase scope listings (after line 101):
   ```
   Note: The `apply` phase is a generic coating phase used when work is NOT
   specifically prime or finish (e.g., a single-product sealer application).
   Most specs use `prime` and/or `finish` directly. Only use `apply` when the
   coating step does not fit either category.
   ```

2. Fix the example output schema `phase` section to either:
   - Remove `apply` from the `sequence` if the example spec doesn't use it, OR
   - Add `apply` to `values` if the sequence includes it

---

### Fix 10: Complete ROUND_ and COV_ Example Listings

**File**: `agents/registry_resolver_agent.md`
**Problem**: Example output shows 2 of 7 ROUND_ entries and 2 of 3 COV_ entries.

**Changes**:

1. Update `round_configurations.existing_patterns` to include all 7:
   ```json
   ["ROUND_SINGLE_COAT", "ROUND_TWO_COAT", "ROUND_FRAME_PRIME_FINISH_2COAT",
    "ROUND_FRAME_FINISH_2COAT", "ROUND_DOOR_PRIME_FINISH_2COAT",
    "ROUND_DOOR_FINISH_2COAT", "ROUND_DOOR_LOUVERED_3COAT"]
   ```

2. Update `coverage_profiles.existing_profiles` to include all 3:
   ```json
   ["COV_FRAME_PRIMER", "COV_FRAME_PRIMER_BARE", "COV_FRAME_FINISH"]
   ```

---

## Implementation Order

```
Fix 3 (spec_status enum)          ─┐
Fix 7 (CON_ key normalization)    ─┤── Can be done in parallel (independent registry edits)
Fix 5 (consumable_usage_models)   ─┘

Fix 2 (resolution.json in structural_keys)  ── Depends on nothing, but Fix 6 builds on it
Fix 6 (threading rules)                     ── Depends on Fix 2

Fix 1 (resolver in agent_rules)             ── Can be done independently

Fix 4 (missing enums in resolver)   ─┐
Fix 8 (example enum lists)          ─┤── All resolver agent edits, do together
Fix 9 (apply phase clarification)   ─┤
Fix 10 (ROUND/COV examples)         ─┘
```

## Validation After Implementation

After all fixes are applied, verify:

- [x] `controlled_enums.json` → `spec_status` includes all values used in `id_registry.json` → SF_ entries
- [x] `structural_keys.json` → `_meta.file_types_covered` includes `"resolution.json"`
- [x] `structural_keys.json` → `cross_file_threading_rules` includes rules 9, 10, and 11
- [x] `agent_rules.json` → `agent_specific_rules` has `registry_resolver` entry
- [x] `agent_rules.json` → each downstream agent references consuming `resolution.json`
- [x] `id_registry.json` → CON_ uses `entries_in_active_use` key
- [x] `registry_resolver_agent.md` → Step 6 includes `task_type`, `uom_input`, `yield_uom`, `finish_group`
- [x] `registry_resolver_agent.md` → Example output has complete enum value lists
- [x] `registry_resolver_agent.md` → Step 9 references `entries_in_active_use`
- [x] No remaining cross-file contradictions between registry files
