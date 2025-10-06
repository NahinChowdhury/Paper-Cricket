Proper game logic.

Game Events to keep in mind and update:
```ts
// Events that clients send TO the server
export interface ClientEvents {
	create_room: (playerId: string) => void;
	join_room: (roomId: string, playerId: string) => void;
	player_joined: (player: Player) => void;
	rotate_pie: (data: { roomId: string; playerId: string; rotation: number }) => void;
	end_turn: (roomId: string, rotation: number) => void;
}

// Events that the server sends TO clients
export interface ServerEvents {
	player_joined: (gameState: GameState, player: Player) => void;
	room_not_found: () => void;
	room_full: () => void;
	game_started: (gameState: GameState) => void;
	rotation_update: (gameState: GameState, rotation: number) => void;
	turn_ended: (gameState: GameState) => void;
	your_turn: (data: { turnNumber: number; remainingTurns: number }) => void;
	game_ended: (gameState: GameState) => void;
	player_left: (playerId: string) => void;
	room_created: (roomId: string) => void;
}
```

Types to keep in mind and update:
```ts
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
```


First a player will create a room.

GameRoom will have these information:
```ts
export interface GameRoom {
	id: string; // room ID
	players: Player[]; // players who joined the room so far. Max 2
	maxPlayers: number; // 2
	created: Date; // creation time
	roomCreator: string// ID of the room creator
}
```

When the room is created, a game object is also created.
```ts
export interface GameState {
  	players: string[]; // list of player IDs. Max 2
	currentBall: number; // current turn number
	currentBallRotation: float | undefined; // current ball rotation
	currentBallBatsmanChoice: string | undefined; // current ball batsman choice
	playerBowling: string; // player ID of who is bowling
	totalBalls: number; // Fixed to 6 right now
	gamePhase: 'waiting' | 'setting field' |  'batting' | 'finished'; // game state
	innings: 1 // Can be 2 max
	deliveryHistory: DeliveryRecord[]; // list of turn records
}	


export interface DeliveryRecord {
	ballNumber: number;
	innings: number;
	rotation: number;
	batsmanChoice: string;
	timestamp: Date;
}
```

New Socket events:
```ts
// Events that clients send TO the server
export interface ClientEvents {
  // Room management
  create_room: (playerId: string) => void;
  join_room: (roomId: string, playerId: string) => void;
  leave_room: (roomId: string, playerId: string) => void;

  // Gameplay
  set_field: (data: { roomId: string; playerId: string; rotation: number }) => void; 
  play_shot: (data: { roomId: string; playerId: string; choice: number }) => void; // batter’s move
  end_innings: (roomId: string, playerId: string) => void; // not used for now // optional explicit request if needed
}

// Events that the server sends TO clients
export interface ServerEvents {
  // Room / player lifecycle
  room_created: (roomId: string) => void;
  room_not_found: () => void;
  room_full: () => void;
  player_joined: (gameState: GameState, player: Player) => void;
  player_left: (playerId: string) => void; // not used for now

  // Game lifecycle
  game_started: (gameState: GameState) => void;
  game_ended: (gameState: GameState) => void;

  // Turn / phase updates
  field_set: (gameState: GameState, rotation: number) => void; 
  shot_played: (gameState: GameState, choice: number) => void; 
  turn_completed: (gameState: GameState) => void; // not used for now // one full ball resolved

  // Role / innings updates
  your_turn: (data: { phase: "setting_field" | "batting"; turnNumber: number; remainingBalls: number }) => void; // not used for now
  innings_switched: (gameState: GameState) => void; // when roles swap // not used for now
}

```


