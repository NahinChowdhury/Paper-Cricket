// Basic type definitions for the multiplayer game

export const presetValues: string[] = [
	"0",
	"1",
	"2",
	"3",
	"4",
	"5",
	"6",
	"W",
	"NB",
	"WD",
];

export interface GameRoom {
	id: string; // room ID
	users: User[]; // users who joined the room as player/spectator/stand-by for now
	created: Date; // creation time
	roomCreator: string; // ID of the room creator
}

export interface User {
	id: string;
	roomId: string;
	connected: boolean;
	isRoomCreator: boolean;
	isPlaying: boolean;
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

	playerFielding: string; // player ID of who is fielding
	playerBatting: string; // player ID of who is batting

	originalTotalBalls: number; // Will not change during the game
	totalBalls: number; // Fixed to 6 right now. Can change if Wide or No Ball is bowled

	totalWickets: number; // Fixed to 2 right now
	inningsOneWicketCurrentCount: number; // wickets fallen so far in innings one
	inningsTwoWicketCurrentCount: number; // wickets fallen so far in innings two

	inningsOneRuns: number; // runs scored in innings one
	inningsTwoRuns: number; // runs scored in innings two
	innings: number; // Can be 2 max

	gamePhase:
		| "waiting"
		| "toss"
		| "side selection"
		| "setting field"
		| "batting"
		| "finished"
		| "surrendered"; // game state
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
	runsAfterThisDelivery: number; // runs scored in current innings after this delivery
}

// Events that clients send TO the server
export interface ClientEvents {
	create_room: (playerId: string) => void;
	join_room: (roomId: string, playerId: string) => void;
	join_as_player: (playerId: string) => void;
	join_as_audience: (playerId: string) => void;
	toss_selection_made: (player: User, choice: "heads" | "tails") => void;
	side_selection_made: (player: User, choice: "batting" | "fielding") => void;
	player_joined: (player: User) => void;
	shot_selection_hover: (playerId: string, choice: string) => void;
	rotate_pie: (data: {
		roomId: string;
		playerId: string;
		rotation: number;
	}) => void; // will be redundant soon
	field_set: (
		playerId: string,
		roomId: string,
		rotation: number,
		presetChoice: number,
	) => void;
	shot_played: (playerId: string, roomId: string, choice: string) => void;
	surrender: (playerId: string, roomId: string) => void;
	leave_room: (playerId: string, roomId: string) => void;
	power_up_used: (
		playerId: string,
		roomId: string,
		powerUp: string,
		modification: any,
	) => void;
}

// Events that the server sends TO clients
export interface ServerEvents {
	user_already_joined: (gameState: GameState, player: User) => void;
	joined_as_player: (gameState: GameState, player: User) => void;
	joined_as_audience: (gameState: GameState, player: User) => void;
	room_not_found: () => void;
	room_full: () => void;
	game_started: (gameState: GameState) => void;
	rotation_update: (gameState: GameState, rotation: number) => void;
	shot_selection_hover_update: (gameState: GameState, choice: string) => void;
	game_ended: (gameState: GameState) => void;
	game_surrendered: (gameState: GameState) => void;
	user_left: (playerId: string) => void;
	room_created: (roomId: string) => void;
	play_shot: (gameState: GameState) => void;
	set_field: (gameState: GameState) => void;
	cannot_create_game: (roomId: string) => void;
	server_error: (error: { code: string; message: string }) => void;
	game_updated: (gameState: GameState) => void;
	toss_started: (gameState: GameState) => void;
	side_selection_started: (gameState: GameState) => void;
}
