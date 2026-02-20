import { useMemo } from 'react';
import { deriveRoom } from '../engine/derive-room';

export function useDerivedRoom(room) {
  return useMemo(() => deriveRoom(room), [room]);
}