gamePhases explained:
 - 'waiting': When one player has joined the game and we are waiting for the other player to join the game/room
 - 'setting field': When the bowler is choosing the field rotation. 
   - This state is initially set after the second player has joined the game. We go from 'waiting' to 'setting field.
   - For now, by default, the roomCreator is the bowler.
   - When the bowler has selected the rotation, this information is passed to the server.
     The server then Updates the information in gamestate has changes the gamePhase to 'batting' and passes the gamestate to all players. The frontend figures out who is batting by looking at the playerBowling value.

 - 'batting': When the batter is choosing their pie.
   - When the frontend gets the 'batting' gamePhase, it picks the rotation from the gamestate and updates the batter's pie rotation first. Then it should allow the batter to choose a pie.
   - The batter then passes this information to server and the server takes into account the batter's choice and logs the information into gamestate.
   - Then the server looks up the number of balls done by looking at currentBall.
   - If innings is still 1 and the currentBall == totalBalls, then the server will set the playerBowling to the other player and set the gamePhase to 'setting field' and share the gamestate with all players.
   - If currentBall == totalBalls and innings == 2, then gamePhase is set to 'finished'
   - Otherwise, server sets the gamePhase back to 'setting field' and the game goes on
 - 'finished': Game is over and we cannot update the gamestate anymore.


Definition of a complete turn/ball:

The bowler needs to choose a rotation and this rotation should be stored for that ball. Then this information is passed to the batter
who will choose a pie. This information is then passed to the server and 
our turn ends.

I don't think I need the rotation pie logic. I just need to pass the final rotation selected by the bowler.

I need to keep track of:
	- who is bowling
	- who is batting
	- what innings it currently is
	- which ball is being bowled (keep track of current over)

# Game State Simluation

### Client to Server (C2S):
**socket.emit(create_room)**


### Server to Client (S2C):

**socket.on(create_room)**

Room is created along with gameState and player 1 is added to both room and gameState

**socket.emit(room_created)**

### Player 2 gets the link:
### C2S:

**socket.emit(join_room)**

### S2C:
**socket.on(join_room)**

creates player profile and adds player to room and gameState

**io.to(socket.id).emit(player_joined)**


### C2S:
**socket.on(player_joined)**

Updates gamestate and player info

**socket.emit(player_joined)**


### S2C:
**socket.on(player_joined)**

Updates gamePhase to 'setting field'

**io.to(player.roomId).emit('game_started', gameState);**


### C2S:
**socket.on(game_started)**

Updates the gamestate and frontend logic ensures each player knows who is bowling and who is batting

Since gamePhase is 'setting field', next action is sent from the bowler

Sends rotation to the server

**socket.emit(field_set)**


### S2C:
**socket.on(field_set)**

Updates game state and changes gamephase to 'batting'

**io.to(player.roomId).emit('play_shot', gameState);**


### C2S:
**socket.on(play_shot)**

Takes the rotation passed by the bowler and updates the wheel rotation for the batter.

Updates the game phase to 'batting'. This makes the bowler unable to make a move or drag the wheel.

Batter then makes a choice on the wheel and ends turn.

**socket.emit(shot_played)**


### S2C:
**socket.on(shot_played)**

Updates game state and adds current rotation and shot to the deliveryHistory.

Checks the current ball.
```
If current ball == totalBalls and innings == 2,

	then game over.

	Set gamePhase == 'finished'.

	io.to(player.roomId).emit(game_ended)

	return

Else If current ball == totalBalls:

	Then innings is over.

	Set innings to 2

	Reset currentBall to 1

	Set playerBowling to the other player

Else:

	Increment the current ball

Run these anyways:

	Reset currentBallroatation to undefined

	Reset currentBallBatsmanChoice to undefined

	Set gamePhase to 'setting field'
```
**io.to(player.roomId).emit(set_field)**


### C2S:
**socket.on(game_started)**

Updates the gamestate and updates the scorecard hopefully.

Since gamePhase is 'setting field', next action is sent from the bowler

Sends rotation to the server

**socket.emit(field_set)**


Rinse and repeat...

