// Parallel scenario-engine estimate hook. Runs the new module-based engine
// on the same project state the legacy engine consumes via useEstimate().
//
// Returns an estimate-compatible object with the SAME SHAPE as run-estimate.js:
//   { specResults, roomProtection, fixtureProtection, totalHours, totalCrewDays,
//     closetHoursByRoom, warnings, materialEstimates, activatedSpecs, totalSpecs,
//     pricing, perInputResults, gaps, bundleStats }
//
// The specResults normalization (Step 1) groups per-input results by
// (roomIndex, specId) into the specResults[] array that EstimateView and
// all downstream components consume. Steps 2-4 add protection, crew days,
// and closet hours on top.
//
// This hook never mutates state and never throws — it always returns either
// a result or null, so it's safe to render alongside the legacy estimate.

import { useMemo, useState, useEffect } from 'react';
import { useProject } from './useProject';
import { useSpecData } from './useSpecData';
import { useCompanyProfile } from './useCompanyProfile';
import { runScenarioEstimate } from '../engine/run-estimate-scenario.js';
import { buildScenarioInputs } from '../engine/context-adapter.js';
import { findBestMatch, findNearMisses } from '../engine/scenario-matcher.js';
import { loadOverlayBundle } from '../engine/overlay-loader.js';
import { configureHeightThresholds } from '../engine/derive-room.js';
import { resolveRoomFloorProtection } from '../engine/floor-protection.js';
import { resolveRoomFixtureProtection } from '../engine/fixture-protection.js';
import { computeMaterialEstimates } from '../engine/material-estimates.js';
import { computePricing } from '../engine/pricing.js';
import canonicalBundle from '../data/scenario-bundle.gen.js';

export function useEstimateScenario() {
  const { state } = useProject();
  const { specData } = useSpecData();
  const { profile } = useCompanyProfile();

  // Load draft overlays once, then re-run estimate. Until drafts resolve
  // we run against the canonical bundle — overlay merge is additive.
  const [bundle, setBundle] = useState(canonicalBundle);
  const [overlayStats, setOverlayStats] = useState({ modulesOverlaid: 0, scenariosOverlaid: 0, assembliesActive: 0 });

  useEffect(() => {
    let cancelled = false;
    loadOverlayBundle(canonicalBundle).then(merged => {
      if (cancelled) return;
      setBundle({ modules: merged.modules, scenarios: merged.scenarios, modifiers: merged.modifiers, tasks: merged.tasks });
      setOverlayStats(merged.overlayStats);
      // Push the merged FAC_HEIGHT thresholds into derive-room so ceiling-
      // height → band mapping reflects user-authored drafts, not just canonical.
      configureHeightThresholds({ modifiers: merged.modifiers });
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
        return { error: `Adapter: ${adapterErr.message}`, specResults: [], totalHours: 0, totalCrewDays: 0, phaseHours: {}, perInputResults: [], gaps: [], warnings: [], bundleStats, roomProtection: {}, fixtureProtection: {}, closetHoursByRoom: {}, materialEstimates: [], pricing: null, activatedSpecs: 0, totalSpecs: 0 };
      }
      const perInputResults = [];
      const gaps = [];
      const warnings = [...adapter.warnings];

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

      // ── Step 1: Normalize perInputResults → specResults ──
      // Groups by (roomIndex, specId), merges tasks, produces the same shape
      // that EstimateView and all downstream components consume.
      const specResults = normalizeToSpecResults(perInputResults, specData);

      // ── Step 2: Protection resolvers ──
      // Derive roomSpecMethods from perInputResults (needed by fixture protection).
      const rooms = state.rooms || [];
      const roomSpecMethods = perInputResults.map(pr => ({
        roomIndex: pr.roomIndex,
        specId: pr.specId,
        method: pr.ctx?.application_method || 'brush_roll',
      }));
      const roomProtection = resolveRoomFloorProtection(specResults, specData, rooms);
      const fixtureProtection = resolveRoomFixtureProtection(rooms, roomSpecMethods);

      // ── Step 3: Grand total + crew days ──
      let grandTotalHours = specResults.reduce((s, sr) => s + sr.totalHours, 0);
      Object.values(roomProtection).forEach(rp => { grandTotalHours += rp.totalHours; });
      Object.values(fixtureProtection).forEach(fp => { grandTotalHours += fp.totalHours; });
      grandTotalHours = Math.round(grandTotalHours * 100) / 100;
      const totalCrewDays = Math.round((grandTotalHours / 8 / 2) * 10) / 10;

      // ── Step 4: Closet hours allocation ──
      const closetHoursByRoom = {};
      const roomLookups = adapter.lookups;
      rooms.forEach((room, ri) => {
        const roomLookup = roomLookups.get(ri);
        const roomQty = roomLookup?.qty;
        const cQty = roomLookup?.closetQty;
        if (!cQty || cQty.size === 0) return;
        let closetSurfaceTotal = 0, roomSurfaceTotal = 0;
        roomQty.forEach((val, key) => {
          if (key.startsWith('PS_SURFACE_')) roomSurfaceTotal += val.value;
        });
        cQty.forEach((val, key) => {
          if (key.startsWith('PS_SURFACE_')) closetSurfaceTotal += val.value;
        });
        if (roomSurfaceTotal <= 0) return;
        const fraction = closetSurfaceTotal / roomSurfaceTotal;
        let roomHours = 0;
        specResults.forEach(sr => {
          if (sr.domain === 'exterior') return;
          sr.tasks.forEach(t => { if (t.roomIndex === ri) roomHours += t.hours; });
        });
        closetHoursByRoom[ri] = Math.round(roomHours * fraction * 100) / 100;
      });

      // Recompute phase totals from specResults (post-merge).
      const phaseHours = {};
      for (const sr of specResults) {
        for (const [phase, hrs] of Object.entries(sr.phaseHours)) {
          phaseHours[phase] = Math.round(((phaseHours[phase] || 0) + hrs) * 100) / 100;
        }
      }

      // ── Step 5: Material estimates ──
      // Interior only — scenario engine doesn't yet handle exterior domain.
      // Same signature run-estimate.js uses at line 802.
      const intSpecResults = specResults.filter(sr => sr.domain !== 'exterior');
      let materialEstimates = [];
      try {
        materialEstimates = computeMaterialEstimates(state, specData, roomLookups, intSpecResults);
      } catch (matErr) {
        console.error('[PaintScope] Material estimate error:', matErr);
        warnings.push(`Material estimates: ${matErr.message}`);
      }

      // ── Step 6: Pricing ──
      // Shared computePricing(); returns null when profile is missing.
      let pricing = null;
      try {
        pricing = computePricing(profile, specResults, materialEstimates);
      } catch (priceErr) {
        console.error('[PaintScope] Pricing error:', priceErr);
        warnings.push(`Pricing: ${priceErr.message}`);
      }

      return {
        // Legacy-compatible shape (Steps 1-6)
        specResults,
        roomProtection,
        fixtureProtection,
        exteriorProtection: { elevationProtection: {}, standaloneProtection: {} },
        closetHoursByRoom,
        totalHours: grandTotalHours,
        totalCrewDays,
        warnings,
        materialEstimates,
        activatedSpecs: specResults.length,
        totalSpecs: specData?.spec_families?.length || 0,
        pricing,
        // Scenario-specific extras (Dev tab still uses these)
        perInputResults,
        gaps,
        bundleStats,
        phaseHours,
      };
    } catch (e) {
      console.error('[PaintScope] Scenario estimate error:', e);
      return { error: e.message, specResults: [], totalHours: 0, totalCrewDays: 0, phaseHours: {}, perInputResults: [], gaps: [], warnings: [], bundleStats, roomProtection: {}, fixtureProtection: {}, closetHoursByRoom: {}, materialEstimates: [], pricing: null, activatedSpecs: 0, totalSpecs: 0 };
    }
  }, [state, specData, profile, bundle, overlayStats]);
}

