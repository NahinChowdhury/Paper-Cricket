import { Router } from "express";
import { RoomManager } from "../roomManager";
import { GameStateManager } from "../gameState";
import { GameRoleResponse } from "../types/api";

export const gamesRouter = Router();

// Dependency injection for managers
export const initializeGamesRouter = (
	roomManager: RoomManager,
	gameStateManager: GameStateManager,
) => {
	// GET /games endpoint to check user's game and role
	gamesRouter.get("/", (req, res) => {
		const playerId = req.query.playerId as string;

		if (!playerId) {
			res.status(400).json({
				error: "playerId query parameter is required",
			});
			return;
		}

		// Get the room for this player if any
		const roomId = roomManager.getRoomByPlayerId(playerId);
		if (!roomId) {
			res.status(404).json({
				error: "No active game found for this player",
			});
			return;
		}

		// Get the game state to determine role and game status
		const gameState = gameStateManager.getGameState(roomId);
		if (!gameState) {
			res.status(404).json({ error: "Game state not found" });
			return;
		}

		// Check if game is finished or surrendered
		if (["finished", "surrendered"].includes(gameState.gamePhase)) {
			res.status(404).json({
				error: "No active game found for this player",
			});
			return;
		}

		// Determine if player is a player or audience
		let role: "Player" | "Audience";
		if (gameState.players.includes(playerId)) {
			role = "Player";
		} else if (gameState.audience.includes(playerId)) {
			role = "Audience";
		} else {
			res.status(404).json({ error: "Player not found in game" });
			return;
		}

		// Determine game status
		const status =
			gameState.gamePhase === "waiting"
				? "Waiting for Players"
				: "In Progress";

		const response: GameRoleResponse = {
			roomId,
			role,
			status,
		};

		res.json(response);
	});

	return gamesRouter;
};
