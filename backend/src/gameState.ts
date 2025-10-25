import { GameState, DeliveryRecord } from "./types";

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

		playerBowling: "", // player ID of who is bowling
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
	}
}

export class GameStateManager {
	private gameStates: Map<string, GameState> = new Map();

	// Create initial game state for a room
	createInitialGameState(playerId: string, roomId: string): GameState {
		const initialState: GameState = createStartingGameState();

		this.gameStates.set(roomId, initialState);
		return initialState;
	}

	// Add player to a room
	addPlayerToGame(playerId: string, roomId: string): GameState {
		const gameState: GameState | undefined = this.gameStates.get(roomId);
		if (!gameState) {
			throw new Error("No game state found for room");
		}

		// look for duplicates
		if (gameState.players.includes(playerId)) {
			throw new Error("Player already in game");
		}

		// Ensure only 2 players
		if (gameState.players.length >= 2) {
			throw new Error("Game already has maximum players");
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
			throw new Error("No game state found for room");
		}

		gameState.gamePhase = "setting field";

		console.log(`Game started in room ${roomId}`);

		return gameState;
	}

	// Record field setting sent by bowler
	updateFieldSetup(
		playerId: string,
		roomId: string,
		rotation: number,
	): GameState {
		let gameState = this.gameStates.get(roomId);
		if (!gameState) {
			throw new Error("No game state found for room");
		}

		// Ensure we take input from the bowler only
		if (gameState.playerBowling !== playerId) {
			throw new Error(
				"Only bowlers are allowed to set the field during 'setting field' game phase!",
			);
		}
		gameState.currentBallRotation = rotation;
		gameState.gamePhase = "batting";

		return gameState;
	}

	// Record field setting sent by bowler
	updateShotPlayed(
		playerId: string,
		roomId: string,
		choice: string,
	): GameState {
		let gameState = this.gameStates.get(roomId);
		if (!gameState) {
			throw new Error("No game state found for room");
		}

		// Ensure we take input from the batsman only
		if (gameState.playerBowling === playerId) {
			throw new Error(
				"Only batsmen are allowed to choose a shot during 'batting' game phase!",
			);
		}

		gameState.currentBallBatsmanChoice = choice;

		if (
			gameState.currentBallRotation === undefined ||
			gameState.currentBallBatsmanChoice.trim() === ""
		) {
			throw new Error(
				"Both field rotation and batsman choice must be set before recording the delivery!",
			);
		}

		// Record the delivery
		const delivery: DeliveryRecord = {
			ballNumber: gameState.currentBall,
			innings: gameState.innings,
			rotation: gameState.currentBallRotation,
			batsmanChoice: gameState.currentBallBatsmanChoice,
			timestamp: new Date(),
			runsSoFar:
				gameState.innings === 1
					? gameState.inningsOneRuns
					: gameState.inningsTwoRuns,
		};

		gameState.deliveryHistory.push(delivery);

		// Determine outcome (wicket or runs)
		switch (choice) {
			case "W": // Wicket
				gameState.innings === 1
					? (gameState.inningsOneWicketCurrentCount += 1)
					: (gameState.inningsTwoWicketCurrentCount += 1);
				break;
			case "WD": // Wide
			case "NB": // No Ball
				// For now, No Ball and Wide do the same thing
				// Increase runs by 1 but do not count ball
				gameState.innings === 1
					? (gameState.inningsOneRuns += 1)
					: (gameState.inningsTwoRuns += 1);
				gameState.totalBalls += 1; // Extra ball for wide/no-ball
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
					throw new Error("Invalid batsman choice");
				}
				break;
			default:
				throw new Error("Invalid batsman choice");
		}

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
			gameState.playerBowling = gameState.players.find(
				(p) => p !== gameState?.playerBowling,
			)!;
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
}
