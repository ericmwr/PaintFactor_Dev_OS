import { useState } from 'react';
import { useProject } from '../../hooks/useProject';
import { useEstimate } from '../../hooks/useEstimate';
import { deriveRoom } from '../../engine/derive-room';
import { PHASE_ORDER, PHASE_COLORS, specDisplayName } from '../../data/constants';
import { FLOOR_TYPES, FLOOR_PROTECTION_LABEL } from '../../data/fixture-catalog';

// Solid accent colors for the phase legend strip and left-border accents
const PHASE_ACCENT = {
  setup:      '#3a5a8a',
  prep:       '#4a6a3a',
  prime:      '#5a4a8a',
  apply:      '#5a4a6a',
  interstage: '#6a5a3a',
  finish:     '#3a6a5a',
  cleanup:    '#5a3a4a',
};

export default function WorkOrderView() {
  const { state } = useProject();
  const estimate = useEstimate();

  const [viewMode, setViewMode] = useState('room'); // 'phase' or 'room'
  const [expandedRooms, setExpandedRooms] = useState({});
  const [expandedItems, setExpandedItems] = useState({});

  if (!estimate || estimate.specResults.length === 0) return (
    <div className="no-data-msg">No tasks to display. Run the Estimate view first to verify specs activate.</div>
  );

  const toggleRoom = (id) => setExpandedRooms(p => ({...p, [id]: !p[id]}));
  const toggleItem = (id) => setExpandedItems(p => ({...p, [id]: !p[id]}));

  // Flatten all tasks
  const allTasks = estimate.specResults.flatMap(s => s.tasks.map(t => ({...t, specId: s.specId, specName: s.specName, itemGroup: s.itemGroup || null})));

  // Merge room protection tasks into allTasks for phase-based views
  if (estimate.roomProtection) {
    Object.entries(estimate.roomProtection).forEach(([ri, rp]) => {
      rp.tasks.forEach(t => {
        allTasks.push({...t, specId: '__ROOM_PROTECTION__', specName: 'Room Protection'});
      });
    });
  }

  // Merge fixture protection tasks into allTasks for phase-based views
  if (estimate.fixtureProtection) {
    Object.entries(estimate.fixtureProtection).forEach(([ri, fp]) => {
      fp.tasks.forEach(t => {
        allTasks.push({...t, specId: '__FIXTURE_PROTECTION__', specName: 'Fixture Protection'});
      });
    });
  }

  // Phase-grouped view: phase -> room -> tasks
  const byPhaseRoom = {};
  PHASE_ORDER.forEach(p => { byPhaseRoom[p] = {}; });
  allTasks.forEach(t => {
    const phase = t.phase || 'apply';
    if (!byPhaseRoom[phase]) byPhaseRoom[phase] = {};
    const ri = t.roomIndex;
    if (!byPhaseRoom[phase][ri]) byPhaseRoom[phase][ri] = { label: t.roomLabel, tasks: [], totalHours: 0 };
    byPhaseRoom[phase][ri].tasks.push(t);
    byPhaseRoom[phase][ri].totalHours += t.hours;
  });

  // Room -> Paintable Item grouped view
  const roomMap = {};
  allTasks.forEach(t => {
    const ri = t.roomIndex;
    const specKey = t.itemGroup ? `${t.specId}::${t.itemGroup}` : t.specId;
    if (!roomMap[ri]) roomMap[ri] = { label: t.roomLabel, specs: {}, totalHours: 0 };
    if (!roomMap[ri].specs[specKey]) roomMap[ri].specs[specKey] = { specName: t.specName, tasks: [], totalHours: 0 };
    roomMap[ri].specs[specKey].tasks.push(t);
    roomMap[ri].specs[specKey].totalHours += t.hours;
    roomMap[ri].totalHours += t.hours;
  });

  // Add room protection hours to room totals
  if (estimate.roomProtection) {
    Object.entries(estimate.roomProtection).forEach(([ri, rp]) => {
      if (roomMap[ri]) roomMap[ri].totalHours += rp.totalHours;
    });
  }

  // Add fixture protection hours to room totals
  if (estimate.fixtureProtection) {
    Object.entries(estimate.fixtureProtection).forEach(([ri, fp]) => {
      if (roomMap[ri]) roomMap[ri].totalHours += fp.totalHours;
    });
  }

  const roomEntries = Object.entries(roomMap).sort((a,b) => parseInt(a[0]) - parseInt(b[0]));

  // Task name suffix helper: adds coat count and/or floor protection material
  const taskNameSuffix = (t) => {
    const parts = [];
    if (t.coatMultiplier > 1) parts.push(`${t.coatMultiplier} coats`);
    if (t.floorType && t.taskName && t.taskName.toLowerCase().includes('floor prot') && FLOOR_PROTECTION_LABEL[t.floorType]) {
      parts.push(`${FLOOR_PROTECTION_LABEL[t.floorType]} \u2014 ${(FLOOR_TYPES.find(f=>f.id===t.floorType)||{}).label||t.floorType}`);
    }
    return parts.length > 0 ? ` (${parts.join(', ')})` : '';
  };

  // Sort tasks by PHASE_ORDER index
  const phaseIndex = (phase) => {
    const idx = PHASE_ORDER.indexOf(phase);
    return idx >= 0 ? idx : 999;
  };

  const TaskRow = ({ t, showRoom, accentBorder }) => (
    <div
      className="wo-task-row"
      style={{
        background: PHASE_COLORS[t.phase] || 'transparent',
        ...(accentBorder ? { borderLeft: `3px solid ${PHASE_ACCENT[t.phase] || 'var(--border)'}` } : {})
      }}
    >
      <div style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}} title={t.taskName}>{t.taskName}{taskNameSuffix(t)}</div>
      {showRoom ? (
        <div style={{fontSize:11,color:'var(--text-muted)',overflow:'hidden',textOverflow:'ellipsis'}}>{t.roomLabel}</div>
      ) : (
        <div style={{fontSize:11,color:'var(--text-muted)',textTransform:'capitalize'}}>{t.phase}</div>
      )}
      <div className="wo-qty">{t.isFixed ? '\u2014' : `${t.quantity} ${t.uom}`}</div>
      <div className="wo-rate">{t.isFixed ? t.baseRate : t.baseRate}</div>
      <div>{t.skillLevel && <span className={`wo-skill ${t.skillLevel}`}>{t.skillLevel}</span>}</div>
      <div className="wo-hrs">{t.hours.toFixed(2)}{t.coatMultiplier > 1 && <span style={{fontSize:9,color:'var(--text-muted)',marginLeft:2}}>{'\u00d7'}{t.coatMultiplier}</span>}</div>
    </div>
  );

  const TaskHeader = ({ secondCol }) => (
    <div className="wo-task-row header">
      <div>Task</div><div>{secondCol || 'Phase'}</div><div style={{textAlign:'right'}}>Qty</div><div style={{textAlign:'right'}}>Rate</div><div style={{textAlign:'center'}}>Skill</div><div style={{textAlign:'right'}}>Hours</div>
    </div>
  );

  return (
    <div>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
        <h2 style={{fontSize:16,color:'var(--accent)'}}>Work Order {state.project.name && ` \u2014 ${state.project.name}`}</h2>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <div className="wo-toggle">
            <button className={`wo-toggle-btn ${viewMode==='room'?'active':''}`} onClick={()=>setViewMode('room')}>By Room</button>
            <button className={`wo-toggle-btn ${viewMode==='phase'?'active':''}`} onClick={()=>setViewMode('phase')}>By Phase</button>
          </div>
          <button className="btn btn-sm" onClick={()=>window.print()}>Print</button>
        </div>
      </div>

      {/* Phase legend strip */}
      <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:12}}>
        {PHASE_ORDER.map(phase => (
          <span key={phase} style={{
            background: PHASE_ACCENT[phase],
            color: '#fff',
            padding: '2px 8px',
            borderRadius: 3,
            fontSize: 10,
            textTransform: 'uppercase',
            fontWeight: 600,
            letterSpacing: '0.5px',
          }}>{phase}</span>
        ))}
      </div>

      <div style={{fontSize:12,color:'var(--text-secondary)',marginBottom:12}}>
        {allTasks.length} tasks | {estimate.totalHours} total hours | {estimate.totalCrewDays} crew days
      </div>

      {viewMode === 'phase' && (
        <div>
          {PHASE_ORDER.filter(p => Object.keys(byPhaseRoom[p] || {}).length > 0).map(phase => {
            const rooms = byPhaseRoom[phase];
            const roomKeys = Object.keys(rooms).sort((a,b) => parseInt(a) - parseInt(b));
            const phaseTotal = roomKeys.reduce((s, ri) => s + rooms[ri].totalHours, 0);
            const phaseTaskCount = roomKeys.reduce((s, ri) => s + rooms[ri].tasks.length, 0);
            return (
              <div key={phase} className="wo-phase-group" style={{borderLeft: `4px solid ${PHASE_ACCENT[phase]}`, paddingLeft: 12}}>
                <div className="wo-phase-title">{phase} <span style={{fontWeight:400,fontSize:12,textTransform:'none'}}>({phaseTaskCount} tasks, {phaseTotal.toFixed(1)} hrs)</span></div>
                {roomKeys.map(ri => {
                  const rd = rooms[ri];
                  return (
                    <div key={ri} style={{marginBottom:8}}>
                      <div style={{fontSize:12,fontWeight:600,color:'var(--text-secondary)',padding:'4px 0',borderBottom:'1px solid var(--border-subtle)'}}>
                        {rd.label}
                        <span style={{float:'right',fontFamily:'var(--font-mono)',fontWeight:700,color:'var(--accent)'}}>{rd.totalHours.toFixed(2)} hrs</span>
                      </div>
                      <TaskHeader secondCol="Room" />
                      {rd.tasks.map((t,i) => <TaskRow key={i} t={t} showRoom={true} />)}
                    </div>
                  );
                })}
                <div className="section-total">
                  <span>Phase Total:</span>
                  <span className="total-hrs">{phaseTotal.toFixed(2)} hrs</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {viewMode === 'room' && (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <button className="btn btn-sm" onClick={() => {
              const rooms = {};
              const items = {};
              roomEntries.forEach(([ri, rd]) => {
                rooms[ri] = true;
                Object.keys(rd.specs).forEach(sk => { items[`${ri}::${sk}`] = true; });
                items[`${ri}::__ROOM_PROTECTION__`] = true;
                items[`${ri}::__FIXTURE_PROTECTION__`] = true;
              });
              setExpandedRooms(rooms);
              setExpandedItems(items);
            }}>Expand All</button>
            <button className="btn btn-sm" onClick={() => {
              const rooms = {};
              roomEntries.forEach(([ri]) => { rooms[ri] = false; });
              setExpandedRooms(rooms);
              setExpandedItems({});
            }}>Collapse All</button>
          </div>
          {roomEntries.map(([ri, roomData]) => {
            const room = state.rooms[parseInt(ri)];
            const d = room ? deriveRoom(room) : null;
            const isRoomOpen = expandedRooms[ri] !== false;
            const specEntries = Object.entries(roomData.specs).sort((a,b) => b[1].totalHours - a[1].totalHours);

            return (
              <div key={ri} className="wo-room-group">
                <div className="wo-room-title" onClick={() => toggleRoom(ri)} style={{cursor:'pointer'}}>
                  <span style={{marginRight:8,display:'inline-block',transform:isRoomOpen?'rotate(90deg)':'rotate(0)',transition:'transform 0.15s',fontSize:12}}>{'\u25B6'}</span>
                  {roomData.label}
                  {d && <span className="wo-room-dims">{d.L}x{d.W}x{d.H} | {d.wall_field_sf} SF wall | {d.ceiling_field_sf} SF ceil</span>}
                  <span style={{float:'right',color:'var(--accent)',fontFamily:'var(--font-mono)',fontWeight:700}}>{roomData.totalHours.toFixed(1)} hrs</span>
                </div>

                {isRoomOpen && estimate.roomProtection && estimate.roomProtection[ri] && (() => {
                  const rp = estimate.roomProtection[ri];
                  const rpKey = 'wo::' + ri + '::__RP__';
                  const isRpOpen = expandedItems[rpKey] !== false;
                  const levelLabel = (rp.protectionLevel || 'edge_only').replace(/_/g, ' ');
                  return (
                    <div className="spec-section" style={{marginLeft:16,borderLeft:'3px solid #e6a817',marginBottom:8}}>
                      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'4px 8px',cursor:'pointer'}} onClick={() => toggleItem(rpKey)}>
                        <div>
                          <span style={{marginRight:6,display:'inline-block',transform:isRpOpen?'rotate(90deg)':'rotate(0)',transition:'transform 0.15s',fontSize:10}}>{'\u25B6'}</span>
                          <span style={{fontWeight:700,fontSize:13,color:'#e6a817'}}>Room Protection</span>
                          <span style={{color:'var(--text-muted)',fontSize:11,marginLeft:8,textTransform:'capitalize'}}>{levelLabel} | {rp.tasks.length} tasks</span>
                        </div>
                        <span style={{fontFamily:'var(--font-mono)',fontWeight:700,color:'var(--accent)'}}>{rp.totalHours.toFixed(2)} hrs</span>
                      </div>
                      {isRpOpen && (
                        <div style={{padding:'0 8px 8px'}}>
                          <TaskHeader secondCol="Phase" />
                          {rp.tasks.map((t,i) => <TaskRow key={'rp'+i} t={{...t, specId: '__RP__', specName: 'Room Protection'}} showRoom={false} accentBorder />)}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {isRoomOpen && estimate.fixtureProtection && estimate.fixtureProtection[ri] && (() => {
                  const fp = estimate.fixtureProtection[ri];
                  const fpKey = 'wo::' + ri + '::__FP__';
                  const isFpOpen = expandedItems[fpKey] !== false;
                  return (
                    <div className="spec-section" style={{marginLeft:16,borderLeft:'3px solid #b87333',marginBottom:8}}>
                      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'4px 8px',cursor:'pointer'}} onClick={() => toggleItem(fpKey)}>
                        <div>
                          <span style={{marginRight:6,display:'inline-block',transform:isFpOpen?'rotate(90deg)':'rotate(0)',transition:'transform 0.15s',fontSize:10}}>{'\u25B6'}</span>
                          <span style={{fontWeight:700,fontSize:13,color:'#b87333'}}>Fixture Protection</span>
                          <span style={{color:'var(--text-muted)',fontSize:11,marginLeft:8}}>{fp.tasks.length} entries</span>
                        </div>
                        <span style={{fontFamily:'var(--font-mono)',fontWeight:700,color:'var(--accent)'}}>{fp.totalHours.toFixed(2)} hrs</span>
                      </div>
                      {isFpOpen && (
                        <div style={{padding:'0 8px 8px'}}>
                          <TaskHeader secondCol="Phase" />
                          {fp.tasks.map((t,i) => <TaskRow key={'fp'+i} t={{...t, specId: '__FP__', specName: 'Fixture Protection'}} showRoom={false} accentBorder />)}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {isRoomOpen && specEntries.map(([specId, specData]) => {
                  const itemKey = `wo::${ri}::${specId}`;
                  const isItemOpen = expandedItems[itemKey] !== false;
                  const baseSpecId = specId.includes('::') ? specId.split('::')[0] : specId;
                  const displayName = specId.includes('::') ? specData.specName : (specDisplayName(baseSpecId) || specData.specName);

                  // Sort tasks flat by phase order
                  const sortedTasks = [...specData.tasks].sort((a,b) => phaseIndex(a.phase) - phaseIndex(b.phase));

                  return (
                    <div key={specId} className="spec-section" style={{marginLeft:16,marginBottom:8}}>
                      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'4px 8px',cursor:'pointer'}} onClick={() => toggleItem(itemKey)}>
                        <div>
                          <span style={{marginRight:6,display:'inline-block',transform:isItemOpen?'rotate(90deg)':'rotate(0)',transition:'transform 0.15s',fontSize:10}}>{'\u25B6'}</span>
                          <span style={{fontWeight:600,fontSize:13}}>{displayName}</span>
                          <span style={{color:'var(--text-muted)',fontSize:11,marginLeft:8}}>{specData.tasks.length} tasks</span>
                        </div>
                        <span style={{fontFamily:'var(--font-mono)',fontWeight:700,color:'var(--accent)'}}>{specData.totalHours.toFixed(2)} hrs</span>
                      </div>

                      {isItemOpen && (
                        <div style={{padding:'0 8px 8px'}}>
                          <TaskHeader secondCol="Phase" />
                          {sortedTasks.map((t,i) => <TaskRow key={i} t={t} showRoom={false} accentBorder />)}
                        </div>
                      )}
                    </div>
                  );
                })}

                <div className="section-total">
                  <span>Room Total:</span>
                  <span className="total-hrs">{roomData.totalHours.toFixed(2)} hrs</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="section-total" style={{borderTop:'3px solid var(--accent)',marginTop:16}}>
        <span style={{fontSize:14}}>Grand Total:</span>
        <span className="total-hrs" style={{fontSize:16}}>{estimate.totalHours} hrs</span>
        <span style={{color:'var(--text-muted)'}}>({estimate.totalCrewDays} crew days)</span>
      </div>
    </div>
  );
}
