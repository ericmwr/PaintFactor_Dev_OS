// Shared scope-tree body — controls + tree + ctx inspector.
// Owns its own UI state (orientation, depth, expand overrides, selected task)
// and computes the pivoted tree from the estimate it receives.
//
// Consumed by:
//   - LabScopeTree (bare lab framing)
//   - LabEstimatePreview (estimate-style framing)

import { useMemo, useState, useCallback } from 'react';
import { buildScopeTree, pivotTree } from '../../engine/scope-tree.js';
import ScopeTreeNode from './ScopeTreeNode.jsx';

const DEFAULT_DEPTH_BY_ORIENTATION = {
  room:    4,
  // Phase view: Project → Phase → Activity → Merged Task. Default opens
  // through Phase so Activities (level 3) are visible but their atomic
  // children (level 4) are click-to-expand for the rate drill-down.
  phase:   3,
  element: 3,
};

const ORIENTATIONS = [
  { id: 'room',    label: 'Room' },
  { id: 'phase',   label: 'Phase' },
  { id: 'element', label: 'Element' },
];

const DEPTH_OPTIONS = [
  { id: 2, label: 'Room/Group' },
  { id: 3, label: 'Element Group' },
  { id: 4, label: 'Substrate' },
  { id: 6, label: 'Phase' },
  { id: 7, label: 'Task' },
];

