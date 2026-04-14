// Parallel scenario-engine estimate hook. Runs the new module-based engine
// on the same project state the legacy engine consumes via useEstimate().
// Returns null if the bundle hasn't been generated, or { totalHours,
// phaseHours, perInputResults, warnings, gaps } when the run succeeds.
//
// This hook never mutates state and never throws — it always returns either
// a result or null, so it's safe to render alongside the legacy estimate.
//
// The bundle is imported statically from scenario-bundle.gen.js, which is
// produced by Claude/scripts/build-scenario-bundle.mjs. Re-run that script
// after authoring new modules/scenarios.

import { useMemo } from 'react';
import { useProject } from './useProject';
import { useSpecData } from './useSpecData';
import { runScenarioEstimate } from '../engine/run-estimate-scenario.js';
import { buildScenarioInputs } from '../engine/context-adapter.js';
import { findBestMatch, findNearMisses } from '../engine/scenario-matcher.js';
import bundle from '../data/scenario-bundle.gen.js';

export function useEstimateScenario() {
  const { state } = useProject();
  const { specData } = useSpecData();

  return useMemo(() => {
    if (!bundle || !bundle.scenarios) return null;
    try {
      const adapter = buildScenarioInputs(state, specData);
      const perInputResults = [];
      const phaseHours = {};
      const gaps = [];
      const warnings = [...adapter.warnings];
      let totalHours = 0;

      for (const input of adapter.roomInputs) {
        const matchInfo = findBestMatch(bundle, input.ctx);
        if (!matchInfo.scenario) {
          // Surface the gap so the UI can show what's missing
          const near = findNearMisses(bundle, input.ctx, 2).slice(0, 2);
          gaps.push({
            roomLabel: input.roomLabel,
            specId: input.specId,
            ctx: input.ctx,
            near: near.map(n => ({
              scenarioId: n.scenario.scenario_id,
              mismatches: n.mismatches,
              missing: n.missing,
            })),
          });
          continue;
        }
        if (matchInfo.tied) warnings.push(...matchInfo.warnings);

        const result = runScenarioEstimate({
          scenarioBundle: bundle,
          ctx: input.ctx,
          roomQty: input.roomQty,
          roomItems: input.roomItems,
          roomIndex: input.roomIndex,
          roomLabel: input.roomLabel,
        });

        perInputResults.push({
          roomIndex: input.roomIndex,
          roomLabel: input.roomLabel,
          specId: input.specId,
          scenarioId: result.scenarioId,
          scenarioName: result.scenarioName,
          totalHours: result.totalHours,
          phaseHours: result.phaseHours,
          tasks: result.tasks,
          outputState: result.outputState,
        });

        totalHours += result.totalHours;
        for (const [phase, hrs] of Object.entries(result.phaseHours)) {
          phaseHours[phase] = Math.round(((phaseHours[phase] || 0) + hrs) * 100) / 100;
        }
        if (result.warnings.length) warnings.push(...result.warnings);
      }

      return {
        totalHours: Math.round(totalHours * 100) / 100,
        phaseHours,
        perInputResults,
        gaps,
        warnings,
        bundleStats: {
          modules: Object.keys(bundle.modules).length,
          scenarios: bundle.scenarios.length,
        },
      };
    } catch (e) {
      console.error('[PaintScope] Scenario estimate error:', e);
      return { error: e.message, totalHours: 0, phaseHours: {}, perInputResults: [], gaps: [], warnings: [] };
    }
  }, [state, specData]);
}
