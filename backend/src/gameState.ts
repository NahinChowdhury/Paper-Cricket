import { createError } from "./errors/AppError";
import {
	evaluateBatsmanChoice,
	isInningsOver,
	recordDelivery,
	shuffle,
	validateFieldShiftModification,
	validatePowerUpUse,
	validateThirdManModification,
} from "./helper/helperMethods";
import {
	batsmanPowerUpNames,
	fielderPowerUpNames,
	GameState,
	presetValues,
	SocketEmissionMode,
} from "./types";

export function createStartingGameState(): GameState {
	return {
		players: [], // list of player IDs. Max 2
		audience: [], // list of audience IDs. Can be empty

		originalPresets: [], // original presets chosen at start of innings
		modifiedPresets: [], // modified presets during the innings
		presetChosen: 0, // index of preset chosen for current delivery

		fielderPowerupsActive: [], // currently active powerup for fielding side
		batsmanPowerupsActive: [], // currently active powerup for batting side
		fielderUsedPowerups: [], // used powerups for fielding side
		batsmanUsedPowerups: [], // used powerups for batting side
		fielderUnusedPowerups: [...fielderPowerUpNames], // unused should be initialized with all powerups
		batsmanUnusedPowerups: [...batsmanPowerUpNames], // unused should be initialized with all powerups

		currentBall: 1, // current turn number
		currentBallRotation: undefined, // current ball rotation
		currentBallBatsmanChoice: undefined, // current ball batsman choice

		playerFielding: "", // player ID of who is fielding
		playerBatting: "", // player ID of who is batting

		originalTotalBalls: 6, // Will not change during the game
		totalBalls: 6, // Fixed to 6 right now. Can change if Wide or No Ball is bowled

		totalWickets: 2, // Fixed to 2 right now
		inningsOneWicketCurrentCount: 0, // wickets fallen so far in innings one
		inningsTwoWicketCurrentCount: 0, // wickets fallen so far in innings two

		inningsOneRuns: 0, // runs scored in innings one
		inningsTwoRuns: 0, // runs scored in innings two
		innings: 1, // Can be 2 max

		gamePhase: "waiting", // game state
		surrenderedBy: null, // player ID who surrendered, null if none

		tossSelector: null, // player ID who won the toss, null if not yet decided
		playerTossChoice: null, // choice made by toss selector, null if not yet decided
		serverTossChoice: null, // server's random choice for toss, null if not yet decided
		tossWinner: null, // player ID who won the toss, null if not yet decided

		deliveryHistory: [], // list of turn records

		powerUpContext: {},
	};
}

export class GameStateManager {
	private gameStates: Map<string, GameState> = new Map();

	/**
	 * User Story:
	 *  Player can add an extra wicket on the board.
	 * Player can move this Wicket to anywhere they like.
	 * IMPORTANT: Player should only be able to move the new wicket. Nothing else! The sequence of everything else should be identical.
	 * @param gameState
	 * @param playerId
	 * @param modification
	 * @returns
	 */
	handleThirdManPowerUp(
		gameState: GameState,
		playerId: string,
		modification?: any,
	): SocketEmissionMode {
		validatePowerUpUse(gameState, playerId, "Third Man");

		// If no modification, just add the power-up to active list and add extra wicket
		if (!modification) {
			// Add to active list and remove from unused
			gameState.fielderPowerupsActive.push("Third Man");
			gameState.fielderUnusedPowerups =
				gameState.fielderUnusedPowerups.filter(
					(p) => p !== "Third Man",
				);

			// Add extra wicket to each preset
			gameState.modifiedPresets = gameState.modifiedPresets.map(
				(preset) => [...preset, "W"],
			);

			// Initialize powerUpContext for Third Man
			const thirdManContext: Record<number, number> = {};

			gameState.modifiedPresets.forEach((_, index) => {
				thirdManContext[index] =
					gameState.modifiedPresets[index].length - 1;
			});

			gameState.powerUpContext["Third Man"] = thirdManContext;

			return SocketEmissionMode.TO_ALL_IN_ROOM;
		}
		// If modification provided, update wicket position
		else {
			const { presetChosen, newWicketIndex } = modification;
			validateThirdManModification(
				gameState,
				presetChosen,
				newWicketIndex,
			);

			// Ensure there is an entry of Third Man in powerUpContext
			if (gameState.powerUpContext["Third Man"] === undefined) {
				return SocketEmissionMode.TO_NONE; // Should never reach here due to earlier validation
			}

			const currentPreset = gameState.modifiedPresets[presetChosen];
			const specialWicketIndex =
				gameState.powerUpContext["Third Man"][presetChosen];

			// Move the special wicket to new position
			const updatedPreset = [...currentPreset];
			updatedPreset.splice(specialWicketIndex, 1); // Remove from old position
			updatedPreset.splice(newWicketIndex, 0, "W"); // Insert at new position
			gameState.modifiedPresets[presetChosen] = updatedPreset;

			// Update context with new position
			gameState.powerUpContext["Third Man"][presetChosen] =
				newWicketIndex;
			return SocketEmissionMode.TO_OTHERS_IN_ROOM;
		}
	}

