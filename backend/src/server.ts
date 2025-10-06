import express from "express";
import { createServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import cors from "cors";
import { v4 as uuidv4 } from "uuid";
import { RoomManager } from "./roomManager";
import { GameStateManager } from "./gameState";
// Import types from local types file
import { ClientEvents, GameRoom, Player, ServerEvents } from "./types";

const app = express();
const server = createServer(app);

// Enable CORS for frontend-backend communication
app.use(
	cors({
		origin: process.env.FRONTEND_URL || "http://localhost:3000",
		credentials: true,
	}),
);

// Socket.IO server (simplified typing for now)
const io = new SocketIOServer(server, {
	cors: {
		origin: process.env.FRONTEND_URL || "http://localhost:3000",
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
			roomManager.createRoom(playerId, roomId);
			socket.join(roomId);

			// Create a game state for the new room
			gameStateManager.createInitialGameState(playerId, roomId);
			socket.emit("room_created", roomId);
			console.log(`Room created: ${roomId} by player: ${playerId}`);
		} catch (error) {
			console.error("Error creating room:", error);
			socket.emit("room_not_found");
		}
	});

	// Handle room joining - joins an existing room by ID
	socket.on("join_room", (roomId: string, playerId: string) => {
		try {
			const room = roomManager.getRoom(roomId);
			if (!room) {
				socket.emit("room_not_found");
				return;
			}

			// find if player has joined the room before
			const existingPlayer = room.players.find((p) => p.id === playerId);
			if (existingPlayer) {
				socket.join(roomId);
				const gameState = gameStateManager.getGameState(roomId);
				// Return the current game state to the re-joining player
				if (!gameState) {
					throw new Error("No game state found for room");
				}
				console.log(
					`Player ${playerId} re-joined room: ${roomId}. gameState:`,
					gameState,
				);
				io.to(socket.id).emit(
					"player_joined",
					gameState,
					existingPlayer,
				);
				return;
			}

			if (room.players.length >= 2) {
				socket.emit("room_full");
				return;
			}

			const player = roomManager.addPlayerToRoom(playerId, roomId);
			socket.join(roomId);

			let gameState = gameStateManager.getGameState(roomId);
			if (!gameState) {
				// We should never reach this situation
				// Because this means that room creator != game creator
				// This can lead to many UI bugs
				throw new Error("A room exists but no game was created for it. Create a new room and try again.");
			} else {
				gameState = gameStateManager.addPlayerToGame(
					playerId,
					roomId,
				);
			}

			console.log(
				`Player ${playerId} joined room: ${roomId}. gameState:`,
				gameState,
			);
			// Return the current game state to the joining player
			io.to(socket.id).emit("player_joined", gameState, player);
		} catch (error) {
			console.error("Error joining room:", error);
			socket.emit("room_not_found");
		}
	});

	// Handle player_joined event from frontend (for game initialization)
	socket.on("player_joined", (player: Player) => {
		try {
			console.log("Player joined event received:", player);

			const room = roomManager.getRoom(player.roomId);
			if (!room) {
				console.log("Room not found for player_joined:", player.roomId);
				socket.emit("room_not_found");
				return;
			}

			// Check if this player is already in the room
			const existingPlayer = room.players.find((p) => p.id === player.id);
			if (!existingPlayer) {
				console.log("Player not found in room, adding them");

				// Check room size before adding
				if (room.players.length >= room.maxPlayers) {
					console.log("Room is full, cannot add player:", player.id);
					socket.emit("room_full");
					return;
				}

				// Add the player to the room
				const addedPlayer: Player = roomManager.addPlayerToRoom(
					player.id,
					player.roomId,
				);
				gameStateManager.addPlayerToGame(player.id, player.roomId);
				console.log(
					`Player ${addedPlayer.id} added to room ${addedPlayer.roomId}`,
				);
			}

			// Check if both players are now connected and start game
			const updatedRoom: GameRoom | undefined = roomManager.getRoom(player.roomId);
			if (updatedRoom && updatedRoom.players.length === 2) {
				console.log(
					"Both players connected, starting game in room:",
					player.roomId,
				);

				// Find the room creator (first player)
				const roomCreator: string = updatedRoom.roomCreator;
				if (roomCreator) {
					const gameState = gameStateManager.startGame(player.roomId);
					console.log(
						`Game started by room creator: ${roomCreator}`,
					);

					// Notify all players that game has started
					io.to(player.roomId).emit("game_started", gameState);
				}
			}
		} catch (error) {
			console.error("Error handling player_joined:", error);
			socket.emit("room_not_found");
		}
	});

	// Basic rotation handling (placeholder - no turn validation yet)
	socket.on(
		"rotate_pie",
		(data: { roomId: string; playerId: string; rotation: number }) => {
			try {
				// get game state
				const gameState = gameStateManager.getGameState(data.roomId);
				if (!gameState) {
					throw new Error("No game state found for room");
				}

				// For now, just broadcast the rotation to other players in the room
				socket
					.to(data.roomId)
					.emit("rotation_update", gameState, data.rotation);

				console.log(
					`Player ${data.playerId} rotated in room ${data.roomId}: ${data.rotation}`,
				);
			} catch (error) {
				console.error("Error handling rotation:", error);
				// socket.emit('invalid_move', 'Failed to process rotation');
			}
		},
	);

	// Bowler sends their desired field rotation
	socket.on("field_set", (playerId: string, roomId: string, rotation: number) => {
		try {
			// Updates game state and changes gamephase to 'batting'
			const gameState = gameStateManager.updateFieldSetup(playerId, roomId, rotation);
			
			// Notify all players about turn end and next turn
			io.to(roomId).emit("play_shot", gameState);
			console.log(
				`Field setup done for ball: ${gameState.currentBall}. Batting now!`,
			);
		} catch (error) {
			console.error("Error setting the field:", error);
		}
	});

	// Bowler sends their desired field rotation
	socket.on("shot_played", (playerId: string, roomId: string, choice: string) => {
		try {
			// Updates game state and changes gamephase to 'batting'
			const gameState = gameStateManager.updateShotPlayed(playerId, roomId, choice);

			if(gameState.gamePhase === 'finished') {
				io.to(roomId).emit("game_ended", gameState);
				console.log(`Game ended in room ${roomId}`);
				return;
			}

			io.to(roomId).emit("set_field", gameState);
			console.log(
				`Delivery completed for ball: ${gameState.currentBall}. Batting now!`,
			);
		} catch (error) {
			console.error("Error setting the field:", error);
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

// Serve the frontend build in production (optional)
if (process.env.NODE_ENV === "production") {
	app.use(express.static("../frontend/build"));
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
	console.log(`Server running on port ${PORT}`);
	console.log(`Health check available at http://localhost:${PORT}/health`);
});
