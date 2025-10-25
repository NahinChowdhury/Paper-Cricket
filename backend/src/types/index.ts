// Basic type definitions for the multiplayer game
export interface User {
	id: string;
	roomId: string;
	connected: boolean;
	isRoomCreator: boolean;
	isPlaying: boolean;
}

export interface GameRoom {
	id: string; // room ID
	users: User[]; // users who joined the room as player/spectator/stand-by for now
	maxPlayers: number; // 2
	created: Date; // creation time
	roomCreator: string; // ID of the room creator
}

export interface GameState {
	players: string[]; // list of player IDs. Max 2
	audience: string[]; // list of audience IDs. Can be empty
	
	originalPresets: string[][]; // original presets chosen at start of innings
	modifiedPresets: string[][]; // modified presets during the innings
	presetChosen: number; // index of preset chosen for current delivery

	fielderPowerupsActive: string[]; // currently active powerup for fielding side
	batsmanPowerupsActive: string[]; // currently active powerup for batting side
	fielderUsedPowerups: string[]; // used powerups for fielding side
	batsmanUsedPowerups: string[]; // used powerups for batting side
	fielderUnusedPowerups: string[]; // unused powerups for fielding side
	batsmanUnusedPowerups: string[]; // unused powerups for batting side
	
	currentBall: number; // current turn number
	currentBallRotation: number | undefined; // current ball rotation
	currentBallBatsmanChoice: string | undefined; // current ball batsman choice
	
	playerBowling: string; // player ID of who is bowling
	playerBatting: string; // player ID of who is batting
	
	originalTotalBalls: number; // Will not change during the game
	totalBalls: number; // Fixed to 6 right now. Can change if Wide or No Ball is bowled
	
	totalWickets: number; // Fixed to 2 right now
	inningsOneWicketCurrentCount: number; // wickets fallen so far in innings one
	inningsTwoWicketCurrentCount: number; // wickets fallen so far in innings two
	
	inningsOneRuns: number; // runs scored in innings one
	inningsTwoRuns: number; // runs scored in innings two
	innings: number; // Can be 2 max

	gamePhase: "waiting" | "toss" | "side selection" |"setting field" | "batting" | "finished" | "surrendered"; // game state
	surrenderedBy: string | null; // player ID who surrendered, null if none
	
	tossSelector: string | null; // player ID who won the toss, null if not yet decided
	playerTossChoice: "heads" | "tails" | null; // choice made by toss selector, null if not yet decided
	serverTossChoice: "heads" | "tails" | null; // server's random choice for toss, null if not yet decided
	tossWinner: string | null; // player ID who won the toss, null if not yet decided
	
	deliveryHistory: DeliveryRecord[]; // list of turn records
}

export interface DeliveryRecord {
	ballNumber: number;
	innings: number;
	rotation: number;
	batsmanChoice: string; // batsman choice is the run for that ball
	presetChosen: number; // index of preset chosen for that delivery
	modifiedPreset: string[]; // modified preset used for that delivery
	fielderPowerUpUsed: string[]; // powerup used by fielding side for that delivery
	batsmanPowerUpUsed: string[]; // powerup used by batting side for that delivery
	timestamp: Date;
	runsSoFar: number; // runs scored in current innings so far
}

// Events that clients send TO the server
export interface ClientEvents {
	create_room: (playerId: string) => void;
	join_room: (roomId: string, playerId: string) => void;
	player_joined: (player: User) => void;
	rotate_pie: (data: {
		roomId: string;
		playerId: string;
		rotation: number;
	}) => void; // will be redundant soon
	field_set: (playerId: string, roomId: string, rotation: number) => void;
	shot_played: (playerId: string, roomId: string, choice: string) => void;
}

// Events that the server sends TO clients
export interface ServerEvents {
	player_joined: (gameState: GameState, player: User) => void;
	room_not_found: () => void;
	room_full: () => void;
	game_started: (gameState: GameState) => void;
	rotation_update: (gameState: GameState, rotation: number) => void;
	game_ended: (gameState: GameState) => void;
	player_left: (playerId: string) => void; // players cant willingliy leave yet
	room_created: (roomId: string) => void;
	play_shot: (gameState: GameState) => void;
	set_field: (gameState: GameState) => void;
	cannot_create_game: (roomId: string) => void;
}