## First innings starts
Game start gameState:
```ts
export interface GameState {
 	players: [1, 2]; // list of player IDs. Max 2
	currentBall: 1; // current turn number
	currentBallRotation: undefined; // current ball rotation
	currentBallBatsmanChoice: undefined; // current ball batsman choice
	playerBowling: 1; // player ID of who is bowling
	totalBalls: 2; // Fixed to 6 right now. Using 2 for example
	gamePhase: 'setting field'; // game state
	innings: 1 // Can be 2 max
	deliveryHistory: []; // list of turn records
}
```

Gamestate after first bowler field setting (sent to server):
```ts
export interface GameState {
 	players: [1, 2]; // list of player IDs. Max 2
	currentBall: 1; // current turn number
	currentBallRotation: 24; // current ball rotation
	currentBallBatsmanChoice: undefined; // current ball batsman choice
	playerBowling: 1; // player ID of who is bowling
	totalBalls: 2; // Fixed to 6 right now. Using 2 for example
	gamePhase: 'setting field'; // game state
	innings: 1 // Can be 2 max
	deliveryHistory: []; // list of turn records
}
```
GameState updated by the server right before sending it back to client:
```ts
export interface GameState {
 	players: [1, 2]; // list of player IDs. Max 2
	currentBall: 1; // current turn number
	currentBallRotation: 24; // current ball rotation
	currentBallBatsmanChoice: undefined; // current ball batsman choice
	playerBowling: 1; // player ID of who is bowling
	totalBalls: 2; // Fixed to 6 right now. Using 2 for example
	gamePhase: 'batting'; // game state
	innings: 1 // Can be 2 max
	deliveryHistory: []; // list of turn records
}
```

Gamestate after first batter choice (sent to server):
```ts
export interface GameState {
 	players: [1, 2]; // list of player IDs. Max 2
	currentBall: 1; // current turn number
	currentBallRotation: 24; // current ball rotation
	currentBallBatsmanChoice: '6'; // current ball batsman choice
	playerBowling: 1; // player ID of who is bowling
	totalBalls: 2; // Fixed to 6 right now. Using 2 for example
	gamePhase: 'batting'; // game state
	innings: 1 // Can be 2 max
	deliveryHistory: []; // list of turn records
}
```

GameState updated by the server right before sending it back to client
```ts
export interface GameState {
 	players: [1, 2]; // list of player IDs. Max 2
	currentBall: 2; // current turn number
	currentBallRotation: undefined; // current ball rotation
	currentBallBatsmanChoice: undefined; // current ball batsman choice
	playerBowling: 1; // player ID of who is bowling
	totalBalls: 2; // Fixed to 6 right now. Using 2 for example
	gamePhase: 'setting field'; // game state
	innings: 1 // Can be 2 max
	deliveryHistory: [
		{
			DeliveryRecord
    			innings: 1
				ballNumber: 1
				rotation: 24
				batsmanChoice: '6'
				timestamp: now
		}
	]; // list of turn records
}
``` 

Gamestate after second bowler field setting (sent to server):
```ts
export interface GameState {
 	players: [1, 2]; // list of player IDs. Max 2
	currentBall: 2; // current turn number
	currentBallRotation: 95; // current ball rotation
	currentBallBatsmanChoice: undefined; // current ball batsman choice
	playerBowling: 1; // player ID of who is bowling
	totalBalls: 2; // Fixed to 6 right now. Using 2 for example
	gamePhase: 'setting field'; // game state
	innings: 1 // Can be 2 max
	deliveryHistory: [
		{
			DeliveryRecord
    			innings: 1
				ballNumber: 1
				rotation: 24
				batsmanChoice: '6'
				timestamp: now
		}
	]; // list of turn records
}
```