// Lab export — bundles the estimate + project + current pivot tree into
// a JSON file so you can share exactly what you see with someone else
// (e.g., for debugging duplicate rows or merge edge cases). Excludes
// `perInputResults` since it duplicates specResults data and bloats the
// payload, but keeps everything buildScopeTree needs to re-render.
function exportLabState(estimate, project, orientation, tree) {
  const projectName = project?.project_name || project?.name || 'project';
  const slug = projectName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

  const payload = {
    exportedAt: new Date().toISOString(),
    source: 'scope-tree-lab',
    orientation,
    project: {
      name: projectName,
      roomCount: (project?.rooms || []).length,
      rooms: (project?.rooms || []).map(r => ({ id: r.id, label: r.label })),
    },
    estimate: {
      totalHours: estimate?.totalHours || 0,
      totalCrewDays: estimate?.totalCrewDays || 0,
      activatedSpecs: estimate?.activatedSpecs || 0,
      totalSpecs: estimate?.totalSpecs || 0,
      specResults: estimate?.specResults || [],
      roomProtection: estimate?.roomProtection || {},
      fixtureProtection: estimate?.fixtureProtection || {},
      pricing: estimate?.pricing || null,
      warnings: estimate?.warnings || [],
      phaseHours: estimate?.phaseHours || {},
    },
    pivotTree: tree, // already-pivoted tree so the recipient sees exactly what's on screen
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `scope-tree-lab_${slug}_${orientation}_${timestamp}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function ScopeTreeBody({ estimate, project, showTotals = true }) {
  const [orientation, setOrientation] = useState('room');
  const [defaultDepth, setDefaultDepth] = useState(DEFAULT_DEPTH_BY_ORIENTATION.room);
  const [overrides, setOverrides] = useState({});
  const [bulkVersion, setBulkVersion] = useState(0);
  const [bulkMode, setBulkMode] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);

  const tree = useMemo(() => {
    if (!estimate || estimate.error) return null;
    try {
      const canonical = buildScopeTree(estimate, project || {});
      return pivotTree(canonical, orientation);
    } catch (e) {
      console.error('[ScopeTreeBody] tree build error:', e);
      return null;
    }
  }, [estimate, project, orientation]);

  const setOrientationAndReset = useCallback((id) => {
    setOrientation(id);
    setDefaultDepth(DEFAULT_DEPTH_BY_ORIENTATION[id] ?? 4);
    setOverrides({});
    setBulkMode(null);
  }, []);

  const handleToggle = useCallback((nodeId, nextExpanded) => {
    setOverrides(prev => ({ ...prev, [nodeId]: nextExpanded }));
  }, []);

  const handleExpandAll = useCallback(() => {
    setOverrides({});
    setBulkMode('expand');
    setBulkVersion(v => v + 1);
  }, []);

  const handleCollapseAll = useCallback(() => {
    setOverrides({});
    setBulkMode('collapse');
    setBulkVersion(v => v + 1);
  }, []);

  const handleDepthChange = useCallback((nextDepth) => {
    setDefaultDepth(nextDepth);
    setOverrides({});
    setBulkMode(null);
  }, []);

  const handleTaskClick = useCallback((node) => {
    if (node.kind === 'task' || node.kind === 'merged_task') setSelectedTask(node);
  }, []);

  const isExpanded = useCallback((node) => {
    if (Object.prototype.hasOwnProperty.call(overrides, node.id)) {
      return overrides[node.id];
    }
    if (bulkMode === 'expand') return true;
    if (bulkMode === 'collapse') return node.level < 2;
    return node.level < defaultDepth;
  }, [overrides, bulkMode, defaultDepth]);

  if (!estimate) {
    return <div className="lab-status">Loading estimate…</div>;
  }
  if (estimate.error) {
    return <div className="lab-status lab-error">Estimate error: {estimate.error}</div>;
  }
  if (!tree) {
    return <div className="lab-status">No tree available — open the main app and add a room first.</div>;
  }

  const totals = { hours: tree.hours, dollars: tree.dollars };

  return (
    <>
      <div className="lab-controls">
        <div className="lab-control-group">
          <span className="lab-label">View</span>
          <div className="lab-segmented">
            {ORIENTATIONS.map(o => (
              <button
                key={o.id}
                className={`lab-seg-btn ${orientation === o.id ? 'active' : ''}`}
                onClick={() => setOrientationAndReset(o.id)}
              >{o.label}</button>
            ))}
          </div>
        </div>

        <div className="lab-control-group">
          <span className="lab-label">Default depth</span>
          <select
            className="lab-select"
            value={defaultDepth}
            onChange={(e) => handleDepthChange(Number(e.target.value))}
          >
            {DEPTH_OPTIONS.map(d => (
              <option key={d.id} value={d.id}>{d.label}</option>
            ))}
          </select>
        </div>

        <div className="lab-control-group">
          <button className="lab-btn" onClick={handleExpandAll}>Expand all</button>
          <button className="lab-btn" onClick={handleCollapseAll}>Collapse all</button>
          <button
            className="lab-btn lab-btn-export"
            onClick={() => exportLabState(estimate, project, orientation, tree)}
            title="Download a JSON snapshot of the current view (project, estimate, pivoted tree)"
          >Export…</button>
        </div>

        <div className="lab-control-spacer" />

        {showTotals && (
          <div className="lab-totals">
            <span className="lab-totals-label">Tree total</span>
            <span className="lab-totals-hours">{totals.hours.toFixed(2)} hrs</span>
            {totals.dollars > 0 && (
              <span className="lab-totals-dollars">${totals.dollars.toFixed(2)}</span>
            )}
          </div>
        )}
      </div>

      <div className="lab-body">
        <div className="lab-tree">
          <ScopeTreeNode
            key={`${orientation}-${bulkVersion}`}
            node={tree}
            isExpanded={isExpanded}
            onToggle={handleToggle}
            onTaskClick={handleTaskClick}
            selectedTaskId={selectedTask?.id}
          />
        </div>

        {selectedTask && (
          <CtxInspector task={selectedTask} onClose={() => setSelectedTask(null)} />
        )}
      </div>
    </>
  );
}

function CtxInspector({ task, onClose }) {
  const meta = task.taskMeta || {};
  const ctx = meta.ctx || null;
  const isMerged = task.kind === 'merged_task' && Array.isArray(meta.perRoom);

  return (
    <aside className="lab-inspector">
      <div className="lab-inspector-head">
        <span className="lab-inspector-title">{isMerged ? 'Merged task inspector' : 'Task inspector'}</span>
        <button className="lab-inspector-close" onClick={onClose} title="Close">×</button>
      </div>
      <div className="lab-inspector-body">
        <Field label="Task">{task.label}</Field>
        <Field label={isMerged ? 'Total hours' : 'Hours'}>{task.hours.toFixed(2)}</Field>
        {task.dollars > 0 && <Field label={isMerged ? 'Total dollars' : 'Dollars'}>${task.dollars.toFixed(2)}</Field>}
        {meta.quantity != null && meta.quantity > 0 && (
          <Field label={isMerged ? 'Total quantity' : 'Quantity'}>{meta.quantity} {meta.uom || ''}</Field>
        )}
        {meta.baseRate != null && (
          <Field label="Base rate">{meta.isFixed ? String(meta.baseRate) : `${meta.baseRate}${meta.uom ? `/${meta.uom}` : ''}/hr`}</Field>
        )}

        {isMerged && (
          <>
            <hr className="lab-inspector-rule" />
            <div className="lab-inspector-section-title">Per-room breakdown</div>
            {(() => {
              // Only show the Band column when at least two rooms have different bands —
              // otherwise it's noise.
              const bands = new Set(meta.perRoom.map(r => r.band).filter(Boolean));
              const showBand = bands.size > 1;
              return (
                <table className="lab-perroom">
                  <thead>
                    <tr>
                      <th>Room</th>
                      {showBand && <th>Access</th>}
                      <th className="num">Qty</th>
                      <th className="num">Hrs</th>
                      <th className="num">$</th>
                    </tr>
                  </thead>
                  <tbody>
                    {meta.perRoom.map(r => (
                      <tr key={`${r.roomIndex}-${r.band || ''}`}>
                        <td>{r.roomLabel}</td>
                        {showBand && <td>{r.band || '—'}</td>}
                        <td className="num">{r.quantity != null ? Number(r.quantity).toFixed(2) : '—'}</td>
                        <td className="num">{Number(r.hours).toFixed(2)}</td>
                        <td className="num">${Number(r.dollars).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              );
            })()}
          </>
        )}

        <hr className="lab-inspector-rule" />
        <Field label="Task ID">{meta.taskId || '—'}</Field>
        <Field label="Spec">{meta.specName || meta.specId || '—'}</Field>
        {!isMerged && <Field label="Room">{meta.roomLabel || '—'}</Field>}
        <Field label="Element group">{meta.elementGroup || '—'}</Field>
        <Field label="Substrate">{meta.substrate || '—'}</Field>
        <Field label="Coating">{meta.coating || '—'}</Field>
        <Field label="Phase">{meta.phase || '—'}</Field>
        {meta.band && <Field label="Height band">{meta.band}</Field>}
        {meta.coatNumber != null && meta.coatNumber !== 1 && <Field label="Coat #">{meta.coatNumber}</Field>}
        <hr className="lab-inspector-rule" />
        <div className="lab-inspector-section-title">ctx</div>
        {ctx ? (
          <pre className="lab-ctx">{JSON.stringify(ctx, null, 2)}</pre>
        ) : (
          <div className="lab-ctx-empty">no ctx (protection or project-setup leaf)</div>
        )}
      </div>
    </aside>
  );
}

function Field({ label, children }) {
  return (
    <div className="lab-field">
      <span className="lab-field-label">{label}</span>
      <span className="lab-field-value">{children}</span>
    </div>
  );
}
