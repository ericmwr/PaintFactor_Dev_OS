import { buildRoomQuantityLookups, OPENING_SUBSTRATES } from './quantity-lookups.js';
import { resolveQualityTier, resolveApplicationMethod, resolveTextureForSpec, resolveCoatingType, resolveStainMethod, resolveClearMethod, resolveCoatCounts, resolveClearSheen, resolveWoodSpecies } from './spec-resolution.js';
import { resolveSubstrateStateForSpec, specAcceptsState, isSpecStateCompatible, evaluateAppliesWhen } from './spec-compatibility.js';
import { computeModifierStack } from './modifier-stack.js';
import { computeWindowPerItemResults, computeDoorPerItemResults } from './per-item-compute.js';
import { deriveRoom, deriveHeightBand } from './derive-room.js';
import { computeMaterialEstimates, computeExteriorMaterialEstimates } from './material-estimates.js';
import { resolveRoomFloorProtection } from './floor-protection.js';
import { resolveRoomFixtureProtection } from './fixture-protection.js';
import { resolveExteriorProtection } from './exterior-protection.js';
import { computePricing } from './pricing.js';
import { SPEC_SUBSTRATE_MAP, SPEC_OUTPUT_STATES, UI_STATE_TO_SPEC_STATE, SPEC_VALID_INPUT_STATES, STAIN_SPEC_FAMILIES, GRAIN_FILL_PARENT_SPEC } from '../data/spec-maps.js';
import { SPEC_DISPLAY_NAMES, specDisplayName, PHASE_ORDER, ARCH_ELEMENT_PS_GROUPS } from '../data/constants.js';
import { FIXTURE_CATALOG } from '../data/fixture-catalog.js';
import { WINDOW_TYPE_LABELS, WINDOW_SIZE_LABELS, DOOR_TYPE_LABELS } from '../data/modifiers.js';
import canonicalBundle from '../data/scenario-bundle.gen.js';
import { buildElevationScenarioInputs, buildStandaloneScenarioInputs } from './context-adapter.js';
import { runScenarioEstimate } from './run-estimate-scenario.js';
import { findBestMatch, findNearMisses } from './scenario-matcher.js';
import { scenarioResultsToSpecResults } from './scenario-to-spec-results.js';

/**
 * Determine if complexity modifier should apply to a given task.
 * Complexity applies to: prep, interstage phases (always)
 * and apply/finish/prime phases ONLY for non-spray methods.
 */
function shouldApplyComplexity(modStack, phase, ctx) {
  if (!modStack.complexityApplicable) return false;
  if (modStack.complexity === 1.0) return false; // STD = no effect
  if (phase === 'prep' || phase === 'interstage') return true;
  if (phase === 'apply' || phase === 'finish' || phase === 'prime') {
    const method = (ctx.application_method || '').toLowerCase();
    return !method.startsWith('spray');
  }
  // setup, cleanup: no complexity
  return false;
}

/**
 * Compute effective total modifier for a task, conditionally including complexity.
 * Returns { effectiveTotal, complexityApplied }
 */
function computeEffectiveTotal(modStack, phase, ctx) {
  const complexityApplied = shouldApplyComplexity(modStack, phase, ctx);
  const effectiveTotal = complexityApplied
    ? Math.round(modStack.total * modStack.complexity * 1000) / 1000
    : modStack.total;
  return { effectiveTotal, complexityApplied };
}

/**
 * Resolve a task's effective rate from its production rate row + context.
 * Returns { effectiveRate, isFixed, fixedMinutes, uom, source }
 */
function resolveTaskRate(rateRow, ctx, overlayMap, specFamilyId) {
  // Check overlay map first (user overrides)
  if (overlayMap && specFamilyId && rateRow.task_id) {
    const key = `${specFamilyId}::${rateRow.task_id}`;
    if (overlayMap[key]) {
      const ov = overlayMap[key];
      if (ov.field_name === 'fixed_minutes' || ov.field_name === 'fixed_minutes_by_tier') {
        return { effectiveRate: null, isFixed: true, fixedMinutes: ov.override_value, uom: rateRow.unit_of_measure, source: 'overlay' };
      }
      return { effectiveRate: ov.override_value, isFixed: false, fixedMinutes: null, uom: rateRow.unit_of_measure, source: 'overlay' };
    }
  }

  const qt = ctx.quality_tier || 'QT3';

  // 1. Try rates_by_tier first (per-QT rates)
  if (rateRow.rates_by_tier && typeof rateRow.rates_by_tier === 'object') {
    const tierData = rateRow.rates_by_tier[qt];
    if (tierData && typeof tierData === 'object') {
      // Search for any rate_* key
      for (const [k, v] of Object.entries(tierData)) {
        if (k.startsWith('rate_') && typeof v === 'number' && v > 0) {
          return { effectiveRate: v, isFixed: false, fixedMinutes: null, uom: rateRow.unit_of_measure, source: 'rates_by_tier' };
        }
      }
    }
  }

  // 2. Try fixed_minutes_by_tier
  if (rateRow.fixed_minutes_by_tier && typeof rateRow.fixed_minutes_by_tier === 'object') {
    const tierMin = rateRow.fixed_minutes_by_tier[qt];
    if (tierMin != null && typeof tierMin === 'number') {
      return { effectiveRate: null, isFixed: true, fixedMinutes: tierMin, uom: rateRow.unit_of_measure, source: 'fixed_minutes_by_tier' };
    }
  }

  // 3. Try flat rate_per_hour
  if (rateRow.rate_per_hour != null && rateRow.rate_per_hour > 0) {
    return { effectiveRate: rateRow.rate_per_hour, isFixed: false, fixedMinutes: null, uom: rateRow.unit_of_measure, source: 'rate_per_hour' };
  }

  // 4. Try flat fixed_minutes
  if (rateRow.fixed_minutes != null && rateRow.fixed_minutes > 0) {
    return { effectiveRate: null, isFixed: true, fixedMinutes: rateRow.fixed_minutes, uom: rateRow.unit_of_measure, source: 'fixed_minutes' };
  }

  return null; // No rate available
}

