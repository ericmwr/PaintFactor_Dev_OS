import React from 'react';
import { SUBSTRATE_MAP } from '../../data/substrate-catalog.js';

export default function ColorSchedule({ rooms, elevations, schedule }) {
  const getLabel = (subId) => {
    const cat = SUBSTRATE_MAP[subId];
    return cat ? cat.label : subId.replace(/_/g, ' ');
  };

  const hasAnyColors = Object.keys(schedule.rooms).length > 0 || Object.keys(schedule.elevations).length > 0;

  return (
    <div style={{ width: 260, padding: 10, background: 'var(--bg-deep)', overflowY: 'auto', borderLeft: '1px solid var(--border)' }}>
      <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-muted)', marginBottom: 8 }}>Full Color Schedule</div>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 10 }}>Resolved colors for every substrate</div>

      {!hasAnyColors && (
        <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)', fontSize: 11, fontStyle: 'italic' }}>
          Set project defaults to see the color schedule
        </div>
      )}

      {rooms.map(room => {
        const roomColors = schedule.rooms[room.id];
        if (!roomColors || Object.keys(roomColors).length === 0) return null;
        return (
          <div key={room.id} style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4, paddingBottom: 3, borderBottom: '1px solid var(--border-subtle)' }}>
              {room.label || room.id}
            </div>
            {Object.entries(roomColors).map(([subId, resolved]) => (
              <div key={subId} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 0' }}>
                <span style={{ display: 'inline-block', width: 8, height: 8, background: '#ccc', border: '1px solid var(--border)', borderRadius: 2 }} />
                <span style={{ fontSize: 10, width: 55, color: 'var(--text-muted)' }}>{getLabel(subId)}</span>
                <span style={{ fontSize: 10, color: resolved.source === 'room' ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                  {resolved.color_name || resolved.color_code || '—'}
                </span>
                {(resolved.source === 'room' || resolved.source === 'substrate') && (
                  <span style={{ fontSize: 8, marginLeft: 'auto', color: resolved.source === 'room' ? '#2a5a4a' : '#aa8a5a' }}>●</span>
                )}
              </div>
            ))}
          </div>
        );
      })}

      {elevations.map(elev => {
        const elevColors = schedule.elevations[elev.id];
        if (!elevColors || Object.keys(elevColors).length === 0) return null;
        return (
          <div key={elev.id} style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4, paddingBottom: 3, borderBottom: '1px solid var(--border-subtle)' }}>
              {elev.label || elev.id}
            </div>
            {Object.entries(elevColors).map(([subId, resolved]) => (
              <div key={subId} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 0' }}>
                <span style={{ display: 'inline-block', width: 8, height: 8, background: '#ccc', border: '1px solid var(--border)', borderRadius: 2 }} />
                <span style={{ fontSize: 10, width: 55, color: 'var(--text-muted)' }}>{getLabel(subId)}</span>
                <span style={{ fontSize: 10, color: resolved.source === 'elevation' ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                  {resolved.color_name || resolved.color_code || '—'}
                </span>
                {(resolved.source === 'elevation' || resolved.source === 'substrate') && (
                  <span style={{ fontSize: 8, marginLeft: 'auto', color: resolved.source === 'elevation' ? '#2a5a4a' : '#aa8a5a' }}>●</span>
                )}
              </div>
            ))}
          </div>
        );
      })}

      {hasAnyColors && (
        <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: 9, color: 'var(--text-muted)', display: 'flex', gap: 12 }}>
            <span><span style={{ color: '#2a5a4a' }}>●</span> room override</span>
            <span><span style={{ color: '#aa8a5a' }}>●</span> substrate override</span>
          </div>
        </div>
      )}
    </div>
  );
}
