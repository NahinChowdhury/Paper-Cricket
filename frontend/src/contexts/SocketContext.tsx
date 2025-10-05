import React, { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { usePlayerId } from '../hooks/usePlayerId';

export interface Player {
  id: string;
  roomId: string;
  connected: boolean;
  isRoomCreator: boolean;
}

export interface TurnRecord {
  turnNumber: number;
  playerId: string;
  rotation: number;
  timestamp: Date;
}

export interface GameState {
  players: string[];
  currentTurn: number;
  currentPlayerId: string;
  totalTurns: number;
  gamePhase: 'waiting' | 'playing' | 'finished';
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

export interface SocketContextType {
  socket: Socket<ServerEvents, ClientEvents> | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
});

export const SocketProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const socketRef = useRef<Socket<ServerEvents, ClientEvents> | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { playerId } = usePlayerId();

  if (!socketRef.current) {
    socketRef.current = io('http://localhost:3001', {
      transports: ['websocket', 'polling'],
      query: playerId ? { playerId } : undefined, // Send persistent player ID to server
    });
  }

  useEffect(() => {
    const socket = socketRef.current!;
    socket.on('connect', () => {
      console.log('Connected to server - Socket ID:', socket.id, 'Player ID:', playerId);
      setIsConnected(true);
    });
    socket.on('disconnect', () => {
      console.log('Disconnected from server');
      setIsConnected(false);
    });

    // 👇 don’t close on unmount unless you really want to
    return () => {
      // socket.close();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  return useContext(SocketContext);
};
