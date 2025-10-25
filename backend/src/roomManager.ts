import { v4 as uuidv4 } from "uuid";
import { User, GameRoom } from "./types";

export class RoomManager {
	private rooms: Map<string, GameRoom> = new Map();
	private playerRooms: Map<string, string> = new Map(); // playerId -> roomId // ensures one player can be playing one game at a time

	// Create a new room
	createRoom(playerId: string, roomId: string): User {

		const user: User = {
			id: playerId,
			roomId: roomId,
			connected: true,
			isRoomCreator: true,
			isPlaying: false
		};

		const room: GameRoom = {
			id: roomId,
			users: [user],
			maxPlayers: 2,
			created: new Date(),
			roomCreator: playerId,
		};

		this.rooms.set(roomId, room);
		this.playerRooms.set(playerId, roomId);

		return user;
	}

	// Add player to existing room
	addPlayerToRoom(playerId: string, roomId: string): User {
		const room: GameRoom | undefined = this.rooms.get(roomId);
		if (!room) {
			throw new Error("Room not found");
		}

		// get user from socketId if already exists
		const existingUser: User | undefined = room.users.find(
			(p) => p.id === playerId,
		);

		if (existingUser) {
			return existingUser;
		}

		if (room.users.length >= room.maxPlayers) {
			throw new Error("Room is full");
		}

		// otherwise create new user
		const user: User = {
			id: playerId,
			roomId: roomId,
			connected: true,
			isRoomCreator: false,
			isPlaying: false
		};

		room.users.push(user);
		this.playerRooms.set(playerId, roomId);

		return user;
	}

	// Get room by ID
	getRoom(roomId: string): GameRoom | undefined {
		return this.rooms.get(roomId);
	}

	// Get user by socket ID
	getUserByPlayerId(playerId: string): User | undefined {
		const roomId = this.playerRooms.get(playerId);
		if (!roomId) return undefined;

		const room = this.rooms.get(roomId);
		return room?.users.find((p) => p.id === playerId);
	}

	// Remove player from room
	removePlayerFromRoom(playerId: string): void {
		const roomId = this.playerRooms.get(playerId);
		if (!roomId) return;

		const room = this.rooms.get(roomId);
		if (room) {
			room.users = room.users.filter((p) => p.id !== playerId);

			// Remove player from playerRooms mapping
			this.playerRooms.delete(playerId);



			// Clean up empty rooms
			if (room.users.length === 0) {
				this.rooms.delete(roomId);
			}
		}

		this.playerRooms.delete(playerId);
	}

	// Delete a room and all its players
	deleteRoom(roomId: string): void {
		const room = this.rooms.get(roomId);
		if (room) {
			room.users.forEach((player) => {
				this.playerRooms.delete(player.id);
			});
			this.rooms.delete(roomId);
		}
	}

	// Get all active rooms (for debugging)
	getAllRooms(): GameRoom[] {
		return Array.from(this.rooms.values());
	}


	getRoomByPlayerId(playerId: string): string | undefined {
		return this.playerRooms.get(playerId);
	}
}
