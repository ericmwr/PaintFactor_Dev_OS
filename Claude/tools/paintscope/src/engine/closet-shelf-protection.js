import {
  SHELVING_PROTECTION_DEFAULTS,
  PROTECTION_LEVEL_MULTIPLIERS,
  resolveProtectionLevel,
  labelForShelvingType,
} from '../data/closet-shelving-protection.js';

/**
 * Resolve closet shelf protection tasks for all rooms.
 *
 * For each closet where:
 *   - shelving_type !== 'none'
 *   - shelving_lf > 0
 *   - paint_shelving === false
 *
 * Emits up to three task entries:
 *   1. setup    — masking setup time
 *   2. cleanup  — masking teardown time
 *   3. apply    — obstruction modifier (only if any closet-relevant
 *                 substrate is active in the parent room)
 *
 * Mirrors the shape of resolveRoomFixtureProtection() so that
 * run-estimate.js can merge the result the same way.
 *
 * Returns: { [roomIndex]: { tasks: [...], totalHours } }
 */
export function resolveClosetShelfProtection(rooms) {
  const result = {};

  rooms.forEach((room, ri) => {
    const subs = room.substrates || {};
    const closetRelevantActive = !!subs.walls || !!subs.ceiling || !!subs.baseboard;

    const tasks = [];

    (room.closets || []).forEach((closet) => {
      if (closet.shelving_type === 'none') return;
      const lf = parseFloat(closet.shelving_lf) || 0;
      if (lf <= 0) return;
      if (closet.paint_shelving !== false) return; // painting → no protection here

      const def = SHELVING_PROTECTION_DEFAULTS[closet.shelving_type];
      if (!def) return;

      const level = resolveProtectionLevel(closet);
      const levelMult = PROTECTION_LEVEL_MULTIPLIERS[level] ?? 1.0;
      const typeLabel = labelForShelvingType(closet.shelving_type);

      const setupHrs    = round3(lf * def.setup_min_per_lf    * levelMult / 60);
      const teardownHrs = round3(lf * def.teardown_min_per_lf * levelMult / 60);
      const obstructHrs = round3(lf * def.obstruction_min_per_lf / 60);

      if (setupHrs > 0) {
        tasks.push({
          taskId: `__CSP_${closet.id}_SETUP__`,
          taskName: `Mask ${typeLabel} (${closet.label})`,
          phase: 'setup',
          hours: setupHrs,
          isFixed: false,
          baseRate: `${def.setup_min_per_lf}m/LF \u00d7 ${levelMult}`,
          quantity: lf,
          uom: 'LF',
          isClosetShelfProtection: true,
          closetId: closet.id,
          shelvingType: closet.shelving_type,
          protectionLevel: level,
          mechanism: 'task',
          roomIndex: ri,
          roomLabel: room.label,
        });
      }

      if (teardownHrs > 0) {
        tasks.push({
          taskId: `__CSP_${closet.id}_TEARDOWN__`,
          taskName: `Remove ${typeLabel} Masking (${closet.label})`,
          phase: 'cleanup',
          hours: teardownHrs,
          isFixed: false,
          baseRate: `${def.teardown_min_per_lf}m/LF \u00d7 ${levelMult}`,
          quantity: lf,
          uom: 'LF',
          isClosetShelfProtection: true,
          closetId: closet.id,
          shelvingType: closet.shelving_type,
          protectionLevel: level,
          mechanism: 'task',
          roomIndex: ri,
          roomLabel: room.label,
        });
      }

      if (obstructHrs > 0 && closetRelevantActive) {
        tasks.push({
          taskId: `__CSP_${closet.id}_OBSTRUCTION__`,
          taskName: `Shelf Obstruction \u2014 ${closet.label}`,
          phase: 'apply',
          hours: obstructHrs,
          isFixed: false,
          baseRate: `${def.obstruction_min_per_lf}m/LF`,
          quantity: lf,
          uom: 'LF',
          isClosetShelfProtection: true,
          closetId: closet.id,
          shelvingType: closet.shelving_type,
          protectionLevel: level,
          mechanism: 'modifier',
          roomIndex: ri,
          roomLabel: room.label,
        });
      }
    });

    if (tasks.length > 0) {
      result[ri] = {
        tasks,
        totalHours: round3(tasks.reduce((s, t) => s + t.hours, 0)),
      };
    }
  });

  return result;
}

function round3(n) {
  return Math.round(n * 1000) / 1000;
}
