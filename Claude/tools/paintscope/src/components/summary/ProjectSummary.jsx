import { useMemo } from 'react';
import { useProject } from '../../hooks/useProject';
import { exportProject } from '../../engine/export-project';
import { deriveRoom } from '../../engine/derive-room';
import { SUBSTRATE_MAP } from '../../data/substrate-catalog';
import { QUANTITY_KEY_LABELS } from '../../data/constants';

export default function ProjectSummary() {
  const { state } = useProject();
  const exported = useMemo(() => exportProject(state), [state]);

  // Determine winning floor protection scope from active substrates
  const winningFloorKey = useMemo(() => {
    const hasFullCover = state.rooms.some(r => {
      const subs = r.substrates || {};
      return subs.walls || subs.ceilings;
    });
    if (hasFullCover) return 'PS_PROTECT_SF.FLOOR_EXPOSED';
    const hasWorkzone = state.rooms.some(r => {
      const subs = r.substrates || {};
      return subs.doors?.painting || subs.windows?.painting || subs.door_frames || subs.window_jamb;
    });
    if (hasWorkzone) return 'PS_PROTECT_SF.FLOOR_WORKZONE';
    return 'PS_PROTECT_SF.FLOOR_PERIMETER';
  }, [state.rooms]);

  const qtyByCategory = useMemo(() => {
    const suppressed = new Set([
      'PS_PROTECT_SF.FLOOR_EXPOSED', 'PS_PROTECT_SF.FLOOR_WORKZONE', 'PS_PROTECT_SF.FLOOR_PERIMETER'
    ]);
    suppressed.delete(winningFloorKey); // keep only the winning floor key
    const cats = {};
    exported.ps_quantities.forEach(q => {
      if (suppressed.has(q.quantity_key)) return;
      const prefix = q.quantity_key.split('.')[0];
      if (!cats[prefix]) cats[prefix] = [];
      cats[prefix].push(q);
    });
    return cats;
  }, [exported, winningFloorKey]);

  const catLabels = {
    'PS_SURFACE_SF': 'Surface Area (SF)',
    'PS_SURFACE_LF': 'Surface Linear (LF)',
    'PS_SURFACE_EA': 'Surface Count (EA)',
    'PS_SURFACE_EA_SIDE': 'Surface Sides (EA_SIDE)',
    'PS_EDGE_LF': 'Edges (LF)',
    'PS_OPENING_EA': 'Openings (EA)',
    'PS_META': 'Meta / Routing',
    'PS_PROTECT_SF': 'Protection Area (SF)',
    'PS_PROTECT_LF': 'Protection Linear (LF)',
    'PS_PROTECT_EA': 'Protection Count (EA)',
  };

  return (
    <div>
      <h2 style={{fontSize:16,marginBottom:4,color:'var(--accent)'}}>Project Summary: {state.project.name || 'Untitled'}</h2>
      <div style={{fontSize:12,color:'var(--text-secondary)',marginBottom:16}}>
        {state.rooms.length} rooms | {exported._meta.total_wall_sf} SF wall | {exported._meta.total_ceiling_sf} SF ceiling | {exported.ps_quantities.length} quantity keys
      </div>

      <div className="panel-section">
        <div className="section-title">Room Breakdown</div>
        <div style={{overflowX:'auto'}}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{minWidth:120}}>Room</th>
                <th>Area Group</th>
                <th style={{width:80,textAlign:'center'}}>Dims</th>
                <th style={{width:70,textAlign:'right'}}>Wall SF</th>
                <th style={{width:70,textAlign:'right'}}>Ceiling SF</th>
                <th style={{width:60,textAlign:'center'}}>Openings</th>
                <th style={{width:60,textAlign:'center'}}>Windows</th>
                <th style={{maxWidth:200}}>Substrates</th>
                <th>QT</th>
              </tr>
            </thead>
            <tbody>
              {state.rooms.map((room, idx) => {
                const d = deriveRoom(room);
                const activeSubKeys = Object.keys(room.substrates||{}).filter(k=>{const ap=k==='doors'||k==='windows'||k==='door_casing'||k==='window_casing';return ap?room.substrates[k]?.painting:true;});
                return (
                  <tr key={room.id} style={idx % 2 === 1 ? {background:'var(--bg-panel)'} : undefined}>
                    <td style={{fontWeight:500,minWidth:120}}>{room.label}</td>
                    <td style={{color:'var(--text-muted)'}}>{room.area_group||'\u2014'}</td>
                    <td style={{fontFamily:'var(--font-mono)',width:80,textAlign:'center'}}>{d.L}{'\u00d7'}{d.W}{'\u00d7'}{d.H}</td>
                    <td style={{fontFamily:'var(--font-mono)',color:'var(--accent)',width:70,textAlign:'right'}}>{d.wall_field_sf}</td>
                    <td style={{fontFamily:'var(--font-mono)',color:'var(--accent)',width:70,textAlign:'right'}}>{d.ceiling_field_sf}</td>
                    <td style={{fontFamily:'var(--font-mono)',width:60,textAlign:'center'}}>{d.totalOpenings}</td>
                    <td style={{fontFamily:'var(--font-mono)',width:60,textAlign:'center'}}>{d.totalWindows}</td>
                    <td style={{fontSize:11,color:'var(--text-secondary)',maxWidth:200,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{activeSubKeys.length > 0 ? activeSubKeys.map(s => SUBSTRATE_MAP[s]?.label || s).join(', ') : '\u2014'}</td>
                    <td>{state.project.default_quality_tier} <span style={{fontSize:10,color:'var(--text-muted)'}}>({d.heightBand})</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="summary-grid">
        {Object.entries(qtyByCategory).map(([cat, items]) => (
          <div key={cat} className="summary-card">
            <div className="summary-card-title">{catLabels[cat] || cat}</div>
            {items.map(q => (
              <div key={q.quantity_key} className="summary-row">
                <span style={{fontFamily:'var(--font-mono)',fontSize:11}}>{QUANTITY_KEY_LABELS[q.quantity_key] || q.quantity_key}</span>
                <span className="summary-value">{q.value !== null ? q.value : q.text_value} {q.uom}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
