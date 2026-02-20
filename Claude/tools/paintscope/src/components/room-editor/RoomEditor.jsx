import { useState, useEffect, useCallback } from 'react';
import { useDerivedRoom } from '../../hooks/useDerivedRoom';
import RoomQuickStats from './RoomQuickStats';
import IdentityTab from './tabs/IdentityTab';
import StructureTab from './tabs/StructureTab';
import OpeningsTab from './tabs/OpeningsTab';
import SurfacesTab from './tabs/SurfacesTab';
import TrimTab from './tabs/TrimTab';
import SpecialtyTab from './tabs/SpecialtyTab';
import ClosetsTab from './tabs/ClosetsTab';
import ProtectionTab from './tabs/ProtectionTab';

const TABS = [
  { id: 'identity',   label: 'Identity' },
  { id: 'structure',  label: 'Structure' },
  { id: 'openings',   label: 'Openings' },
  { id: 'surfaces',   label: 'Surfaces' },
  { id: 'trim',       label: 'Trim' },
  { id: 'specialty',  label: 'Specialty' },
  { id: 'closets',    label: 'Closets' },
  { id: 'protection', label: 'Protection' },
];

export default function RoomEditor({ room, project, dispatch }) {
  const [activeTab, setActiveTab] = useState('identity');
  const [focusedSubstrate, setFocusedSubstrate] = useState(null);
  const derived = useDerivedRoom(room);
  const subs = room.substrates || {};

  // Clear focus if substrate was unchecked externally
  useEffect(() => {
    if (focusedSubstrate && !subs[focusedSubstrate]) setFocusedSubstrate(null);
  }, [subs, focusedSubstrate]);

  // Reset tab when switching rooms
  useEffect(() => {
    setActiveTab('identity');
    setFocusedSubstrate(null);
  }, [room.id]);

  // Tab badge counts
  const openingIds = new Set(['doors', 'windows', 'door_casing', 'window_casing', 'door_frames', 'window_jamb']);
  const surfaceCount = ['walls', 'ceiling'].filter(id => subs[id]).length;
  const trimCount = Object.keys(subs).filter(id => !openingIds.has(id) && !['walls', 'ceiling'].includes(id) && (subs[id]?.group === 'Trim' || ['baseboard', 'crown_molding', 'chair_rail', 'shoe_mold', 'wainscot_cap', 'picture_rail', 'window_stool', 'window_apron', 'shadow_box', 'panel_mold'].includes(id))).length;
  const specialtyCount = Object.keys(subs).filter(id => ['wainscoting', 'wood_feature_wall', 'wood_ceiling', 'closet_shelving', 'beams', 'columns', 'mantels', 'builtins', 'stair_risers', 'stair_railing'].includes(id)).length;
  const openingCount = (room.openings?.length || 0) + (subs.doors?.items?.length || 0) + (subs.windows?.items?.length || 0);
  const fixtureCount = room.fixtures ? Object.keys(room.fixtures).length : 0;

  const getBadge = (tabId) => {
    switch (tabId) {
      case 'surfaces': return surfaceCount || null;
      case 'trim': return trimCount || null;
      case 'specialty': return specialtyCount || null;
      case 'openings': return openingCount || null;
      case 'closets': return room.closets?.length || null;
      case 'protection': return fixtureCount || null;
      case 'structure': return room.vaulted_ceiling ? 'V' : null;
      default: return null;
    }
  };

  // Keyboard navigation
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

  const tabProps = { room, derived, dispatch, project };
  const substrateTabProps = { ...tabProps, focusedSubstrate, setFocusedSubstrate };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Quick stats bar */}
      <RoomQuickStats room={room} derived={derived} />

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
              {badge != null && (
                <span className="tab-badge">{badge}</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="editor-tab-content">
        {activeTab === 'identity' && <IdentityTab {...tabProps} />}
        {activeTab === 'structure' && <StructureTab {...tabProps} />}
        {activeTab === 'openings' && <OpeningsTab {...tabProps} />}
        {activeTab === 'surfaces' && <SurfacesTab {...substrateTabProps} />}
        {activeTab === 'trim' && <TrimTab {...substrateTabProps} />}
        {activeTab === 'specialty' && <SpecialtyTab {...substrateTabProps} />}
        {activeTab === 'closets' && <ClosetsTab {...tabProps} />}
        {activeTab === 'protection' && <ProtectionTab {...tabProps} />}
      </div>
    </div>
  );
}
