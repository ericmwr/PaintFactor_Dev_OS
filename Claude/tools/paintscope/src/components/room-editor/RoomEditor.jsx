import { useState, useEffect, useCallback } from 'react';
import { useDerivedRoom } from '../../hooks/useDerivedRoom';
import RoomQuickStats from './RoomQuickStats';
import IdentityTab from './tabs/IdentityTab';
import StructureTab from './tabs/StructureTab';
import OpeningsTab from './tabs/OpeningsTab';

import TrimTab from './tabs/TrimTab';
import SpecialtyTab from './tabs/SpecialtyTab';
import ClosetsTab from './tabs/ClosetsTab';
import ProtectionTab from './tabs/ProtectionTab';
import PhotoAnalysisModal from '../photo-analysis/PhotoAnalysisModal';
import { usePhotoAnalysis } from '../../hooks/usePhotoAnalysis';

const TABS = [
  { id: 'identity',   label: 'Identity' },
  { id: 'structure',  label: 'Structure' },
  { id: 'openings',   label: 'Openings' },
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
  const photoAnalysis = usePhotoAnalysis();

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
  const trimCount = Object.keys(subs).filter(id => !openingIds.has(id) && !['walls', 'ceiling'].includes(id) && (subs[id]?.group === 'Trim' || ['baseboard', 'crown_molding', 'chair_rail', 'shoe_mold', 'wainscot_cap', 'picture_rail', 'window_stool', 'window_apron', 'shadow_box', 'panel_mold'].includes(id))).length;
  const specialtyCount = Object.keys(subs).filter(id => ['wainscoting', 'wood_feature_wall', 'wood_ceiling', 'closet_shelving', 'beams', 'columns', 'mantels', 'builtins', 'stairway'].includes(id)).length;
  const openingCount = (room.openings?.length || 0) + (subs.doors?.items?.length || 0) + (subs.windows?.items?.length || 0);
  const fixtureCount = room.fixtures ? Object.keys(room.fixtures).length : 0;

  const getBadge = (tabId) => {
    switch (tabId) {
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
      {/* Quick stats bar + camera button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ flex: 1 }}><RoomQuickStats room={room} derived={derived} /></div>
        <button
          className="btn-camera"
          onClick={() => photoAnalysis.openForRoom(room.id)}
          title="Scan room photos with AI"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
            <circle cx="12" cy="13" r="4"/>
          </svg>
          Scan
        </button>
      </div>

      {/* Photo analysis modal */}
      {photoAnalysis.showModal && (
        <PhotoAnalysisModal
          roomId={photoAnalysis.targetRoomId}
          savedResult={room.photoAnalysis || null}
          onApply={(roomId, patch, analysisResult) => dispatch({ type: 'APPLY_PHOTO_ANALYSIS', payload: { roomId, patch, analysisResult } })}
          onCreateRoom={(patch, analysisResult) => dispatch({ type: 'CREATE_ROOM_FROM_PHOTO', payload: { patch, analysisResult } })}
          onClose={photoAnalysis.close}
        />
      )}

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

        {activeTab === 'trim' && <TrimTab {...substrateTabProps} />}
        {activeTab === 'specialty' && <SpecialtyTab {...substrateTabProps} />}
        {activeTab === 'closets' && <ClosetsTab {...tabProps} />}
        {activeTab === 'protection' && <ProtectionTab {...tabProps} />}
      </div>
    </div>
  );
}
