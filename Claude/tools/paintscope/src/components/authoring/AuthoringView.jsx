// Admin authoring hub. Eight sub-tabs: Modules, Scenarios, Tasks, QT Builder,
// Assemblies, Modifiers, Drafts, Archive. Header carries a Regenerate-bundle
// button that re-runs build-scenario-bundle.mjs via the dev plugin.
//
// Filter state preservation: ModuleList, ScenarioList, and TaskList are
// kept mounted across tab switches (display: none on the inactive ones).
// Without this, switching from Tasks → Module via a Where-used link would
// unmount TaskList and lose chip filters / search / selected row / scroll
// position. The other tabs (QT/Assemblies/Modifiers/Drafts/Archive)
// stay conditionally mounted since they don't participate in the
// reverse-lookup nav chain.
//
// Navigation history: a navStack tracks every cross-tab forward link
// (Where-used clicks + module/task forward chips). A breadcrumb above
// the tab content lets the user jump back one step or all the way to
// the chain's origin. Clicking a top-nav tab button directly clears
// the chain (treats it as a fresh entry point).
//
// Gate: shown only when localStorage.paintscope.admin === '1'.

import { useState, useCallback, useEffect } from 'react';
import ModuleList from './ModuleList.jsx';
import ScenarioList from './ScenarioList.jsx';
import TaskList from './TaskList.jsx';
import QTBuilder from './QTBuilder.jsx';
import AssemblyBuilder from './AssemblyBuilder.jsx';
import ModifierList from './ModifierList.jsx';
import DraftsView from './DraftsView.jsx';
import ArchiveView from './ArchiveView.jsx';
import { regenBundle } from '../../authoring/archive-ops.js';
import { getLedgerCount, buildLedgerExport, clearLedger } from '../../data/ledger-db.js';

const KIND_TO_TAB = {
  module: 'modules',
  scenario: 'scenarios',
  task: 'tasks',
  assembly: 'assemblies',
  modifier: 'modifiers',
};

const TAB_TO_KIND = {
  modules: 'module',
  scenarios: 'scenario',
  tasks: 'task',
  assemblies: 'assembly',
  modifiers: 'modifier',
};

