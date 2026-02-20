"""Patch prototype HTML to add room-level floor protection resolution."""
import sys

proto = r'C:\Users\mowre\.claude-worktrees\Claude\hungry-cartwright\Claude\tools\paintscope_prototype.html'

with open(proto, 'r', encoding='utf-8') as f:
    content = f.read()

patches_applied = 0

# ── PATCH 1: Add constants after SPEC_DISPLAY_NAMES ──
anchor = "function specDisplayName(specId) { return SPEC_DISPLAY_NAMES[specId] || specId.replace(/^SF_/,'').replace(/_/g,' '); }"

constants = """function specDisplayName(specId) { return SPEC_DISPLAY_NAMES[specId] || specId.replace(/^SF_/,'').replace(/_/g,' '); }

// Floor protection level hierarchy - higher rank = more protection
const FLOOR_PROTECTION_HIERARCHY = {
  'edge_only': 1, 'partial_cover': 2, 'full_cover': 3, 'heavy_cover': 4
};
const FLOOR_ZONE_IDS = new Set([
  'floor_full','floor_perimeter','floor_workzone',
  'floor_full_kitchen','floor_full_8ft_radius','floor_door_swing'
]);

// Preferred donor specs for floor protection rates (canonical full-room tasks)
const FLOOR_PROTECTION_DONOR_PRIORITY = [
  'SF_DRYWALL_WALL_NC_PRIME', 'SF_DRYWALL_CEILING_NC_PRIME',
  'SF_DRYWALL_WALL_NC_FINISH', 'SF_DRYWALL_CEILING_NC_FINISH'
];

/**
 * Classify a task as a floor install/remove candidate.
 * Returns null if not a pure floor protection task, or {action, protectionRank} if it is.
 * Mixed-zone tasks (floor + wall/fixture) are NOT classified - they stay with their specs.
 * Maintain tasks are NOT classified - they stay with their specs.
 */
function classifyFloorProtectionTask(sopTask, db) {
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
  const zoneTable = db.spec_protection_zones || [];
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
function resolveRoomFloorProtection(specResults, db, rooms) {
  // Build index: taskId::specFamilyId -> sop_task record (for protection_metadata lookup)
  const sopTaskIndex = {};
  (db.sop_tasks || []).forEach(t => {
    sopTaskIndex[t.id + '::' + t.spec_family_id] = t;
  });

  // Scan all task results and classify floor protection tasks
  // roomIndex -> [{ taskResult, specIdx, taskIdx, specId, classification }]
  const roomFloorTasks = {};

  specResults.forEach((sr, specIdx) => {
    sr.tasks.forEach((task, taskIdx) => {
      const sopTask = sopTaskIndex[task.taskId + '::' + sr.specId];
      if (!sopTask) return;

      const cls = classifyFloorProtectionTask(sopTask, db);
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
}"""

if anchor not in content:
    print("ERROR: Could not find specDisplayName anchor")
    sys.exit(1)
else:
    content = content.replace(anchor, constants)
    patches_applied += 1
    print("PATCH 1: Added constants + classifyFloorProtectionTask + resolveRoomFloorProtection")


# ── PATCH 2: Wire into runEstimate return value ──
# Find the sort line and add protection resolution after it
sort_anchor = "  // Sort specs by total hours descending\n  specResults.sort((a,b) => b.totalHours - a.totalHours);"

new_sort_block = """  // Sort specs by total hours descending
  specResults.sort((a,b) => b.totalHours - a.totalHours);

  // Room-level floor protection deduplication
  const roomProtection = resolveRoomFloorProtection(specResults, db, rooms);

  // Recalculate grand total (some hours moved from specs to room protection)
  grandTotalHours = specResults.reduce((s, sr) => s + sr.totalHours, 0);
  Object.values(roomProtection).forEach(rp => { grandTotalHours += rp.totalHours; });"""

if sort_anchor not in content:
    print("ERROR: Could not find sort anchor")
    sys.exit(1)
else:
    content = content.replace(sort_anchor, new_sort_block)
    patches_applied += 1
    print("PATCH 2: Wired resolveRoomFloorProtection into runEstimate")


# ── PATCH 3: Add roomProtection to return value ──
return_anchor = """    specResults,
    totalHours: Math.round(grandTotalHours * 100) / 100,"""

new_return = """    specResults,
    roomProtection,
    totalHours: Math.round(grandTotalHours * 100) / 100,"""

if return_anchor not in content:
    print("ERROR: Could not find return anchor")
    sys.exit(1)
else:
    content = content.replace(return_anchor, new_return)
    patches_applied += 1
    print("PATCH 3: Added roomProtection to return value")


# ── PATCH 4: EstimateView - add Room Protection block before paintable items ──
# Find the specEntries rendering in EstimateView
ev_anchor = """            {isRoomOpen && specEntries.map(([specId, specData]) => {
              const itemKey = `${ri}::${specId}`;"""

