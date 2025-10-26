// Helper methods
import { RoomManager } from "../roomManager";
import { GameStateManager } from "../gameState";
import { DeliveryRecord, GameState } from "../types";
import { createError } from "../errors/AppError";


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


/**
 * Proper Fisher–Yates shuffle to get unbiased random permutation.
 * Used for shuffling preset choices etc.
 */
export function shuffle<T>(array: T[]): T[] {
	for (let i = array.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[array[i], array[j]] = [array[j], array[i]];
	}
	return array;
}


/**
 * Records the delivery details in the game state.
 * @param gameState - The current game state
 * @param presetIndex - The index of the preset used for this delivery
 * @param presetForThisDelivery - The preset configuration for this delivery
 */
export function recordDelivery(gameState: GameState, presetIndex:number, presetForThisDelivery: string[]): void {
	const delivery: DeliveryRecord = {
		ballNumber: gameState.currentBall,
		innings: gameState.innings,
		rotation: gameState.currentBallRotation || 0, // default to 0 if undefined
		batsmanChoice: gameState.currentBallBatsmanChoice!,
		timestamp: new Date(),
		runsAfterThisDelivery:
			gameState.innings === 1
				? gameState.inningsOneRuns
				: gameState.inningsTwoRuns,
		presetChosen: presetIndex,
		modifiedPreset: presetForThisDelivery,
		fielderPowerUpUsed: gameState.fielderPowerupsActive,
		batsmanPowerUpUsed: gameState.batsmanPowerupsActive,
	};

	gameState.deliveryHistory.push(delivery);
}


export function evaluateBatsmanChoice(gameState: GameState, choice: string): void {
	// Determine outcome (wicket or runs)
	switch (choice) {
		case "W": // Wicket
			gameState.innings === 1
				? (gameState.inningsOneWicketCurrentCount += 1)
				: (gameState.inningsTwoWicketCurrentCount += 1);
			break;
		case "WD": // Wide
			// Increase runs by 1 but do not count ball
			gameState.innings === 1
				? (gameState.inningsOneRuns += 1)
				: (gameState.inningsTwoRuns += 1);
			gameState.totalBalls += 1; // Extra ball for wide/no-ball
		case "NB": // No Ball
			// Increase runs by 1 but do not count ball
			gameState.innings === 1
				? (gameState.inningsOneRuns += 1)
				: (gameState.inningsTwoRuns += 1);
			gameState.totalBalls += 1; // Extra ball for wide/no-ball

			// Set all modifiedPresets for next delivery to original presets
			// and then swap "W" with "0" to ensure no wicket can fall
			// in all modified presets
			gameState.modifiedPresets = gameState.originalPresets.map((preset) =>
				preset.map((value) => (value === "W" ? "0" : value))
			);
			break;
		case "0":
		case "1":
		case "2":
		case "3":
		case "4":
		case "5":
		case "6":
			const runs = parseInt(choice, 10);
			if (!isNaN(runs) && runs >= 0 && runs <= 6) {
				gameState.innings === 1
					? (gameState.inningsOneRuns += runs)
					: (gameState.inningsTwoRuns += runs);
			} else {
				throw createError("INVALID_MOVE", "Invalid batsman choice");
			}
			break;
		default:
			throw createError("INVALID_MOVE", "Invalid batsman choice");
	}
}