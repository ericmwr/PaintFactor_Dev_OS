import { useState, useMemo } from 'react';
import { useProject } from '../../hooks/useProject';
import { exportProject } from '../../engine/export-project';
import { migrateV02toV03 } from '../../state/migrations';

export default function ExportImport() {
  const { state, dispatch } = useProject();
  const [toast, setToast] = useState(null);
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState('');
  const exported = useMemo(() => exportProject(state), [state]);
  const jsonStr = useMemo(() => JSON.stringify(exported, null, 2), [exported]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(jsonStr).then(() => {
      setToast('Copied to clipboard!'); setTimeout(()=>setToast(null), 2000);
    });
  };

  const download = () => {
    const blob = new Blob([jsonStr], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${state.project.name || 'paintscope'}_scope.json`;
    a.click();
    URL.revokeObjectURL(url);
    setToast('Downloaded!'); setTimeout(()=>setToast(null), 2000);
  };

  const handleImport = () => {
    try {
      const data = JSON.parse(importText);
      // Reconstruct state from exported JSON
      if (data._meta && data._meta.tool === 'PaintScope Prototype') {
        // It's a raw state export -- try to load
        setToast('Imported (external format) \u2014 manual mapping needed');
      }
      // Try loading as internal state (with v0.2->v0.3 migration)
      if (data.project && data.rooms) {
        const migrated = migrateV02toV03(data);
        dispatch({type:'IMPORT_PROJECT', payload:migrated});
        setShowImport(false);
        setToast('Project imported!'); setTimeout(()=>setToast(null), 2000);
        return;
      }
      setToast('Unrecognized format'); setTimeout(()=>setToast(null), 3000);
    } catch(e) {
      setToast('Invalid JSON: ' + e.message); setTimeout(()=>setToast(null), 3000);
    }
  };

  const exportInternalState = () => {
    const blob = new Blob([JSON.stringify({ project:state.project, rooms:state.rooms, ui:state.ui }, null, 2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${state.project.name || 'paintscope'}_state.json`;
    a.click();
    URL.revokeObjectURL(url);
    setToast('State exported for re-import!'); setTimeout(()=>setToast(null), 2000);
  };

  return (
    <div style={{display:'flex',flexDirection:'column',gap:20}}>
      {/* Export Card */}
      <div className="panel-section" data-section="export" style={{
        padding:'16px 20px',
        borderRadius:'var(--radius-md)',
        border:'1px solid var(--border)',
        background:'rgba(100,210,140,0.04)',
      }}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
          <div>
            <h2 style={{fontSize:16,color:'var(--accent)',margin:0}}>Scope Export</h2>
            <div style={{fontSize:11,color:'var(--text-muted)',marginTop:2}}>Machine-readable JSON for downstream systems</div>
          </div>
          <div className="btn-group">
            <button className="btn btn-accent" onClick={copyToClipboard}>Copy JSON</button>
            <button className="btn btn-success" onClick={download}>Download .json</button>
          </div>
        </div>

        <div style={{fontSize:11,color:'var(--text-secondary)',marginBottom:10,fontFamily:'var(--font-mono)'}}>
          {exported.ps_quantities.length} quantity keys | {exported.ps_surfaces.length} surfaces | {exported.ps_assets.length} assets | {exported.ps_edges.length} edges
        </div>

        <details>
          <summary style={{
            cursor:'pointer',
            fontSize:12,
            color:'var(--text-muted)',
            userSelect:'none',
            padding:'4px 0',
            fontWeight:500,
          }}>
            Show / Hide JSON Preview
          </summary>
          <div className="json-view" style={{marginTop:8}}>{jsonStr}</div>
        </details>
      </div>

      {/* Visual separator */}
      <div style={{borderTop:'1px solid var(--border)',margin:'0 20px'}} />

      {/* State Card */}
      <div className="panel-section" data-section="state" style={{
        padding:'16px 20px',
        borderRadius:'var(--radius-md)',
        border:'1px solid var(--border)',
        background:'rgba(130,170,255,0.04)',
      }}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
          <div>
            <h2 style={{fontSize:16,color:'var(--accent)',margin:0}}>Project State</h2>
            <div style={{fontSize:11,color:'var(--text-muted)',marginTop:2}}>Save/restore full project state including UI settings</div>
          </div>
          <div className="btn-group">
            <button className="btn" onClick={exportInternalState}>Save State</button>
            <button className="btn" onClick={()=>setShowImport(true)}>Import State...</button>
          </div>
        </div>
      </div>

      {toast && <div className="toast">{toast}</div>}

      {showImport && (
        <div className="modal-overlay" onClick={()=>setShowImport(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div className="modal-title">Import Project State</div>
            <div style={{fontSize:12,color:'var(--text-secondary)',marginBottom:8}}>Paste a previously saved state JSON (from "Save State" button):</div>
            <textarea value={importText} onChange={e=>setImportText(e.target.value)} rows={12} style={{width:'100%',fontFamily:'var(--font-mono)',fontSize:11}} placeholder='Paste JSON here...' />
            <div className="btn-group" style={{marginTop:8}}>
              <button className="btn btn-accent" onClick={handleImport}>Import</button>
              <button className="btn" onClick={()=>setShowImport(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
