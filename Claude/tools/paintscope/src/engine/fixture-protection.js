import { FIXTURE_MAP } from '../data/fixture-catalog.js';
import { SPEC_PAINTING_CONTEXT, isSprayMethod, resolveFixtureScenario } from '../data/fixture-protection.js';

/**
 * Resolve fixture protection tasks/modifiers for all rooms.
 *
 * @param {Array} rooms - state.rooms array
 * @param {Array} roomSpecMethods - [{ roomIndex, specId, method }] from the main spec loop
 * @returns {Object} { [roomIndex]: { tasks: [...], totalHours } }
 */
export function resolveRoomFixtureProtection(rooms, roomSpecMethods) {
  // Step 1: Build per-room active contexts with worst-case method
  // roomIndex → Map<paintingContext, applicationMethod>
  // "worst-case" = spray beats brush_roll (spray needs physical protection)
  const roomContexts = {};

  roomSpecMethods.forEach(({ roomIndex, specId, method }) => {
    const ctx = SPEC_PAINTING_CONTEXT[specId];
    if (!ctx) return;

    if (!roomContexts[roomIndex]) roomContexts[roomIndex] = new Map();
    const existing = roomContexts[roomIndex].get(ctx);
    if (!existing || (isSprayMethod(method) && !isSprayMethod(existing))) {
      roomContexts[roomIndex].set(ctx, method);
    }
  });

  const result = {};

  // Step 2: For each room with active contexts, resolve fixture protection
  Object.entries(roomContexts).forEach(([ri, contextMap]) => {
    const riNum = parseInt(ri);
    const room = rooms[riNum];
    if (!room) return;

    const tasks = [];
    const subs = room.substrates || {};

    // Auto-detect: Window masking when any spray spec fires + windows exist but aren't being painted
    const anySpray = [...contextMap.values()].some(m => isSprayMethod(m));
    if (anySpray) {
      const windowItems = subs.windows?.items || [];
      const windowCount = windowItems.reduce((sum, w) => sum + (parseInt(w.count) || 0), 0);
      const windowsPainting = !!subs.windows?.painting;
      if (windowCount > 0 && !windowsPainting) {
        tasks.push({
          taskId: '__FP_WINDOW_MASK_SETUP__',
          taskName: `Mask Windows \u2014 Full Cover (${windowCount} windows)`,
          phase: 'setup',
          hours: round3(windowCount * 8 / 60), // ~8 min per window
          isFixed: true,
          baseRate: '8m/EA',
          quantity: windowCount,
          uom: 'EA',
          isFixtureProtection: true,
          fixtureId: 'windows_auto',
          protectionLevel: 'full_mask',
          mechanism: 'task',
          roomIndex: riNum,
          roomLabel: room.label,
        });
        tasks.push({
          taskId: '__FP_WINDOW_MASK_TEARDOWN__',
          taskName: `Remove Window Masking (${windowCount} windows)`,
          phase: 'cleanup',
          hours: round3(windowCount * 4 / 60), // ~4 min per window
          isFixed: true,
          baseRate: '4m/EA',
          quantity: windowCount,
          uom: 'EA',
          isFixtureProtection: true,
          fixtureId: 'windows_auto',
          protectionLevel: 'full_mask',
          mechanism: 'task',
          roomIndex: riNum,
          roomLabel: room.label,
        });
      }

      // Auto-detect: Door masking when spray fires + doors exist but aren't being painted.
      // Item is unpainted if the substrate-level toggle is off OR the per-item paint flag is false.
      const doorItems = subs.doors?.items || [];
      const doorsPainting = !!subs.doors?.painting;
      const unpaintedDoorCount = doorItems.reduce((sum, d) => {
        const itemPainting = d.painting !== false;
        return (doorsPainting && itemPainting) ? sum : sum + (parseInt(d.count) || 0);
      }, 0);
      if (unpaintedDoorCount > 0) {
        tasks.push({
          taskId: '__FP_DOOR_MASK_SETUP__',
          taskName: `Mask Doors \u2014 Full Cover (${unpaintedDoorCount} doors)`,
          phase: 'setup',
          hours: round3(unpaintedDoorCount * 6 / 60), // ~6 min per door
          isFixed: true,
          baseRate: '6m/EA',
          quantity: unpaintedDoorCount,
          uom: 'EA',
          isFixtureProtection: true,
          fixtureId: 'doors_auto',
          protectionLevel: 'full_mask',
          mechanism: 'task',
          roomIndex: riNum,
          roomLabel: room.label,
        });
        tasks.push({
          taskId: '__FP_DOOR_MASK_TEARDOWN__',
          taskName: `Remove Door Masking (${unpaintedDoorCount} doors)`,
          phase: 'cleanup',
          hours: round3(unpaintedDoorCount * 3 / 60), // ~3 min per door
          isFixed: true,
          baseRate: '3m/EA',
          quantity: unpaintedDoorCount,
          uom: 'EA',
          isFixtureProtection: true,
          fixtureId: 'doors_auto',
          protectionLevel: 'full_mask',
          mechanism: 'task',
          roomIndex: riNum,
          roomLabel: room.label,
        });
      }
    }

    // Catalog fixtures
    const fixtures = room.fixtures || {};
    const fixtureIds = Object.keys(fixtures);
    if (fixtureIds.length === 0 && tasks.length === 0) return;

    // For each fixture present in the room
    fixtureIds.forEach(fixtureId => {
      const fixtureDef = FIXTURE_MAP[fixtureId];
      if (!fixtureDef) return;

      // Feature wall: SF-based protection (mask/cover) — supports multiple items
      if (fixtureId === 'feature_wall') {
        const cfg = fixtures[fixtureId];
        const items = cfg.items || (cfg.length_ft ? [cfg] : []);
        const sf = items.reduce((s, i) => s + Math.round((parseFloat(i.length_ft) || 0) * (parseFloat(i.height_ft) || 0) * (parseInt(i.count) || 1)), 0);
        if (sf <= 0) return;
        const SETUP_RATE = 450;   // SF/hr for masking setup
        const REMOVAL_RATE = 1500; // SF/hr for removal
        const setupHrs = round3(sf / SETUP_RATE);
        const teardownHrs = round3(sf / REMOVAL_RATE);
        const protLevel = items[0]?.protection || cfg.protection || 'full_mask';
        const levelLabel = protLevel.replace(/_/g, ' ');
        tasks.push({
          taskId: '__FP_FEATURE_WALL_SETUP__',
          taskName: `Protect Feature Wall \u2014 ${capitalize(levelLabel)}`,
          phase: 'setup',
          hours: setupHrs,
          isFixed: false,
          baseRate: `${SETUP_RATE} SF/hr`,
          quantity: sf,
          uom: 'SF',
          isFixtureProtection: true,
          fixtureId,
          protectionLevel: protLevel,
          mechanism: 'task',
          roomIndex: riNum,
          roomLabel: room.label,
        });
        tasks.push({
          taskId: '__FP_FEATURE_WALL_TEARDOWN__',
          taskName: `Remove Feature Wall Protection`,
          phase: 'cleanup',
          hours: teardownHrs,
          isFixed: false,
          baseRate: `${REMOVAL_RATE} SF/hr`,
          quantity: sf,
          uom: 'SF',
          isFixtureProtection: true,
          fixtureId,
          protectionLevel: protLevel,
          mechanism: 'task',
          roomIndex: riNum,
          roomLabel: room.label,
        });
        return;
      }

      // Cabinet protection: LF-based masking (Protection tab)
      // Tape edges + encapsulate entire cabinet system (including countertop) with plastic.
      // Lower run: 15 min per 20 LF, Upper run: 10 min per 20 LF.
      if (fixtureId === 'cabinets') {
        const cfg = fixtures[fixtureId];
        const lf = parseFloat(cfg.linear_ft) || 0;
        if (lf <= 0) return;
        const hasUppers = cfg.layout === 'lower_upper';
        const protLevel = cfg.protection || 'full_cover';
        const LOWER_MIN_PER_20LF = 15;
        const UPPER_MIN_PER_20LF = 10;
        const TEARDOWN_MIN_PER_20LF = 5;
        const setupMin = (lf / 20) * LOWER_MIN_PER_20LF + (hasUppers ? (lf / 20) * UPPER_MIN_PER_20LF : 0);
        const teardownMin = (lf / 20) * TEARDOWN_MIN_PER_20LF + (hasUppers ? (lf / 20) * 3 : 0);
        const setupHrs = round3(setupMin / 60);
        const teardownHrs = round3(teardownMin / 60);
        const desc = hasUppers ? `${lf} LF lower + upper` : `${lf} LF lower only`;
        tasks.push({
          taskId: '__FP_CABINET_PROTECT_SETUP__',
          taskName: `Mask Cabinet System \u2014 ${capitalize(protLevel.replace(/_/g, ' '))} (${desc})`,
          phase: 'setup',
          hours: setupHrs,
          isFixed: false,
          baseRate: `${LOWER_MIN_PER_20LF}min/20LF lower${hasUppers ? ` + ${UPPER_MIN_PER_20LF}min/20LF upper` : ''}`,
          quantity: lf,
          uom: 'LF',
          isFixtureProtection: true,
          fixtureId,
          protectionLevel: protLevel,
          mechanism: 'task',
          roomIndex: riNum,
          roomLabel: room.label,
        });
        tasks.push({
          taskId: '__FP_CABINET_PROTECT_TEARDOWN__',
          taskName: `Remove Cabinet Masking (${desc})`,
          phase: 'cleanup',
          hours: teardownHrs,
          isFixed: false,
          baseRate: `${TEARDOWN_MIN_PER_20LF}min/20LF`,
          quantity: lf,
          uom: 'LF',
          isFixtureProtection: true,
          fixtureId,
          protectionLevel: protLevel,
          mechanism: 'task',
          roomIndex: riNum,
          roomLabel: room.label,
        });
        return;
      }

      // Fireplace / stone fireplace: SF-based masking — tape edges + encapsulate with plastic.
      // Setup: 100 SF/hr, Teardown: 300 SF/hr.
      if (fixtureId === 'fireplace' || fixtureId === 'stone_fireplace') {
        const cfg = fixtures[fixtureId];
        const count = parseInt(cfg.count) || 1;
        const sf = Math.round((parseFloat(cfg.width_ft) || 0) * (parseFloat(cfg.height_ft) || 0) * count);
        if (sf <= 0) return;
        const SETUP_RATE = 100;
        const TEARDOWN_RATE = 300;
        const setupHrs = round3(sf / SETUP_RATE);
        const teardownHrs = round3(sf / TEARDOWN_RATE);
        const protLevel = cfg.protection || 'full_cover';
        const label = fixtureDef.label;
        tasks.push({
          taskId: `__FP_${fixtureId.toUpperCase()}_SETUP__`,
          taskName: `Mask ${label} \u2014 ${capitalize(protLevel.replace(/_/g, ' '))} (${sf} SF)`,
          phase: 'setup',
          hours: setupHrs,
          isFixed: false,
          baseRate: `${SETUP_RATE} SF/hr`,
          quantity: sf,
          uom: 'SF',
          isFixtureProtection: true,
          fixtureId,
          protectionLevel: protLevel,
          mechanism: 'task',
          roomIndex: riNum,
          roomLabel: room.label,
        });
        tasks.push({
          taskId: `__FP_${fixtureId.toUpperCase()}_TEARDOWN__`,
          taskName: `Remove ${label} Masking (${sf} SF)`,
          phase: 'cleanup',
          hours: teardownHrs,
          isFixed: false,
          baseRate: `${TEARDOWN_RATE} SF/hr`,
          quantity: sf,
          uom: 'SF',
          isFixtureProtection: true,
          fixtureId,
          protectionLevel: protLevel,
          mechanism: 'task',
          roomIndex: riNum,
          roomLabel: room.label,
        });
        return;
      }

      // Only bathroom fixtures have context-dependent scenarios
      if (fixtureDef.group !== 'Bathroom') return;

      const label = fixtureDef.label;

      // Collect every scenario this fixture triggers across active painting contexts.
      // Physical protection (mechanism=task) is performed once for the whole visit, so
      // we collapse those down to a single dominant scenario. Production-penalty
      // modifiers stay per-context because they tax each spec's apply phase separately.
      const taskScenarios = [];
      const modifierScenarios = [];
      contextMap.forEach((method, paintingContext) => {
        const scenario = resolveFixtureScenario(fixtureId, paintingContext, method);
        if (!scenario) return;
        if (scenario.mechanism === 'task') taskScenarios.push({ scenario, paintingContext, method });
        else if (scenario.mechanism === 'modifier' && scenario.added_min > 0) modifierScenarios.push({ scenario, paintingContext, method });
      });

      if (taskScenarios.length > 0) {
        const dominant = taskScenarios.reduce((best, cur) => {
          const bestRank = PROTECTION_LEVEL_RANK[best.scenario.level] || 0;
          const curRank = PROTECTION_LEVEL_RANK[cur.scenario.level] || 0;
          if (curRank !== bestRank) return curRank > bestRank ? cur : best;
          return (cur.scenario.setup_min || 0) > (best.scenario.setup_min || 0) ? cur : best;
        });
        const { scenario, paintingContext, method } = dominant;
        const methodLabel = isSprayMethod(method) ? 'spray' : 'brush/roll';
        const levelLabel = scenario.level.replace(/_/g, ' ');

        if (scenario.setup_min > 0) {
          tasks.push({
            taskId: `__FP_${fixtureId.toUpperCase()}_SETUP__`,
            taskName: `Protect ${label} \u2014 ${capitalize(levelLabel)} (${paintingContext} ${methodLabel})`,
            phase: 'setup',
            hours: round3(scenario.setup_min / 60),
            isFixed: true,
            baseRate: `${scenario.setup_min}m`,
            quantity: 1,
            uom: 'EA',
            isFixtureProtection: true,
            fixtureId,
            paintingContext,
            protectionLevel: scenario.level,
            mechanism: 'task',
            roomIndex: riNum,
            roomLabel: room.label,
          });
        }

        if (scenario.teardown_min > 0) {
          tasks.push({
            taskId: `__FP_${fixtureId.toUpperCase()}_TEARDOWN__`,
            taskName: `Remove ${label} Protection (${paintingContext} ${methodLabel})`,
            phase: 'cleanup',
            hours: round3(scenario.teardown_min / 60),
            isFixed: true,
            baseRate: `${scenario.teardown_min}m`,
            quantity: 1,
            uom: 'EA',
            isFixtureProtection: true,
            fixtureId,
            paintingContext,
            protectionLevel: scenario.level,
            mechanism: 'task',
            roomIndex: riNum,
            roomLabel: room.label,
          });
        }
      }

      modifierScenarios.forEach(({ scenario, paintingContext, method }) => {
        const methodLabel = isSprayMethod(method) ? 'spray' : 'brush/roll';
        tasks.push({
          taskId: `__FP_${fixtureId.toUpperCase()}_${paintingContext.toUpperCase()}_MOD__`,
          taskName: `Fixture Obstruction \u2014 ${label} (${methodLabel} ${paintingContext})`,
          phase: 'apply',
          hours: round3(scenario.added_min / 60),
          isFixed: true,
          baseRate: `${scenario.added_min}m`,
          quantity: 1,
          uom: 'EA',
          isFixtureProtection: true,
          fixtureId,
          paintingContext,
          mechanism: 'modifier',
          roomIndex: riNum,
          roomLabel: room.label,
        });
      });
    });

    if (tasks.length > 0) {
      result[ri] = {
        tasks,
        totalHours: round3(tasks.reduce((sum, t) => sum + t.hours, 0)),
      };
    }
  });

  return result;
}

// Higher rank = more restrictive protection. Used to pick the dominant
// scenario when one fixture is touched by multiple painting contexts.
const PROTECTION_LEVEL_RANK = {
  none: 0,
  item_mask: 1,
  partial_cover: 2,
  full_cover: 3,
  full_mask: 3,
};

function round3(n) {
  return Math.round(n * 1000) / 1000;
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
