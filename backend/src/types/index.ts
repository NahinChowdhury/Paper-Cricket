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
  rotate_pie: (data: { roomId: string; playerId: string; rotation: number }) => void; // will be redundant soon
  field_set: (roomId: string, rotation: number) => void;
  shot_played: (roomId: string, choice: string) => void;
}


// Events that the server sends TO clients
export interface ServerEvents {
  player_joined: (gameState: GameState, player: Player) => void;
  room_not_found: () => void;
  room_full: () => void;
  game_started: (gameState: GameState) => void;
  rotation_update: (gameState: GameState, rotation: number) => void;
  game_ended: (gameState: GameState) => void;
  player_left: (playerId: string) => void; // players cant willingliy leave yet
  room_created: (roomId: string) => void;
  play_shot: (gameState: GameState) => void;
  set_field: (gameState: GameState) => void;
}