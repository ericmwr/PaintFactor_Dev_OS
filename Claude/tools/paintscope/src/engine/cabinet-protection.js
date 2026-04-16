/**
 * Resolve cabinet protection tasks for all rooms.
 *
 * For each room where substrates.cabinets exists and paint_cabinets === false:
 *   - Emits protection tasks based on protection_level (light/standard/heavy)
 *   - Each level includes successively more protection zones
 *
 * Returns: { [roomIndex]: { tasks: [...], totalHours } }
 */
export function resolveCabinetProtection(rooms) {
  const result = {};

  rooms.forEach((room, ri) => {
    const cab = room.substrates?.cabinets;
    if (!cab) return;
    if (cab.paint_cabinets !== false) return; // painting, not protecting
    const totalFaces = (cab.door_count || 0) + (cab.drawer_count || 0);
    if (totalFaces <= 0) return;

    const level = cab.protection_level || 'standard';
    const tasks = [];

    // LIGHT: tape + plastic on cabinet faces
    const faceCoverHrs = round3(totalFaces * 0.05); // 3 min per face
    if (faceCoverHrs > 0) {
      tasks.push({
        taskId: `__CABPROT_${ri}_FACE_COVER__`,
        taskName: `Cover Cabinet Faces (${level})`,
        phase: 'setup',
        hours: faceCoverHrs,
        isFixed: false,
        baseRate: '3 min/face',
        quantity: totalFaces,
        uom: 'EA',
        isCabinetProtection: true,
        protectionLevel: level,
        mechanism: 'task',
        roomIndex: ri,
        roomLabel: room.label,
      });
    }

    // STANDARD: + countertop edge + hardware covers
    if (level === 'standard' || level === 'heavy') {
      const hwCount = cab.hardware_count || 0;
      if (hwCount > 0) {
        tasks.push({
          taskId: `__CABPROT_${ri}_HARDWARE__`,
          taskName: 'Cover Cabinet Hardware',
          phase: 'setup',
          hours: round3(hwCount * 0.025), // 1.5 min per piece
          isFixed: false,
          baseRate: '1.5 min/pc',
          quantity: hwCount,
          uom: 'EA',
          isCabinetProtection: true,
          protectionLevel: level,
          mechanism: 'task',
          roomIndex: ri,
          roomLabel: room.label,
        });
      }
      // Countertop edge — estimate from cabinet_count
      const cabCount = cab.cabinet_count || 0;
      const counterLF = cabCount * 3; // ~3 LF per cabinet unit
      if (counterLF > 0) {
        tasks.push({
          taskId: `__CABPROT_${ri}_COUNTERTOP__`,
          taskName: 'Mask Countertop Edges',
          phase: 'setup',
          hours: round3(counterLF * 0.02), // ~1.2 min/LF
          isFixed: false,
          baseRate: '1.2 min/LF',
          quantity: counterLF,
          uom: 'LF',
          isCabinetProtection: true,
          protectionLevel: level,
          mechanism: 'task',
          roomIndex: ri,
          roomLabel: room.label,
        });
      }
    }

    // HEAVY: + floor runner + backsplash mask + appliance covers
    if (level === 'heavy') {
      // Floor — fixed time per kitchen
      tasks.push({
        taskId: `__CABPROT_${ri}_FLOOR__`,
        taskName: 'Lay Kitchen Floor Protection',
        phase: 'setup',
        hours: 0.5, // 30 min fixed
        isFixed: true,
        baseRate: '30 min fixed',
        quantity: 1,
        uom: 'EA',
        isCabinetProtection: true,
        protectionLevel: level,
        mechanism: 'task',
        roomIndex: ri,
        roomLabel: room.label,
      });
      // Backsplash mask — estimate from cabinet_count
      const bsLF = (cab.cabinet_count || 0) * 3;
      if (bsLF > 0) {
        tasks.push({
          taskId: `__CABPROT_${ri}_BACKSPLASH__`,
          taskName: 'Mask Backsplash',
          phase: 'setup',
          hours: round3(bsLF * 0.015),
          isFixed: false,
          baseRate: '~1 min/LF',
          quantity: bsLF,
          uom: 'LF',
          isCabinetProtection: true,
          protectionLevel: level,
          mechanism: 'task',
          roomIndex: ri,
          roomLabel: room.label,
        });
      }
      // Appliance covers — fixed 2 appliances average
      tasks.push({
        taskId: `__CABPROT_${ri}_APPLIANCES__`,
        taskName: 'Cover Kitchen Appliances',
        phase: 'setup',
        hours: round3(2 * 0.1), // 6 min per appliance
        isFixed: true,
        baseRate: '6 min/appliance x 2',
        quantity: 2,
        uom: 'EA',
        isCabinetProtection: true,
        protectionLevel: level,
        mechanism: 'task',
        roomIndex: ri,
        roomLabel: room.label,
      });
    }

    // Teardown — symmetric to setup, faster (~60% of setup time)
    const setupHrs = tasks.reduce((s, t) => s + t.hours, 0);
    const teardownHrs = round3(setupHrs * 0.6);
    if (teardownHrs > 0) {
      tasks.push({
        taskId: `__CABPROT_${ri}_TEARDOWN__`,
        taskName: `Remove Cabinet Protection (${level})`,
        phase: 'cleanup',
        hours: teardownHrs,
        isFixed: false,
        baseRate: '60% of setup',
        quantity: 1,
        uom: 'EA',
        isCabinetProtection: true,
        protectionLevel: level,
        mechanism: 'task',
        roomIndex: ri,
        roomLabel: room.label,
      });
    }

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