ev_new = """            {isRoomOpen && estimate.roomProtection && estimate.roomProtection[ri] && (() => {
              const rp = estimate.roomProtection[ri];
              const rpKey = ri + '::__ROOM_PROTECTION__';
              const isRpOpen = expandedItems[rpKey];
              const levelLabel = (rp.protectionLevel || 'edge_only').replace(/_/g, ' ');
              return (
                <div className="spec-section" style={{marginLeft:16,borderLeft:'3px solid #e6a817',paddingLeft:12,marginBottom:8}}>
                  <div className="spec-header" onClick={() => toggleItem(rpKey)} style={{cursor:'pointer',padding:'6px 0'}}>
                    <span style={{marginRight:6,display:'inline-block',transform:isRpOpen?'rotate(90deg)':'rotate(0)',transition:'transform 0.15s',fontSize:10}}>{'\\u25B6'}</span>
                    <span style={{fontWeight:700,color:'#e6a817'}}>Room Protection</span>
                    <span style={{fontSize:11,color:'var(--text-muted)',marginLeft:8,textTransform:'capitalize'}}>{levelLabel}</span>
                    <span className="spec-hours" style={{float:'right',fontFamily:'var(--font-mono)'}}>{rp.totalHours.toFixed(2)} hrs</span>
                  </div>
                  {isRpOpen && (
                    <div className="task-detail" style={{marginLeft:16}}>
                      <table className="task-table">
                        <thead><tr><th>Task</th><th>Phase</th><th>Source Spec</th><th style={{textAlign:'right'}}>Qty</th><th style={{textAlign:'right'}}>Rate</th><th style={{textAlign:'right'}}>Hours</th></tr></thead>
                        <tbody>
                          {rp.tasks.map((t, i) => (
                            <tr key={i}>
                              <td className="task-name-col">{t.taskName}</td>
                              <td style={{fontSize:11,color:'var(--text-muted)',textTransform:'capitalize'}}>{t.phase}</td>
                              <td style={{fontSize:10,color:'var(--derived)'}}>{specDisplayName(t.donorSpecId)}</td>
                              <td style={{textAlign:'right'}}>{t.isFixed ? '\\u2014' : t.quantity}</td>
                              <td style={{textAlign:'right',color:'var(--text-muted)'}}>{t.baseRate}</td>
                              <td style={{textAlign:'right',color:'var(--accent)',fontWeight:600}}>{t.hours.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })()}

            {isRoomOpen && specEntries.map(([specId, specData]) => {
              const itemKey = `${ri}::${specId}`;"""

if ev_anchor not in content:
    print("ERROR: Could not find EstimateView specEntries anchor")
    sys.exit(1)
else:
    content = content.replace(ev_anchor, ev_new)
    patches_applied += 1
    print("PATCH 4: Added Room Protection block to EstimateView")


# ── PATCH 5: WorkOrderView By Room mode - add Room Protection block ──
# Find the specEntries rendering in WorkOrderView "By Room" mode
wo_anchor = """                {isRoomOpen && specEntries.map(([specId, specData]) => {
                  const itemKey = `wo::${ri}::${specId}`;"""

wo_new = """                {isRoomOpen && estimate.roomProtection && estimate.roomProtection[ri] && (() => {
                  const rp = estimate.roomProtection[ri];
                  const rpKey = 'wo::' + ri + '::__RP__';
                  const isRpOpen = expandedItems[rpKey] !== false;
                  const levelLabel = (rp.protectionLevel || 'edge_only').replace(/_/g, ' ');
                  return (
                    <div style={{marginLeft:16,borderLeft:'3px solid #e6a817',paddingLeft:12,marginBottom:8}}>
                      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'4px 0',cursor:'pointer'}} onClick={() => toggleItem(rpKey)}>
                        <div>
                          <span style={{marginRight:6,display:'inline-block',transform:isRpOpen?'rotate(90deg)':'rotate(0)',transition:'transform 0.15s',fontSize:10}}>{'\\u25B6'}</span>
                          <span style={{fontWeight:700,fontSize:13,color:'#e6a817'}}>Room Protection</span>
                          <span style={{color:'var(--text-muted)',fontSize:11,marginLeft:8,textTransform:'capitalize'}}>{levelLabel} | {rp.tasks.length} tasks</span>
                        </div>
                        <span style={{fontFamily:'var(--font-mono)',fontWeight:700,color:'var(--accent)'}}>{rp.totalHours.toFixed(2)} hrs</span>
                      </div>
                      {isRpOpen && (
                        <div style={{marginLeft:16}}>
                          <TaskHeader secondCol="Phase" />
                          {rp.tasks.map((t,i) => <TaskRow key={'rp'+i} t={{...t, specId: '__RP__', specName: 'Room Protection'}} showRoom={false} />)}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {isRoomOpen && specEntries.map(([specId, specData]) => {
                  const itemKey = `wo::${ri}::${specId}`;"""

if wo_anchor not in content:
    print("ERROR: Could not find WorkOrderView specEntries anchor")
    sys.exit(1)
else:
    content = content.replace(wo_anchor, wo_new)
    patches_applied += 1
    print("PATCH 5: Added Room Protection block to WorkOrderView By Room mode")


# ── PATCH 6: WorkOrderView By Phase mode - merge room protection tasks ──
phase_anchor = """  // Flatten all tasks
  const allTasks = estimate.specResults.flatMap(s => s.tasks.map(t => ({...t, specId: s.specId, specName: s.specName})));"""

phase_new = """  // Flatten all tasks
  const allTasks = estimate.specResults.flatMap(s => s.tasks.map(t => ({...t, specId: s.specId, specName: s.specName})));

  // Merge room protection tasks into allTasks for phase-based views
  if (estimate.roomProtection) {
    Object.entries(estimate.roomProtection).forEach(([ri, rp]) => {
      rp.tasks.forEach(t => {
        allTasks.push({...t, specId: '__ROOM_PROTECTION__', specName: 'Room Protection'});
      });
    });
  }"""

if phase_anchor not in content:
    print("ERROR: Could not find phase flatten anchor")
    sys.exit(1)
else:
    content = content.replace(phase_anchor, phase_new)
    patches_applied += 1
    print("PATCH 6: Merged room protection tasks into WorkOrderView By Phase mode")


# ── Write result ──
with open(proto, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"\nAll {patches_applied} patches applied successfully.")
