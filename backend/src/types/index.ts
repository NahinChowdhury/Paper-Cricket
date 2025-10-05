// Basic type definitions for the multiplayer game
export interface Player {
  id: string;
  roomId: string;
  connected: boolean;
  isRoomCreator: boolean;
}

export interface GameRoom {
  id: string;
  players: Player[];
  maxPlayers: number;
  created: Date;
  isActive: boolean;
}

export interface GameState {
  players: string[];
	currentTurn: number;
	currentPlayerId: string;
	totalTurns: number;
	gamePhase: 'waiting' | 'playing' | 'finished';
	turnHistory: TurnRecord[];
}


export interface TurnRecord {
  turnNumber: number;
  playerId: string;
  rotation: number;
  timestamp: Date;
}

// Events that clients send TO the server
export interface ClientEvents {
  create_room: (playerId: string) => void;
  join_room: (roomId: string, playerId: string) => void;
  player_joined: (player: Player) => void;
  rotate_pie: (data: { roomId: string; playerId: string; rotation: number }) => void;
  end_turn: (playerId: string) => void;
}

// Events that the server sends TO clients
export interface ServerEvents {
  player_joined: (gameState: GameState, player: Player) => void;
  room_not_found: () => void;
  room_full: () => void;
  game_started: (gameState: GameState) => void;
  rotation_update: (rotation: number ) => void;
  turn_ended: (gameState: GameState) => void;
  your_turn: (data: { turnNumber: number; remainingTurns: number }) => void;
  game_ended: (gameState: GameState) => void;
  player_left: (playerId: string) => void;
  room_created: (roomId: string) => void;
}