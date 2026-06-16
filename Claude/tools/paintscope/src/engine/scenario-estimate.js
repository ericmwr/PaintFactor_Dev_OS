// scenario-estimate.js — plain (non-React) orchestrator for the scenario engine
// estimate computation. Extracted from useEstimateScenario.js so callers outside
// the React tree (headless parity harnesses, future server-side compute) can
// invoke it without a hook.
//
// useEstimateScenario is now a thin wrapper that calls this function, passing
// bundle + overlayStats as parameters instead of React state.

import { buildManualMaterialEstimates } from './manual-materials.js';
import { runScenarioEstimate } from './run-estimate-scenario.js';
import { buildScenarioInputs } from './context-adapter.js';
import { findBestMatch, findNearMisses } from './scenario-matcher.js';
import { resolveRoomFloorProtection } from './floor-protection.js';
import { resolveRoomFixtureProtection } from './fixture-protection.js';
import { computeMaterialEstimates, computeExteriorMaterialEstimates } from './material-estimates.js';
import { resolveExteriorProtection } from './exterior-protection.js';
import { buildElevationQuantityLookups, buildStandaloneQuantityLookups } from './quantity-lookups-exterior.js';
import { computePricing } from './pricing.js';

export function computeScenarioEstimate(state, db, bundle, profile, products, overlayStats = {}) {
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
      adapter = buildScenarioInputs(state, db);
    } catch (adapterErr) {
      console.error('[PaintScope] Adapter error:', adapterErr);
      return { error: `Adapter: ${adapterErr.message}`, specResults: [], totalHours: 0, totalCrewDays: 0, phaseHours: {}, perInputResults: [], gaps: [], warnings: [], bundleStats, roomProtection: {}, fixtureProtection: {}, closetHoursByRoom: {}, materialEstimates: [], pricing: null, activatedSpecs: 0, totalSpecs: 0 };
    }
    const perInputResults = [];
    const gaps = [];
    const warnings = [...adapter.warnings];

    // Build per-project task-rate overlayMap from protection_heuristics.
    // Each rate override applies to BOTH the install/remove task in that
    // category — user sees a single rate per work item; engine maps to
    // the underlying install + remove task pair.
    const ph = state?.project?.protection_heuristics || {};
    const projectOverlayMap = {};
    const setRate = (taskId, rate) => {
      if (rate != null && rate > 0) projectOverlayMap[taskId] = { rate_per_hour: rate };
    };
    setRate('TSK_MASK_OUTLET_SWITCH_INSTALL',  ph.outlet_mask_rate);
    setRate('TSK_MASK_OUTLET_SWITCH_REMOVE',   ph.outlet_mask_rate);
    setRate('TSK_PREP_OUTLET_COVER_REMOVE',    ph.outlet_remove_reinstall_rate);
    setRate('TSK_PREP_OUTLET_COVER_REINSTALL', ph.outlet_remove_reinstall_rate);
    setRate('TSK_MASK_HVAC_VENT_INSTALL',      ph.hvac_mask_rate);
    setRate('TSK_MASK_HVAC_VENT_REMOVE',       ph.hvac_mask_rate);
    setRate('TSK_PREP_HVAC_VENT_REMOVE',       ph.hvac_remove_reinstall_rate);
    setRate('TSK_PREP_HVAC_VENT_REINSTALL',    ph.hvac_remove_reinstall_rate);

    // Phase A: merge user-edited rate overrides (state.project.rate_overrides) into
    // the overlayMap. User overrides win on collision with protection_heuristics
    // rates — most recent intent wins.
    const userOverrides = state?.project?.rate_overrides || {};
    for (const [taskId, ov] of Object.entries(userOverrides)) {
      if (ov?.rate_per_hour != null && ov.rate_per_hour > 0) {
        projectOverlayMap[taskId] = { rate_per_hour: ov.rate_per_hour };
      }
    }

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
        overlayMap: projectOverlayMap,
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
    const specResults = normalizeToSpecResults(perInputResults, db);

    // ── Step 2: Protection resolvers ──
    // Derive roomSpecMethods from perInputResults (needed by fixture protection).
    const rooms = state.rooms || [];
    const roomSpecMethods = perInputResults.map(pr => ({
      roomIndex: pr.roomIndex,
      specId: pr.specId,
      method: pr.ctx?.application_method || 'brush_roll',
    }));
    const roomProtection = resolveRoomFloorProtection(specResults, db, rooms);
    const fixtureProtection = resolveRoomFixtureProtection(rooms, roomSpecMethods);

    // Exterior protection dedup — per-elevation + per-standalone. Mutates
    // specResults in place (suppresses protection tasks from exterior specs),
    // so it MUST run before the grand-total reduce below. Mirrors
    // run-estimate.js:718-722.
    let exteriorProtection = { elevationProtection: {}, standaloneProtection: {} };
    if (state.exterior && state.exterior.elevations && state.exterior.elevations.length > 0) {
      exteriorProtection = resolveExteriorProtection(specResults, db, state.exterior);
    }

    // ── Step 3: Grand total + crew days ──
    let grandTotalHours = specResults.reduce((s, sr) => s + sr.totalHours, 0);
    Object.values(roomProtection).forEach(rp => { grandTotalHours += rp.totalHours; });
    Object.values(fixtureProtection).forEach(fp => { grandTotalHours += fp.totalHours; });
    Object.values(exteriorProtection.elevationProtection).forEach(ep => { grandTotalHours += ep.totalHours; });
    Object.values(exteriorProtection.standaloneProtection).forEach(sp => { grandTotalHours += sp.totalHours; });
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
      materialEstimates = computeMaterialEstimates(state, db, roomLookups, intSpecResults);
    } catch (matErr) {
      console.error('[PaintScope] Material estimate error:', matErr);
      warnings.push(`Material estimates: ${matErr.message}`);
    }
    // Exterior materials (default coverage profiles). Mirrors run-estimate.js:734-738.
    if (state.exterior && state.exterior.elevations && state.exterior.elevations.length > 0) {
      try {
        const extSpecResults = specResults.filter(sr => sr.domain === 'exterior');
        const extMat = computeExteriorMaterialEstimates(
          state, db, buildElevationQuantityLookups(state), buildStandaloneQuantityLookups(state), extSpecResults
        );
        materialEstimates = [...materialEstimates, ...extMat];
      } catch (extMatErr) {
        console.error('[PaintScope] Exterior material estimate error:', extMatErr);
        warnings.push(`Exterior material estimates: ${extMatErr.message}`);
      }
    }

    // Append manual material entries (state.project.material_overrides.manual)
    // so the bid price + Materials views all see them. Pure append — engine-
    // emitted estimates are untouched.
    const manualEntries = state.project?.material_overrides?.manual || [];
    const manualMaterials = buildManualMaterialEstimates(manualEntries, products);
    if (manualMaterials.length > 0) {
      materialEstimates = [...materialEstimates, ...manualMaterials];
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
      exteriorProtection,
      closetHoursByRoom,
      totalHours: grandTotalHours,
      totalCrewDays,
      warnings,
      materialEstimates,
      activatedSpecs: specResults.length,
      totalSpecs: db?.spec_families?.length || 0,
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
export function normalizeToSpecResults(perInputResults, specData) {
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

    // Merge tasks from all results in the group, tagging each task with its
    // source activation's height_band so the Estimate UI can group band-
    // stratified tasks (window casing/jamb/stool/apron) by access level.
    const allTasks = [];
    for (const pr of group) {
      const prBand = pr.ctx?.height_band || 'STD';
      for (const t of pr.tasks || []) {
        allTasks.push({
          ...t,
          // Ensure legacy field names are present
          module: t.moduleId || t.module || null,
          band: prBand,
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

    // Determine domain: prefer db spec_families entry; fall back to roomIndex
    // convention (exterior inputs use negative indices: -100 to -1999) so that
    // exterior specs not yet in db-bundle (e.g. SF_DECK_EXT) are not
    // misclassified as interior.
    const inferredDomain = info.domain || (first.roomIndex <= -100 ? 'exterior' : 'interior');
    specResults.push({
      specId,
      specName: info.name || first.scenarioName || specId,
      domain: inferredDomain,
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
export function dedupeSharedTasks(perInputResults) {
  // Group by (roomIndex, specId, height_band). Including height_band keeps
  // band-stratified activations of the same spec independent — e.g. window
  // casing fanned out per band for mixed-height windows in one room (window
  // stratification, 2026-05-03). Without this, the second activation's tasks
  // get dropped because the first claims their IDs.
  const groups = new Map();
  for (const pr of perInputResults) {
    const band = pr.ctx?.height_band || '';
    const key = `${pr.roomIndex}|${pr.specId}|${band}`;
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
