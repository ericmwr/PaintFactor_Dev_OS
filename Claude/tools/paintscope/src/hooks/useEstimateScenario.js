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
//
// Overlay: authoring drafts in IndexedDB are merged over the canonical
// bundle once per session via overlay-loader. Revisions to drafts require
// a page reload to re-merge (acceptable for an admin tool).

import { useMemo, useState, useEffect } from 'react';
import { useProject } from './useProject';
import { useSpecData } from './useSpecData';
import { runScenarioEstimate } from '../engine/run-estimate-scenario.js';
import { buildScenarioInputs } from '../engine/context-adapter.js';
import { findBestMatch, findNearMisses } from '../engine/scenario-matcher.js';
import { loadOverlayBundle } from '../engine/overlay-loader.js';
import canonicalBundle from '../data/scenario-bundle.gen.js';

export function useEstimateScenario() {
  const { state } = useProject();
  const { specData } = useSpecData();

  // Load draft overlays once, then re-run estimate. Until drafts resolve
  // we run against the canonical bundle — overlay merge is additive.
  const [bundle, setBundle] = useState(canonicalBundle);
  const [overlayStats, setOverlayStats] = useState({ modulesOverlaid: 0, scenariosOverlaid: 0, assembliesActive: 0 });

  useEffect(() => {
    let cancelled = false;
    loadOverlayBundle(canonicalBundle).then(merged => {
      if (cancelled) return;
      setBundle({ modules: merged.modules, scenarios: merged.scenarios, modifiers: merged.modifiers });
      setOverlayStats(merged.overlayStats);
    }).catch(err => {
      console.warn('[PaintScope] Overlay load failed, using canonical:', err);
    });
    return () => { cancelled = true; };
  }, []);

  return useMemo(() => {
    if (!bundle || !bundle.scenarios || !bundle.modules) {
      console.warn('[PaintScope] Scenario bundle missing or malformed:', bundle);
      return null;
    }
    const bundleStats = {
      modules: Object.keys(bundle.modules).length,
      scenarios: bundle.scenarios.length,
      ...overlayStats,
    };
    try {
      let adapter;
      try {
        adapter = buildScenarioInputs(state, specData);
      } catch (adapterErr) {
        console.error('[PaintScope] Adapter error:', adapterErr);
        return { error: `Adapter: ${adapterErr.message}`, totalHours: 0, phaseHours: {}, perInputResults: [], gaps: [], warnings: [], bundleStats };
      }
      const perInputResults = [];
      const phaseHours = {};
      const gaps = [];
      const warnings = [...adapter.warnings];
      let totalHours = 0;

      for (const input of adapter.roomInputs) {
        try {
        const matchInfo = findBestMatch(bundle, input.ctx);
        if (!matchInfo.scenario) {
          const near = findNearMisses(bundle, input.ctx, 2).slice(0, 2);
          gaps.push({
            roomIndex: input.roomIndex,
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
          ctx: input.ctx,
        });

        if (result.warnings.length) warnings.push(...result.warnings);
        } catch (innerErr) {
          warnings.push(`[${input.roomLabel}] ${input.specId}: ${innerErr.message}`);
          console.error('[PaintScope] Scenario input error:', input, innerErr);
        }
      }

      // Dedupe: per-component expansion (stair, closet) splits one spec into N
      // roomInputs that each run the full scenario INCLUDING shared SETUP/PREP/
      // CLEANUP modules. The shared modules produce identical (taskId, coatNumber)
      // entries in each per-component result — collapse them so shared work is
      // counted once per (room, spec), not once per component.
      dedupeSharedTasks(perInputResults);

      // Recompute totals from (possibly deduped) per-input results.
      totalHours = 0;
      for (const k of Object.keys(phaseHours)) delete phaseHours[k];
      for (const pr of perInputResults) {
        totalHours += pr.totalHours;
        for (const [phase, hrs] of Object.entries(pr.phaseHours)) {
          phaseHours[phase] = Math.round(((phaseHours[phase] || 0) + hrs) * 100) / 100;
        }
      }

      return {
        totalHours: Math.round(totalHours * 100) / 100,
        phaseHours,
        perInputResults,
        gaps,
        warnings,
        bundleStats,
      };
    } catch (e) {
      console.error('[PaintScope] Scenario estimate error:', e);
      return { error: e.message, totalHours: 0, phaseHours: {}, perInputResults: [], gaps: [], warnings: [], bundleStats };
    }
  }, [state, specData, bundle, overlayStats]);
}

/**
 * Dedupe tasks that appear in multiple per-component scenarios of the same
 * (room, spec). Shared modules like MOD_SETUP_STAIR_RISER, MOD_PREP_STAIR_RISER,
 * MOD_CLEANUP_STAIR_RISER run once per per-component scenario — but they
 * represent shared work (setup the stairway, prep everything, tool cleanup)
 * that should count once per spec per room, not N times.
 *
 * Strategy: within each (roomIndex, specId) group, track seen
 * (taskId, coatNumber) pairs and drop subsequent duplicates. Recompute
 * per-result totalHours + phaseHours after dedup.
 *
 * Mutates perInputResults in place.
 */
function dedupeSharedTasks(perInputResults) {
  const groups = new Map();
  for (const pr of perInputResults) {
    const key = `${pr.roomIndex}|${pr.specId}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(pr);
  }
  for (const group of groups.values()) {
    if (group.length <= 1) continue;
    const seenTasks = new Set();
    for (const pr of group) {
      const kept = [];
      for (const t of pr.tasks || []) {
        const tk = `${t.taskId}|${t.coatNumber}`;
        if (seenTasks.has(tk)) continue;
        seenTasks.add(tk);
        kept.push(t);
      }
      pr.tasks = kept;
      pr.totalHours = Math.round(kept.reduce((s, t) => s + (t.hours || 0), 0) * 100) / 100;
      const ph = {};
      for (const t of kept) {
        const phase = t.phase || 'other';
        ph[phase] = Math.round(((ph[phase] || 0) + (t.hours || 0)) * 100) / 100;
      }
      pr.phaseHours = ph;
    }
  }
}
