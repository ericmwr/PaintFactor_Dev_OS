// Scope Tree Lab — Phase 2 sandbox surface for the canonical scope tree.
//
// Bare-frame viewer: "what does the data look like?" — minimal chrome, all
// surface area to the tree itself. For an estimate-page-style framing, see
// LabEstimatePreview (?lab=estimate-preview).
//
// Phase 2 plan: memory/project_scope_tree_phase2_lab.md

import { useProject } from '../../hooks/useProject';
import { useEstimateScenario } from '../../hooks/useEstimateScenario';
import ScopeTreeBody from './ScopeTreeBody.jsx';

export default function LabScopeTree() {
  const { state } = useProject();
  const estimate = useEstimateScenario();

  return (
    <div className="lab-shell">
      <header className="lab-header">
        <div className="lab-header-title">
          <span className="lab-header-eyebrow">PaintScope · Lab</span>
          <h1>Scope Tree</h1>
        </div>
        <div className="lab-header-meta">
          <span className="lab-pill">sandbox</span>
          <a className="lab-back" href={window.location.pathname}>← Back to PaintScope</a>
        </div>
      </header>
      <div className="lab-content">
        <ScopeTreeBody estimate={estimate} project={state.project || {}} />
      </div>
    </div>
  );
}