	/**
	 * User Story:
	 * Player can shuffle the field for a turn.
	 * Player can manually modify the pie order as they please.
	 * It will reset to the default field view next round
	 *
	 * @param gameState
	 * @param playerId
	 * @param modification
	 * @returns
	 */
	handleFieldShiftPowerUp(
		gameState: GameState,
		playerId: string,
		modification?: any,
	): SocketEmissionMode {
		validatePowerUpUse(gameState, playerId, "Field Shift");

		if (!modification) {
			// Just activate the power-up
			gameState.fielderPowerupsActive.push("Field Shift");
			gameState.fielderUnusedPowerups =
				gameState.fielderUnusedPowerups.filter(
					(p) => p !== "Field Shift",
				);
			return SocketEmissionMode.TO_ALL_IN_ROOM;
		} else {
			const { presetChosen, newPreset } = modification;
			validateFieldShiftModification(gameState, presetChosen, newPreset);
			gameState.modifiedPresets[presetChosen] = [...newPreset]; // Apply the new preset modification
			return SocketEmissionMode.TO_OTHERS_IN_ROOM;
		}
	}

	/**
	 * User Story:
	 * Player can reverse the order of the pies for the turn
	 *
	 * @param gameState
	 * @param playerId
	 * @returns
	 */
	handleMirrorFieldPowerUp(
		gameState: GameState,
		playerId: string,
	): SocketEmissionMode {
		validatePowerUpUse(gameState, playerId, "Mirror Field");

		// Add to active and remove from unused
		gameState.fielderPowerupsActive.push("Mirror Field");
		gameState.fielderUnusedPowerups =
			gameState.fielderUnusedPowerups.filter((p) => p !== "Mirror Field");

		// Reverse all presets
		gameState.modifiedPresets = gameState.modifiedPresets.map((preset) =>
			[...preset].reverse(),
		);
		return SocketEmissionMode.TO_ALL_IN_ROOM;
	}

	/**
	 * User Story:
	 * Player can click on a pie and see what’s under it before submitting the shot
	 *
	 * @param gameState
	 * @param playerId
	 * @param modification
	 * @returns
	 */
	handleScoutReportPowerUp(
		gameState: GameState,
		playerId: string,
		modification?: any,
	): SocketEmissionMode {
		validatePowerUpUse(gameState, playerId, "Scout Report");

		if (!modification) {
			// Just activate the power-up
			gameState.batsmanPowerupsActive.push("Scout Report");
			gameState.batsmanUnusedPowerups =
				gameState.batsmanUnusedPowerups.filter(
					(p) => p !== "Scout Report",
				);
			return SocketEmissionMode.TO_ALL_IN_ROOM;
		} else {
			// Add the revealed pie index to context
			const { pieIndex } = modification;
			if (gameState.powerUpContext["Scout Report"] === undefined) {
				gameState.powerUpContext["Scout Report"] = pieIndex;
			}
			return SocketEmissionMode.TO_ALL_IN_ROOM;
		}
	}

	/**
	 * User Story:
	 * If the batter hits wicket, ignore the wicket for that ball
	 *
	 * @param gameState
	 * @param playerId
	 * @returns
	 */
	handleInvulnerabilityPowerUp(
		gameState: GameState,
		playerId: string,
	): SocketEmissionMode {
		validatePowerUpUse(gameState, playerId, "Invulnerability");

		// Add to active and remove from unused
		gameState.batsmanPowerupsActive.push("Invulnerability");
		gameState.batsmanUnusedPowerups =
			gameState.batsmanUnusedPowerups.filter(
				(p) => p !== "Invulnerability",
			);

		// Replace all wickets with 0s in current modifiedPresets
		gameState.modifiedPresets = gameState.modifiedPresets.map((preset) =>
			preset.map((value) => (value === "W" ? "0" : value)),
		);
		return SocketEmissionMode.TO_ALL_IN_ROOM;
	}

	/**
	 * User Story:
	 * Temporarily locks the fielder's rotation for the next ball.
	 * Fielder must send the same rotation but they can change the preset
	 * @param gameState
	 * @param playerId
	 * @returns
	 */
	handleFrozenHandsPowerUp(
		gameState: GameState,
		playerId: string,
	): SocketEmissionMode {
		validatePowerUpUse(gameState, playerId, "Frozen Hands");

		// Add to active and remove from unused
		gameState.batsmanPowerupsActive.push("Frozen Hands");
		gameState.batsmanUnusedPowerups =
			gameState.batsmanUnusedPowerups.filter((p) => p !== "Frozen Hands");

		// Add entry to context with current delivery number
		gameState.powerUpContext["Frozen Hands"] = gameState.currentBall;
		return SocketEmissionMode.TO_ALL_IN_ROOM;
	}

