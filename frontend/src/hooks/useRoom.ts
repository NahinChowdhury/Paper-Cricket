import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Socket } from "socket.io-client";
import { ClientEvents, ServerEvents } from "../contexts/SocketContext";
import { usePlayerId } from "./usePlayerId";

export const useRoom = (socket: Socket<ServerEvents, ClientEvents> | null) => {
	const navigate = useNavigate();
	const [isCreatingRoom, setIsCreatingRoom] = useState(false);
	const { playerId } = usePlayerId();

	const createRoom = useCallback(() => {
		if (!socket || isCreatingRoom) return;

		setIsCreatingRoom(true);
		console.log("Creating room...");
		socket.emit("create_room", playerId!);

		socket.once("room_created", (newRoomId: string) => {
			console.log("Room created:", newRoomId);
			navigate(`/game/${newRoomId}`);
			setIsCreatingRoom(false);
		});

		// should handle socket.once('room_not_found')
	}, [socket, navigate, isCreatingRoom]);

	const joinRoom = useCallback(
		(targetRoomId: string) => {
			if (!socket) return;

			socket.emit("join_room", targetRoomId, playerId!);
			navigate(`/game/${targetRoomId}`);
		},
		[socket, navigate],
	);

	return {
		createRoom,
		joinRoom,
		isCreatingRoom,
	};
};