/**
 * Step 1: Normalize perInputResults into specResults[].
 *
 * Groups by (roomIndex, specId), merges tasks from multi-component results
 * (stairs, closets), and produces the same shape as run-estimate.js:
 *   { specId, specName, domain, totalHours, phaseHours, tasks[] }
 *
 * Each task retains its roomIndex, roomLabel, phase, hours, modStack etc.
 * so EstimateView can group by room → spec → task.
 */
function normalizeToSpecResults(perInputResults, specData) {
  // Lookup table: specId → { name, domain } from the DB bundle
  const specLookup = {};
  if (specData?.spec_families) {
    for (const sf of specData.spec_families) {
      specLookup[sf.id] = { name: sf.name, domain: sf.domain || 'interior' };
    }
  }

  // Group by (roomIndex, specId) — multi-component specs (stairs, closets)
  // produce multiple perInputResults that belong together.
  const groups = new Map();
  for (const pr of perInputResults) {
    const key = `${pr.roomIndex}|${pr.specId}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(pr);
  }

  const specResults = [];
  for (const [, group] of groups) {
    const first = group[0];
    const specId = first.specId;
    const info = specLookup[specId] || {};

    // Merge tasks from all results in the group
    const allTasks = [];
    for (const pr of group) {
      for (const t of pr.tasks || []) {
        allTasks.push({
          ...t,
          // Ensure legacy field names are present
          module: t.moduleId || t.module || null,
        });
      }
    }

    // Compute totals
    const totalHours = Math.round(allTasks.reduce((s, t) => s + (t.hours || 0), 0) * 100) / 100;
    const phaseHours = {};
    for (const t of allTasks) {
      const p = t.phase || 'apply';
      phaseHours[p] = Math.round(((phaseHours[p] || 0) + (t.hours || 0)) * 100) / 100;
    }

    specResults.push({
      specId,
      specName: info.name || first.scenarioName || specId,
      domain: info.domain || 'interior',
      totalHours,
      phaseHours,
      tasks: allTasks,
    });
  }

  // Sort by total hours descending (matches legacy behavior)
  specResults.sort((a, b) => b.totalHours - a.totalHours);
  return specResults;
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
