import { FLOOR_TYPES, FIXTURE_MAP } from '../data/fixture-catalog.js';
import { FIXTURE_PROTECTION_SCENARIOS } from '../data/fixture-protection.js';

// Bathroom fixtures with context-dependent scenarios resolved at estimate time
const CONTEXT_DEPENDENT_IDS = new Set(Object.keys(FIXTURE_PROTECTION_SCENARIOS));

export function deriveProtectionSummary(room, subs, applicationMethod) {
  const items = [];

  // Floor — only if a type is selected and it's not subfloor (subfloor needs no protection)
  if (room.floor_type && room.floor_type !== 'subfloor') {
    const floorType = FLOOR_TYPES.find(f => f.id === room.floor_type);
    if (floorType) {
      items.push({ zone: 'floor', label: floorType.label, protection: room.floor_protection || floorType.defaultProtection, auto: true });
    }
  }

  // Unpainted surfaces adjacent to painted ones
  const alwaysPresentIds = new Set(['doors','windows','door_casing','window_casing']);
  const anyPainted = Object.keys(subs).some(k => alwaysPresentIds.has(k) ? subs[k]?.painting : true);
  if (anyPainted) {
    if (!subs.walls && subs.ceiling) items.push({ zone: 'walls_adjacent', label: 'Walls (unpainted)', protection: applicationMethod === 'spray' ? 'full_mask' : 'light_mask', auto: true });
    if (!subs.ceiling && subs.walls) items.push({ zone: 'ceiling_adjacent', label: 'Ceiling (unpainted)', protection: applicationMethod === 'spray' ? 'partial_cover' : 'light_mask', auto: true });
  }

  // Fixtures from room.fixtures
  Object.entries(room.fixtures || {}).forEach(function([fId, cfg]) {
    const cat = FIXTURE_MAP[fId];
    if (!cat) return;
    if (fId === 'cabinets') {
      const lf = parseFloat(cfg.linear_ft) || 0;
      const layoutLabel = cfg.layout === 'lower_only' ? 'Lower' : 'Lower + Upper';
      items.push({ zone: 'fixture_cabinets', label: cat.label + ' (' + layoutLabel + (lf > 0 ? ', ' + lf + ' LF' : '') + ')', protection: cfg.protection || cat.defaultProtection, auto: false });
    } else {
      // Bathroom fixtures with context-dependent scenarios show worst-case default
      // but are flagged so the UI can indicate protection varies at estimate time
      const isContextDep = CONTEXT_DEPENDENT_IDS.has(fId);
      items.push({
        zone: 'fixture_' + fId,
        label: cat.label,
        protection: cfg.protection || cat.defaultProtection,
        count: cfg.count || 1,
        auto: false,
        contextDependent: isContextDep,
      });
    }
  });

  return items;
}