GameState updated by the server right before sending it back to client:
```ts
export interface GameState {
 	players: [1, 2]; // list of player IDs. Max 2
	currentBall: 2; // current turn number
	currentBallRotation: 95; // current ball rotation
	currentBallBatsmanChoice: undefined; // current ball batsman choice
	playerBowling: 1; // player ID of who is bowling
	totalBalls: 2; // Fixed to 6 right now. Using 2 for example
	gamePhase: 'batting'; // game state
	innings: 1 // Can be 2 max
	deliveryHistory: [
		{
			DeliveryRecord
    			innings: 1
				ballNumber: 1
				rotation: 24
				batsmanChoice: '6'
				timestamp: now
		}
	]; // list of turn records
}
```

Gamestate after second batter choice (sent to server):
```ts
export interface GameState {
 	players: [1, 2]; // list of player IDs. Max 2
	currentBall: 2; // current turn number
	currentBallRotation: 95; // current ball rotation
	currentBallBatsmanChoice: 'W'; // current ball batsman choice
	playerBowling: 1; // player ID of who is bowling
	totalBalls: 2; // Fixed to 6 right now. Using 2 for example
	gamePhase: 'batting'; // game state
	innings: 1 // Can be 2 max
	deliveryHistory: [
		{
			DeliveryRecord
    			innings: 1
				ballNumber: 1
				rotation: 24
				batsmanChoice: '6'
				timestamp: now
		}
	]; // list of turn records
}
```

GameState updated by the server right before sending it back to client
```ts
export interface GameState {
 	players: [1, 2]; // list of player IDs. Max 2
	currentBall: 1; // current turn number
	currentBallRotation: undefined; // current ball rotation
	currentBallBatsmanChoice: undeifned; // current ball batsman choice
	playerBowling: 2; // player ID of who is bowling
	totalBalls: 2; // Fixed to 6 right now. Using 2 for example
	gamePhase: 'setting field'; // game state
	innings: 2 // Can be 2 max
	deliveryHistory: [
		{
			DeliveryRecord
				innings: 1
				ballNumber: 1
				rotation: 24
				batsmanChoice: '6'
				timestamp: now
		},
		{
			DeliveryRecord
    			innings: 1
				ballNumber: 2
				rotation: 95
				batsmanChoice: 'W'
				timestamp: now
		}
	]; // list of turn records
}
```
Frontend should keep track of innings locally. If innings changes, it should updating who is batting and bowling above maybe? Maybe this is not even needed.
### First Innings has ended

## Second innings starts

Second innings beginning gameState:
```ts
export interface GameState {
 	players: [1, 2]; // list of player IDs. Max 2
	currentBall: 1; // current turn number
	currentBallRotation: undefined; // current ball rotation
	currentBallBatsmanChoice: undeifned; // current ball batsman choice
	playerBowling: 2; // player ID of who is bowling
	totalBalls: 2; // Fixed to 6 right now. Using 2 for example
	gamePhase: 'setting field'; // game state
	innings: 2 // Can be 2 max
	deliveryHistory: [
		{
			DeliveryRecord
				innings: 1
				ballNumber: 1
				rotation: 24
				batsmanChoice: '6'
				timestamp: now
		},
		{
			DeliveryRecord
    			innings: 1
				ballNumber: 2
				rotation: 95
				batsmanChoice: 'W'
				timestamp: now
		}
	]; // list of turn records
}
```

