import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Socket } from "socket.io-client";
import { ClientEvents, ServerEvents } from "../contexts/SocketContext";
import { usePlayerId } from "./usePlayerId";

// Import types from backend (we'll create a shared types file later)
interface Player {
	id: string;
	roomId: string;
	connected: boolean;
	isRoomCreator: boolean;
}

export const useRoom = (socket: Socket<ServerEvents, ClientEvents> | null) => {
	const navigate = useNavigate();
	const { roomId } = useParams<{ roomId: string }>();
	const [currentRoomId, setCurrentRoomId] = useState<string | null>(
		roomId || null,
	);
	const [isCreatingRoom, setIsCreatingRoom] = useState(false);
	const { playerId } = usePlayerId();

	const createRoom = useCallback(() => {
		if (!socket || isCreatingRoom) return;

		setIsCreatingRoom(true);
		socket.emit("create_room", playerId!);

		socket.once("room_created", (newRoomId: string) => {
			setCurrentRoomId(newRoomId);
			navigate(`/game/${newRoomId}`);
			setIsCreatingRoom(false);
		});

		// should handle socket.once('room_not_found')
	}, [socket, navigate, isCreatingRoom]);

	const joinRoom = useCallback(
		(targetRoomId: string) => {
			if (!socket) return;

			socket.emit("join_room", targetRoomId, playerId!);
			setCurrentRoomId(targetRoomId);
			navigate(`/game/${targetRoomId}`);
		},
		[socket, navigate],
	);

	return {
		currentRoomId,
		createRoom,
		joinRoom,
		isCreatingRoom,
	};
};
