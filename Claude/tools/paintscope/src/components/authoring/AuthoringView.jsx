// Admin authoring hub. Five sub-tabs: Modules, Scenarios, Assemblies,
// Modifiers, Drafts. Gate: shown only when localStorage.paintscope.admin === '1'.

import { useState, useCallback } from 'react';
import ModuleList from './ModuleList.jsx';
import ScenarioList from './ScenarioList.jsx';
import AssemblyBuilder from './AssemblyBuilder.jsx';
import ModifierList from './ModifierList.jsx';
import DraftsView from './DraftsView.jsx';

const KIND_TO_TAB = {
  module: 'modules',
  scenario: 'scenarios',
  assembly: 'assemblies',
  modifier: 'modifiers',
};

const TABS = [
  { id: 'modules',    label: 'Modules'    },
  { id: 'scenarios',  label: 'Scenarios'  },
  { id: 'assemblies', label: 'Assemblies' },
  { id: 'modifiers',  label: 'Modifiers'  },
  { id: 'drafts',     label: 'Drafts'     },
];

export default function AuthoringView() {
  const [tab, setTab] = useState('modules');
  // Cross-tab navigation target from DraftsView — { kind, id, nonce }.
  // Nonce changes on every request so the matching list re-fires its select
  // effect even when the user re-clicks the same draft.
  const [pendingSelection, setPendingSelection] = useState(null);

  const handleNavigate = useCallback((kind, id) => {
    const nextTab = KIND_TO_TAB[kind];
    if (!nextTab) return;
    setTab(nextTab);
    setPendingSelection({ kind, id, nonce: Date.now() });
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{
        display: 'flex',
        gap: 4,
        padding: '6px 12px',
        borderBottom: '1px solid var(--border)',
        background: 'rgba(0,0,0,0.1)',
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
        <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-muted)', alignSelf: 'center' }}>
          Admin · drafts in IndexedDB · publish writes to <code>Claude/modules</code>+<code>scenarios</code>
        </span>
      </div>
      <div style={{ flex: 1, overflow: 'hidden', padding: 12 }}>
        {tab === 'modules'    && <ModuleList pendingSelection={pendingSelection?.kind === 'module' ? pendingSelection : null} />}
        {tab === 'scenarios'  && <ScenarioList pendingSelection={pendingSelection?.kind === 'scenario' ? pendingSelection : null} />}
        {tab === 'assemblies' && <AssemblyBuilder pendingSelection={pendingSelection?.kind === 'assembly' ? pendingSelection : null} />}
        {tab === 'modifiers'  && <ModifierList pendingSelection={pendingSelection?.kind === 'modifier' ? pendingSelection : null} />}
        {tab === 'drafts'     && <DraftsView onNavigate={handleNavigate} />}
      </div>
    </div>
  );
}

export function isAuthoringEnabled() {
  try { return localStorage.getItem('paintscope.admin') === '1'; }
  catch { return false; }
}