Gamestate after first bowler field setting (sent to server):
```ts
export interface GameState {
 	players: [1, 2]; // list of player IDs. Max 2
	currentBall: 1; // current turn number
	currentBallRotation: 51; // current ball rotation
	currentBallBatsmanChoice: undeifned; // current ball batsman choice
	playerBowling: 2; // player ID of who is bowling
	totalBalls: 2; // Fixed to 6 right now. Using 2 for example
	gamePhase: 'setting field'; // game state
	innings: 2 // Can be 2 max
	deliveryHistory: [
		{
			DeliveryRecord
				innings: 1
				ballNumber: 1
				rotation: 24
				batsmanChoice: '6'
				timestamp: now
		},
		{
			DeliveryRecord
    			innings: 1
				ballNumber: 2
				rotation: 95
				batsmanChoice: 'W'
				timestamp: now
		}
	]; // list of turn records
}
```
GameState updated by the server right before sending it back to client:
```ts
export interface GameState {
 	players: [1, 2]; // list of player IDs. Max 2
	currentBall: 1; // current turn number
	currentBallRotation: 51; // current ball rotation
	currentBallBatsmanChoice: undeifned; // current ball batsman choice
	playerBowling: 2; // player ID of who is bowling
	totalBalls: 2; // Fixed to 6 right now. Using 2 for example
	gamePhase: 'batting'; // game state
	innings: 2 // Can be 2 max
	deliveryHistory: [
		{
			DeliveryRecord
				innings: 1
				ballNumber: 1
				rotation: 24
				batsmanChoice: '6'
				timestamp: now
		},
		{
			DeliveryRecord
    			innings: 1
				ballNumber: 2
				rotation: 95
				batsmanChoice: 'W'
				timestamp: now
		}
	]; // list of turn records
}
```

Gamestate after first batter choice (sent to server):
```ts
export interface GameState {
 	players: [1, 2]; // list of player IDs. Max 2
	currentBall: 1; // current turn number
	currentBallRotation: 51; // current ball rotation
	currentBallBatsmanChoice: 'NB'; // current ball batsman choice
	playerBowling: 2; // player ID of who is bowling
	totalBalls: 2; // Fixed to 6 right now. Using 2 for example
	gamePhase: 'batting'; // game state
	innings: 2 // Can be 2 max
	deliveryHistory: [
		{
			DeliveryRecord
				innings: 1
				ballNumber: 1
				rotation: 24
				batsmanChoice: '6'
				timestamp: now
		},
		{
			DeliveryRecord
    			innings: 1
				ballNumber: 2
				rotation: 95
				batsmanChoice: 'W'
				timestamp: now
		}
	]; // list of turn records
}
```

GameState updated by the server right before sending it back to client
```ts
export interface GameState {
 	players: [1, 2]; // list of player IDs. Max 2
	currentBall: 2; // current turn number
	currentBallRotation: undefined; // current ball rotation
	currentBallBatsmanChoice: undefined; // current ball batsman choice
	playerBowling: 2; // player ID of who is bowling
	totalBalls: 2; // Fixed to 6 right now. Using 2 for example
	gamePhase: 'setting field'; // game state
	innings: 2 // Can be 2 max
	deliveryHistory: [
		{
			DeliveryRecord
				innings: 1
				ballNumber: 1
				rotation: 24
				batsmanChoice: '6'
				timestamp: now
		},
		{
			DeliveryRecord
    			innings: 1
				ballNumber: 2
				rotation: 95
				batsmanChoice: 'W'
				timestamp: now
		},
		{
			DeliveryRecord
    			innings: 2
				ballNumber: 1
				rotation: 51
				batsmanChoice: 'NB'
				timestamp: now
		}
	]; // list of turn records
}
```
Gamestate after second bowler field setting (sent to server):
```ts
export interface GameState {
 	players: [1, 2]; // list of player IDs. Max 2
	currentBall: 2; // current turn number
	currentBallRotation: 275; // current ball rotation
	currentBallBatsmanChoice: undefined; // current ball batsman choice
	playerBowling: 2; // player ID of who is bowling
	totalBalls: 2; // Fixed to 6 right now. Using 2 for example
	gamePhase: 'setting field'; // game state
	innings: 2 // Can be 2 max
	deliveryHistory: [
		{
			DeliveryRecord
				innings: 1
				ballNumber: 1
				rotation: 24
				batsmanChoice: '6'
				timestamp: now
		},
		{
			DeliveryRecord
    			innings: 1
				ballNumber: 2
				rotation: 95
				batsmanChoice: 'W'
				timestamp: now
		},
		{
			DeliveryRecord
    			innings: 2
				ballNumber: 1
				rotation: 51
				batsmanChoice: 'NB'
				timestamp: now
		}
	]; // list of turn records
}
```

