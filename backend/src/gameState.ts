import { createError } from "./errors/AppError";
import {
	evaluateBatsmanChoice,
	recordDelivery,
	shuffle,
} from "./helper/helperMethods";
import { GameState, DeliveryRecord, presetValues } from "./types";

export function createStartingGameState(): GameState {
	return {
		players: [], // list of player IDs. Max 2
		audience: [], // list of audience IDs. Can be empty

		originalPresets: [], // original presets chosen at start of innings
		modifiedPresets: [], // modified presets during the innings
		presetChosen: 1, // index of preset chosen for current delivery

		fielderPowerupsActive: [], // currently active powerup for fielding side
		batsmanPowerupsActive: [], // currently active powerup for batting side
		fielderUsedPowerups: [], // used powerups for fielding side
		batsmanUsedPowerups: [], // used powerups for batting side
		fielderUnusedPowerups: [], // unused should be initialized with all powerups
		batsmanUnusedPowerups: [], // unused should be initialized with all powerups

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
	};
}

export class GameStateManager {
	private gameStates: Map<string, GameState> = new Map();

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
		choice: string,
	): GameState {
		const gameState = this.gameStates.get(roomId);
		choice = choice.trim(); // sanitize input

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

		if (presetValues.indexOf(choice) === -1) {
			throw createError("INVALID_MOVE", "Invalid choice made by batsman");
		}

		gameState.currentBallBatsmanChoice = choice;

		// cache the preset chosen for this delivery before resetting
		const presetForThisDelivery = [
			...gameState.modifiedPresets[gameState.presetChosen],
		];
		const presetIndex = gameState.presetChosen;

		// Reset the presets early for next delivery
		// Because they might get modified during delivery evaluation
		gameState.presetChosen = 1; // reset to default preset
		gameState.fielderUsedPowerups.push(...gameState.fielderPowerupsActive);
		gameState.batsmanUsedPowerups.push(...gameState.batsmanPowerupsActive);
		gameState.fielderPowerupsActive = [];
		gameState.batsmanPowerupsActive = [];
		gameState.modifiedPresets = gameState.originalPresets.map((preset) => [
			...preset,
		]); // no reference to originalPresets nested lists

		// Record the delivery
		recordDelivery(gameState, presetIndex, presetForThisDelivery);

		// Evaluate the batsman choice
		evaluateBatsmanChoice(gameState, choice);

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
		const inningsOver =
			gameState.currentBall === gameState.totalBalls ||
			(gameState.innings === 1
				? gameState.inningsOneWicketCurrentCount >=
					gameState.totalWickets
				: gameState.inningsTwoWicketCurrentCount >=
					gameState.totalWickets);

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
