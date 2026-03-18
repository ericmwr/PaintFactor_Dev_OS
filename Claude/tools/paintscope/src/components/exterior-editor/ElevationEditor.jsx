import { useState, useEffect, useCallback, useMemo } from 'react';
import { deriveElevation } from '../../engine/derive-elevation';
import ElevationQuickStats from './ElevationQuickStats';
import IdentityTab from './tabs/IdentityTab';
import SidingTab from './tabs/SidingTab';
import TrimTab from './tabs/TrimTab';
import OpeningsTab from './tabs/OpeningsTab';
import CaulkingTab from './tabs/CaulkingTab';
import SubElementsSection from './tabs/SubElementsSection';

const TABS = [
  { id: 'identity', label: 'Identity' },
  { id: 'siding',   label: 'Siding' },
  { id: 'trim',     label: 'Trim' },
  { id: 'openings', label: 'Openings' },
  { id: 'caulking', label: 'Caulking' },
];

export default function ElevationEditor({ elevation, dispatch, exterior, project, isRP }) {
  const [activeTab, setActiveTab] = useState('identity');
  const derived = useMemo(() => deriveElevation(elevation), [elevation]);

  // Reset tab when switching elevations
  useEffect(() => {
    setActiveTab('identity');
  }, [elevation.id]);

  // Tab badges
  const getBadge = (tabId) => {
    switch (tabId) {
      case 'siding': return elevation.siding_sections?.length || null;
      case 'trim': return Object.keys(elevation.trim || {}).length || null;
      case 'openings': return (derived.totalWindows + derived.totalDoors) || null;
      case 'caulking': return derived.caulkLF > 0 ? derived.caulkLF : null;
      default: return null;
    }
  };

  // Keyboard nav
  const handleKeyDown = useCallback((e) => {
    const idx = TABS.findIndex(t => t.id === activeTab);
    if (e.key === 'ArrowRight' && idx < TABS.length - 1) {
      e.preventDefault();
      setActiveTab(TABS[idx + 1].id);
    } else if (e.key === 'ArrowLeft' && idx > 0) {
      e.preventDefault();
      setActiveTab(TABS[idx - 1].id);
    }
  }, [activeTab]);

  const tabProps = { elevation, derived, dispatch, exterior, project, isRP };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <ElevationQuickStats elevation={elevation} derived={derived} />

      {/* Tab bar */}
      <div className="editor-tab-bar" role="tablist" onKeyDown={handleKeyDown}>
        {TABS.map(t => {
          const badge = getBadge(t.id);
          return (
            <div
              key={t.id}
              className={`editor-tab${activeTab === t.id ? ' active' : ''}`}
              role="tab"
              tabIndex={activeTab === t.id ? 0 : -1}
              aria-selected={activeTab === t.id}
              onClick={() => setActiveTab(t.id)}
            >
              {t.label}
              {badge != null && <span className="tab-badge">{badge}</span>}
            </div>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="editor-tab-content">
        {activeTab === 'identity' && <IdentityTab {...tabProps} />}
        {activeTab === 'siding' && <SidingTab {...tabProps} />}
        {activeTab === 'trim' && <TrimTab {...tabProps} />}
        {activeTab === 'openings' && <OpeningsTab {...tabProps} />}
        {activeTab === 'caulking' && <CaulkingTab {...tabProps} />}
      </div>

      {/* Sub-elements collapsible (below tabs, not a tab) */}
      <SubElementsSection {...tabProps} />
    </div>
  );
}