	// Create initial game state for a room
	createInitialGameState(roomId: string): GameState {
		const initialState: GameState = createStartingGameState();

		this.gameStates.set(roomId, initialState);
		return initialState;
	}

	addUserToGameAudience(playerId: string, roomId: string): GameState {
		const gameState: GameState | undefined = this.gameStates.get(roomId);
		if (!gameState) {
			throw new Error("No game state found for room");
		}

		if (
			gameState.gamePhase !== "waiting" &&
			gameState.players.includes(playerId)
		) {
			throw createError(
				"CANNOT_JOIN_AUDIENCE_WHILE_PLAYING",
				"Cannot join audience while actively playing in the game",
			);
		}

		// look for duplicates
		if (gameState.audience.includes(playerId)) {
			throw createError(
				"USER_ALREADY_IN_AUDIENCE",
				"User already in game audience",
			);
		}

		// Remove user from players list if present
		gameState.players = gameState.players.filter((p) => p !== playerId);

		// Add to audience list
		gameState.audience.push(playerId);

		return gameState;
	}

	// Add user to game players list
	addUserToGamePlayers(playerId: string, roomId: string): GameState {
		const gameState: GameState | undefined = this.gameStates.get(roomId);
		if (!gameState) {
			throw createError(
				"GAMESTATE_NOT_FOUND",
				"No game state found for room",
			);
		}

		if (gameState.players.length >= 2) {
			throw createError(
				"MAX_PLAYERS_REACHED",
				"Game already has maximum number of players. Please join as audience.",
			);
		}

		// look for duplicates
		if (gameState.players.includes(playerId)) {
			throw createError(
				"USER_ALREADY_PLAYING",
				"User already in game players",
			);
		}

		gameState.players.push(playerId);

		return gameState;
	}

	// Get current game state for a room
	getGameState(roomId: string): GameState | undefined {
		return this.gameStates.get(roomId);
	}

	// Start a new game
	startGame(roomId: string): GameState {
		const gameState: GameState | undefined = this.gameStates.get(roomId);

		if (!gameState) {
			throw createError(
				"GAMESTATE_NOT_FOUND",
				"No game state found for room",
			);
		}

		if (gameState.players.length < 2) {
			throw createError(
				"NOT_ENOUGH_PLAYERS",
				"Cannot start game without 2 players",
			);
		}

		// update game phase
		gameState.gamePhase = "toss";

		// Choosee tossSelector randomly
		const randomIndex = Math.floor(
			Math.random() * gameState.players.length,
		);
		gameState.tossSelector = gameState.players[randomIndex];

		console.log(`Game started in room ${roomId}`);

		return gameState;
	}

	generateFieldPresets(): string[][] {
		const presets: string[][] = [];

		// Generate up to 3 unique shuffles
		while (presets.length < 3) {
			const shuffled = shuffle([...presetValues]);

			// Check if identical preset already exists
			const isDuplicate = presets.some(
				(p) => p.join(",") === shuffled.join(","),
			);
			if (!isDuplicate) {
				presets.push(shuffled);
			}
		}

		return presets;
	}

	// Record field setting sent by bowler
	updateFieldSetup(
		playerId: string,
		roomId: string,
		rotation: number,
		presetChoice: number,
	): GameState {
		let gameState = this.gameStates.get(roomId);
		if (!gameState) {
			throw createError(
				"GAMESTATE_NOT_FOUND",
				"No game state found for room",
			);
		}

		// Ensure we take input from the bowler only
		if (gameState.playerFielding !== playerId) {
			throw createError(
				"INVALID_MOVE",
				"Only bowlers are allowed to set the field during 'setting field' game phase!",
			);
		}
		gameState.currentBallRotation = rotation;
		gameState.gamePhase = "batting";
		gameState.presetChosen = presetChoice;

		return gameState;
	}

