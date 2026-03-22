import { buildRoomQuantityLookups, OPENING_SUBSTRATES } from './quantity-lookups.js';
import { buildElevationQuantityLookups, buildStandaloneQuantityLookups } from './quantity-lookups-exterior.js';
import { resolveQualityTier, resolveApplicationMethod, resolveTextureForSpec, resolveCoatingType, resolveStainMethod, resolveClearMethod, resolveCoatCounts, resolveClearSheen, resolveWoodSpecies } from './spec-resolution.js';
import { resolveSubstrateStateForSpec, specAcceptsState, isSpecStateCompatible, evaluateAppliesWhen } from './spec-compatibility.js';
import { computeModifierStack } from './modifier-stack.js';
import { computeWindowPerItemResults, computeDoorPerItemResults, computeExtWindowPerItemResults, computeExtDoorPerItemResults, computeGarageDoorPerItemResults } from './per-item-compute.js';
import { deriveRoom, deriveHeightBand } from './derive-room.js';
import { deriveElevation, deriveAccessBand } from './derive-elevation.js';
import { computeMaterialEstimates, computeExteriorMaterialEstimates } from './material-estimates.js';
import { resolveRoomFloorProtection } from './floor-protection.js';
import { resolveRoomFixtureProtection } from './fixture-protection.js';
import { resolveExteriorProtection } from './exterior-protection.js';
import { SPEC_SUBSTRATE_MAP, SPEC_OUTPUT_STATES, UI_STATE_TO_SPEC_STATE, SPEC_VALID_INPUT_STATES, EXT_UI_STATE_TO_SPEC_STATE, EXTERIOR_SPEC_IDS, getExteriorSpecIds, STAIN_SPEC_FAMILIES, GRAIN_FILL_PARENT_SPEC } from '../data/spec-maps.js';
import { SPEC_DISPLAY_NAMES, specDisplayName, PHASE_ORDER, ARCH_ELEMENT_PS_GROUPS } from '../data/constants.js';
import { FIXTURE_CATALOG } from '../data/fixture-catalog.js';
import { WINDOW_TYPE_LABELS, WINDOW_SIZE_LABELS, DOOR_TYPE_LABELS } from '../data/modifiers.js';

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
export function runEstimate(state, db, overlayMap) {
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

  const tasksByModule = {};
  db.sop_tasks.forEach(t => {
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
    if (EXTERIOR_SPEC_IDS.has(spec.id)) return; // Skip exterior — processed in exterior loop

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
      const roomQty = roomLookups.get(ri);
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
      const roomQty = roomLookups.get(ri);

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
                floorType: ctx.floor_type || null
              });
            };

            if (resolved.isFixed) {
              // FIXED: hours = fixed_minutes / 60 (no modifier per doctrine)
              pushResult(resolved.fixedMinutes / 60, 1, null, { ...modStack });
            } else if (psKey === 'PS_OPENING_EA.WINDOW_TOTAL' && spec.id === 'SF_WINDOW_INT_NC') {
              // Per-item window calculation: separate line items per window type x size
              const itemResults = computeWindowPerItemResults(resolved.effectiveRate, modStack.total, room);
              if (itemResults) {
                itemResults.forEach(ir => {
                  pushResult(ir.hours, ir.quantity, null,
                    { ...modStack, sizeMod: ir.sizeMod, typeMod: ir.typeMod, total: Math.round(modStack.total * ir.itemMod * 1000) / 1000 },
                    ir.label);
                });
              }
            } else if ((psKey === 'PS_SURFACE_EA_SIDE.DOOR_SLAB' || psKey === 'PS_OPENING_EA.DOOR_OPENINGS_TOTAL') && spec.id === 'SF_DOOR_SLAB_INT_NC') {
              // Per-item door calculation: separate line items per door type
              const useSides = psKey === 'PS_SURFACE_EA_SIDE.DOOR_SLAB';
              const itemResults = computeDoorPerItemResults(resolved.effectiveRate, modStack.total, room, useSides);
              if (itemResults) {
                itemResults.forEach(ir => {
                  pushResult(ir.hours, ir.quantity, null,
                    { ...modStack, typeMod: ir.typeMod, total: Math.round(modStack.total * ir.itemMod * 1000) / 1000 },
                    ir.label);
                });
              }
            } else if (psKey && roomQty && roomQty.has(psKey)) {
              // Standard rate-based calculation
              const quantity = roomQty.get(psKey).value;
              const effRate = resolved.effectiveRate / modStack.total;
              // Arch element per-item grouping: assign itemGroup by PS key
              const archGroup = (spec.id === 'SF_ARCH_ELEMENT_NC') ? (ARCH_ELEMENT_PS_GROUPS[psKey] || null) : null;
              pushResult(quantity / effRate, quantity, null, { ...modStack }, archGroup);
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
      const roomQty = roomLookups.get(parseInt(ri));
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
  // EXTERIOR ESTIMATION LOOP
  // ============================================================
  const exterior = state.exterior;
  if (exterior && exterior.elevations && exterior.elevations.length > 0) {
    const elevLookups = buildElevationQuantityLookups(state);
    const standaloneLookups = buildStandaloneQuantityLookups(state);
    const extDefaults = exterior.defaults || {};
    const siteConditions = exterior.site_conditions || {};
    const extProjectType = exterior.project_type || 'NC';
    const activeExtSpecIds = getExteriorSpecIds(extProjectType);

    db.spec_families.forEach(spec => {
      if (!activeExtSpecIds.has(spec.id)) return; // Only exterior specs for active project type

      const inputs = requiredInputsBySpec[spec.id] || [];
      const modules = (modulesBySpec[spec.id] || []).sort((a,b) => (a.sort_order||0)-(b.sort_order||0));
      if (modules.length === 0) return;

      const allPsKeys = inputs.map(i => i.paintscope_key);
      // Activation: check PS_EXT_ surface and opening keys
      const psKeys = allPsKeys.filter(k => k.startsWith('PS_EXT_SURFACE_') || k.startsWith('PS_EXT_EDGE_') || k.startsWith('PS_EXT_OPENING_'));

      let specTotalHours = 0;
      const phaseHours = {};
      const taskResults = [];

      // Determine which lookups to check: elevation-bound or standalone
      const isStandaloneSpec = isStandaloneSpecId(spec.id);
      const lookupsToProcess = [];

      if (isStandaloneSpec) {
        // Standalone specs process standalone item lookups
        standaloneLookups.forEach((qty, itemType) => {
          if (psKeys.some(k => qty.has(k) && qty.get(k).value > 0)) {
            lookupsToProcess.push({ qty, label: itemType, index: itemType, isStandalone: true });
          }
        });
      } else {
        // Elevation-bound specs process per-elevation
        elevLookups.forEach((qty, ei) => {
          if (psKeys.some(k => qty.has(k) && qty.get(k).value > 0)) {
            const elev = exterior.elevations[ei];
            lookupsToProcess.push({ qty, label: elev.label, index: ei, elev, isStandalone: false });
          }
        });
      }

      if (lookupsToProcess.length === 0) return;

      lookupsToProcess.forEach(({ qty: lookupQty, label, index, elev, isStandalone }) => {
        // Build exterior context
        const ctx = buildExteriorContext(spec.id, elev, extDefaults, siteConditions, isStandalone ? exterior.standalone : null, index, extProjectType);

        // Coat count lookup
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

        const modStack = computeModifierStack(spec.id, ctx, db, warnings);

        modules.forEach(mod => {
          if (!evaluateAppliesWhen(mod.applies_when, ctx)) return;

          let coatMultiplier = 1;
          if (mod.phase === 'interstage') coatMultiplier = interstageCycles;
          else if (mod.phase === 'finish' && !mod.id.includes('FINAL') && !/_COAT_\d/.test(mod.id)) coatMultiplier = finishCoats;

          const tasks = (tasksByModule[`${spec.id}::${mod.id}`] || []).sort((a,b) => (a.sort_order||0)-(b.sort_order||0));

          tasks.forEach(task => {
            if (task.appears_in_tiers && Array.isArray(task.appears_in_tiers)) {
              if (!task.appears_in_tiers.includes(ctx.quality_tier)) return;
            }
            if (!evaluateAppliesWhen(task.applies_when, ctx)) return;

            const rates = ratesByTask[`${spec.id}::${task.id}`] || [];
            if (rates.length === 0) return;

            rates.forEach(rateRow => {
              if (!evaluateAppliesWhen(rateRow.applies_when, ctx)) return;

              const resolved = resolveTaskRate(rateRow, ctx, overlayMap, spec.id);
              if (!resolved) return;

              const phase = mod.phase || 'apply';
              const psKey = rateRow.paintscope_key;

              const pushResult = (hrs, qty, itemModStack, itemGroup) => {
                if (hrs <= 0) return;
                const singleCoatHrs = Math.round(hrs * 1000) / 1000;
                const totalHrs = Math.round(singleCoatHrs * coatMultiplier * 1000) / 1000;
                phaseHours[phase] = (phaseHours[phase] || 0) + totalHrs;
                specTotalHours += totalHrs;
                taskResults.push({
                  taskId: task.id,
                  taskName: task.name,
                  phase,
                  moduleName: mod.name,
                  roomIndex: isStandalone ? index : index,
                  roomLabel: label,
                  psKey: psKey || '(fixed)',
                  uom: resolved.uom,
                  quantity: Math.round(qty * 100) / 100,
                  baseRate: resolved.isFixed ? `${resolved.fixedMinutes}m` : resolved.effectiveRate,
                  modStack: itemModStack || { ...modStack },
                  hours: totalHrs,
                  coatMultiplier,
                  skillLevel: task.skill_level,
                  crewSize: rateRow.crew_size || 1,
                  isFixed: resolved.isFixed,
                  domain: 'exterior',
                  elevationLabel: isStandalone ? null : label,
                  standaloneType: isStandalone ? index : null,
                  itemGroup: itemGroup || null,
                  conditionScale: ctx.condition_scale || null,
                });
              };

              if (resolved.isFixed) {
                pushResult(resolved.fixedMinutes / 60, 1);
              } else if (psKey && psKey.startsWith('PS_EXT_OPENING_EA.WINDOW_') && (spec.id === 'SF_WINDOW_EXT_NC' || spec.id === 'SF_WINDOW_EXT_RP') && elev) {
                // Per-item exterior window splitting
                const itemResults = computeExtWindowPerItemResults(resolved.effectiveRate, modStack.total, elev);
                if (itemResults) {
                  itemResults.forEach(ir => {
                    pushResult(ir.hours, ir.quantity,
                      { ...modStack, sizeMod: ir.sizeMod, typeMod: ir.typeMod, total: Math.round(modStack.total * ir.itemMod * 1000) / 1000 },
                      ir.label);
                  });
                } else if (lookupQty.has(psKey)) {
                  const quantity = lookupQty.get(psKey).value;
                  pushResult(quantity / (resolved.effectiveRate / modStack.total), quantity);
                }
              } else if (psKey === 'PS_EXT_OPENING_EA.DOOR_EXT' && (spec.id === 'SF_DOOR_EXT_NC' || spec.id === 'SF_DOOR_EXT_RP') && elev) {
                // Per-item exterior door splitting
                const itemResults = computeExtDoorPerItemResults(resolved.effectiveRate, modStack.total, elev);
                if (itemResults) {
                  itemResults.forEach(ir => {
                    pushResult(ir.hours, ir.quantity,
                      { ...modStack, typeMod: ir.typeMod, substrateMod: ir.substrateMod, total: Math.round(modStack.total * ir.itemMod * 1000) / 1000 },
                      ir.label);
                  });
                } else if (lookupQty.has(psKey)) {
                  const quantity = lookupQty.get(psKey).value;
                  pushResult(quantity / (resolved.effectiveRate / modStack.total), quantity);
                }
              } else if (psKey === 'PS_EXT_OPENING_EA.DOOR_GARAGE' && (spec.id === 'SF_GARAGE_DOOR_EXT_NC' || spec.id === 'SF_GARAGE_DOOR_EXT_RP') && isStandalone) {
                // Per-item garage door splitting
                const garageDoors = exterior.standalone?.garage_doors || [];
                const itemResults = computeGarageDoorPerItemResults(resolved.effectiveRate, modStack.total, garageDoors);
                if (itemResults) {
                  itemResults.forEach(ir => {
                    pushResult(ir.hours, ir.quantity,
                      { ...modStack, sizeMod: ir.sizeMod, panelMod: ir.panelMod, total: Math.round(modStack.total * ir.itemMod * 1000) / 1000 },
                      ir.label);
                  });
                } else if (lookupQty.has(psKey)) {
                  const quantity = lookupQty.get(psKey).value;
                  pushResult(quantity / (resolved.effectiveRate / modStack.total), quantity);
                }
              } else if (psKey && lookupQty.has(psKey)) {
                const quantity = lookupQty.get(psKey).value;
                const effRate = resolved.effectiveRate / modStack.total;
                pushResult(quantity / effRate, quantity);
              }
            });
          });
        });
      });

      if (specTotalHours > 0 || taskResults.length > 0) {
        specResults.push({
          specId: spec.id,
          specName: spec.name,
          domain: 'exterior',
          totalHours: Math.round(specTotalHours * 100) / 100,
          phaseHours: Object.fromEntries(Object.entries(phaseHours).map(([k,v]) => [k, Math.round(v*100)/100])),
          tasks: taskResults
        });
        grandTotalHours += specTotalHours;
      }
    });
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
  const interiorMaterialEstimates = computeMaterialEstimates(state, db, roomLookups);
  const extSpecResults = specResults.filter(sr => sr.domain === 'exterior');
  const exteriorMaterialEstimates = (exterior && exterior.elevations && exterior.elevations.length > 0)
    ? computeExteriorMaterialEstimates(state, db, buildElevationQuantityLookups(state), buildStandaloneQuantityLookups(state), extSpecResults)
    : [];
  const materialEstimates = [...interiorMaterialEstimates, ...exteriorMaterialEstimates];

  const crewDays = grandTotalHours / 8 / 2; // 8hr day, 2-person crew

  return {
    specResults,
    roomProtection,
    fixtureProtection,
    exteriorProtection,
    totalHours: Math.round(grandTotalHours * 100) / 100,
    totalCrewDays: Math.round(crewDays * 10) / 10,
    warnings,
    materialEstimates,
    activatedSpecs: specResults.length,
    totalSpecs: db.spec_families.length
  };
}

// ============================================================
// EXTERIOR HELPERS
// ============================================================

/**
 * Specs that are standalone (not elevation-bound).
 */
function isStandaloneSpecId(specId) {
  const STANDALONE_SPECS = new Set([
    // NC
    'SF_DECK_EXT', 'SF_FENCE_EXT', 'SF_FOUNDATION_EXT_NC',
    'SF_PORCH_CEILING_EXT_NC', 'SF_PORCH_FLOOR_EXT_NC',
    'SF_GARAGE_DOOR_EXT_NC', 'SF_METAL_EXT',
    // RP
    'SF_DECK_EXT_RP', 'SF_FENCE_EXT_RP', 'SF_FOUNDATION_EXT_RP',
    'SF_PORCH_CEILING_EXT_RP', 'SF_PORCH_FLOOR_EXT_RP',
    'SF_GARAGE_DOOR_EXT_RP', 'SF_METAL_EXT_RP',
  ]);
  return STANDALONE_SPECS.has(specId);
}

/**
 * Build exterior context for a spec running on an elevation or standalone item.
 * Implements three-level override cascade: project defaults → elevation → substrate-level.
 */
function buildExteriorContext(specId, elevation, extDefaults, siteConditions, standalone, index, projectType) {
  // Start with project exterior defaults
  const ctx = {
    quality_tier: extDefaults.quality_tier || 'QT3',
    application_method: extDefaults.application_method || 'spray_backbrush',
    surface_texture: 'smooth',
    // Site conditions (project-level)
    wind_exposure: siteConditions.wind_exposure || 'moderate',
    sun_exposure: siteConditions.sun_exposure || 'mixed',
    temperature_zone: siteConditions.temperature_zone || 'standard',
    // Access defaults to ground
    access_type: 'ground',
    height_band: 'GROUND',
    // RP condition scale (default from project defaults)
    condition_scale: projectType === 'RP' ? (extDefaults.condition_scale || 'GOOD') : undefined,
    project_type: projectType || 'NC',
  };

  // Elevation overrides (second level)
  if (elevation) {
    if (elevation.quality_tier) ctx.quality_tier = elevation.quality_tier;
    if (elevation.application_method) ctx.application_method = elevation.application_method;
    ctx.access_type = elevation.access_type || 'ground';
    ctx.height_band = deriveAccessBand(ctx.access_type);

    // Resolve substrate state from the relevant siding section or trim config
    const substrateSource = SPEC_SUBSTRATE_MAP[specId];
    if (substrateSource === 'ext_siding' && elevation.siding_sections?.length > 0) {
      const sec = elevation.siding_sections[0];
      const uiState = sec.substrate_state;
      if (uiState && EXT_UI_STATE_TO_SPEC_STATE[uiState]) {
        ctx.substrate_state = EXT_UI_STATE_TO_SPEC_STATE[uiState];
      }
      ctx.surface_texture = sec.texture_profile || 'smooth';
      ctx.siding_type = sec.siding_type;
      ctx.substrate_material = sec.substrate_material;
      // RP: per-section condition scale
      if (sec.condition_scale) ctx.condition_scale = sec.condition_scale;
    } else if (substrateSource === 'ext_trim') {
      // Use first enabled trim type's substrate state
      for (const config of Object.values(elevation.trim || {})) {
        if (config && config.enabled && config.substrate_state) {
          const uiState = config.substrate_state;
          if (EXT_UI_STATE_TO_SPEC_STATE[uiState]) {
            ctx.substrate_state = EXT_UI_STATE_TO_SPEC_STATE[uiState];
          }
          ctx.substrate_material = config.substrate_material;
          ctx.profile_complexity = config.profile_complexity || 'standard';
          // RP: per-trim condition scale
          if (config.condition_scale) ctx.condition_scale = config.condition_scale;
          break;
        }
      }
    }

    // Caulk scope
    if (elevation.caulk_scope) ctx.caulk_scope = elevation.caulk_scope;
  }

  // Standalone context overrides
  if (standalone && typeof index === 'string') {
    const items = standalone;
    if (index === 'deck' && items.deck) {
      ctx.coating_type = items.deck.coating_type || 'stain';
      const uiState = items.deck.substrate_state;
      if (uiState && EXT_UI_STATE_TO_SPEC_STATE[uiState]) ctx.substrate_state = EXT_UI_STATE_TO_SPEC_STATE[uiState];
      if (items.deck.condition_scale) ctx.condition_scale = items.deck.condition_scale;
    } else if (index === 'fence' && items.fence) {
      ctx.coating_type = items.fence.coating_type || 'stain';
      const uiState = items.fence.substrate_state;
      if (uiState && EXT_UI_STATE_TO_SPEC_STATE[uiState]) ctx.substrate_state = EXT_UI_STATE_TO_SPEC_STATE[uiState];
      if (items.fence.condition_scale) ctx.condition_scale = items.fence.condition_scale;
    } else if (index === 'foundation' && items.foundation) {
      const uiState = items.foundation.substrate_state;
      if (uiState && EXT_UI_STATE_TO_SPEC_STATE[uiState]) ctx.substrate_state = EXT_UI_STATE_TO_SPEC_STATE[uiState];
      if (items.foundation.condition_scale) ctx.condition_scale = items.foundation.condition_scale;
    } else if (index === 'porch' && items.porch) {
      const floor = items.porch.floor;
      const ceil = items.porch.ceiling;
      if (floor?.enabled && floor.substrate_state) {
        const uiState = floor.substrate_state;
        if (EXT_UI_STATE_TO_SPEC_STATE[uiState]) ctx.substrate_state = EXT_UI_STATE_TO_SPEC_STATE[uiState];
        if (floor.condition_scale) ctx.condition_scale = floor.condition_scale;
      } else if (ceil?.enabled && ceil.substrate_state) {
        const uiState = ceil.substrate_state;
        if (EXT_UI_STATE_TO_SPEC_STATE[uiState]) ctx.substrate_state = EXT_UI_STATE_TO_SPEC_STATE[uiState];
        if (ceil.condition_scale) ctx.condition_scale = ceil.condition_scale;
      }
    }
    // Garage doors and metal surfaces: condition from individual items
    if (index === 'garage_doors' && items.garage_doors?.length > 0) {
      const gd = items.garage_doors[0];
      if (gd.condition_scale) ctx.condition_scale = gd.condition_scale;
      const uiState = gd.substrate_state;
      if (uiState && EXT_UI_STATE_TO_SPEC_STATE[uiState]) ctx.substrate_state = EXT_UI_STATE_TO_SPEC_STATE[uiState];
    }
    if (index === 'metal' && items.metal_surfaces?.length > 0) {
      const ms = items.metal_surfaces[0];
      if (ms.condition_scale) ctx.condition_scale = ms.condition_scale;
      const uiState = ms.substrate_state;
      if (uiState && EXT_UI_STATE_TO_SPEC_STATE[uiState]) ctx.substrate_state = EXT_UI_STATE_TO_SPEC_STATE[uiState];
    }
  }

  return ctx;
}
