import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

const PLAYER_ID_KEY = 'paper_cricket_player_id';

export const usePlayerId = () => {
  // Read from sessionStorage immediately
  const [playerId, setPlayerId] = useState<string>(() => {
    let storedId = sessionStorage.getItem(PLAYER_ID_KEY);
    if (!storedId) {
      storedId = uuidv4();
      sessionStorage.setItem(PLAYER_ID_KEY, storedId);
      console.log('Generated new player ID:', storedId);
    } else {
      console.log('Using existing player ID:', storedId);
    }
    return storedId;
  });

  const resetPlayerId = () => {
    const newId = uuidv4();
    sessionStorage.setItem(PLAYER_ID_KEY, newId);
    setPlayerId(newId);
    console.log('Reset player ID to:', newId);
  };

  return { playerId, resetPlayerId };
};
