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
			totalBalls: 6,
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
	updateFieldSetup(playerId: string, roomId: string, rotation: number): GameState {
		let gameState = this.gameStates.get(roomId);
		if (!gameState) {
			throw new Error("No game state found for room");
		}

		// Ensure we take input from the bowler only
		if (gameState.playerBowling !== playerId) {
			throw new Error("Only bowlers are allowed to set the field during 'setting field' game phase!")
		}
		gameState.currentBallRotation = rotation;
		gameState.gamePhase = 'batting';

		return gameState;
	}

	// Record field setting sent by bowler
	updateShotPlayed(playerId: string, roomId: string, choice: string): GameState {
		let gameState = this.gameStates.get(roomId);
		if (!gameState) {
			throw new Error("No game state found for room");
		}

		// Ensure we take input from the batsman only
		if (gameState.playerBowling === playerId) {
			throw new Error("Only batsmen are allowed to choose a shot during 'batting' game phase!")
		}
		gameState.currentBallBatsmanChoice = choice;
		gameState.gamePhase = 'batting';

		if(!gameState.currentBallRotation || gameState.currentBallBatsmanChoice.trim() === '') {
			throw new Error("Both field rotation and batsman choice must be set before recording the delivery!");
		}

		// Record the delivery
		const delivery: DeliveryRecord = {
			ballNumber: gameState.currentBall,
			innings: gameState.innings,
			rotation: gameState.currentBallRotation,
			batsmanChoice: gameState.currentBallBatsmanChoice,
			timestamp: new Date()
		}

		gameState.deliveryHistory.push(delivery);

		if(gameState.currentBall === gameState.totalBalls && gameState.innings === 2) {
			gameState.gamePhase = 'finished';
			return gameState;
		} else if(gameState.currentBall === gameState.totalBalls) {
			// Start second innings
			gameState.innings = 2;
			gameState.currentBall = 1;
		} else {
			gameState.currentBall++;
		}

		gameState.currentBallRotation = undefined;
		gameState.currentBallBatsmanChoice = undefined;
		gameState.gamePhase = 'setting field';

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
