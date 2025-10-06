// Basic type definitions for the multiplayer game
export interface Player {
	id: string;
	roomId: string;
	connected: boolean;
	isRoomCreator: boolean;
}

export interface GameRoom {
	id: string; // room ID
	players: Player[]; // players who joined the room so far. Max 2
	maxPlayers: number; // 2
	created: Date; // creation time
	roomCreator: string; // ID of the room creator
}

export interface GameState {
	players: string[]; // list of player IDs. Max 2
	currentBall: number; // current turn number
	currentBallRotation: number | undefined; // current ball rotation
	currentBallBatsmanChoice: string | undefined; // current ball batsman choice
	playerBowling: string; // player ID of who is bowling
	totalBalls: number; // Fixed to 6 right now
	gamePhase: "waiting" | "setting field" | "batting" | "finished"; // game state
	innings: 1; // Can be 2 max
	deliveryHistory: BallRecord[]; // list of turn records
}

export interface BallRecord {
	ballNumber: number;
	innings: number;
	rotation: number;
	batsmanChoice: string;
	timestamp: Date;
}

// Events that clients send TO the server
export interface ClientEvents {
	create_room: (playerId: string) => void;
	join_room: (roomId: string, playerId: string) => void;
	player_joined: (player: Player) => void;
	rotate_pie: (data: {
		roomId: string;
		playerId: string;
		rotation: number;
	}) => void; // will be redundant soon
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
