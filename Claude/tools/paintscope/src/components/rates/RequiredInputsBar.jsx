import { useState } from 'react';
import { useSpecData } from '../../hooks/useSpecData';

export default function RequiredInputsBar({ specId }) {
  const { specData, dispatch } = useSpecData();
  const [expanded, setExpanded] = useState(false);

  const inputs = specData.spec_required_inputs.filter(i => i.spec_family_id === specId);

  const addInput = () => dispatch({ type: 'ADD_REQUIRED_INPUT', payload: { specId } });

  // Find the global index of this input in the full spec_required_inputs array
  const getGlobalIndex = (localIdx) => {
    let count = 0;
    for (let i = 0; i < specData.spec_required_inputs.length; i++) {
      if (specData.spec_required_inputs[i].spec_family_id === specId) {
        if (count === localIdx) return i;
        count++;
      }
    }
    return -1;
  };

  const removeInput = (localIdx) => {
    const globalIdx = getGlobalIndex(localIdx);
    if (globalIdx >= 0) dispatch({ type: 'REMOVE_REQUIRED_INPUT', payload: { specId, inputId: globalIdx } });
  };

  const updateInput = (localIdx, field, value) => {
    const globalIdx = getGlobalIndex(localIdx);
    if (globalIdx >= 0) dispatch({ type: 'UPDATE_REQUIRED_INPUT', payload: { specId, inputId: globalIdx, field, value } });
  };

  return (
    <div style={{ background: 'var(--bg-card, #111a28)', borderRadius: 6, padding: '6px 12px', marginBottom: 6 }}>
      <div onClick={() => setExpanded(!expanded)} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{expanded ? '▼' : '▶'}</span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Required Inputs:</span>
        {!expanded && inputs.slice(0, 2).map((inp, i) => (
          <span key={i} style={{ fontSize: 10, color: 'var(--accent)', fontFamily: 'monospace' }}>{inp.paintscope_key}</span>
        ))}
        {!expanded && inputs.length > 2 && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>+{inputs.length - 2} more</span>}
      </div>

      {expanded && (
        <div style={{ marginTop: 6 }}>
          {inputs.map((inp, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <input value={inp.paintscope_key || ''} onChange={e => updateInput(i, 'paintscope_key', e.target.value)}
                placeholder="PS_SURFACE_LF.EXAMPLE"
                style={{ flex: 1, background: 'var(--bg-input, #0a1018)', border: '1px solid var(--border, #1a2a3a)', color: 'var(--accent)', padding: '2px 6px', borderRadius: 3, fontFamily: 'monospace', fontSize: 11 }} />
              <input value={inp.uom || ''} onChange={e => updateInput(i, 'uom', e.target.value)}
                style={{ width: 50, background: 'var(--bg-input, #0a1018)', border: '1px solid var(--border, #1a2a3a)', color: 'var(--text-secondary)', padding: '2px 4px', borderRadius: 3, fontSize: 10, textAlign: 'center' }} />
              <span onClick={() => removeInput(i)} style={{ color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14 }}>×</span>
            </div>
          ))}
          <button onClick={addInput}
            style={{ background: 'none', border: '1px solid var(--border, #1a2a3a)', color: 'var(--text-muted)', padding: '2px 8px', borderRadius: 3, fontSize: 10, cursor: 'pointer', marginTop: 2 }}>+ Add Input</button>
        </div>
      )}
    </div>
  );
}
