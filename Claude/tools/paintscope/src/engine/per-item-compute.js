import { WINDOW_SIZE_MODIFIERS, WINDOW_TYPE_MODIFIERS, MUNTIN_MODIFIER, DOOR_TYPE_MODIFIERS, WINDOW_TYPE_LABELS, WINDOW_SIZE_LABELS, DOOR_TYPE_LABELS } from '../data/modifiers.js';

/**
 * Compute per-item results for window tasks using PS_OPENING_EA.WINDOW_TOTAL.
 * Returns an array of per-item results, each representing a unique window item
 * (type x size combination) with its own modifiers and hours.
 * Each result: { hours, quantity, label, sizeMod, typeMod, itemMod }
 */
export function computeWindowPerItemResults(effRate, modStackTotal, room) {
  const wins = room.substrates?.windows?.items || [];
  const results = [];

  wins.forEach(win => {
    const cnt = win.count || 0;
    if (cnt <= 0) return;
    const sizeMod = WINDOW_SIZE_MODIFIERS[win.size_bucket] || 1.0;
    const typeMod = WINDOW_TYPE_MODIFIERS[win.window_type] || 1.0;
    const itemMod = sizeMod * typeMod;
    // effective_rate = base_rate / (room_modifiers * size_modifier * type_modifier)
    const itemEffRate = effRate / (modStackTotal * itemMod);
    const hours = cnt / itemEffRate;
    const typeLabel = WINDOW_TYPE_LABELS[win.window_type] || win.window_type;
    const sizeLabel = WINDOW_SIZE_LABELS[win.size_bucket] || win.size_bucket;
    results.push({
      hours,
      quantity: cnt,
      label: `${typeLabel} ${sizeLabel}`,
      sizeMod,
      typeMod,
      itemMod
    });
  });

  return results.length > 0 ? results : null;
}

// Tasks where door_type panel complexity modifier applies.
// Sanding (more surface area), brush cutting in (more edges), cleaning (more surfaces).
// Setup, spray, prime, inspect, hardware tasks use flat rates regardless of panel count.
const DOOR_TYPE_MOD_TASKS = new Set([
  'TSK_DOOR_SAND_PREP',
  'TSK_DOOR_LIGHT_SAND',
  'TSK_DOOR_FINISH_BRUSH',
  'TSK_DOOR_CLEAN_DUST',
  'TSK_DOOR_CLEAN_INTERSTAGE',
]);

/**
 * Compute per-item results for door tasks using PS_SURFACE_EA_SIDE.DOOR_SLAB
 * or PS_OPENING_EA.DOOR_OPENINGS_TOTAL.
 * Returns an array of per-item results, each representing a unique door type
 * with its complexity modifier and hours.
 * @param useSides - true for EA_SIDE tasks, false for EA (opening) tasks
 * @param taskId - task ID used to determine if door_type modifier applies
 */
export function computeDoorPerItemResults(effRate, modStackTotal, room, useSides, taskId) {
  const doors = room.substrates?.doors?.items || [];
  const results = [];
  const applyTypeMod = DOOR_TYPE_MOD_TASKS.has(taskId);

  doors.forEach(door => {
    const cnt = door.count || 0;
    if (cnt <= 0) return;
    const qty = useSides ? cnt * (parseInt(door.sides_per_door) || 2) : cnt;
    const typeMod = applyTypeMod ? (DOOR_TYPE_MODIFIERS[door.door_type] || 1.0) : 1.0;
    // effective_rate = base_rate / (room_modifiers * type_modifier)
    const itemEffRate = effRate / (modStackTotal * typeMod);
    const hours = qty / itemEffRate;
    const typeLabel = DOOR_TYPE_LABELS[door.door_type] || door.door_type;
    results.push({
      hours,
      quantity: qty,
      label: typeLabel,
      typeMod,
      itemMod: typeMod
    });
  });

  return results.length > 0 ? results : null;
}