/**
 * Main estimation orchestrator.
 * Returns { specResults[], totalHours, totalCrewDays, warnings[], materialEstimates[] }
 */
export function runEstimate(state, db, overlayMap, profile) {
  const { project, rooms } = state;
  const roomLookups = buildRoomQuantityLookups(state);
  const warnings = [];
  let specResults = [];
  let grandTotalHours = 0;

  // Index required inputs by spec
  const requiredInputsBySpec = {};
  db.spec_required_inputs.forEach(ri => {
    if (!requiredInputsBySpec[ri.spec_family_id]) requiredInputsBySpec[ri.spec_family_id] = [];
    requiredInputsBySpec[ri.spec_family_id].push(ri);
  });

  // Index modules and tasks by spec
  const modulesBySpec = {};
  db.sop_modules.forEach(m => {
    if (!modulesBySpec[m.spec_family_id]) modulesBySpec[m.spec_family_id] = [];
    modulesBySpec[m.spec_family_id].push(m);
  });

  // Tasks suppressed from the legacy engine (removed from workflow, kept in DB for history).
  // Clean-tools tasks eliminated — arbitrary fixed-time values that inflate hours
  // when multiplied across rooms. Real cleanup overhead is absorbed into production rates.
  // Scenario engine parity: same task IDs have been deleted from module JSONs under Claude/modules/.
  const SUPPRESSED_TASKS = new Set([
    'TSK_DOOR_SPRAY_PROTECT',
    'TSK_ARCH_TOOL_CLEANUP', 'TSK_BLTN_TOOL_CLEANUP', 'TSK_CABT_TOOL_CLEANUP',
    'TSK_FRAME_CLEAN_TOOLS', 'TSK_DOOR_CLEAN_TOOLS',
    'TSK_CLEAN_TOOLS_CEILING', 'TSK_CEIL_CLEAN_TOOLS',
    'TSK_CLEAN_TOOLS_WALL', 'TSK_WALL_CLEAN_TOOLS',
    'TSK_STRL_TOOL_CLEANUP', 'TSK_STRS_TOOL_CLEANUP',
    'TSK_TRIM_CLEAN_TOOLS', 'TSK_WNSC_TOOL_CLEANUP',
    'TSK_WIN_CLEAN_TOOLS', 'TSK_WDCL_TOOL_CLEANUP', 'TSK_WDWL_TOOL_CLEANUP',
    'TSK_XTRM_CLEAN_EQUIPMENT', 'TSK_MSRY_CLEAN_EQUIPMENT', 'TSK_PRCH_CLEAN_EQUIPMENT',
    'TSK_ENSD_CLEAN_EQUIPMENT', 'TSK_FCSD_CLEAN_EQUIPMENT', 'TSK_SFIT_CLEAN_EQUIPMENT',
    'TSK_SDNG_CLEAN_EQUIPMENT', 'TSK_PCRP_CLEAN_EQUIPMENT', 'TSK_FCRP_CLEAN_EQUIPMENT',
    'TSK_SFRP_CLEAN_EQUIPMENT', 'TSK_EWRP_CLEAN_EQUIPMENT', 'TSK_TRRP_CLEAN_EQUIPMENT',
    'TSK_DRRP_CLEAN_EQUIPMENT', 'TSK_ALRP_CLEAN_EQUIPMENT', 'TSK_VNRP_CLEAN_EQUIPMENT',
    'TSK_FINAL_CLEANUP',
    'TSK_DECK_TOOL_CLEAN', 'TSK_XDOR_TOOL_CLEAN', 'TSK_FNDN_TOOL_CLEAN',
    'TSK_GRDR_TOOL_CLEAN', 'TSK_STCO_TOOL_CLEAN', 'TSK_XWIN_EQUIPMENT_CLEAN',
    'TSK_FNCE_TOOL_CLEAN', 'TSK_DKRP_TOOL_CLEAN', 'TSK_FERP_TOOL_CLEANUP',
    'TSK_GDRP_TOOL_CLEAN', 'TSK_PFRP_TOOL_CLEANUP', 'TSK_XWRP_EQUIPMENT_CLEAN',
    'TSK_FNRP_TOOL_CLEAN', 'TSK_MSRP_EQUIPMENT_CLEANUP', 'TSK_SCRP_TOOL_CLEAN',
    // MDF edge seal tasks — caulk + primer on MDF edges already covers the same work,
    // no separate billable task needed. Heuristic for when to fire is unreliable.
    // Scenario engine parity: same task IDs have been deleted from module JSONs.
    'TSK_ARCH_SEAL_MDF_EDGES', 'TSK_BLTN_SEAL_MDF_EDGES', 'TSK_CABT_EDGE_SEAL',
    'TSK_EDGE_SEAL', 'TSK_DOOR_MDF_EDGE_SEAL', 'TSK_STRS_SEAL_MDF_EDGES',
    'TSK_MDF_EDGE_SEAL', 'TSK_MDF_EDGE_SEAL_SPRAY',
    'TSK_WNSC_SEAL_MDF_EDGES', 'TSK_WDCL_SEAL_MDF_EDGES', 'TSK_WDWL_SEAL_MDF_EDGES',
  ]);

  const tasksByModule = {};
  db.sop_tasks.forEach(t => {
    if (SUPPRESSED_TASKS.has(t.id)) return;
    const key = `${t.spec_family_id}::${t.module_id}`;
    if (!tasksByModule[key]) tasksByModule[key] = [];
    tasksByModule[key].push(t);
  });

  // Index production rates by spec+task
  const ratesByTask = {};
  db.task_production_rates.forEach(r => {
    const key = `${r.spec_family_id}::${r.task_id}`;
    if (!ratesByTask[key]) ratesByTask[key] = [];
    ratesByTask[key].push(r);
  });

  // Dedup tracker: per-room fixture protection and full-cover floor protection
  // Prevents duplicate masking when multiple specs (wall + ceiling) fire in same room
  const roomProtectionClaimed = {};  // roomIndex -> Set of claimed zone IDs

  // Collector for fixture protection: (roomIndex, specId, method) tuples
  const roomSpecMethods = [];

  // For each INTERIOR spec family (exterior specs handled separately below)
  db.spec_families.forEach(spec => {
    const inputs = requiredInputsBySpec[spec.id] || [];
    const modules = (modulesBySpec[spec.id] || []).sort((a,b) => (a.sort_order||0)-(b.sort_order||0));

    if (modules.length === 0) return; // No modules = skip

    // Check if this spec has any matching quantities across all rooms
    // AND substrate state is compatible with the spec's valid_input_states
    let specHasQuantity = false;
    const allPsKeys = inputs.map(i => i.paintscope_key);
    // For activation: only check surface/opening keys — meta, protection, edge, and modifier
    // keys exist in every room and would cause phantom spec activation
    const psKeys = allPsKeys.filter(k => k.startsWith('PS_SURFACE_') || k.startsWith('PS_OPENING_EA.'));

    rooms.forEach((room, ri) => {
      const roomQty = roomLookups.get(ri)?.qty;
      if (psKeys.some(k => roomQty && roomQty.has(k) && roomQty.get(k).value > 0)) {
        // Quantity exists — now check substrate state compatibility
        if (isSpecStateCompatible(spec.id, room)) {
          specHasQuantity = true;
        }
      }
    });

    if (!specHasQuantity) {
      return; // Skip spec — no quantities match or substrate state incompatible
    }

    let specTotalHours = 0;
    const phaseHours = {};
    const taskResults = [];

    // For each room
    rooms.forEach((room, ri) => {
      const roomLookup = roomLookups.get(ri);
      const roomQty = roomLookup?.qty;
      const closetQty = roomLookup?.closetQty;

      // Per-room activation: skip this room if it has NONE of the spec's activation keys
      // OR if the room's substrate state is incompatible with this spec
      const roomHasSpec = psKeys.some(k => roomQty && roomQty.has(k) && roomQty.get(k).value > 0);
      if (!roomHasSpec) return;
      if (!isSpecStateCompatible(spec.id, room)) return;

      // Painting toggle guard: skip specs whose primary substrate isn't toggled for painting.
      // Some substrates (doors, windows, door_casing, window_casing) have a 'painting' flag
      // that controls whether they're in scope. PS keys may still be emitted for structural
      // purposes (wall deductions, casing LF) even when painting is off.
      const primarySub = SPEC_SUBSTRATE_MAP[spec.id];
      if (primarySub) {
        const subConfig = (room.substrates || {})[primarySub];
        if (subConfig && subConfig.painting === false) return;
      }

      // Stain/paint routing: skip specs that don't match the substrate's coating_type
      const coatingType = resolveCoatingType(spec.id, room, project);
      // Skip stain specs when coating_type is paint (or not set)
      if (STAIN_SPEC_FAMILIES.has(spec.id) && coatingType === 'paint') return;
      // Skip paint specs for this substrate when coating_type is stain/clear
      if (!STAIN_SPEC_FAMILIES.has(spec.id) && coatingType !== 'paint') {
        const primarySub = SPEC_SUBSTRATE_MAP[spec.id];
        const hasStainCounterpart = [...STAIN_SPEC_FAMILIES].some(
          stainId => SPEC_SUBSTRATE_MAP[stainId] === primarySub
        );
        if (hasStainCounterpart) return;
      }

      // Resolve substrate_state for this spec's substrate in this room (SS_* enum)
      // Used by combined specs' applies_when conditions on primer modules
      const roomSpecStates = resolveSubstrateStateForSpec(spec.id, room);
      const roomDerived = deriveRoom(room);
      const ctx = {
        quality_tier: resolveQualityTier(spec.id, room, project),
        height_band: roomDerived.heightBand,
        complexity: room.complexity || project.default_complexity,
        application_method: resolveApplicationMethod(spec.id, room, project),
        surface_texture: resolveTextureForSpec(spec.id, room, project),
        substrate_state: (roomSpecStates && roomSpecStates.length > 0) ? roomSpecStates[0] : null,
        // Phase 1: NC residential windows are wood. Metal support deferred.
        // Enables correct filtering of applies_when: { substrate: ["aluminum","steel"] }
        substrate: (spec.id === 'SF_WINDOW_INT_NC') ? 'wood' : undefined,
        // Room adjacency context — drives floor protection and fixture masking tasks
        floor_type: room.floor_type || 'subfloor',
        floor_protection: room.floor_protection || '',
      };
      // Fixture presence as boolean context keys for applies_when matching
      // Default all fixtures to false so applies_when: { has_X: [true] } fails when absent
      FIXTURE_CATALOG.forEach(f => { ctx['has_' + f.id] = false; });
      Object.keys(room.fixtures || {}).forEach(fId => { ctx['has_' + fId] = true; });

      // Beam overrides for arch element spec
      if (spec.id === 'SF_ARCH_ELEMENT_NC' && room.vaulted_ceiling && room.beams_enabled) {
        // Height: use peak_height_ft (beams are always overhead)
        const peakFt = parseFloat(room.peak_height_ft) || 0;
        if (peakFt > 0) {
          ctx.height_band = deriveHeightBand(peakFt);
        }
        // Application method: use beam-specific setting
        if (room.beam_application_method) {
          ctx.application_method = room.beam_application_method;
        }
        // Substrate state: use beam-specific setting
        if (room.beam_substrate_state) {
          const mapped = UI_STATE_TO_SPEC_STATE[room.beam_substrate_state];
          if (mapped) ctx.substrate_state = mapped;
        }
      }

      // Add stain-specific context for stain specs
      if (STAIN_SPEC_FAMILIES.has(spec.id)) {
        ctx.coating_type = coatingType;
        ctx.application_method_stain = resolveStainMethod(spec.id, room, project);
        ctx.application_method_clear = resolveClearMethod(spec.id, room, project);
        ctx.wood_species_group = resolveWoodSpecies(spec.id, room, project);
        ctx.clear_sheen = resolveClearSheen(spec.id, room, project);
        const coats = resolveCoatCounts(spec.id, room, project);
        ctx.stain_coats = coats.stain_coats;
        ctx.sealer_coats = coats.sealer_coats;
        ctx.clear_coats = coats.clear_coats;
      }

      // Track active spec + method per room for fixture protection resolution
      roomSpecMethods.push({ roomIndex: ri, specId: spec.id, method: ctx.application_method });

      const modStack = computeModifierStack(spec.id, ctx, db, warnings);

      // Coat count lookup: how many finish coats and interstage cycles for this spec+tier+method
      let finishCoats = 1, interstageCycles = 1;
      if (db.coat_counts) {
        const qt = ctx.quality_tier || 'QT3';
        const method = ctx.application_method || 'spray';
        const tierKey = qt === 'QT5' ? ('QT5_' + (method.startsWith('spray') ? 'spray' : 'brush')) : qt;
        const ccRow = db.coat_counts.find(r => r.spec_family_id === spec.id && r.tier_key === tierKey);
        if (ccRow) {
          finishCoats = ccRow.finish_coats || 1;
          interstageCycles = ccRow.interstage_cycles || 1;
        }
      }

      // For each module -> task
      modules.forEach(mod => {
        // Check module applies_when
        if (!evaluateAppliesWhen(mod.applies_when, ctx)) return;

        // Coat multiplier: finish coat modules repeat per coat, interstage repeats per cycle
        // Exclude FINAL_INSPECT and _COAT_2 modules (already handle multi-coat structurally)
        let coatMultiplier = 1;
        if (mod.phase === 'interstage') {
          coatMultiplier = interstageCycles;
        } else if (mod.phase === 'finish' && !mod.id.includes('FINAL') && !/_COAT_\d/.test(mod.id)) {
          coatMultiplier = finishCoats;
        }

        const tasks = (tasksByModule[`${spec.id}::${mod.id}`] || []).sort((a,b) => (a.sort_order||0)-(b.sort_order||0));

        tasks.forEach(task => {
          // Check appears_in_tiers
          if (task.appears_in_tiers && Array.isArray(task.appears_in_tiers)) {
            if (!task.appears_in_tiers.includes(ctx.quality_tier)) return;
          }

          // Check task applies_when
          if (!evaluateAppliesWhen(task.applies_when, ctx)) return;

          // Dedup guard: prevents duplicate protection when multiple specs fire in same room
          if (!roomProtectionClaimed[ri]) roomProtectionClaimed[ri] = new Set();
          // Fixture protection dedup (wall + ceiling specs share fixture tasks)
          if (mod.id.includes('ROOM_FIXTURES') || mod.id.includes('TEARDOWN_ROOM_FIXTURES')) {
            const zoneKey = task.id.replace(/^TSK_(WALL_P|WALL_F|CEIL_P|CEIL_F)_/, 'FIX_');
            if (roomProtectionClaimed[ri].has(zoneKey)) return;
            roomProtectionClaimed[ri].add(zoneKey);
          }
          // Full-cover floor protection dedup (wall prime + ceiling prime both have full floor cover)
          if (task.name && task.name.toLowerCase().includes('floor protection') && task.name.toLowerCase().includes('full room')) {
            const floorKey = 'FLOOR_FULL_COVER';
            if (roomProtectionClaimed[ri].has(floorKey)) return;
            roomProtectionClaimed[ri].add(floorKey);
          }

          // Get production rates for this task
          const rates = ratesByTask[`${spec.id}::${task.id}`] || [];
          if (rates.length === 0) {
            warnings.push(`No production rate found for task ${task.id} in ${spec.id} with config ${JSON.stringify(ctx)}`);
            return;
          }

          rates.forEach(rateRow => {
            // Check rate applies_when
            if (!evaluateAppliesWhen(rateRow.applies_when, ctx)) return;

            const resolved = resolveTaskRate(rateRow, ctx, overlayMap, spec.id);
            if (!resolved) return;

            const phase = mod.phase || 'apply';
            const psKey = rateRow.paintscope_key;

            // Helper: push a single task result entry (applies coat multiplier from module)
            const pushResult = (hrs, qty, label, itemModStack, itemGroup) => {
              if (hrs <= 0) return;
              const singleCoatHrs = Math.round(hrs * 1000) / 1000;
              const totalHrs = Math.round(singleCoatHrs * coatMultiplier * 1000) / 1000;
              phaseHours[phase] = (phaseHours[phase] || 0) + totalHrs;
              specTotalHours += totalHrs;
              taskResults.push({
                taskId: task.id,
                taskName: task.name,
                phase: phase,
                moduleName: mod.name,
                roomIndex: ri,
                roomLabel: room.label,
                psKey: psKey || '(fixed)',
                uom: resolved.uom,
                quantity: Math.round(qty * 100) / 100,
                baseRate: resolved.isFixed ? `${resolved.fixedMinutes}m` : resolved.effectiveRate,
                modStack: itemModStack || { ...modStack },
                hours: totalHrs,
                coatMultiplier: coatMultiplier,
                skillLevel: task.skill_level,
                crewSize: rateRow.crew_size || 1,
                isFixed: resolved.isFixed,
                itemGroup: itemGroup || null,
                floorType: ctx.floor_type || null,
                cathedralCeiling: !!room.cathedral_ceiling,
                vaultedCeiling:   !!room.vaulted_ceiling,
                coatingType:      ctx.coating_type || null,
              });
            };

            if (resolved.isFixed) {
              // FIXED: hours = fixed_minutes / 60 (no modifier per doctrine)
              pushResult(resolved.fixedMinutes / 60, 1, null, { ...modStack, complexityApplied: false });
            } else if (psKey === 'PS_OPENING_EA.WINDOW_TOTAL' && spec.id === 'SF_WINDOW_INT_NC') {
              // Per-item window calculation: separate line items per window type x size
              const { effectiveTotal, complexityApplied } = computeEffectiveTotal(modStack, phase, ctx);
              const itemResults = computeWindowPerItemResults(resolved.effectiveRate, effectiveTotal, room);
              if (itemResults) {
                itemResults.forEach(ir => {
                  pushResult(ir.hours, ir.quantity, null,
                    { ...modStack, sizeMod: ir.sizeMod, typeMod: ir.typeMod,
                      total: Math.round(effectiveTotal * ir.itemMod * 1000) / 1000,
                      complexityApplied },
                    ir.label);
                });
              }
            } else if ((psKey === 'PS_SURFACE_EA_SIDE.DOOR_SLAB' || psKey === 'PS_OPENING_EA.DOOR_OPENINGS_TOTAL') && spec.id === 'SF_DOOR_SLAB_INT_NC') {
              // Per-item door calculation: separate line items per door type
              const useSides = psKey === 'PS_SURFACE_EA_SIDE.DOOR_SLAB';
              const { effectiveTotal, complexityApplied } = computeEffectiveTotal(modStack, phase, ctx);
              const itemResults = computeDoorPerItemResults(resolved.effectiveRate, effectiveTotal, room, useSides, task.id);
              if (itemResults) {
                itemResults.forEach(ir => {
                  pushResult(ir.hours, ir.quantity, null,
                    { ...modStack, typeMod: ir.typeMod,
                      total: Math.round(effectiveTotal * ir.itemMod * 1000) / 1000,
                      complexityApplied },
                    ir.label);
                });
              }
            } else if (psKey && roomQty && roomQty.has(psKey)) {
              // Standard rate-based calculation
              const quantity = roomQty.get(psKey).value;
              const { effectiveTotal, complexityApplied } = computeEffectiveTotal(modStack, phase, ctx);
              const effRate = resolved.effectiveRate / effectiveTotal;
              // Arch element per-item grouping: assign itemGroup by PS key
              const archGroup = (spec.id === 'SF_ARCH_ELEMENT_NC') ? (ARCH_ELEMENT_PS_GROUPS[psKey] || null) : null;
              pushResult(quantity / effRate, quantity, null,
                { ...modStack, total: effectiveTotal, complexityApplied },
                archGroup);
            } else if (!psKey) {
              return; // No PS key — skip
            } else {
              return; // No quantity for this key in this room
            }
          });
        });
      });
    });

    if (specTotalHours > 0 || taskResults.length > 0) {
      specResults.push({
        specId: spec.id,
        specName: spec.name,
        domain: spec.domain,
        totalHours: Math.round(specTotalHours * 100) / 100,
        phaseHours: Object.fromEntries(Object.entries(phaseHours).map(([k,v]) => [k, Math.round(v*100)/100])),
        tasks: taskResults
      });
      grandTotalHours += specTotalHours;
    }
  });

  // Redistribute grain fill tasks into parent spec results.
  // Grain fill is computed as a standalone spec but hours should appear under the
  // parent line item (Trim, Door Frames, etc.) rather than as a separate entry.
  const grainFillIdx = specResults.findIndex(sr => sr.specId === 'SF_WOOD_GRAIN_FILL_NC');
  if (grainFillIdx >= 0) {
    const gfResult = specResults[grainFillIdx];
    // Group grain fill tasks by room, then distribute to parent specs by SF proportion
    const tasksByRoom = {};
    gfResult.tasks.forEach(t => {
      if (!tasksByRoom[t.roomIndex]) tasksByRoom[t.roomIndex] = [];
      tasksByRoom[t.roomIndex].push(t);
    });

    Object.entries(tasksByRoom).forEach(([ri, tasks]) => {
      const roomQty = roomLookups.get(parseInt(ri))?.qty;
      const breakdown = roomQty && roomQty.get('_GRAIN_FILL_BREAKDOWN');
      if (!breakdown) return;

      const totalSF = Object.values(breakdown).reduce((s, v) => s + v, 0);
      if (totalSF <= 0) return;

      // For each substrate that contributed grain fill SF, find its parent spec
      // and allocate a proportional share of grain fill tasks
      Object.entries(breakdown).forEach(([subId, sf]) => {
        const parentSpecId = GRAIN_FILL_PARENT_SPEC[subId];
        if (!parentSpecId) return;
        const proportion = sf / totalSF;

        // Find or create the parent spec result
        let parentResult = specResults.find(sr => sr.specId === parentSpecId);
        if (!parentResult) {
          // Parent spec may not have fired (e.g., factory_primed trim with grain fill on door frames only)
          // In this case, create a minimal parent result
          const parentSpec = db.spec_families.find(s => s.id === parentSpecId);
          parentResult = {
            specId: parentSpecId,
            specName: parentSpec ? parentSpec.name : parentSpecId,
            domain: 'interior',
            totalHours: 0,
            phaseHours: {},
            tasks: []
          };
          specResults.push(parentResult);
        }

        // Create prorated copies of each grain fill task for this parent
        tasks.forEach(t => {
          const proratedHours = Math.round(t.hours * proportion * 1000) / 1000;
          const proratedQty = Math.round(t.quantity * proportion * 100) / 100;
          if (proratedHours <= 0) return;
          parentResult.tasks.push({
            ...t,
            hours: proratedHours,
            quantity: proratedQty,
            specId: parentSpecId,
            taskName: `Grain Fill: ${t.taskName}`,
            isGrainFill: true,
          });
          parentResult.totalHours = Math.round((parentResult.totalHours + proratedHours) * 100) / 100;
          const p = t.phase || 'prep';
          parentResult.phaseHours[p] = Math.round(((parentResult.phaseHours[p] || 0) + proratedHours) * 100) / 100;
        });
      });
    });

    // Remove the standalone grain fill spec result
    specResults.splice(grainFillIdx, 1);
  }

  // Split door/window specs into per-type sub-entries for grouped display
  const SPECS_WITH_ITEM_GROUPS = [
    'SF_DOOR_SLAB_INT_NC', 'SF_WINDOW_INT_NC', 'SF_ARCH_ELEMENT_NC',
    'SF_WINDOW_EXT_NC', 'SF_DOOR_EXT_NC', 'SF_DOOR_EXT_RP', 'SF_GARAGE_DOOR_EXT_NC',
    'SF_WINDOW_EXT_RP', 'SF_GARAGE_DOOR_EXT_RP',
  ];
  const expandedSpecResults = [];
  specResults.forEach(sr => {
    // Check if this spec has per-item grouped tasks
    const hasGroups = SPECS_WITH_ITEM_GROUPS.includes(sr.specId) &&
                      sr.tasks.some(t => t.itemGroup);
    if (!hasGroups) {
      expandedSpecResults.push(sr);
      return;
    }

    // Collect unique item groups and shared (ungrouped) tasks
    const groups = {};
    const shared = [];
    sr.tasks.forEach(t => {
      if (t.itemGroup) {
        if (!groups[t.itemGroup]) groups[t.itemGroup] = [];
        groups[t.itemGroup].push(t);
      } else {
        shared.push(t);
      }
    });

    // Create a sub-result per item group
    const groupEntries = Object.entries(groups);
    groupEntries.forEach(([group, tasks]) => {
      // Prorate shared tasks across groups by proportion of grouped hours
      const groupedTotalHrs = groupEntries.reduce((s, [, ts]) => s + ts.reduce((s2, t) => s2 + t.hours, 0), 0);
      const groupHrs = tasks.reduce((s, t) => s + t.hours, 0);
      const proportion = groupedTotalHrs > 0 ? groupHrs / groupedTotalHrs : 1 / groupEntries.length;

      // Create prorated copies of shared tasks for this group
      const proratedShared = shared.map(t => ({
        ...t,
        hours: Math.round(t.hours * proportion * 1000) / 1000,
        quantity: Math.round(t.quantity * proportion * 100) / 100,
        itemGroup: group
      }));

      const allTasks = [...proratedShared, ...tasks];
      const totalHours = allTasks.reduce((s, t) => s + t.hours, 0);
      const phaseHours = {};
      allTasks.forEach(t => { phaseHours[t.phase] = (phaseHours[t.phase] || 0) + t.hours; });

      expandedSpecResults.push({
        ...sr,
        specName: sr.specId === 'SF_DOOR_SLAB_INT_NC' ? `${group} Door`
                : sr.specId === 'SF_WINDOW_INT_NC' ? `${group} Window`
                : sr.specId === 'SF_ARCH_ELEMENT_NC' ? group
                : sr.specId === 'SF_WINDOW_EXT_NC' ? `Ext ${group} Window`
                : sr.specId === 'SF_WINDOW_EXT_RP' ? `Ext ${group} Window (RP)`
                : sr.specId === 'SF_DOOR_EXT_NC' ? `Ext ${group} Door`
                : sr.specId === 'SF_DOOR_EXT_RP' ? `Ext ${group} Door (RP)`
                : sr.specId === 'SF_GARAGE_DOOR_EXT_NC' ? `Garage Door — ${group}`
                : sr.specId === 'SF_GARAGE_DOOR_EXT_RP' ? `Garage Door (RP) — ${group}`
                : `${SPEC_DISPLAY_NAMES[sr.specId] || sr.specName} — ${group}`,
        specId: sr.specId,
        itemGroup: group,
        totalHours: Math.round(totalHours * 100) / 100,
        phaseHours: Object.fromEntries(Object.entries(phaseHours).map(([k, v]) => [k, Math.round(v * 100) / 100])),
        tasks: allTasks
      });
    });
  });
  specResults = expandedSpecResults;

  // ============================================================
  // EXTERIOR ESTIMATION — scenario engine path
  // ============================================================
  // The legacy SF_EXT_* spec-driven exterior loop was retired in this PR.
  // Exterior elevation + standalone inputs are emitted by context-adapter's
  // buildScenarioInputs (filter: roomIndex < 0) and run through the scenario
  // engine. Output is converted to specResult shape so the downstream
  // protection dedup, material estimates, and EstimateView consumers stay
  // unchanged.
  // Build project-level overlay map for the scenario engine (mirrors useEstimateScenario.js:84-110).
  // The legacy `overlayMap` parameter uses spec-keyed task ids; the scenario engine uses bare task ids.
  // Constructed here so user rate edits + protection_heuristics rates apply to exterior tasks.
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

  const userOverrides = state?.project?.rate_overrides || {};
  for (const [taskId, ov] of Object.entries(userOverrides)) {
    if (ov?.rate_per_hour != null && ov.rate_per_hour > 0) {
      projectOverlayMap[taskId] = { rate_per_hour: ov.rate_per_hour };
    }
  }

  const exterior = state.exterior;
  if (exterior && exterior.elevations && exterior.elevations.length > 0) {
    const exteriorInputs = [
      ...buildElevationScenarioInputs(state, db),
      ...buildStandaloneScenarioInputs(state, db),
    ];

    const perInputResults = [];
    for (const inp of exteriorInputs) {
      try {
        const matchInfo = findBestMatch(canonicalBundle, inp.ctx);
        if (!matchInfo.scenario) {
          const near = findNearMisses(canonicalBundle, inp.ctx, 2).slice(0, 1);
          const nearMsg = near[0]
            ? ` (near-miss: ${near[0].scenario.scenario_id})`
            : '';
          warnings.push(`[${inp.roomLabel}] ${inp.specId}: no scenario match${nearMsg}`);
          continue;
        }
        if (matchInfo.tied) warnings.push(...matchInfo.warnings);

        const result = runScenarioEstimate({
          scenarioBundle: canonicalBundle,
          ctx: inp.ctx,
          roomQty: inp.roomQty,
          roomItems: inp.roomItems,
          overlayMap: projectOverlayMap,
          roomIndex: inp.roomIndex,
          roomLabel: inp.roomLabel,
        });
        if (!result || !result.scenarioId) continue;

        perInputResults.push({
          specId: inp.specId,
          specName: SPEC_DISPLAY_NAMES[inp.specId] || inp.specId,
          roomLabel: inp.roomLabel,
          roomIndex: inp.roomIndex,
          ctx: inp.ctx,
          scenarioId: result.scenarioId,
          scenarioName: result.scenarioName,
          totalHours: result.totalHours,
          phaseHours: result.phaseHours,
          tasks: result.tasks,
          warnings: result.warnings || [],
        });
        if (result.warnings?.length) warnings.push(...result.warnings);
      } catch (err) {
        warnings.push(`[${inp.roomLabel}] ${inp.specId}: ${err.message}`);
      }
    }

    const extSpecResults = scenarioResultsToSpecResults(perInputResults, { domain: 'exterior' });
    for (const sr of extSpecResults) {
      specResults.push(sr);
      grandTotalHours += sr.totalHours;
    }
  }

  // Sort specs by total hours descending
  specResults.sort((a,b) => b.totalHours - a.totalHours);

  // Room-level floor protection deduplication
  const roomProtection = resolveRoomFloorProtection(specResults, db, rooms);

  // Room-level fixture protection (bathroom fixtures × active painting contexts)
  const fixtureProtection = resolveRoomFixtureProtection(rooms, roomSpecMethods);

  // Exterior protection dedup — per-elevation and per-standalone-item
  let exteriorProtection = { elevationProtection: {}, standaloneProtection: {} };
  if (exterior && exterior.elevations && exterior.elevations.length > 0) {
    exteriorProtection = resolveExteriorProtection(specResults, db, exterior);
  }

  // Recalculate grand total (some hours moved from specs to protection categories)
  grandTotalHours = specResults.reduce((s, sr) => s + sr.totalHours, 0);
  Object.values(roomProtection).forEach(rp => { grandTotalHours += rp.totalHours; });
  Object.values(fixtureProtection).forEach(fp => { grandTotalHours += fp.totalHours; });
  Object.values(exteriorProtection.elevationProtection).forEach(ep => { grandTotalHours += ep.totalHours; });
  Object.values(exteriorProtection.standaloneProtection).forEach(sp => { grandTotalHours += sp.totalHours; });

  // Material estimates — interior (DB-driven) + exterior (default profiles)
  const intSpecResults = specResults.filter(sr => sr.domain !== 'exterior');
  const interiorMaterialEstimates = computeMaterialEstimates(state, db, roomLookups, intSpecResults);
  const extSpecResults = specResults.filter(sr => sr.domain === 'exterior');
  const exteriorMaterialEstimates = (exterior && exterior.elevations && exterior.elevations.length > 0)
    ? computeExteriorMaterialEstimates(state, db, buildElevationQuantityLookups(state), buildStandaloneQuantityLookups(state), extSpecResults)
    : [];
  const materialEstimates = [...interiorMaterialEstimates, ...exteriorMaterialEstimates];

  const crewDays = grandTotalHours / 8 / 2; // 8hr day, 2-person crew

  // Compute closet hours per room — proportion of surface quantities from closets
  const closetHoursByRoom = {};
  rooms.forEach((room, ri) => {
    const roomLookup = roomLookups.get(ri);
    const roomQty = roomLookup?.qty;
    const cQty = roomLookup?.closetQty;
    if (!cQty || cQty.size === 0) return;
    // Sum surface-key quantities from closets and total
    const surfacePrefix = 'PS_SURFACE_';
    let closetSurfaceTotal = 0, roomSurfaceTotal = 0;
    roomQty.forEach((val, key) => {
      if (key.startsWith(surfacePrefix)) roomSurfaceTotal += val.value;
    });
    cQty.forEach((val, key) => {
      if (key.startsWith(surfacePrefix)) closetSurfaceTotal += val.value;
    });
    if (roomSurfaceTotal <= 0) return;
    const fraction = closetSurfaceTotal / roomSurfaceTotal;
    // Sum all interior hours for this room from spec results
    let roomHours = 0;
    specResults.forEach(sr => {
      if (sr.domain === 'exterior') return;
      sr.tasks.forEach(t => {
        if (t.roomIndex === ri) roomHours += t.hours;
      });
    });
    closetHoursByRoom[ri] = Math.round(roomHours * fraction * 100) / 100;
  });

  // --- Pricing pass (requires profile) ---
  const pricing = computePricing(profile, specResults, materialEstimates);

  return {
    specResults,
    roomProtection,
    fixtureProtection,
    exteriorProtection,
    closetHoursByRoom,
    totalHours: Math.round(grandTotalHours * 100) / 100,
    totalCrewDays: Math.round(crewDays * 10) / 10,
    warnings,
    materialEstimates,
    activatedSpecs: specResults.length,
    totalSpecs: db.spec_families.length,
    pricing
  };
}
