import { v4 as uuidv4 } from 'uuid';
import { Player, GameRoom } from './types';

export class RoomManager {
  private rooms: Map<string, GameRoom> = new Map();
  private playerRooms: Map<string, string> = new Map(); // playerId -> roomId

  // Create a new room
  createRoom(playerId: string, roomId?: string): Player {
    const finalRoomId = roomId || uuidv4();

    const player: Player = {
      id: playerId,
      roomId: finalRoomId,
      connected: true,
      isRoomCreator: true
    };

    const room: GameRoom = {
      id: finalRoomId,
      players: [player],
      maxPlayers: 2,
      created: new Date(),
      isActive: false
    };

    this.rooms.set(finalRoomId, room);
    this.playerRooms.set(playerId, finalRoomId);

    return player;
  }

  // Add player to existing room
  addPlayerToRoom(playerId: string, roomId: string): Player {
    const room: GameRoom | undefined = this.rooms.get(roomId);
    if (!room) {
      throw new Error('Room not found');
    }

    if (room.players.length >= room.maxPlayers) {
      throw new Error('Room is full');
    }

    // get player from socketId if already exists
    const existingPlayer: Player | undefined = room.players.find(p => p.id === playerId);

    if(existingPlayer) {
      return existingPlayer;
    }

    // otherwise create new player
    const player: Player = {
      id: playerId,
      roomId: roomId,
      connected: true,
      isRoomCreator: false
    };

    room.players.push(player);
    this.playerRooms.set(playerId, roomId);

    return player;
  }

  // Get room by ID
  getRoom(roomId: string): GameRoom | undefined {
    return this.rooms.get(roomId);
  }

  // Get player by socket ID
  getPlayerByPlayerId(playerId: string): Player | undefined {
    const roomId = this.playerRooms.get(playerId);
    if (!roomId) return undefined;

    const room = this.rooms.get(roomId);
    return room?.players.find(p => p.id === playerId);
  }

  // Get player's socket ID (for notifications)
  // getPlayerSocketId(playerId: string): string | undefined {
  //   // This is a simple implementation - in a real scenario you might need a reverse map
  //   for (const [socketId, roomId] of this.playerRooms) {
  //     const room = this.rooms.get(roomId);
  //     const player = room?.players.find(p => p.id === playerId);
  //     if (player) return socketId;
  //   }
  //   return undefined;
  // }

  // Remove player from room
  removePlayerFromRoom(playerId: string): void {
    const roomId = this.playerRooms.get(playerId);
    if (!roomId) return;

    const room = this.rooms.get(roomId);
    if (room) {
      room.players = room.players.filter(p => p.id !== playerId);

      // Clean up empty rooms
      if (room.players.length === 0) {
        this.rooms.delete(roomId);
      }
    }

    this.playerRooms.delete(playerId);
  }

  // Delete a room and all its players
  deleteRoom(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (room) {
      room.players.forEach(player => {
        this.playerRooms.delete(player.id);
      });
      this.rooms.delete(roomId);
    }
  }


  // Get all active rooms (for debugging)
  getAllRooms(): GameRoom[] {
    return Array.from(this.rooms.values());
  }
}