GameState updated by the server right before sending it back to client:
```ts
export interface GameState {
 	players: [1, 2]; // list of player IDs. Max 2
	currentBall: 2; // current turn number
	currentBallRotation: 275; // current ball rotation
	currentBallBatsmanChoice: undefined; // current ball batsman choice
	playerBowling: 2; // player ID of who is bowling
	totalBalls: 2; // Fixed to 6 right now. Using 2 for example
	gamePhase: 'batting'; // game state
	innings: 2 // Can be 2 max
	deliveryHistory: [
		{
			DeliveryRecord
				innings: 1
				ballNumber: 1
				rotation: 24
				batsmanChoice: '6'
				timestamp: now
		},
		{
			DeliveryRecord
    			innings: 1
				ballNumber: 2
				rotation: 95
				batsmanChoice: 'W'
				timestamp: now
		},
		{
			DeliveryRecord
    			innings: 2
				ballNumber: 1
				rotation: 51
				batsmanChoice: 'NB'
				timestamp: now
		}
	]; // list of turn records
}
```

Gamestate after second batter choice (sent to server):
```ts
export interface GameState {
 	players: [1, 2]; // list of player IDs. Max 2
	currentBall: 2; // current turn number
	currentBallRotation: 275; // current ball rotation
	currentBallBatsmanChoice: '2'; // current ball batsman choice
	playerBowling: 2; // player ID of who is bowling
	totalBalls: 2; // Fixed to 6 right now. Using 2 for example
	gamePhase: 'batting'; // game state
	innings: 2 // Can be 2 max
	deliveryHistory: [
		{
			DeliveryRecord
				innings: 1
				ballNumber: 1
				rotation: 24
				batsmanChoice: '6'
				timestamp: now
		},
		{
			DeliveryRecord
    			innings: 1
				ballNumber: 2
				rotation: 95
				batsmanChoice: 'W'
				timestamp: now
		},
		{
			DeliveryRecord
    			innings: 2
				ballNumber: 1
				rotation: 51
				batsmanChoice: 'NB'
				timestamp: now
		}
	]; // list of turn records
}
```

GameState updated by the server right before sending it back to client
```ts
export interface GameState {
 	players: [1, 2]; // list of player IDs. Max 2
	currentBall: 2; // current turn number.
	currentBallRotation: 275; // current ball rotation
	currentBallBatsmanChoice: '2'; // current ball batsman choice
	playerBowling: 2; // player ID of who is bowling
	totalBalls: 2; // Fixed to 6 right now. Using 2 for example
	gamePhase: 'finished'; // game state
	innings: 2 // Can be 2 max
	deliveryHistory: [
		{
			DeliveryRecord
				innings: 1
				ballNumber: 1
				rotation: 24
				batsmanChoice: '6'
				timestamp: now
		},
		{
			DeliveryRecord
    			innings: 1
				ballNumber: 2
				rotation: 95
				batsmanChoice: 'W'
				timestamp: now
		},
		{
			DeliveryRecord
    			innings: 2
				ballNumber: 1
				rotation: 51
				batsmanChoice: 'NB'
				timestamp: now
		},
		{
			DeliveryRecord
    			innings: 2
				ballNumber: 2
				rotation: 275
				batsmanChoice: '2'
				timestamp: now
		}
	]; // list of turn records
}
```

When frontend gets the gamePhase == 'finished', show end game by removing the pie and showing the balls one by one.

Important: If game phase is 'setting_field' and the batter sends a 'batting' socket action, I should drop that action.

We will figure out winner logic later on.
We also need to figure out how many wickets are allowed and how to ends an innings if the maximum wickets are reached.

We can include the idea of audiend watching the match or even fielding being able to see the batter's mouse movement building hype for when the batsman hovers over risky pies.