	// Record field setting sent by bowler
	updateShotPlayed(
		playerId: string,
		roomId: string,
		choiceIndex: number,
	): GameState {
		const gameState = this.gameStates.get(roomId);

		if (!gameState) {
			throw createError(
				"GAMESTATE_NOT_FOUND",
				"No game state found for room",
			);
		}

		if (gameState.gamePhase !== "batting") {
			throw createError(
				"INVALID_MOVE",
				"Cannot play shot when game phase is not 'batting'",
			);
		}

		// Ensure we take input from the batsman only
		if (gameState.playerBatting !== playerId) {
			throw createError(
				"INVALID_MOVE",
				"Only batsmen are allowed to choose a shot during 'batting' game phase!",
			);
		}

		// Get the value at the chosen index
		const choiceValue =
			gameState.modifiedPresets[gameState.presetChosen][choiceIndex];
		if (presetValues.indexOf(choiceValue) === -1) {
			throw createError(
				"INVALID_MOVE",
				"Invalid choice index made by batsman",
			);
		}

		gameState.currentBallBatsmanChoice = choiceIndex;

		// cache the preset chosen for this delivery before resetting
		const presetForThisDelivery = [
			...gameState.modifiedPresets[gameState.presetChosen],
		];
		const presetIndex = gameState.presetChosen;

		// Reset the presets early for next delivery
		// Because they might get modified during delivery evaluation
		gameState.presetChosen = 0; // reset to default preset
		gameState.fielderUsedPowerups.push(...gameState.fielderPowerupsActive);
		gameState.batsmanUsedPowerups.push(...gameState.batsmanPowerupsActive);
		gameState.fielderPowerupsActive = [];
		gameState.batsmanPowerupsActive = [];
		gameState.modifiedPresets = gameState.originalPresets.map((preset) => [
			...preset,
		]); // no reference to originalPresets nested lists

		// Record the delivery
		recordDelivery(gameState, presetIndex, presetForThisDelivery);

		// Evaluate the batsman choice using the actual value
		evaluateBatsmanChoice(gameState, choiceValue);

		// Checks if total runs exceed opponent's score in 2nd innings
		if (gameState.innings === 2) {
			const opponentRuns = gameState.inningsOneRuns;
			const currentRuns = gameState.inningsTwoRuns;
			if (currentRuns > opponentRuns) {
				gameState.gamePhase = "finished";
				return gameState;
			}
		}

		// Check for end of innings or game
		// If currentBall exceeds totalBalls OR all wickets are down
		const inningsOver = isInningsOver(gameState);

		// If all balls are bowled or all wickets are down, end or switch innings
		if (inningsOver && gameState.innings === 2) {
			gameState.gamePhase = "finished";
			return gameState;
		} else if (inningsOver) {
			// Start second innings
			gameState.innings = 2;
			gameState.currentBall = createStartingGameState().currentBall;

			// swap batting and fielding players
			const temp = gameState.playerBatting;
			gameState.playerBatting = gameState.playerFielding;
			gameState.playerFielding = temp;
			gameState.totalBalls = createStartingGameState().totalBalls;
			// No need to reset runs and wickets because we have separate variables for both innings

			// create new presets for new batsman
			gameState.originalPresets = this.generateFieldPresets();
			gameState.modifiedPresets = gameState.originalPresets.map(
				(preset) => [...preset],
			);
		} else {
			gameState.currentBall++;
		}

		gameState.currentBallRotation = undefined;
		gameState.currentBallBatsmanChoice = undefined;
		gameState.gamePhase = "setting field";

		return gameState;
	}

	// Get room state (for synchronization)
	getRoomState(roomId: string): GameState | undefined {
		return this.gameStates.get(roomId);
	}

	// Clean up game state when room is destroyed
	cleanupGameState(roomId: string): void {
		this.gameStates.delete(roomId);
	}

	removeUserFromGameAudience(playerId: string, roomId: string): void {
		const gameState = this.gameStates.get(roomId);
		if (!gameState) {
			return;
		}

		// Remove user from audience list
		gameState.audience = gameState.audience.filter((p) => p !== playerId);

		// If no audience left, clean up game state
		if (gameState.audience.length === 0 && gameState.players.length === 0) {
			this.cleanupGameState(roomId);
		}
	}

	isUserPlayingInOngoingGame(playerId: string, roomId: string): boolean {
		const gameState = this.gameStates.get(roomId);
		if (!gameState) {
			return false;
		}

		return (
			gameState.gamePhase !== "waiting" &&
			gameState.players.includes(playerId)
		);
	}

	attemptSurrenderGame(playerId: string, roomId: string): GameState {
		const gameState = this.gameStates.get(roomId);
		if (!gameState) {
			throw createError(
				"GAMESTATE_NOT_FOUND",
				"No game state found for room",
			);
		}

		// Ensure only active players can surrender
		if (!gameState.players.includes(playerId)) {
			throw createError(
				"UNABLE_TO_SURRENDER",
				"Only active players can surrender the game.",
			);
		}

		if (
			gameState.gamePhase === "finished" ||
			gameState.gamePhase === "surrendered" ||
			gameState.gamePhase === "waiting"
		) {
			throw createError(
				"UNABLE_TO_SURRENDER",
				"Cannot surrender the game at this stage",
			);
		}

		gameState.gamePhase = "surrendered";
		gameState.surrenderedBy = playerId;

		return gameState;
	}
}
