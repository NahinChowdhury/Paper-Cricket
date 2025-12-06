// Helper methods
import { RoomManager } from "../roomManager";
import { GameStateManager } from "../gameState";
import {
	batsmanPowerUpNames,
	DeliveryRecord,
	fielderPowerUpNames,
	GameState,
} from "../types";
import { createError } from "../errors/AppError";

export function verifyUserisActivePlayerInAGame(
	playerId: string,
	existingRoomId: string | undefined,
	roomManager: RoomManager,
	gameStateManager: GameStateManager,
): boolean {
	// get the room's game state's player IDs and see if playerId is in that list
	if (existingRoomId) {
		const existingGameState = gameStateManager.getGameState(existingRoomId);
		if (
			existingGameState &&
			existingGameState.players.includes(playerId) &&
			!["waiting", "finished", "surrendered"].includes(
				existingGameState.gamePhase,
			)
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
export function recordDelivery(
	gameState: GameState,
	presetIndex: number,
	presetForThisDelivery: string[],
): void {
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
		fielderPowerUpUsed: [...gameState.fielderActivePowerups],
		batsmanPowerUpUsed: [...gameState.batsmanActivePowerups],
	};

	gameState.deliveryHistory.push(delivery);
}

export function evaluateBatsmanChoice(
	gameState: GameState,
	choice: string,
): void {
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
			break;
		case "NB": // No Ball
			// Increase runs by 1 but do not count ball
			gameState.innings === 1
				? (gameState.inningsOneRuns += 1)
				: (gameState.inningsTwoRuns += 1);
			gameState.totalBalls += 1; // Extra ball for wide/no-ball

			// Set all modifiedPresets for next delivery to original presets
			// and then swap "W" with "0" to ensure no wicket can fall
			// in all modified presets
			gameState.modifiedPresets = gameState.originalPresets.map(
				(preset) =>
					preset.map((value) => (value === "W" ? "0" : value)),
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

/**
 * Validates if a power-up can be used
 */
export function validatePowerUpUse(
	gameState: GameState,
	playerId: string,
	powerUp: string,
): void {
	// Check if player is either batting or fielding
	const isBatting = gameState.playerBatting === playerId;
	const isFielding = gameState.playerFielding === playerId;

	if (!isBatting && !isFielding) {
		throw createError(
			"INVALID_MOVE",
			"Only active players can use power-ups",
		);
	}

	// Get the relevant power-up lists based on player role
	const usedList = isBatting
		? gameState.batsmanUsedPowerups
		: gameState.fielderUsedPowerups;

	// Check if power-up has been used
	if (usedList.includes(powerUp)) {
		throw createError("INVALID_MOVE", "Power-up has already been used");
	}
}

/**
 * Validates if the Third Man power-up modification is legal
 */
export function validateThirdManModification(
	gameState: GameState,
	presetChosen: number,
	newWicketIndex: number,
): void {
	// Get the current preset
	const currentPreset = gameState.modifiedPresets[presetChosen];
	if (!currentPreset) {
		throw createError("INVALID_MOVE", "Invalid preset chosen");
	}

	// Verify that the new wicket index is valid
	if (newWicketIndex < 0 || newWicketIndex >= currentPreset.length) {
		throw createError("INVALID_MOVE", "Invalid wicket index");
	}
}

/**
 * Validates if the Field Shift power-up modification is legal
 */
export function validateFieldShiftModification(
	gameState: GameState,
	presetChosen: number,
	newPreset: string[],
): void {
	// Get the relevant preset
	// If Third Man is active, compare against modified preset because it adds a new wicket position to the preset
	const relevantPreset = gameState.fielderActivePowerups.includes("Third Man")
		? gameState.modifiedPresets[presetChosen]
		: gameState.originalPresets[presetChosen];

	if (!relevantPreset) {
		throw createError("INVALID_MOVE", "Invalid preset chosen");
	}

	// Sort both arrays to compare contents without caring about order
	const sortedOriginal = [...relevantPreset].sort();
	const sortedNew = [...newPreset].sort();

	// Check if all values from original preset exist in new preset
	if (sortedOriginal.join(",") !== sortedNew.join(",")) {
		throw createError(
			"INVALID_MOVE",
			"Field Shift must maintain all original values",
		);
	}
}

/**
 * Checks if the innings is over based on current game state
 * @param gameState
 * @returns
 */
export function isInningsOver(gameState: GameState): boolean {
	return (
		gameState.currentBall === gameState.totalBalls ||
		(gameState.innings === 1
			? gameState.inningsOneWicketCurrentCount >= gameState.totalWickets
			: gameState.inningsTwoWicketCurrentCount >= gameState.totalWickets)
	);
}

/**
 * Manages power-up context by clearing all contexts except Frozen Hands
 */
export function managePowerUpContext(
	gameState: GameState,
	playerId: string,
): void {
	// Store Frozen Hands context if it exists
	const frozenHandsValue: number | undefined =
		gameState.powerUpContext["Frozen Hands"];

	// Clear all power-up context
	gameState.powerUpContext = {};

	const isBatting = gameState.playerBatting === playerId;

	// Restore Frozen Hands context if it was set by the batter
	// because the context needs to persist during the next field setup
	// No need to persist the context if the innings is over
	if (
		isBatting &&
		frozenHandsValue !== undefined &&
		!isInningsOver(gameState)
	) {
		gameState.powerUpContext["Frozen Hands"] = frozenHandsValue;
	}
}

export function updatePowerUpsAfterUse(
	gameState: GameState,
	gameOver: boolean,
	inningsOver: boolean,
): void {
	if (gameOver) {
		// empty all power-up lists at game over
		gameState.fielderUnusedPowerups = [];
		gameState.batsmanUnusedPowerups = [];
		gameState.fielderActivePowerups = [];
		gameState.batsmanActivePowerups = [];
		gameState.fielderUsedPowerups = [];
		gameState.batsmanUsedPowerups = [];
		return;
	} else if (inningsOver) {
		// At the end of innings, reset to default power-ups setup
		gameState.batsmanActivePowerups = [];
		gameState.fielderActivePowerups = [];
		gameState.fielderUnusedPowerups = [...fielderPowerUpNames];
		gameState.batsmanUnusedPowerups = [...batsmanPowerUpNames];
		gameState.batsmanUsedPowerups = [];
		gameState.fielderUsedPowerups = [];
		return;
	}

	gameState.batsmanUsedPowerups.push(...gameState.batsmanActivePowerups);
	gameState.batsmanActivePowerups = [];

	gameState.fielderUsedPowerups.push(...gameState.fielderActivePowerups);
	gameState.fielderActivePowerups = [];

	return;
}
