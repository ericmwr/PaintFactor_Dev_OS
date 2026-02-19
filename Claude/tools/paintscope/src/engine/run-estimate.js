import { buildRoomQuantityLookups, OPENING_SUBSTRATES } from './quantity-lookups.js';
import { resolveQualityTier, resolveApplicationMethod, resolveTextureForSpec } from './spec-resolution.js';
import { resolveSubstrateStateForSpec, specAcceptsState, isSpecStateCompatible, evaluateAppliesWhen } from './spec-compatibility.js';
import { computeModifierStack } from './modifier-stack.js';
import { computeWindowPerItemResults, computeDoorPerItemResults } from './per-item-compute.js';
import { deriveRoom, deriveHeightBand } from './derive-room.js';
import { computeMaterialEstimates } from './material-estimates.js';
import { resolveRoomFloorProtection } from './floor-protection.js';
import { SPEC_SUBSTRATE_MAP, SPEC_OUTPUT_STATES, UI_STATE_TO_SPEC_STATE, SPEC_VALID_INPUT_STATES } from '../data/spec-maps.js';
import { SPEC_DISPLAY_NAMES, specDisplayName, PHASE_ORDER, ARCH_ELEMENT_PS_GROUPS } from '../data/constants.js';
import { FIXTURE_CATALOG } from '../data/fixture-catalog.js';
import { WINDOW_TYPE_LABELS, WINDOW_SIZE_LABELS, DOOR_TYPE_LABELS } from '../data/modifiers.js';

/**
 * Resolve a task's effective rate from its production rate row + context.
 * Returns { effectiveRate, isFixed, fixedMinutes, uom, source }
 */
function resolveTaskRate(rateRow, ctx) {
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
export function runEstimate(state, db) {
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

  // For each spec family
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

            const resolved = resolveTaskRate(rateRow, ctx);
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

  // Split door/window specs into per-type sub-entries for grouped display
  const SPECS_WITH_ITEM_GROUPS = ['SF_DOOR_SLAB_INT_NC', 'SF_WINDOW_INT_NC', 'SF_ARCH_ELEMENT_NC'];
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

  // Sort specs by total hours descending
  specResults.sort((a,b) => b.totalHours - a.totalHours);

  // Room-level floor protection deduplication
  const roomProtection = resolveRoomFloorProtection(specResults, db, rooms);

  // Recalculate grand total (some hours moved from specs to room protection)
  grandTotalHours = specResults.reduce((s, sr) => s + sr.totalHours, 0);
  Object.values(roomProtection).forEach(rp => { grandTotalHours += rp.totalHours; });

  // Material estimates
  const materialEstimates = computeMaterialEstimates(state, db, roomLookups);

  const crewDays = grandTotalHours / 8 / 2; // 8hr day, 2-person crew

  return {
    specResults,
    roomProtection,
    totalHours: Math.round(grandTotalHours * 100) / 100,
    totalCrewDays: Math.round(crewDays * 10) / 10,
    warnings,
    materialEstimates,
    activatedSpecs: specResults.length,
    totalSpecs: db.spec_families.length
  };
}