const TAB_LABELS = {
  modules: 'Modules',
  scenarios: 'Scenarios',
  tasks: 'Tasks',
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
  // Cross-tab navigation target from DraftsView / forward links —
  // { kind, id, nonce }. Nonce changes on every request so the matching
  // list re-fires its select effect even when the user re-clicks the
  // same draft / link.
  const [pendingSelection, setPendingSelection] = useState(null);
  // navStack[0] is the chain origin (a tab the user was on when they
  // first clicked a forward link). Each subsequent entry is a forward
  // navigation target. Empty stack = no chain in progress.
  //   { tab: 'tasks',   id: null,    label: 'Tasks' }       // origin (no specific row)
  //   { tab: 'modules', id: 'MOD_X', label: 'MOD_X' }
  //   { tab: 'scenarios', id: 'SCN_Y', label: 'SCN_Y' }
  const [navStack, setNavStack] = useState([]);
  const [regenStatus, setRegenStatus] = useState(null);

  const handleNavigate = useCallback((kind, id) => {
    const nextTab = KIND_TO_TAB[kind];
    if (!nextTab) return;
    setTab(currentTab => {
      const newEntry = { tab: nextTab, id, label: id };
      setNavStack(prevStack => {
        if (prevStack.length === 0) {
          // First forward link in this chain — capture origin tab.
          return [
            { tab: currentTab, id: null, label: TAB_LABELS[currentTab] || currentTab },
            newEntry,
          ];
        }
        return [...prevStack, newEntry];
      });
      return nextTab;
    });
    setPendingSelection({ kind, id, nonce: Date.now() });
  }, []);

  // User clicked a top-nav tab button directly — treat as exiting the chain.
  const handleTabClick = useCallback((tabId) => {
    setTab(tabId);
    setNavStack([]);
  }, []);

  // Pop one step. If popping reduces the stack to just the origin, clear it.
  const goBack = useCallback(() => {
    setNavStack(prev => {
      if (prev.length === 0) return prev;
      const trimmed = prev.slice(0, -1);
      const target = trimmed[trimmed.length - 1];
      if (!target) return [];
      setTab(target.tab);
      if (target.id) {
        setPendingSelection({ kind: TAB_TO_KIND[target.tab], id: target.id, nonce: Date.now() });
      }
      // If only the origin remains, drop the chain — manual nav from here on.
      return trimmed.length <= 1 ? [] : trimmed;
    });
  }, []);

  // Jump to step `index` in the chain. Same semantics as goBack but truncates
  // to (index + 1) entries.
  const jumpToStep = useCallback((index) => {
    setNavStack(prev => {
      if (index < 0 || index >= prev.length) return prev;
      const truncated = prev.slice(0, index + 1);
      const target = truncated[truncated.length - 1];
      setTab(target.tab);
      if (target.id) {
        setPendingSelection({ kind: TAB_TO_KIND[target.tab], id: target.id, nonce: Date.now() });
      }
      return truncated.length <= 1 ? [] : truncated;
    });
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

  // Ledger count + actions. Refreshes on focus + every 5s while the tab
  // is visible so the user sees the count climb as estimates run.
  const [ledgerCount, setLedgerCount] = useState(null);
  useEffect(() => {
    let cancelled = false;
    const refresh = () => {
      getLedgerCount().then(n => { if (!cancelled) setLedgerCount(n); }).catch(() => {});
    };
    refresh();
    const id = setInterval(refresh, 5000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);
  const handleDownloadLedger = useCallback(async () => {
    try {
      const payload = await buildLedgerExport();
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `paintscope-fired-tasks-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) {
      alert(`Ledger export failed: ${e.message}`);
    }
  }, []);
  const handleClearLedger = useCallback(async () => {
    if (!confirm(`Clear the fired-tasks ledger?\n\nThis removes ${ledgerCount ?? '?'} records. Download first if you want a backup.`)) return;
    try {
      const cleared = await clearLedger();
      setLedgerCount(0);
      console.log(`[ledger] cleared ${cleared} records`);
    } catch (e) {
      alert(`Ledger clear failed: ${e.message}`);
    }
  }, [ledgerCount]);

  const showBreadcrumb = navStack.length > 1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Top tabs */}
      <div style={{
        display: 'flex', gap: 4, padding: '6px 12px',
        borderBottom: '1px solid var(--border)', background: 'rgba(0,0,0,0.1)',
        alignItems: 'center',
      }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => handleTabClick(t.id)}
            style={{
              padding: '4px 12px', fontSize: 12,
              background: tab === t.id ? 'var(--accent, #82aaff)' : 'transparent',
              color: tab === t.id ? '#000' : 'var(--text)',
              border: '1px solid var(--border)', borderRadius: 3, cursor: 'pointer',
              fontWeight: tab === t.id ? 600 : 400,
            }}
          >{t.label}</button>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          {regenStatus && (
            <span style={{
              fontSize: 10,
              color: regenStatus === 'running' ? 'var(--text-muted)'
                : regenStatus.ok ? '#5aa85a' : '#e74c3c',
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
              padding: '4px 10px', fontSize: 11, background: 'transparent', color: 'var(--text)',
              border: '1px solid var(--border)', borderRadius: 3,
              cursor: regenStatus === 'running' ? 'wait' : 'pointer',
            }}
          >Regenerate bundle</button>
          <button
            onClick={handleDownloadLedger}
            disabled={!ledgerCount}
            title={`Download fired-tasks ledger (${ledgerCount ?? '?'} distinct task IDs accumulated). Drives the elimination-by-absence cleanup workflow.`}
            style={{
              padding: '4px 10px', fontSize: 11, background: 'transparent', color: 'var(--text)',
              border: '1px solid var(--border)', borderRadius: 3,
              cursor: !ledgerCount ? 'not-allowed' : 'pointer',
              opacity: !ledgerCount ? 0.5 : 1,
            }}
          >Ledger ({ledgerCount ?? '…'})</button>
          <button
            onClick={handleClearLedger}
            disabled={!ledgerCount}
            title="Clear the fired-tasks ledger. Download first if you want a backup."
            style={{
              padding: '4px 8px', fontSize: 11, background: 'transparent', color: 'var(--text-muted)',
              border: '1px solid var(--border)', borderRadius: 3,
              cursor: !ledgerCount ? 'not-allowed' : 'pointer',
              opacity: !ledgerCount ? 0.4 : 0.8,
            }}
          >clear</button>
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
            Admin · drafts in IndexedDB · publish writes to <code>Claude/modules</code>+<code>scenarios</code>
          </span>
        </div>
      </div>

      {/* Breadcrumb — visible only when a navigation chain is in progress */}
      {showBreadcrumb && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '4px 12px', fontSize: 11,
          background: 'rgba(130, 170, 255, 0.06)',
          borderBottom: '1px solid var(--border)',
        }}>
          <button
            onClick={goBack}
            title="Pop one step off the navigation stack"
            style={{
              padding: '2px 8px', fontSize: 11,
              background: 'transparent', color: 'var(--accent, #82aaff)',
              border: '1px solid var(--accent, #82aaff)', borderRadius: 3, cursor: 'pointer',
            }}
          >← Back</button>
          {navStack.map((step, i) => {
            const isCurrent = i === navStack.length - 1;
            return (
              <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {i > 0 && <span style={{ color: 'var(--text-muted)' }}>›</span>}
                <button
                  onClick={() => jumpToStep(i)}
                  disabled={isCurrent}
                  title={isCurrent ? 'You are here' : `Jump back to ${step.label}`}
                  style={{
                    padding: '1px 6px', fontSize: 11, fontFamily: step.id ? 'var(--font-mono)' : 'inherit',
                    background: isCurrent ? 'rgba(130, 170, 255, 0.18)' : 'transparent',
                    color: isCurrent ? 'var(--text)' : 'var(--accent, #82aaff)',
                    border: '1px solid transparent', borderRadius: 3,
                    cursor: isCurrent ? 'default' : 'pointer',
                    textDecoration: isCurrent ? 'none' : 'underline',
                    fontWeight: isCurrent ? 600 : 400,
                  }}
                >{step.label}</button>
              </span>
            );
          })}
        </div>
      )}

      {/* Tab content. The three linked lists stay mounted across tab
          switches (display:none on inactive) so chip filters, search,
          selected row, expand state, and scroll position survive
          navigation. Other tabs render conditionally. */}
      <div style={{ flex: 1, overflow: 'hidden', padding: 12, position: 'relative' }}>
        <div style={{ display: tab === 'modules' ? 'block' : 'none', height: '100%' }}>
          <ModuleList
            pendingSelection={pendingSelection?.kind === 'module' ? pendingSelection : null}
            onNavigateToScenario={(id) => handleNavigate('scenario', id)}
            onNavigateToTask={(id) => handleNavigate('task', id)}
          />
        </div>
        <div style={{ display: tab === 'scenarios' ? 'block' : 'none', height: '100%' }}>
          <ScenarioList
            pendingSelection={pendingSelection?.kind === 'scenario' ? pendingSelection : null}
            onNavigateToModule={(id) => handleNavigate('module', id)}
          />
        </div>
        <div style={{ display: tab === 'tasks' ? 'block' : 'none', height: '100%' }}>
          <TaskList
            pendingSelection={pendingSelection?.kind === 'task' ? pendingSelection : null}
            onNavigateToModule={(id) => handleNavigate('module', id)}
          />
        </div>
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
