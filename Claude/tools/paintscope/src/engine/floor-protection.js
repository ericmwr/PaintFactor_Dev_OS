import { FLOOR_PROTECTION_HIERARCHY, FLOOR_ZONE_IDS, FLOOR_PROTECTION_DONOR_PRIORITY, PHASE_ORDER } from '../data/constants.js';
import { SPEC_PROTECTION_ZONES, SOP_TASK_PROTECTION } from '../data/scenario-rate-data.js';

/**
 * Classify a task as a floor install/remove candidate.
 * Returns null if not a pure floor protection task, or {action, protectionRank} if it is.
 * Mixed-zone tasks (floor + wall/fixture) are NOT classified - they stay with their specs.
 * Maintain tasks are NOT classified - they stay with their specs.
 */
export function classifyFloorProtectionTask(sopTask) {
  const pm = sopTask.protection_metadata;
  if (!pm || !pm.action || !pm.zones) return null;
  if (pm.action === 'maintain') return null;
  if (pm.action !== 'setup' && pm.action !== 'teardown') return null;

  const zones = pm.zones || [];
  const floorZones = zones.filter(z => FLOOR_ZONE_IDS.has(z));
  if (floorZones.length === 0) return null;

  // Only classify if ALL zones are floor zones (exclude mixed tasks)
  const nonFloorZones = zones.filter(z => !FLOOR_ZONE_IDS.has(z));
  if (nonFloorZones.length > 0) return null;

  // Resolve highest protection level from the zones
  let maxRank = 0;
  let maxLevelName = 'edge_only';
  const zoneTable = SPEC_PROTECTION_ZONES;
  for (const zone of floorZones) {
    const zoneRow = zoneTable.find(
      r => r.zone_id === zone && r.spec_family_id === sopTask.spec_family_id
    );
    const level = zoneRow ? zoneRow.protection_level : 'edge_only';
    const rank = FLOOR_PROTECTION_HIERARCHY[level] || 1;
    if (rank > maxRank) { maxRank = rank; maxLevelName = level; }
  }

  return { action: pm.action, protectionRank: maxRank, protectionLevel: maxLevelName };
}

/**
 * Post-process estimation results to deduplicate floor protection.
 * Removes floor install/remove tasks from individual specs and emits
 * one install + one remove per room under a Room Protection category.
 */
export function resolveRoomFloorProtection(specResults, rooms) {
  // Build index: taskId::specFamilyId -> sop_task record (for protection_metadata lookup)
  const sopTaskIndex = {};
  SOP_TASK_PROTECTION.forEach(t => {
    sopTaskIndex[t.id + '::' + t.spec_family_id] = t;
  });

  // Scan all task results and classify floor protection tasks
  // roomIndex -> [{ taskResult, specIdx, taskIdx, specId, classification }]
  const roomFloorTasks = {};

  specResults.forEach((sr, specIdx) => {
    sr.tasks.forEach((task, taskIdx) => {
      const sopTask = sopTaskIndex[task.taskId + '::' + sr.specId];
      if (!sopTask) return;

      const cls = classifyFloorProtectionTask(sopTask);
      if (!cls) return;

      const ri = task.roomIndex;
      if (!roomFloorTasks[ri]) roomFloorTasks[ri] = [];
      roomFloorTasks[ri].push({
        taskResult: task,
        specIdx, taskIdx,
        specId: sr.specId,
        specName: sr.specName,
        classification: cls
      });
    });
  });

  const roomProtection = {};

  for (const [ri, entries] of Object.entries(roomFloorTasks)) {
    if (entries.length === 0) continue;

    // Determine winning protection level (highest rank across all specs in this room)
    let maxRank = 0;
    entries.forEach(e => {
      if (e.classification.protectionRank > maxRank) {
        maxRank = e.classification.protectionRank;
      }
    });

    const winningLevel = Object.entries(FLOOR_PROTECTION_HIERARCHY)
      .find(([, rank]) => rank === maxRank)?.[0] || 'edge_only';

    // Select donor tasks for setup and teardown
    // Prefer canonical drywall prime/finish specs, then fall back to highest-rank
    const setupCandidates = entries.filter(e => e.classification.action === 'setup');
    const teardownCandidates = entries.filter(e => e.classification.action === 'teardown');

    function pickDonor(candidates) {
      if (candidates.length === 0) return null;
      // First try preferred donors at the winning protection level
      const atWinningLevel = candidates.filter(e => e.classification.protectionRank === maxRank);
      for (const prefSpec of FLOOR_PROTECTION_DONOR_PRIORITY) {
        const found = atWinningLevel.find(e => e.specId === prefSpec);
        if (found) return found;
      }
      // Fall back to any candidate at winning level
      if (atWinningLevel.length > 0) return atWinningLevel[0];
      // Fall back to highest rank candidate
      return candidates.sort((a,b) => b.classification.protectionRank - a.classification.protectionRank)[0];
    }

    const donorSetup = pickDonor(setupCandidates);
    const donorTeardown = pickDonor(teardownCandidates);

    const protTasks = [];
    const levelLabel = winningLevel.replace(/_/g, ' ');

    if (donorSetup) {
      protTasks.push({
        ...donorSetup.taskResult,
        taskId: '__RP_INSTALL__',
        taskName: 'Install Floor Protection (' + levelLabel + ')',
        phase: 'setup',
        isRoomProtection: true,
        donorSpecId: donorSetup.specId,
        protectionLevel: winningLevel
      });
    }

    if (donorTeardown) {
      protTasks.push({
        ...donorTeardown.taskResult,
        taskId: '__RP_REMOVE__',
        taskName: 'Remove Floor Protection',
        phase: 'cleanup',
        isRoomProtection: true,
        donorSpecId: donorTeardown.specId,
        protectionLevel: winningLevel
      });
    }

    if (protTasks.length > 0) {
      roomProtection[ri] = {
        tasks: protTasks,
        totalHours: Math.round(protTasks.reduce((s, t) => s + t.hours, 0) * 1000) / 1000,
        protectionLevel: winningLevel
      };
    }

    // Suppress original floor install/remove tasks from specs
    const taskKeysToRemove = new Set(
      entries.map(e => e.specId + '::' + e.taskResult.taskId + '::' + e.taskResult.roomIndex)
    );

    specResults.forEach(sr => {
      const before = sr.tasks.length;
      sr.tasks = sr.tasks.filter(t => {
        const key = sr.specId + '::' + t.taskId + '::' + t.roomIndex;
        return !taskKeysToRemove.has(key);
      });
      if (sr.tasks.length < before) {
        sr.totalHours = Math.round(sr.tasks.reduce((s, t) => s + t.hours, 0) * 100) / 100;
        // Recalculate phaseHours
        sr.phaseHours = {};
        sr.tasks.forEach(t => {
          const p = t.phase || 'apply';
          sr.phaseHours[p] = (sr.phaseHours[p] || 0) + t.hours;
        });
        Object.keys(sr.phaseHours).forEach(p => {
          sr.phaseHours[p] = Math.round(sr.phaseHours[p] * 100) / 100;
        });
      }
    });

    // Remove specs that now have zero tasks
    // (don't do this - spec might still have non-floor tasks)
  }

  return roomProtection;
}
