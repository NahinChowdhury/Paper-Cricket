import { GameState, TurnState, TurnRecord } from './types';
import { RoomManager } from './roomManager';

export class GameStateManager {
  private gameStates: Map<string, GameState> = new Map();
  private turnStates: Map<string, TurnState> = new Map();


  // Create initial game state for a room
  createInitialGameState(playerId: string, roomId: string): GameState {
      const initialState: GameState = {
        players: [playerId],
        currentTurn: 1,
        currentPlayerId: playerId,
        totalTurns: 6,
        gamePhase: 'waiting',
        turnHistory: []
      };

      this.gameStates.set(roomId, initialState);
      return initialState;
  }

  // Add player to a room
  addPlayerToGameState(playerId: string, roomId: string): GameState {
    const gameState: GameState | undefined = this.gameStates.get(roomId);
    if (!gameState) {
      throw new Error('No game state found for room');
    }
    
    // look for duplicates
    if (gameState.players.includes(playerId)) {
      throw new Error('Player already in game');
    }

    // Ensure only 2 players
    if (gameState.players.length >= 2) {
      throw new Error('Game already has maximum players');
    }



    gameState.players.push(playerId);
    this.gameStates.set(roomId, gameState);

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
      throw new Error('No game state found for room');
    }

    gameState.gamePhase = 'playing';
    this.gameStates.set(roomId, gameState);

    console.log(`Game started in room ${roomId}`);

    return gameState;
  }

  // Validate if it's a player's turn
  validateTurn(playerId: string, roomId: string): boolean {
    const turnState = this.turnStates.get(roomId);
    if (!turnState || turnState.gamePhase !== 'playing') {
      return false;
    }

    return turnState.currentPlayerId === playerId;
  }

  // Record a move and return turn record
  recordMove(roomId: string, rotation: number): GameState {
    
    const gameState = this.gameStates.get(roomId);
    if (!gameState) {
      throw new Error('No game state found for room');
    }

    // Create a turn record
    const turnToRecord: TurnRecord = {
      turnNumber: gameState.currentTurn,
      playerId: gameState.currentPlayerId,
      rotation,
      timestamp: new Date()
    };

    return this.endTurn(gameState, turnToRecord); // Update turn state
  }

  // End current turn and return next turn info
  endTurn(gameState: GameState, turnRecord: TurnRecord): GameState {
    // Update game state with turn record
    gameState.turnHistory.push(turnRecord);

    // Update game state
    gameState.currentTurn

    // Check if game should end
    if (gameState.turnHistory.length >= gameState.totalTurns) {
      gameState.gamePhase = 'finished';
      return gameState;
    } else {
      // Advance to next turn
      gameState.currentTurn++;
      // Switch current player (assuming 2 players for simplicity)
      const currentIndex = Array.from(gameState.players).indexOf(gameState.currentPlayerId);
      const nextIndex = (currentIndex + 1) % gameState.players.length;
      gameState.currentPlayerId = Array.from(gameState.players)[nextIndex];
      gameState.gamePhase = 'playing';
    }

    return gameState;
  }

  // Get room state (for synchronization)
  getRoomState(roomId: string): GameState | undefined {
    return this.gameStates.get(roomId);
  }

  // Get turn state for a room
  getTurnState(roomId: string): TurnState | undefined {
    return this.turnStates.get(roomId);
  }

  // Clean up game state when room is destroyed
  cleanupRoom(roomId: string): void {
    this.gameStates.delete(roomId);
    this.turnStates.delete(roomId);
  }
}