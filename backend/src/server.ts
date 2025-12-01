import dotenv from "dotenv";
import express from "express";
import { createServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import cors from "cors";
import { v4 as uuidv4 } from "uuid";
import { RoomManager } from "./roomManager";
import { GameStateManager } from "./gameState";
import { managePowerUpContext } from "./helper/helperMethods";
// Import types from local types file
import {
	ClientEvents,
	GameRoom,
	User,
	ServerEvents,
	GameState,
	presetValues,
	SocketEmissionMode,
} from "./types";
import { initializeGamesRouter } from "./routes/games";
import { verifyUserisActivePlayerInAGame } from "./helper/helperMethods";
import { createError, handleSocketError } from "./errors/AppError";

const app = express();
const server = createServer(app);

dotenv.config();

// Enable CORS for frontend-backend communication
app.use(
	cors({
		origin: process.env.DEBUG
			? "*"
			: process.env.FRONTEND_URL || "http://localhost:3000",
		credentials: true,
	}),
);

// Socket.IO server (simplified typing for now)
const io = new SocketIOServer(server, {
	cors: {
		origin: process.env.DEBUG
			? "*"
			: process.env.FRONTEND_URL || "http://localhost:3000",
		methods: ["GET", "POST"],
	},
});

const roomManager = new RoomManager();
const gameStateManager = new GameStateManager();

// Basic Socket.IO connection handling
io.on("connection", (socket: Socket<ClientEvents, ServerEvents>) => {
	console.log(`Client connected: ${socket.id}`);

	// Handle room creation - creates a room and returns room ID
	socket.on("create_room", (playerId: string) => {
		try {
			const roomId = uuidv4();

			// check player isn't already in a room as an active player
			const existingRoomId = roomManager.getRoomByPlayerId(playerId);
			if (
				verifyUserisActivePlayerInAGame(
					playerId,
					existingRoomId,
					roomManager,
					gameStateManager,
				)
			) {
				socket.emit("cannot_create_game", existingRoomId!);
				return;
			}

			// Remove user from any previous rooms and the audience list of those rooms
			if (existingRoomId) {
				// above ensures the user isn't a player in an active game
				gameStateManager.removeUserFromGameAudience(
					playerId,
					existingRoomId,
				);
				roomManager.removePlayerFromRoom(playerId);
			}

			// creating a new room doesn't add the user to the room's user list
			// that is done when 'join_room' event is received from frontend
			roomManager.createRoom(playerId, roomId);
			socket.join(roomId);

			// Create a game state for the new room
			gameStateManager.createInitialGameState(roomId);
			socket.emit("room_created", roomId);
			console.log(`Room created: ${roomId} by user: ${playerId}`);
		} catch (error) {
			handleSocketError(socket, error);
		}
	});

	// Handle room joining - joins an existing room by ID
	socket.on("join_room", (roomId: string, playerId: string) => {
		// This event is called everytime the user first opens the game page
		try {
			const room: GameRoom | undefined = roomManager.getRoom(roomId);
			if (!room) {
				socket.emit("room_not_found");
				return;
			}

			const existingGameState = gameStateManager.getGameState(roomId);
			// check player isn't already in a room as an active player
			const existingRoomId = roomManager.getRoomByPlayerId(playerId);
			if (
				existingRoomId !== roomId &&
				verifyUserisActivePlayerInAGame(
					playerId,
					existingRoomId,
					roomManager,
					gameStateManager,
				)
			) {
				socket.emit("cannot_join_game", existingRoomId!);
				return;
			}

			if (existingGameState) {
				if (
					["finished", "surrendered"].includes(
						existingGameState.gamePhase,
					)
				) {
					socket.emit("game_ended", existingGameState);
					return;
				}

				if (
					existingGameState.players.includes(playerId) ||
					existingGameState.audience.includes(playerId)
				) {
					// let them re-join
					socket.join(roomId);
					console.log(
						`Player ${playerId} re-joined ongoing game in room: ${roomId}. gameState:`,
						existingGameState,
					);
					socket.emit(
						"user_already_joined",
						existingGameState,
						roomManager.getUserByPlayerId(playerId)!,
					);
					return;
				}
			}

			// If player isn't in the player list or audience list
			// Just add them to the room. Not adding to game state yet.
			roomManager.addPlayerToRoom(playerId, roomId);
			socket.join(roomId);
		} catch (error) {
			handleSocketError(socket, error);
		}
	});

	// This event should never be called by a player who is actively playing in a game
	socket.on("join_as_player", (playerId: string) => {
		try {
			const roomId: string | undefined =
				roomManager.getRoomByPlayerId(playerId);
			if (!roomId) {
				socket.emit("room_not_found");
				return;
			}

			// Add the player to the room (Not really necessary if already added in join_room)
			roomManager.addPlayerToRoom(playerId, roomId); // Optional

			gameStateManager.addUserToGamePlayers(playerId, roomId);
			// update the user to be playing
			const user = roomManager.getUserByPlayerId(playerId);
			if (user) {
				user.isPlaying = true; // this should update the user in the room's user list as well
			}

			socket.join(roomId);
			// socket.emit("joined_as_player", gameStateManager.getGameState(player.roomId)!);
			// console.log(`Player ${player.id} joined as player in room ${player.roomId}`);

			// Check if both players are now connected and start game
			const updatedGameState: GameState | undefined =
				gameStateManager.getGameState(roomId);
			if (updatedGameState && updatedGameState.players.length === 2) {
				// if the game state is waiting, then start the game
				// otherwise, send the game start to that socket only
				if (updatedGameState.gamePhase === "waiting") {
					console.log(
						"Both players connected, starting game in room:",
						roomId,
					);

					// Set the game phase to "toss"
					const gameState = gameStateManager.startGame(roomId);
					console.log(`Game started by room creator: ${playerId}`);

					// Send a joined_as_player to the joining player so that they can update their user state
					socket.emit("joined_as_player", gameState, user!);
					// Notify all players that game has started
					io.to(roomId).emit("toss_started", gameState);
					return;
				}
			}

			socket.emit(
				"joined_as_player",
				gameStateManager.getGameState(roomId)!,
				user!,
			);
			socket
				.to(roomId)
				.emit("game_updated", gameStateManager.getGameState(roomId)!); // doesn't send to self
		} catch (error) {
			handleSocketError(socket, error);
		}
	});

	// This event should never be called by a player who is actively playing in a game
	socket.on("join_as_audience", (playerId: string) => {
		try {
			const roomId: string | undefined =
				roomManager.getRoomByPlayerId(playerId);
			if (!roomId) {
				socket.emit("room_not_found");
				return;
			}

			// Add the player to the room (Not really necessary if already added in join_room)
			roomManager.addPlayerToRoom(playerId, roomId); // Optional

			gameStateManager.addUserToGameAudience(playerId, roomId);
			// update the user to be not playing
			const user = roomManager.getUserByPlayerId(playerId);
			if (user) {
				user.isPlaying = false; // this should update the user in the room's user list as well
			}

			socket.join(roomId);

			socket.emit(
				"joined_as_audience",
				gameStateManager.getGameState(roomId)!,
				roomManager.getUserByPlayerId(playerId)!,
			);
			socket
				.to(roomId)
				.emit("game_updated", gameStateManager.getGameState(roomId)!); // doesn't send to self
		} catch (error) {
			handleSocketError(socket, error);
		}
	});

	socket.on(
		"toss_selection_made",
		(player: User, choice: "heads" | "tails") => {
			try {
				const gameState = gameStateManager.getGameState(player.roomId);
				if (!gameState) {
					throw createError(
						"GAMESTATE_NOT_FOUND",
						"No game state found for room",
					);
				}

				// Check if the player is allowed to make a toss selection
				if (gameState.tossSelector !== player.id) {
					throw createError(
						"INVALID_MOVE",
						"You are not authorized to make the toss selection",
					);
				}

				// Server randomly chooses heads or tails
				const serverChoice = Math.random() < 0.5 ? "heads" : "tails";

				gameState.playerTossChoice = choice;
				gameState.serverTossChoice = serverChoice;

				// Determine toss winner
				if (choice === serverChoice) {
					gameState.tossWinner = player.id;
				} else {
					gameState.tossWinner = gameState.players.find(
						(id) => id !== player.id,
					)!; // other player
				}

				console.log(
					`Toss selection made by player ${player.id}: ${choice}, server chose: ${serverChoice}, toss winner: ${gameState.tossWinner}`,
				);
				// Update game phase to side selection
				gameState.gamePhase = "side selection";

				// Broadcast updated game state to all in room
				io.to(player.roomId).emit("side_selection_started", gameState);
			} catch (error) {
				handleSocketError(socket, error);
			}
		},
	);

	socket.on(
		"side_selection_made",
		(player: User, choice: "batting" | "fielding") => {
			try {
				console.log(
					`Side selection made by player ${player.id}: ${choice}`,
				);
				const gameState = gameStateManager.getGameState(player.roomId);
				if (!gameState) {
					throw createError(
						"GAMESTATE_NOT_FOUND",
						"No game state found for room",
					);
				}

				// Check if the player is allowed to make a side selection
				if (gameState.tossWinner !== player.id) {
					throw createError(
						"INVALID_MOVE",
						"You are not authorized to make the side selection",
					);
				}

				// Assign sides based on choice
				if (choice === "batting") {
					gameState.playerBatting = player.id;
					gameState.playerFielding = gameState.players.find(
						(id) => id !== player.id,
					)!;
				} else {
					gameState.playerBatting = gameState.players.find(
						(id) => id !== player.id,
					)!;
					gameState.playerFielding = player.id;
				}

				// Update game phase to 'setting field'
				gameState.gamePhase = "setting field";

				// server will create 3 presets for the fielding player to choose from
				gameState.originalPresets =
					gameStateManager.generateFieldPresets();
				gameState.modifiedPresets = gameState.originalPresets.map(
					(preset) => [...preset],
				); // no reference to originalPresets nested lists

				console.log("Side selection completed. Game state:", gameState);
				// Broadcast updated game state to all in room
				io.to(player.roomId).emit("game_started", gameState);
			} catch (error) {
				handleSocketError(socket, error);
			}
		},
	);

	// // REDUNDANT - Keep for reference
	// socket.on("player_joined", (player: User) => {
	// 	try {
	// 		console.log("Player joined event received:", player);

	// 		const room = roomManager.getRoom(player.roomId);
	// 		if (!room) {
	// 			console.log("Room not found for player_joined:", player.roomId);
	// 			socket.emit("room_not_found");
	// 			return;
	// 		}

	// 		// Check if this player is already in the room
	// 		const existingPlayer = room.users.find((p) => p.id === player.id);
	// 		if (!existingPlayer) {
	// 			console.log("Player not found in room, adding them");

	// 			// Check room size before adding
	// 			if (room.users.length >= room.maxPlayers) {
	// 				console.log("Room is full, cannot add player:", player.id);
	// 				socket.emit("room_full");
	// 				return;
	// 			}

	// 			// Add the player to the room
	// 			const addedUser: User = roomManager.addPlayerToRoom(
	// 				player.id,
	// 				player.roomId,
	// 			);
	// 			gameStateManager.addPlayerToGame(player.id, player.roomId);
	// 			console.log(
	// 				`Player ${addedUser.id} added to room ${addedUser.roomId}`,
	// 			);
	// 		}

	// 		// Check if both players are now connected and start game
	// 		const updatedRoom: GameRoom | undefined = roomManager.getRoom(
	// 			player.roomId,
	// 		);
	// 		if (updatedRoom && updatedRoom.users.length === 2) {
	// 			// Get the game state
	// 			// if the game state is waiting, then start the game
	// 			// otherwise, send the game start to that socket only
	// 			const gameState = gameStateManager.getGameState(player.roomId);
	// 			if (!gameState) {
	// 				throw createError("GAMESTATE_NOT_FOUND", "No game state found for room");
	// 			}

	// 			if (gameState.gamePhase === "waiting") {
	// 				console.log(
	// 					"Both players connected, starting game in room:",
	// 					player.roomId,
	// 				);

	// 				// Find the room creator (first player)
	// 				const roomCreator: string = updatedRoom.roomCreator;
	// 				if (roomCreator) {
	// 					const gameState = gameStateManager.startGame(
	// 						player.roomId,
	// 					);
	// 					console.log(
	// 						`Game started by room creator: ${roomCreator}`,
	// 					);

	// 					// Notify all players that game has started
	// 					io.to(player.roomId).emit("game_started", gameState);
	// 					return;
	// 				}
	// 			} else {
	// 				// Game already started, just send the current state to the joining player
	// 				socket.emit("game_started", gameState);
	// 				return;
	// 			}
	// 		}
	// 	} catch (error) {
	// 		handleSocketError(socket, error);
	// 	}
	// });

	// Basic rotation handling (placeholder - no turn validation yet)
	socket.on(
		"rotate_pie",
		(
			roomId: string,
			playerId: string,
			rotation: number,
			presetChoice: number,
		) => {
			try {
				// get game state
				const gameState = gameStateManager.getGameState(roomId);
				if (!gameState) {
					throw createError(
						"GAMESTATE_NOT_FOUND",
						"No game state found for room",
					);
				}

				// For now, just broadcast the rotation to other players in the room
				socket
					.to(roomId)
					.emit("rotation_update", gameState, rotation, presetChoice);
			} catch (error) {
				handleSocketError(socket, error);
			}
		},
	);

	socket.on(
		"shot_selection_hover",
		(playerId: string, choiceIndex: number) => {
			try {
				// get game state
				const roomId = roomManager.getRoomByPlayerId(playerId);
				if (!roomId) {
					throw createError(
						"ROOM_NOT_FOUND",
						"No room found for player",
					);
				}

				const gameState = gameStateManager.getGameState(roomId);
				if (!gameState) {
					throw createError(
						"GAMESTATE_NOT_FOUND",
						"No game state found for room",
					);
				}

				const choice =
					gameState.modifiedPresets[gameState.presetChosen][
						choiceIndex
					];
				if (presetValues.indexOf(choice) === -1) {
					return; // No need to throw error for hover
				}

				// Broadcast the hover selection to other players in the room
				socket
					.to(roomId)
					.emit(
						"shot_selection_hover_update",
						gameState,
						choiceIndex,
					);

				console.log(
					`Player ${playerId} hovered shot selection in room ${roomId}: ${choice} (index: ${choiceIndex})`,
				);
			} catch (error) {
				handleSocketError(socket, error);
			}
		},
	);

	// Bowler sends their desired field rotation
	socket.on(
		"field_set",
		(
			playerId: string,
			roomId: string,
			rotation: number,
			presetChoice: number,
		) => {
			try {
				console.log(
					`Field set received from player ${playerId} in room ${roomId}: ${rotation}`,
				);

				// If the powerContext has "Frozen Hands", then the rotation should be 0
				const gameStateBeforeUpdate =
					gameStateManager.getGameState(roomId);
				if (!gameStateBeforeUpdate) {
					throw createError(
						"GAMESTATE_NOT_FOUND",
						"No game state found for room",
					);
				}

				// Updates game state and changes gamephase to 'batting'
				const gameState = gameStateManager.updateFieldSetup(
					playerId,
					roomId,
					rotation,
					presetChoice,
				);

				// Manage power-up context (clear all except Frozen Hands)
				managePowerUpContext(gameState, playerId);

				// Notify all players about turn end and next turn
				io.to(roomId).emit("play_shot", gameState);
				console.log(
					`Field setup done for ball: ${gameState.currentBall}. Batting now!`,
				);
			} catch (error) {
				handleSocketError(socket, error);
			}
		},
	);

	// Handle batsman's shot selection
	socket.on(
		"shot_played",
		(playerId: string, roomId: string, choiceIndex: number) => {
			try {
				// Updates game state and changes gamephase to 'batting'
				const gameState = gameStateManager.updateShotPlayed(
					playerId,
					roomId,
					choiceIndex,
				);

				// Clean up power-up context after shot is played
				managePowerUpContext(gameState, playerId);

				if (gameState.gamePhase === "finished") {
					io.to(roomId).emit("game_ended", gameState);
					console.log(`Game ended in room ${roomId}`);

					// TODO: Run room cleanup properly
					return;
				}

				io.to(roomId).emit("set_field", gameState);
				console.log(
					`Delivery completed for ball: ${gameState.currentBall}. Batting now!`,
				);
			} catch (error) {
				handleSocketError(socket, error);
			}
		},
	);

	socket.on(
		"power_up_used",
		(
			playerId: string,
			roomId: string,
			powerUp: string,
			modification?: any,
		) => {
			try {
				console.log(
					`Power-up ${powerUp} used by player ${playerId} in room ${roomId}`,
				);

				const gameState = gameStateManager.getGameState(roomId);
				if (!gameState) {
					throw createError(
						"GAMESTATE_NOT_FOUND",
						"No game state found for room",
					);
				}

				const isBatting = gameState.playerBatting === playerId;
				const isFielding = gameState.playerFielding === playerId;

				let socketEmissionMode: SocketEmissionMode =
					SocketEmissionMode.TO_NONE;

				// Handle each power-up type
				switch (powerUp) {
					case "Third Man":
						if (!isFielding) {
							throw createError(
								"INVALID_MOVE",
								"Only fielders can use Third Man power-up",
							);
						}
						socketEmissionMode =
							gameStateManager.handleThirdManPowerUp(
								gameState,
								playerId,
								modification,
							);
						break;

					case "Field Shift":
						if (!isFielding) {
							throw createError(
								"INVALID_MOVE",
								"Only fielders can use Field Shift power-up",
							);
						}
						socketEmissionMode =
							gameStateManager.handleFieldShiftPowerUp(
								gameState,
								playerId,
								modification,
							);
						break;

					case "Mirror Field":
						if (!isFielding) {
							throw createError(
								"INVALID_MOVE",
								"Only fielders can use Mirror Field power-up",
							);
						}
						socketEmissionMode =
							gameStateManager.handleMirrorFieldPowerUp(
								gameState,
								playerId,
							);
						break;

					case "Scout Report":
						if (!isBatting) {
							throw createError(
								"INVALID_MOVE",
								"Only batsmen can use Scout Report power-up",
							);
						}
						socketEmissionMode =
							gameStateManager.handleScoutReportPowerUp(
								gameState,
								playerId,
								modification,
							);
						break;

					case "Invulnerability":
						if (!isBatting) {
							throw createError(
								"INVALID_MOVE",
								"Only batsmen can use Invulnerability power-up",
							);
						}
						socketEmissionMode =
							gameStateManager.handleInvulnerabilityPowerUp(
								gameState,
								playerId,
							);
						break;

					case "Frozen Hands":
						if (!isBatting) {
							throw createError(
								"INVALID_MOVE",
								"Only batsmen can use Frozen Hands power-up",
							);
						}
						socketEmissionMode =
							gameStateManager.handleFrozenHandsPowerUp(
								gameState,
								playerId,
							);
						break;

					default:
						throw createError(
							"INVALID_MOVE",
							`Unknown power-up: ${powerUp}`,
						);
				}

				// Emit updated game state based on emission mode
				switch (socketEmissionMode) {
					case SocketEmissionMode.TO_ALL_IN_ROOM:
						io.to(roomId).emit("game_updated", gameState);
						break;
					case SocketEmissionMode.TO_OTHERS_IN_ROOM:
						socket.to(roomId).emit("game_updated", gameState);
						break;
					case SocketEmissionMode.TO_SELF:
						socket.emit("game_updated", gameState);
						break;
					case SocketEmissionMode.TO_NONE:
					default:
						// Do nothing
						break;
				}
				return;
			} catch (error) {
				handleSocketError(socket, error);
			}
		},
	);

	socket.on("leave_room", (playerId: string) => {
		// get the roomId from the removed player
		const roomId = roomManager.getRoomByPlayerId(playerId);

		try {
			if (roomId) {
				if (
					gameStateManager.isUserPlayingInOngoingGame(
						playerId,
						roomId,
					)
				) {
					// if the user is an active player, we may want to handle it differently
					// for now, just log and return
					console.log(
						`Active player ${playerId} cannot leave the room ${roomId} directly.`,
					);
					throw createError(
						"UNABLE_TO_LEAVE_ROOM",
						"Active players cannot leave the room directly. They must surrender or wait for the game to end.",
					);
				}

				roomManager.removePlayerFromRoom(playerId);
				gameStateManager.removeUserFromGameAudience(playerId, roomId);

				socket.emit("user_left", playerId); // Client will take this and redirect the user to the main room
				socket
					.to(roomId)
					.emit(
						"game_updated",
						gameStateManager.getGameState(roomId)!,
					); // Update other clients about the user leaving
			}
		} catch (error) {
			handleSocketError(socket, error);
		}
	});

	socket.on("surrender", (playerId: string) => {
		// get the roomId from the removed player
		const roomId = roomManager.getRoomByPlayerId(playerId);

		try {
			if (roomId) {
				// Update game state to surrendered
				const gameState = gameStateManager.attemptSurrenderGame(
					playerId,
					roomId,
				); // throws error if unable to surrender

				// Notify all players about game end due to surrender
				io.to(roomId).emit("game_surrendered", gameState);
				console.log(`Player ${playerId} surrendered in room ${roomId}`);

				console.log(`Room ${roomId} removed after surrender.`);
			}
		} catch (error) {
			handleSocketError(socket, error);
		}
	});

	// Handle disconnection
	socket.on("disconnect", (playerId: string) => {
		roomManager.removePlayerFromRoom(playerId);
		// maybe keep the player in the game state for reconnection?
		console.log(`Client disconnected: ${playerId}`);
	});
});

// Basic health check endpoint
app.get("/health", (req, res) => {
	res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// GET /games/active - return all active games
app.get("/games/active", (req, res) => {
	// Use GameStateManager.getActiveGames() to obtain active games
	const activeMap = gameStateManager.getActiveGames();

	const activeGames: { roomId: string; gameState: GameState }[] = [];
	activeMap.forEach((gameState, roomId) => {
		activeGames.push({ roomId, gameState });
	});

	return res.status(200).json(activeGames);
});

// Initialize routes
app.use("/games", initializeGamesRouter(roomManager, gameStateManager));

// Serve the frontend build in production (optional)
if (process.env.NODE_ENV === "production") {
	app.use(express.static("../frontend/build"));
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
	console.log(`Server running on port ${PORT}`);
	console.log(`Health check available at http://localhost:${PORT}/health`);
});
