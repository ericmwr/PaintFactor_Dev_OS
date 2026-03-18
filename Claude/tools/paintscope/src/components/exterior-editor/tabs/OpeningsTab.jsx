import Select from '../../shared/Select';
import { ENUMS } from '../../../data/enums';

export default function OpeningsTab({ elevation, derived, dispatch }) {
  const eid = elevation.id;
  const windows = elevation.windows || [];
  const doors = elevation.doors || [];

  return (
    <div>
      {/* Windows */}
      <div className="panel-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="section-title">Windows</div>
          <button className="btn btn-sm btn-accent" onClick={() => dispatch({ type: 'ADD_EXT_WINDOW', payload: { elevId: eid } })}>+ Add Window</button>
        </div>

        {windows.length === 0 && <div className="no-data-msg" style={{ padding: 16 }}>No windows on this elevation.</div>}

        {windows.map((win, i) => (
          <div key={win.id} className="form-row" style={{ alignItems: 'flex-end', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 6, marginBottom: 6 }}>
            <div style={{ flex: 1 }}>
              <div className="field-label">Type</div>
              <Select options={ENUMS.extWindowTypes} value={win.type} onChange={v => dispatch({ type: 'SET_EXT_WINDOW', payload: { elevId: eid, winId: win.id, field: 'type', value: v } })} />
            </div>
            <div>
              <div className="field-label">Size</div>
              <Select options={ENUMS.extWindowSizes} value={win.size} onChange={v => dispatch({ type: 'SET_EXT_WINDOW', payload: { elevId: eid, winId: win.id, field: 'size', value: v } })} />
            </div>
            <div>
              <div className="field-label">Count</div>
              <input type="number" value={win.count || ''} onChange={e => dispatch({ type: 'SET_EXT_WINDOW', payload: { elevId: eid, winId: win.id, field: 'count', value: parseInt(e.target.value) || 0 } })} min="0" style={{ width: 60 }} />
            </div>
            <button className="btn btn-sm btn-danger" onClick={() => dispatch({ type: 'REMOVE_EXT_WINDOW', payload: { elevId: eid, winId: win.id } })}>Remove</button>
          </div>
        ))}

        <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', marginTop: 4 }}>
          Total: <b>{derived.totalWindows}</b> windows | Deduction: <b style={{ color: 'var(--warning)' }}>{derived.windowDeductionSF} SF</b>
        </div>
      </div>

      {/* Doors */}
      <div className="panel-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="section-title">Doors</div>
          <button className="btn btn-sm btn-accent" onClick={() => dispatch({ type: 'ADD_EXT_DOOR', payload: { elevId: eid } })}>+ Add Door</button>
        </div>

        {doors.length === 0 && <div className="no-data-msg" style={{ padding: 16 }}>No doors on this elevation.</div>}

        {doors.map((door, i) => (
          <div key={door.id} className="form-row" style={{ alignItems: 'flex-end', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 6, marginBottom: 6 }}>
            <div style={{ flex: 1 }}>
              <div className="field-label">Type</div>
              <Select options={ENUMS.extDoorTypes} value={door.type} onChange={v => dispatch({ type: 'SET_EXT_DOOR', payload: { elevId: eid, doorId: door.id, field: 'type', value: v } })} />
            </div>
            <div>
              <div className="field-label">Substrate</div>
              <Select options={ENUMS.extDoorSubstrates} value={door.substrate} onChange={v => dispatch({ type: 'SET_EXT_DOOR', payload: { elevId: eid, doorId: door.id, field: 'substrate', value: v } })} />
            </div>
            <div>
              <div className="field-label">Count</div>
              <input type="number" value={door.count || ''} onChange={e => dispatch({ type: 'SET_EXT_DOOR', payload: { elevId: eid, doorId: door.id, field: 'count', value: parseInt(e.target.value) || 0 } })} min="0" style={{ width: 60 }} />
            </div>
            <button className="btn btn-sm btn-danger" onClick={() => dispatch({ type: 'REMOVE_EXT_DOOR', payload: { elevId: eid, doorId: door.id } })}>Remove</button>
          </div>
        ))}

        <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', marginTop: 4 }}>
          Total: <b>{derived.totalDoors}</b> doors | Deduction: <b style={{ color: 'var(--warning)' }}>{derived.doorDeductionSF} SF</b>
        </div>
      </div>
    </div>
  );
}
