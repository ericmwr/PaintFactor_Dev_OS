/**
 * Exterior Protection — Elevation-level dedup.
 *
 * When multiple exterior specs fire on the same elevation (siding + trim + soffit),
 * shared protection zones (landscape, hardscape, light fixtures, HVAC, etc.) should
 * fire once, not per-spec. Standalone items (deck, fence, foundation) get their own
 * independent protection cycle.
 *
 * Approach: scan all exterior task results, classify protection tasks by zone,
 * dedup per-elevation (or per-standalone-item), pick the highest protection level
 * as the winner, suppress duplicates from individual spec results.
 */

// Protection level hierarchy — higher rank = more protection
const EXT_PROTECTION_HIERARCHY = {
  'edge_only':        1,
  'light_mask':       2,
  'partial_cover':    3,
  'full_mask':        4,
  'full_cover':       5,
  'full_containment': 6,
  'relocate':         7,
  'item_mask':        3,  // item-level masking ~ partial_cover
};

/**
 * Classify an exterior task as a protection setup/teardown candidate.
 * Returns null if not a protection task.
 */
function classifyExtProtectionTask(sopTask) {
  const pm = sopTask.protection_metadata;
  if (!pm || !pm.action || !pm.zones) return null;
  if (pm.action === 'maintain') return null;
  if (pm.action !== 'setup' && pm.action !== 'teardown') return null;

  const zones = pm.zones || [];
  if (zones.length === 0) return null;

  return {
    action: pm.action,
    zones,
    methodDependent: pm.method_dependent || false,
  };
}

/**
 * Resolve exterior protection — dedup per elevation and per standalone item.
 *
 * @param {Array} specResults — from runEstimate (exterior domain only)
 * @param {Object} db — DB_BUNDLE
 * @param {Object} exteriorState — state.exterior
 * @returns {Object} { elevationProtection: { [elevIndex]: {...} }, standaloneProtection: { [itemType]: {...} } }
 */
