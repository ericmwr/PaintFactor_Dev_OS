import React from 'react';
import { useColorSchedule } from '../../hooks/useColorSchedule.js';
import ProjectDefaults from './ProjectDefaults.jsx';
import RoomColorEditor from './RoomColorEditor.jsx';
import ColorSchedule from './ColorSchedule.jsx';

export default function ColorsView({ state, dispatch }) {
  const schedule = useColorSchedule(state);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <ProjectDefaults colors={state.colors} dispatch={dispatch} />
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <RoomColorEditor state={state} schedule={schedule} dispatch={dispatch} />
        <ColorSchedule
          rooms={state.rooms || []}
          elevations={state.exterior?.elevations || []}
          schedule={schedule}
          colors={state.colors} />
      </div>
    </div>
  );
}
