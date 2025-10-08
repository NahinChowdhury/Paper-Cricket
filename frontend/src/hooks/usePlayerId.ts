import { useMemo } from "react";
import { v4 as uuidv4 } from "uuid";

const PLAYER_ID_KEY = "player_id";

export const usePlayerId = () => {
	const playerId = useMemo(() => {
		let storedId = localStorage.getItem(PLAYER_ID_KEY);
		if (!storedId) {
			storedId = uuidv4();
			localStorage.setItem(PLAYER_ID_KEY, storedId);
			console.log("Generated new player ID:", storedId);
		} else {
			console.log("Using existing player ID:", storedId);
		}
		return storedId;
	}, []);

	const resetPlayerId = () => {
		const newId = uuidv4();
		localStorage.setItem(PLAYER_ID_KEY, newId);
		// Force re-render by triggering a storage event
		window.location.reload();
		console.log("Reset player ID to:", newId);
	};

	return { playerId, resetPlayerId };
};
