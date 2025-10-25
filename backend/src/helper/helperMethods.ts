// Helper methods
import { RoomManager } from "../roomManager";
import { GameStateManager } from "../gameState";


export function verifyUserisActivePlayerInAGame(playerId: string, existingRoomId: string | undefined, roomManager: RoomManager, gameStateManager: GameStateManager): boolean {
	
	// get the room's game state's player IDs and see if playerId is in that list
	if (existingRoomId) {
		const existingGameState =
			gameStateManager.getGameState(existingRoomId);
		if (
			existingGameState &&
			existingGameState.players.includes(playerId)
		) {
			// player is already in an active game
			return true;
		}
	}
	return false;
}