export function resolveExteriorProtection(specResults, db, exteriorState) {
  // Index sop_tasks by taskId::specFamilyId
  const sopTaskIndex = {};
  (db.sop_tasks || []).forEach(t => {
    sopTaskIndex[t.id + '::' + t.spec_family_id] = t;
  });

  // Index spec_protection_zones by spec+zone for level lookups
  const zoneIndex = {};
  (db.spec_protection_zones || []).forEach(z => {
    zoneIndex[z.spec_family_id + '::' + z.zone_id] = z;
  });

  // Filter to exterior spec results only
  const extResults = specResults.filter(sr => sr.domain === 'exterior');

  // Scan all exterior task results and classify protection tasks
  // Group by container key: elevation index (number) or standalone item type (string)
  // containerKey -> zone -> [{ taskResult, specIdx, classification, protLevel }]
  const containerZoneTasks = {};

  extResults.forEach((sr, specIdx) => {
    sr.tasks.forEach((task, taskIdx) => {
      const sopTask = sopTaskIndex[task.taskId + '::' + sr.specId];
      if (!sopTask) return;

      const cls = classifyExtProtectionTask(sopTask);
      if (!cls) return;

      // Determine container: elevation index or standalone item type
      const containerKey = task.standaloneType || task.roomIndex;

      if (containerZoneTasks[containerKey] === undefined) {
        containerZoneTasks[containerKey] = {};
      }

      // For each zone this task covers
      cls.zones.forEach(zone => {
        if (containerZoneTasks[containerKey][zone] === undefined) {
          containerZoneTasks[containerKey][zone] = [];
        }

        // Look up protection level from spec_protection_zones
        const zoneRow = zoneIndex[sr.specId + '::' + zone];
        const level = zoneRow ? zoneRow.protection_level : 'edge_only';
        const rank = EXT_PROTECTION_HIERARCHY[level] || 1;

        containerZoneTasks[containerKey][zone].push({
          taskResult: task,
          specIdx,
          taskIdx,
          specId: sr.specId,
          specName: sr.specName,
          action: cls.action,
          zone,
          protLevel: level,
          protRank: rank,
          methodDependent: cls.methodDependent,
        });
      });
    });
  });

  const elevationProtection = {};
  const standaloneProtection = {};

  // For each container (elevation or standalone item)
  for (const [containerKey, zoneTasks] of Object.entries(containerZoneTasks)) {
    const protTasks = [];
    const suppressKeys = new Set();

    for (const [zone, entries] of Object.entries(zoneTasks)) {
      if (entries.length === 0) continue;

      // Find the winning protection level (highest rank)
      let maxRank = 0;
      entries.forEach(e => {
        if (e.protRank > maxRank) maxRank = e.protRank;
      });

      // Pick donor: prefer the entry with the highest rank
      const setupCandidates = entries.filter(e => e.action === 'setup');
      const teardownCandidates = entries.filter(e => e.action === 'teardown');

      function pickDonor(candidates) {
        if (candidates.length === 0) return null;
        // Prefer candidate at winning level
        const atWinning = candidates.filter(e => e.protRank === maxRank);
        if (atWinning.length > 0) return atWinning[0];
        return candidates.sort((a, b) => b.protRank - a.protRank)[0];
      }

      const donorSetup = pickDonor(setupCandidates);
      const donorTeardown = pickDonor(teardownCandidates);

      const winningLevel = Object.entries(EXT_PROTECTION_HIERARCHY)
        .find(([, rank]) => rank === maxRank)?.[0] || 'edge_only';
      const levelLabel = winningLevel.replace(/_/g, ' ');
      const zoneLabel = zone.replace(/^ext_/, '').replace(/_/g, ' ');

      if (donorSetup) {
        protTasks.push({
          ...donorSetup.taskResult,
          taskId: '__EXT_PROT_' + zone.toUpperCase() + '_SETUP__',
          taskName: 'Protect ' + capitalize(zoneLabel) + ' (' + levelLabel + ')',
          phase: 'setup',
          isExteriorProtection: true,
          donorSpecId: donorSetup.specId,
          protectionZone: zone,
          protectionLevel: winningLevel,
        });
      }

      if (donorTeardown) {
        protTasks.push({
          ...donorTeardown.taskResult,
          taskId: '__EXT_PROT_' + zone.toUpperCase() + '_TEARDOWN__',
          taskName: 'Remove ' + capitalize(zoneLabel) + ' Protection',
          phase: 'cleanup',
          isExteriorProtection: true,
          donorSpecId: donorTeardown.specId,
          protectionZone: zone,
          protectionLevel: winningLevel,
        });
      }

      // Mark all original entries for suppression
      entries.forEach(e => {
        suppressKeys.add(e.specId + '::' + e.taskResult.taskId + '::' + containerKey);
      });
    }

    if (protTasks.length > 0) {
      const containerLabel = typeof containerKey === 'number'
        ? (exteriorState.elevations[containerKey]?.label || 'Elevation ' + (containerKey + 1))
        : capitalize(String(containerKey).replace(/_/g, ' '));

      const entry = {
        label: containerLabel,
        tasks: protTasks,
        totalHours: round3(protTasks.reduce((s, t) => s + t.hours, 0)),
      };

      if (typeof containerKey === 'number') {
        elevationProtection[containerKey] = entry;
      } else {
        standaloneProtection[containerKey] = entry;
      }
    }

    // Suppress original protection tasks from spec results
    if (suppressKeys.size > 0) {
      extResults.forEach(sr => {
        const before = sr.tasks.length;
        sr.tasks = sr.tasks.filter(t => {
          const key = sr.specId + '::' + t.taskId + '::' + (t.standaloneType || t.roomIndex);
          return !suppressKeys.has(key);
        });
        if (sr.tasks.length < before) {
          sr.totalHours = round2(sr.tasks.reduce((s, t) => s + t.hours, 0));
          sr.phaseHours = {};
          sr.tasks.forEach(t => {
            const p = t.phase || 'apply';
            sr.phaseHours[p] = (sr.phaseHours[p] || 0) + t.hours;
          });
          Object.keys(sr.phaseHours).forEach(p => {
            sr.phaseHours[p] = round2(sr.phaseHours[p]);
          });
        }
      });
    }
  }

  return { elevationProtection, standaloneProtection };
}

function round2(n) { return Math.round(n * 100) / 100; }
function round3(n) { return Math.round(n * 1000) / 1000; }
function capitalize(str) { return str.charAt(0).toUpperCase() + str.slice(1); }
