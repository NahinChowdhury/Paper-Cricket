import { GameState, DeliveryRecord } from "./types";

export class GameStateManager {
	private gameStates: Map<string, GameState> = new Map();

	// Create initial game state for a room
	createInitialGameState(playerId: string, roomId: string): GameState {
		const initialState: GameState = {
			players: [playerId],
			currentBall: 1,
			currentBallRotation: undefined,
			currentBallBatsmanChoice: undefined,
			playerBowling: playerId, // Initially the game creator bowls
			originalTotalBalls: 6, // TODO: Set to 6 later
			totalBalls: 6, // TODO: Set to 6 later
			totalWickets: 3, // TODO: Set to 10 later
			inningsOneRuns: 0,
			inningsTwoRuns: 0,
			inningsOneWicketCurrentCount: 0,
			inningsTwoWicketCurrentCount: 0,
			gamePhase: "waiting",
			innings: 1,
			deliveryHistory: [],
		};

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
			gameState.currentBall = 1;
			gameState.playerBowling = gameState.players.find(
				(p) => p !== gameState?.playerBowling,
			)!;
			gameState.totalBalls = gameState.originalTotalBalls;
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
}
