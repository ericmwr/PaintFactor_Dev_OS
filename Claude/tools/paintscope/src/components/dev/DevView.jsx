// Admin-gated Dev tab. Room picker on the left, Live Engine Trace on the
// right. Header has the Copy Debug Blob button.
//
// Everything reads from useEstimateScenario() which already re-runs on any
// state change — so edits in the room editor are reflected here immediately
// when the user flips tabs.

import { useState, useMemo } from 'react';
import { useProject } from '../../hooks/useProject';
import { useEstimateScenario } from '../../hooks/useEstimateScenario.js';
import RoomTracePanel from './RoomTracePanel.jsx';
import DebugBlobButton from './DebugBlobButton.jsx';
import { buildDebugBlob } from './buildDebugBlob.js';

// Mirrors STANDALONE_INDEX in context-adapter.js — slot order drives roomIndex
// math (roomIndex = -1000 - slot).
const STANDALONE_KEYS = ['garage_doors', 'fence', 'deck', 'foundation', 'porch', 'metal_surfaces'];

const ITEM_ROW_STYLE = {
  padding: '5px 8px', fontSize: 11, cursor: 'pointer', borderRadius: 3,
  marginBottom: 2,
};

export default function DevView() {
  const { state } = useProject();
  const scenario = useEstimateScenario();
  const rooms = state.rooms || [];
  const elevations = state.exterior?.elevations || [];
  const standalone = state.exterior?.standalone || {};

  const [selectedRoomIndex, setSelectedRoomIndex] = useState(() =>
    rooms.length ? 0 : (elevations.length ? -100 : null)
  );

  const selectedItem = useMemo(() => {
    if (selectedRoomIndex == null) return null;
    if (selectedRoomIndex >= 0) {
      const room = rooms[selectedRoomIndex];
      return room
        ? { kind: 'room', data: room, label: room.name || room.label || `Room ${selectedRoomIndex + 1}` }
        : null;
    }
    if (selectedRoomIndex <= -100 && selectedRoomIndex > -1000) {
      // roomIndex = -100 - elevIdx  =>  elevIdx = -100 - roomIndex
      const elevIdx = -100 - selectedRoomIndex;
      const elev = elevations[elevIdx];
      return elev
        ? { kind: 'elevation', data: elev, label: elev.label || `Elevation ${elevIdx + 1}` }
        : null;
    }
    if (selectedRoomIndex <= -1000) {
      // roomIndex = -1000 - slot  =>  slot = -1000 - roomIndex
      const slot = -1000 - selectedRoomIndex;
      const itemKey = STANDALONE_KEYS[slot];
      return itemKey
        ? { kind: 'standalone', data: standalone[itemKey] || null, label: `Standalone: ${itemKey}` }
        : null;
    }
    return null;
  }, [selectedRoomIndex, rooms, elevations, standalone]);

  const filteredResults = useMemo(() => {
    if (!scenario) return { perInputResults: [], gaps: [] };
    return {
      perInputResults: (scenario.perInputResults || []).filter(r => r.roomIndex === selectedRoomIndex),
      gaps: (scenario.gaps || []).filter(g => g.roomIndex === selectedRoomIndex),
    };
  }, [scenario, selectedRoomIndex]);

  const debugBlob = useMemo(() => {
    if (selectedItem == null) return null;
    const adapterInputs = [
      ...filteredResults.perInputResults.map(r => ({
        specId: r.specId,
        roomIndex: r.roomIndex,
        roomLabel: r.roomLabel,
        ctx: r.ctx || {},
        roomQty: null, // not round-tripped through the hook — acceptable for blob v1
        roomItems: null,
      })),
      ...filteredResults.gaps.map(g => ({
        specId: g.specId,
        roomIndex: g.roomIndex,
        roomLabel: g.roomLabel,
        ctx: g.ctx || {},
        roomQty: null,
        roomItems: null,
      })),
    ];
    const blob = buildDebugBlob({
      room: selectedItem.data,
      projectDefaults: state.project || null,
      adapterInputs,
      engineOutput: {
        perInputResults: filteredResults.perInputResults,
        gaps: filteredResults.gaps,
        warnings: scenario?.warnings || [],
        bundleStats: scenario?.bundleStats || null,
        totalHours: (filteredResults.perInputResults || []).reduce((s, r) => s + (r.totalHours || 0), 0),
        phaseHours: aggregatePhaseHours(filteredResults.perInputResults),
      },
    });
    if (selectedItem.kind !== 'room' && blob && typeof blob === 'object') {
      blob.kind = selectedItem.kind;
    }
    return blob;
  }, [selectedItem, state.project, scenario, filteredResults]);

  const matchCount = filteredResults.perInputResults.length;
  const gapCount = filteredResults.gaps.length;
  const totalHours = filteredResults.perInputResults.reduce((s, r) => s + (r.totalHours || 0), 0);

  // Compute standalone items that have data (mirrors sidebar filter so the
  // section header count matches what's rendered below).
  const presentStandaloneItems = STANDALONE_KEYS
    .map((key, slot) => ({ key, slot, data: standalone[key] }))
    .filter(it => it.data && (Array.isArray(it.data) ? it.data.length > 0 : Object.keys(it.data).length > 0));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '8px 12px',
        borderBottom: '1px solid var(--border)',
        background: 'rgba(0,0,0,0.1)',
      }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>Engine Trace</span>
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
          Live view of what the scenario engine sees, per room.
        </span>
        <div style={{ flex: 1 }} />
        {debugBlob && (
          <DebugBlobButton
            blob={debugBlob}
            fileNameHint={`paintscope-${selectedItem?.label || 'item'}`.replace(/\s+/g, '-').toLowerCase()}
          />
        )}
      </div>

      {/* Body */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Item picker */}
        <div style={{
          width: 220, flexShrink: 0,
          borderRight: '1px solid var(--border)',
          padding: '10px 10px 10px 12px',
          overflowY: 'auto',
        }}>
          {/* ROOMS section */}
          <h4 style={{ margin: '0 0 6px', fontSize: 11, color: 'var(--text-muted)' }}>ROOMS ({rooms.length})</h4>
          {rooms.length === 0 ? (
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>No rooms in project.</div>
          ) : (
            rooms.map((r, i) => {
              const isSel = i === selectedRoomIndex;
              return (
                <div
                  key={r.id || `room-${i}`}
                  onClick={() => setSelectedRoomIndex(i)}
                  style={{
                    ...ITEM_ROW_STYLE,
                    background: isSel ? 'rgba(130,170,255,0.12)' : 'transparent',
                    borderLeft: isSel ? '2px solid var(--accent, #82aaff)' : '2px solid transparent',
                  }}
                >
                  <div style={{ fontWeight: isSel ? 600 : 400 }}>{r.name || r.label || `Room ${i + 1}`}</div>
                  <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 1 }}>
                    {r.length_ft || 0}×{r.width_ft || 0} · {Object.keys(r.substrates || {}).length} subs
                  </div>
                </div>
              );
            })
          )}

          {/* ELEVATIONS section */}
          {elevations.length > 0 && (
            <>
              <h4 style={{ margin: '14px 0 6px', fontSize: 11, color: 'var(--text-muted)' }}>ELEVATIONS ({elevations.length})</h4>
              {elevations.map((e, i) => {
                const idx = -100 - i;
                const isSel = idx === selectedRoomIndex;
                const trimCount = Object.entries(e.trim || {}).filter(([, v]) => v?.enabled).length;
                return (
                  <div
                    key={e.id || `elev-${i}`}
                    onClick={() => setSelectedRoomIndex(idx)}
                    style={{
                      ...ITEM_ROW_STYLE,
                      background: isSel ? 'rgba(130,170,255,0.12)' : 'transparent',
                      borderLeft: isSel ? '2px solid var(--accent, #82aaff)' : '2px solid transparent',
                    }}
                  >
                    <div style={{ fontWeight: isSel ? 600 : 400 }}>{e.label || `Elevation ${i + 1}`}</div>
                    <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 1 }}>
                      {e.width_ft || 0}×{e.height_to_eave_ft || 0} · {(e.siding_sections || []).length} sec · {trimCount} trim
                    </div>
                  </div>
                );
              })}
            </>
          )}

          {/* STANDALONE section */}
          {presentStandaloneItems.length > 0 && (
            <>
              <h4 style={{ margin: '14px 0 6px', fontSize: 11, color: 'var(--text-muted)' }}>STANDALONE ({presentStandaloneItems.length})</h4>
              {presentStandaloneItems.map(it => {
                const idx = -1000 - it.slot;
                const isSel = idx === selectedRoomIndex;
                return (
                  <div
                    key={it.key}
                    onClick={() => setSelectedRoomIndex(idx)}
                    style={{
                      ...ITEM_ROW_STYLE,
                      background: isSel ? 'rgba(130,170,255,0.12)' : 'transparent',
                      borderLeft: isSel ? '2px solid var(--accent, #82aaff)' : '2px solid transparent',
                    }}
                  >
                    <div style={{ fontWeight: isSel ? 600 : 400 }}>{it.key}</div>
                    <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 1 }}>
                      {Array.isArray(it.data) ? `${it.data.length} item${it.data.length === 1 ? '' : 's'}` : 'configured'}
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>

        {/* Trace cards */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
          {selectedItem ? (
            <>
              <div style={{
                display: 'flex', alignItems: 'baseline', gap: 12,
                marginBottom: 10, paddingBottom: 6, borderBottom: '1px solid var(--border)',
              }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{selectedItem.label}</span>
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                  <span style={{ color: '#5aa85a', fontWeight: 600 }}>{matchCount}</span> matched ·{' '}
                  <span style={{ color: gapCount ? '#c87' : 'var(--text-muted)', fontWeight: 600 }}>{gapCount}</span> gap{gapCount === 1 ? '' : 's'} ·{' '}
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{totalHours.toFixed(2)}h</span>
                </span>
                <span style={{ flex: 1 }} />
                <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>
                  {scenario?.error ? <span style={{ color: '#c87' }}>engine error: {scenario.error}</span> : 'live'}
                </span>
              </div>
              <RoomTracePanel
                roomIndex={selectedRoomIndex}
                perInputResults={filteredResults.perInputResults}
                gaps={filteredResults.gaps}
              />
            </>
          ) : (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
              Select a room, elevation, or standalone item to inspect.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function aggregatePhaseHours(results) {
  const out = {};
  for (const r of results || []) {
    for (const [phase, h] of Object.entries(r.phaseHours || {})) {
      out[phase] = Math.round(((out[phase] || 0) + h) * 100) / 100;
    }
  }
  return out;
}
