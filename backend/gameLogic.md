When 2 players join a room, the game should start automatically. 


What is starting game?
Create an entry in GameStateManager.gameStates with room ID as the ID
```
GameState {
	players: list of player Ids,
	currentTurn: TurnState,
	currentPlayerId: string,
	totalTurns: number,
	gamePhase: 'waiting' | 'playing' | 'finished',
	turnHistory: linkedlist of TurnRecord
}
```

Now, when a game starts, GameState object is created with the following info
Example data:
```
player1 ID: 1
player2 ID: 2
```
```
GameState
	players: [1, 2]
	currentTurn: 1
	currentPlayerId: 1
	totalTurns: 6
	gamePhase: 'playing'
	turnHistory: []
```
This information is passed to player 1
In the frontend, player 1 will do the following
```
setGameState(prev => ({
				...prev,
				isMyTurn: data.currentPlayerId === playerId,
				currentTurn: currentTurn,
				gamePhase: 'playing'
			}));
```
Then player 1 will spin the wheel and spinning the wheel will not update the game state.
We will pass that information tot he other player and update their wheel accordingly

When player 1 clicks end turn, the player will also pass the rotation with it.
We will update the gamestate accordingly
```
GameState
	players: [1, 2]
	currentTurn: 2
	currentPlayerId: 2
	totalTurns: 6
	gamePhase: 'playing'
	turnHistory: [
		{
			TurnRecord
				turnNumber: 1
				playerId: 1
				rotation: 10
				timestamp: now
		}
	]
```
This information is passed to all players to "turn_ended"
In the frontend, players will update their states with this information
```
setGameState(prev => ({
				...prev,
				isMyTurn: data.currentPlayerId === playerId,
				currentTurn: data.turnNumber
			}));
```
This goes on until currentTurn is 6 and the 6th turn has ended

Check if currentTurn is 6, then change the gamePhase to finished
```
GameState
	players: [1, 2]
	currentTurn: 6
	currentPlayerId: 2
	totalTurns: 6
	gamePhase: 'finished'
	turnHistory: [...]
```
Send this news to all players.
They should just show game ended!