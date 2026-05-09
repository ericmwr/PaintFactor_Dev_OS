// Admin authoring hub. Eight sub-tabs: Modules, Scenarios, Tasks, QT Builder,
// Assemblies, Modifiers, Drafts, Archive. Header carries a Regenerate-bundle
// button that re-runs build-scenario-bundle.mjs via the dev plugin. Gate:
// shown only when localStorage.paintscope.admin === '1'.

import { useState, useCallback } from 'react';
import ModuleList from './ModuleList.jsx';
import ScenarioList from './ScenarioList.jsx';
import TaskList from './TaskList.jsx';
import QTBuilder from './QTBuilder.jsx';
import AssemblyBuilder from './AssemblyBuilder.jsx';
import ModifierList from './ModifierList.jsx';
import DraftsView from './DraftsView.jsx';
import ArchiveView from './ArchiveView.jsx';
import { regenBundle } from '../../authoring/archive-ops.js';

const KIND_TO_TAB = {
  module: 'modules',
  scenario: 'scenarios',
  task: 'tasks',
  assembly: 'assemblies',
  modifier: 'modifiers',
};

const TABS = [
  { id: 'modules',    label: 'Modules'    },
  { id: 'scenarios',  label: 'Scenarios'  },
  { id: 'tasks',      label: 'Tasks'      },
  { id: 'qt',         label: 'QT Builder' },
  { id: 'assemblies', label: 'Assemblies' },
  { id: 'modifiers',  label: 'Modifiers'  },
  { id: 'drafts',     label: 'Drafts'     },
  { id: 'archive',    label: 'Archive'    },
];

export default function AuthoringView() {
  const [tab, setTab] = useState('modules');
  // Cross-tab navigation target from DraftsView — { kind, id, nonce }.
  // Nonce changes on every request so the matching list re-fires its select
  // effect even when the user re-clicks the same draft.
  const [pendingSelection, setPendingSelection] = useState(null);
  const [regenStatus, setRegenStatus] = useState(null); // null | 'running' | { ok, ms } | { error }

  const handleNavigate = useCallback((kind, id) => {
    const nextTab = KIND_TO_TAB[kind];
    if (!nextTab) return;
    setTab(nextTab);
    setPendingSelection({ kind, id, nonce: Date.now() });
  }, []);

  const handleRegen = useCallback(async () => {
    setRegenStatus('running');
    try {
      const res = await regenBundle();
      setRegenStatus({ ok: true, ms: res.ms });
      setTimeout(() => setRegenStatus(null), 4000);
    } catch (e) {
      setRegenStatus({ error: e.message });
    }
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{
        display: 'flex',
        gap: 4,
        padding: '6px 12px',
        borderBottom: '1px solid var(--border)',
        background: 'rgba(0,0,0,0.1)',
        alignItems: 'center',
      }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: '4px 12px',
              fontSize: 12,
              background: tab === t.id ? 'var(--accent, #82aaff)' : 'transparent',
              color: tab === t.id ? '#000' : 'var(--text)',
              border: '1px solid var(--border)',
              borderRadius: 3,
              cursor: 'pointer',
              fontWeight: tab === t.id ? 600 : 400,
            }}
          >{t.label}</button>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          {regenStatus && (
            <span style={{
              fontSize: 10,
              color: regenStatus === 'running' ? 'var(--text-muted)'
                : regenStatus.ok ? '#5aa85a'
                : '#e74c3c',
            }}>
              {regenStatus === 'running' ? 'regenerating bundle…'
                : regenStatus.ok ? `bundle regenerated in ${regenStatus.ms}ms`
                : `regen failed: ${regenStatus.error}`}
            </span>
          )}
          <button
            onClick={handleRegen}
            disabled={regenStatus === 'running'}
            title="Re-runs build-scenario-bundle.mjs and HMR re-imports the new bundle"
            style={{
              padding: '4px 10px',
              fontSize: 11,
              background: 'transparent',
              color: 'var(--text)',
              border: '1px solid var(--border)',
              borderRadius: 3,
              cursor: regenStatus === 'running' ? 'wait' : 'pointer',
            }}
          >Regenerate bundle</button>
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
            Admin · drafts in IndexedDB · publish writes to <code>Claude/modules</code>+<code>scenarios</code>
          </span>
        </div>
      </div>
      <div style={{ flex: 1, overflow: 'hidden', padding: 12 }}>
        {tab === 'modules'    && <ModuleList pendingSelection={pendingSelection?.kind === 'module' ? pendingSelection : null} onNavigateToScenario={(id) => handleNavigate('scenario', id)} onNavigateToTask={(id) => handleNavigate('task', id)} />}
        {tab === 'scenarios'  && <ScenarioList pendingSelection={pendingSelection?.kind === 'scenario' ? pendingSelection : null} onNavigateToModule={(id) => handleNavigate('module', id)} />}
        {tab === 'tasks'      && <TaskList pendingSelection={pendingSelection?.kind === 'task' ? pendingSelection : null} onNavigateToModule={(id) => handleNavigate('module', id)} />}
        {tab === 'qt'         && <QTBuilder />}
        {tab === 'assemblies' && <AssemblyBuilder pendingSelection={pendingSelection?.kind === 'assembly' ? pendingSelection : null} />}
        {tab === 'modifiers'  && <ModifierList pendingSelection={pendingSelection?.kind === 'modifier' ? pendingSelection : null} />}
        {tab === 'drafts'     && <DraftsView onNavigate={handleNavigate} />}
        {tab === 'archive'    && <ArchiveView />}
      </div>
    </div>
  );
}

export function isAuthoringEnabled() {
  try { return localStorage.getItem('paintscope.admin') === '1'; }
  catch { return false; }
}
