// Lab sandbox root. Wraps the same providers AppShell uses so the lab can
// consume real project data via the existing hooks (useProject + useSpecData
// + useEstimateScenario), without any production UI surface in the tree.
//
// Activate with ?lab=scope-tree.

import { useEffect, useState } from 'react';
import { ProjectProvider } from '../../hooks/useProject';
import { SpecDataProvider } from '../../hooks/useSpecData';
import { useProjectDB } from '../../hooks/useProjectDB';
import { loadProject } from '../../data/project-db';
import ErrorBoundary from '../shared/ErrorBoundary';
import LabScopeTree from './LabScopeTree.jsx';
import LabEstimatePreview from './LabEstimatePreview.jsx';
import './scope-tree-lab.css';

export default function LabRoot({ labId }) {
  const projectDb = useProjectDB();
  const [loaded, setLoaded] = useState({ data: null, forId: null });

  useEffect(() => {
    let cancelled = false;
    setLoaded({ data: null, forId: null });
    (async () => {
      if (projectDb.activeProjectId) {
        const proj = await loadProject(projectDb.activeProjectId);
        if (!cancelled) setLoaded({ data: proj?.project_data || null, forId: projectDb.activeProjectId });
      } else {
        if (!cancelled) setLoaded({ data: null, forId: '__none__' });
      }
    })();
    return () => { cancelled = true; };
  }, [projectDb.activeProjectId]);

  const isReady = !projectDb.loading && loaded.forId === (projectDb.activeProjectId || '__none__');
  if (!isReady) {
    return <div className="lab-loading">Loading project…</div>;
  }

  if (!projectDb.activeProjectId) {
    return (
      <div className="lab-empty">
        <h2>Scope Tree Lab</h2>
        <p>No active project. Open the main app, select a project, then return here with <code>?lab=scope-tree</code>.</p>
        <p><a href={window.location.pathname}>← Back to PaintScope</a></p>
      </div>
    );
  }

  return (
    <SpecDataProvider>
      <ProjectProvider key={loaded.forId} initialData={loaded.data} projectId={projectDb.activeProjectId}>
        <ErrorBoundary label="Lab">
          {labId === 'scope-tree' && <LabScopeTree />}
          {labId === 'estimate-preview' && <LabEstimatePreview />}
          {labId !== 'scope-tree' && labId !== 'estimate-preview' && (
            <div className="lab-empty">
              <h2>Unknown lab: {labId}</h2>
              <p>Available labs: <code>?lab=scope-tree</code>, <code>?lab=estimate-preview</code></p>
              <p><a href={window.location.pathname}>← Back to PaintScope</a></p>
            </div>
          )}
        </ErrorBoundary>
      </ProjectProvider>
    </SpecDataProvider>
  );
}
