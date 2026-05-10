// Probe runner — imperative function that takes a synthetic project
// state, runs it through the same pipeline useEstimateScenario uses
// (buildScenarioInputs → findBestMatch → runScenarioEstimate), and
// returns the fired-tasks list ready for the ledger.
//
// Probes seed the fired_tasks_seen ledger faster than waiting for
// organic estimates to cover the long tail of NC interior specs.
// Each probe produces { probe_id, total_hours, fired_tasks[], warnings }.

import { runScenarioEstimate } from './run-estimate-scenario.js';
import { buildScenarioInputs } from './context-adapter.js';
import { findBestMatch } from './scenario-matcher.js';

/**
 * Run a single probe through the estimate engine.
 *
 * @param {object} probe - { probe_id, description?, project, rooms[] }
 * @param {object} bundle - the scenario bundle (canonical + overlays)
 * @param {object} specData - SQLite spec families db (DB_BUNDLE shape)
 * @returns {{ probe_id, total_hours, fired_tasks: Array, warnings: string[], unmatched_inputs: number }}
 */
export function runProbe(probe, bundle, specData) {
  const state = {
    project: probe.project || {},
    rooms: probe.rooms || [],
  };

  const fired = [];
  const warnings = [];
  let totalHours = 0;
  let unmatchedInputs = 0;

  let adapter;
  try {
    adapter = buildScenarioInputs(state, specData);
  } catch (err) {
    return {
      probe_id: probe.probe_id,
      total_hours: 0,
      fired_tasks: [],
      warnings: [`adapter error: ${err.message}`],
      unmatched_inputs: 0,
    };
  }

  for (const input of adapter.roomInputs) {
    try {
      const matchInfo = findBestMatch(bundle, input.ctx);
      if (!matchInfo.scenario) {
        unmatchedInputs++;
        continue;
      }
      const result = runScenarioEstimate({
        scenarioBundle: bundle,
        ctx: input.ctx,
        roomQty: input.roomQty,
        roomItems: input.roomItems,
        roomIndex: input.roomIndex,
        roomLabel: input.roomLabel,
      });
      totalHours += result.totalHours || 0;
      for (const t of result.tasks || []) {
        if (!t || !t.taskId) continue;
        fired.push({
          task_id: t.taskId,
          hours: t.hours,
          ps_key: t.psKey,
          scenario_id: result.scenarioId || null,
          module_id: t.moduleId || null,
        });
      }
      if (result.warnings?.length) warnings.push(...result.warnings);
    } catch (err) {
      warnings.push(`[${input.specId}] ${err.message}`);
    }
  }

  return {
    probe_id: probe.probe_id,
    total_hours: Math.round(totalHours * 100) / 100,
    fired_tasks: fired,
    warnings,
    unmatched_inputs: unmatchedInputs,
  };
}
