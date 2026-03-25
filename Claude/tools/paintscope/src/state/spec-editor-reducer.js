/**
 * spec-editor-reducer.js
 * Reducer for the SpecDataProvider — manages editable copies of DB_BUNDLE tables.
 *
 * Editable tables: spec_families, sop_modules, sop_tasks, task_production_rates,
 *                  factor_modifiers, spec_required_inputs, quality_tier_effects
 *
 * Field reference (confirmed from db-bundle.js):
 *   spec_families:        .id, .name, .domain
 *   sop_modules:          .id, .spec_family_id, .name, .phase, .sort_order
 *   sop_tasks:            .id, .spec_family_id, .module_id, .name, .task_classification, .sort_order
 *   task_production_rates:.task_id, .spec_family_id, .rate_per_hour, .fixed_minutes, .unit_of_measure, .paintscope_key
 *   factor_modifiers:     .id, .spec_family_id, .name, .modifier_category, .modifier_type, .condition
 *   spec_required_inputs: .spec_family_id, .paintscope_key, .uom, .is_required  (NO .id — use array index)
 *   quality_tier_effects: .spec_family_id, .quality_tier, .time_modifier        (NO .material_modifier)
 */

import { DB_BUNDLE } from '../data/db-bundle.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Tables that get persisted to IndexedDB and managed by this reducer. */
export const EDITABLE_TABLES = [
  'spec_families',
  'sop_modules',
  'sop_tasks',
  'task_production_rates',
  'factor_modifiers',
  'spec_required_inputs',
  'quality_tier_effects',
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Deep-clone the DB_BUNDLE editable tables, then merge in any working-copy
 * overrides followed by overlay data.
 *
 * @param {Object|null} workingCopy  - Persisted edits from IndexedDB (keyed by table)
 * @param {Object|null} overlays     - Additional overlay data to merge on top
 * @returns {Object} Full spec data state object
 */
export function createInitialSpecData(workingCopy, overlays) {
  // Start with a deep clone of the base DB_BUNDLE editable tables
  const base = {};
  for (const table of EDITABLE_TABLES) {
    base[table] = JSON.parse(JSON.stringify(DB_BUNDLE[table] || []));
  }

  // Merge working copy (persisted edits) — replace entire table arrays
  if (workingCopy) {
    for (const table of EDITABLE_TABLES) {
      if (workingCopy[table] != null) {
        base[table] = JSON.parse(JSON.stringify(workingCopy[table]));
      }
    }
  }

  // Merge overlay data on top
  if (overlays) {
    for (const table of EDITABLE_TABLES) {
      if (overlays[table] != null) {
        base[table] = JSON.parse(JSON.stringify(overlays[table]));
      }
    }
  }

  return base;
}

/**
 * Extract only the editable tables from a full spec data state.
 * Used to produce the payload that gets persisted to IndexedDB.
 */
export function extractEditableTables(specData) {
  const result = {};
  for (const table of EDITABLE_TABLES) {
    result[table] = specData[table];
  }
  return result;
}

// ---------------------------------------------------------------------------
// ID generation for new tasks
// ---------------------------------------------------------------------------

/**
 * Generate a new task ID using the spec's prefix convention.
 * Spec family IDs look like "SF_ARCH_ELEMENT_NC" → prefix becomes "ARCH_ELEMENT_NC".
 * Falls back to a timestamp-based ID if no prefix can be derived.
 */
function generateTaskId(specFamilyId, existingTaskIds) {
  // Strip the "SF_" prefix to get the base prefix
  const base = specFamilyId.startsWith('SF_')
    ? specFamilyId.slice(3)
    : specFamilyId;

  // Find the highest existing numeric suffix for this spec's tasks
  const prefix = `TSK_${base}_CUSTOM_`;
  let max = 0;
  for (const id of existingTaskIds) {
    if (id.startsWith(prefix)) {
      const n = parseInt(id.slice(prefix.length), 10);
      if (!isNaN(n) && n > max) max = n;
    }
  }
  return `${prefix}${max + 1}`;
}

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

/**
 * @param {Object} state - Current spec data (editable tables)
 * @param {Object} action - { type, payload }
 */
export function specEditorReducer(state, action) {
  const { type, payload } = action;

  switch (type) {

    // -----------------------------------------------------------------------
    // _LOAD — Replace entire state with payload (used by SpecDataProvider on
    //         initial load from IndexedDB)
    // -----------------------------------------------------------------------
    case '_LOAD': {
      return payload;
    }

    // -----------------------------------------------------------------------
    // RESET_ALL — Return a fresh deep clone of DB_BUNDLE (discard all edits)
    // -----------------------------------------------------------------------
    case 'RESET_ALL': {
      return createInitialSpecData(null, null);
    }

    // -----------------------------------------------------------------------
    // RESET_SPEC — Revert all editable-table rows for a given spec_family_id
    //              back to the base DB_BUNDLE values
    // -----------------------------------------------------------------------
    case 'RESET_SPEC': {
      const { spec_family_id } = payload;
      const next = { ...state };

      for (const table of EDITABLE_TABLES) {
        const baseRows = DB_BUNDLE[table] || [];
        const currentRows = state[table] || [];

        if (table === 'spec_families') {
          // Replace the single matching row with the base value
          const baseRow = baseRows.find(r => r.id === spec_family_id);
          if (baseRow) {
            next[table] = currentRows.map(r =>
              r.id === spec_family_id ? JSON.parse(JSON.stringify(baseRow)) : r
            );
          } else {
            // The spec didn't exist in base — remove it entirely
            next[table] = currentRows.filter(r => r.id !== spec_family_id);
          }
        } else {
          // All other tables use spec_family_id field
          const baseSpecRows = baseRows
            .filter(r => r.spec_family_id === spec_family_id)
            .map(r => JSON.parse(JSON.stringify(r)));
          const otherRows = currentRows.filter(r => r.spec_family_id !== spec_family_id);
          next[table] = [...otherRows, ...baseSpecRows];
        }
      }

      return next;
    }

    // -----------------------------------------------------------------------
    // UPDATE_TASK — Update fields on a single sop_task by task id
    // payload: { taskId, changes }  where changes is a partial task object
    // -----------------------------------------------------------------------
    case 'UPDATE_TASK': {
      const { taskId, changes } = payload;
      return {
        ...state,
        sop_tasks: state.sop_tasks.map(t =>
          t.id === taskId ? { ...t, ...changes } : t
        ),
      };
    }

    // -----------------------------------------------------------------------
    // ADD_TASK — Add a new task to a module and create its production rate row
    // payload: { spec_family_id, module_id, taskData? }
    // -----------------------------------------------------------------------
    case 'ADD_TASK': {
      const { spec_family_id, module_id, taskData = {} } = payload;

      // Find the highest sort_order in this module
      const moduleTasks = state.sop_tasks.filter(
        t => t.spec_family_id === spec_family_id && t.module_id === module_id
      );
      const maxSort = moduleTasks.reduce((m, t) => Math.max(m, t.sort_order ?? 0), -1);

      // Auto-generate ID
      const existingIds = state.sop_tasks.map(t => t.id);
      const newId = taskData.id || generateTaskId(spec_family_id, existingIds);

      const newTask = {
        id: newId,
        spec_family_id,
        module_id,
        name: 'New Task',
        task_classification: 'binary',
        skill_level: 'painter',
        sort_order: maxSort + 1,
        ...taskData,
        // Always enforce these fields
        id: newId,
        spec_family_id,
        module_id,
      };

      // Create a corresponding task_production_rates entry
      const newRate = {
        spec_family_id,
        task_id: newId,
        unit_of_measure: taskData.unit_of_measure || 'SF',
        paintscope_key: taskData.paintscope_key || null,
        rate_per_hour: taskData.rate_per_hour ?? null,
        fixed_minutes: taskData.fixed_minutes ?? null,
      };

      return {
        ...state,
        sop_tasks: [...state.sop_tasks, newTask],
        task_production_rates: [...state.task_production_rates, newRate],
      };
    }

    // -----------------------------------------------------------------------
    // REMOVE_TASK — Remove a task and its production rate row
    // payload: { taskId }
    // -----------------------------------------------------------------------
    case 'REMOVE_TASK': {
      const { taskId } = payload;
      return {
        ...state,
        sop_tasks: state.sop_tasks.filter(t => t.id !== taskId),
        task_production_rates: state.task_production_rates.filter(r => r.task_id !== taskId),
      };
    }

    // -----------------------------------------------------------------------
    // UPDATE_RATE — Update the production rate row for a task
    // payload: { taskId, changes }  where changes is partial task_production_rates fields
    // -----------------------------------------------------------------------
    case 'UPDATE_RATE': {
      const { taskId, changes } = payload;
      return {
        ...state,
        task_production_rates: state.task_production_rates.map(r =>
          r.task_id === taskId ? { ...r, ...changes } : r
        ),
      };
    }

    // -----------------------------------------------------------------------
    // ADD_MODULE — Add a new SOP module to a spec family
    // payload: { spec_family_id, moduleData? }
    // -----------------------------------------------------------------------
    case 'ADD_MODULE': {
      const { spec_family_id, moduleData = {} } = payload;

      const specModules = state.sop_modules.filter(
        m => m.spec_family_id === spec_family_id
      );
      const maxSort = specModules.reduce((m, mod) => Math.max(m, mod.sort_order ?? 0), -1);

      // Auto-generate a module ID
      const base = spec_family_id.startsWith('SF_') ? spec_family_id.slice(3) : spec_family_id;
      const existingModIds = state.sop_modules.map(m => m.id);
      const modPrefix = `MOD_${base}_CUSTOM_`;
      let modMax = 0;
      for (const id of existingModIds) {
        if (id.startsWith(modPrefix)) {
          const n = parseInt(id.slice(modPrefix.length), 10);
          if (!isNaN(n) && n > modMax) modMax = n;
        }
      }
      const newModId = moduleData.id || `${modPrefix}${modMax + 1}`;

      const newModule = {
        id: newModId,
        spec_family_id,
        name: 'New Module',
        phase: 'apply',
        sort_order: maxSort + 1,
        ...moduleData,
        // Always enforce these
        id: newModId,
        spec_family_id,
      };

      return {
        ...state,
        sop_modules: [...state.sop_modules, newModule],
      };
    }

    // -----------------------------------------------------------------------
    // REMOVE_MODULE — Remove a module and cascade-delete its tasks + rates
    // payload: { moduleId }
    // -----------------------------------------------------------------------
    case 'REMOVE_MODULE': {
      const { moduleId } = payload;

      // Find all task IDs that belong to this module
      const taskIds = state.sop_tasks
        .filter(t => t.module_id === moduleId)
        .map(t => t.id);

      const taskIdSet = new Set(taskIds);

      return {
        ...state,
        sop_modules: state.sop_modules.filter(m => m.id !== moduleId),
        sop_tasks: state.sop_tasks.filter(t => t.module_id !== moduleId),
        task_production_rates: state.task_production_rates.filter(r => !taskIdSet.has(r.task_id)),
      };
    }

    // -----------------------------------------------------------------------
    // UPDATE_MODIFIER — Update fields on a factor_modifier by .id
    // payload: { modifierId, changes }
    // -----------------------------------------------------------------------
    case 'UPDATE_MODIFIER': {
      const { modifierId, changes } = payload;
      return {
        ...state,
        factor_modifiers: state.factor_modifiers.map(m =>
          m.id === modifierId ? { ...m, ...changes } : m
        ),
      };
    }

    // -----------------------------------------------------------------------
    // UPDATE_REQUIRED_INPUT — Update a spec_required_inputs row by array index
    //                         (no .id field on this table)
    // payload: { inputId (array index), changes }
    // -----------------------------------------------------------------------
    case 'UPDATE_REQUIRED_INPUT': {
      const { inputId, changes } = payload;
      return {
        ...state,
        spec_required_inputs: state.spec_required_inputs.map((inp, i) =>
          i === inputId ? { ...inp, ...changes } : inp
        ),
      };
    }

    // -----------------------------------------------------------------------
    // ADD_REQUIRED_INPUT — Add a new spec_required_inputs row
    // payload: { spec_family_id, paintscope_key, uom?, is_required? }
    // -----------------------------------------------------------------------
    case 'ADD_REQUIRED_INPUT': {
      const { spec_family_id, paintscope_key, uom = 'SF', is_required = 0 } = payload;
      const newInput = {
        spec_family_id,
        paintscope_key: paintscope_key || '',
        uom,
        is_required,
      };
      return {
        ...state,
        spec_required_inputs: [...state.spec_required_inputs, newInput],
      };
    }

    // -----------------------------------------------------------------------
    // REMOVE_REQUIRED_INPUT — Remove a spec_required_inputs row by array index
    // payload: { inputId (array index) }
    // -----------------------------------------------------------------------
    case 'REMOVE_REQUIRED_INPUT': {
      const { inputId } = payload;
      return {
        ...state,
        spec_required_inputs: state.spec_required_inputs.filter((_, i) => i !== inputId),
      };
    }

    default:
      return state;
  }
}
