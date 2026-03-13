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

    const fixtures = room.fixtures || {};
    const fixtureIds = Object.keys(fixtures);
    if (fixtureIds.length === 0) return;

    const tasks = [];

    // For each fixture present in the room
    fixtureIds.forEach(fixtureId => {
      const fixtureDef = FIXTURE_MAP[fixtureId];
      if (!fixtureDef) return;

      // Only bathroom fixtures have context-dependent scenarios
      if (fixtureDef.group !== 'Bathroom') return;

      const label = fixtureDef.label;

      // For each active painting context in this room
      contextMap.forEach((method, paintingContext) => {
        const scenario = resolveFixtureScenario(fixtureId, paintingContext, method);
        if (!scenario) return;

        const methodLabel = isSprayMethod(method) ? 'spray' : 'brush/roll';

        if (scenario.mechanism === 'task') {
          // Physical protection work: setup + teardown entries
          const levelLabel = scenario.level.replace(/_/g, ' ');

          if (scenario.setup_min > 0) {
            tasks.push({
              taskId: `__FP_${fixtureId.toUpperCase()}_${paintingContext.toUpperCase()}_SETUP__`,
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
              taskId: `__FP_${fixtureId.toUpperCase()}_${paintingContext.toUpperCase()}_TEARDOWN__`,
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
        } else if (scenario.mechanism === 'modifier' && scenario.added_min > 0) {
          // Production penalty: fixture presence slows adjacent work
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
        }
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

function round3(n) {
  return Math.round(n * 1000) / 1000;
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
