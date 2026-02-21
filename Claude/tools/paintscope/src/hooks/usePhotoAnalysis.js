// React hook wrapping the photo analysis modal state

import { useState, useCallback } from 'react';

/**
 * Hook for managing photo analysis modal visibility.
 * @returns {Object} { showModal, targetRoomId, openForRoom, openForNewRoom, close }
 */
export function usePhotoAnalysis() {
  const [showModal, setShowModal] = useState(false);
  const [targetRoomId, setTargetRoomId] = useState(null);

  const openForRoom = useCallback((roomId) => {
    setTargetRoomId(roomId);
    setShowModal(true);
  }, []);

  const openForNewRoom = useCallback(() => {
    setTargetRoomId(null);
    setShowModal(true);
  }, []);

  const close = useCallback(() => {
    setShowModal(false);
    setTargetRoomId(null);
  }, []);

  return { showModal, targetRoomId, openForRoom, openForNewRoom, close };
}
