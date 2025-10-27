import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Socket } from "socket.io-client";
import { usePlayerId } from "./usePlayerId";
import { ClientEvents, ServerEvents } from "../types";

export const useRoom = (socket: Socket<ServerEvents, ClientEvents> | null) => {
	const navigate = useNavigate();
	const [isCreatingRoom, setIsCreatingRoom] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const { playerId } = usePlayerId();

	// 🧩 Create Room
	const createRoom = useCallback(() => {
		if (!socket || isCreatingRoom) return;

		setIsCreatingRoom(true);
		setError(null);
		console.log("Creating room...");
		socket.emit("create_room", playerId!);

		// ✅ Success handler
		socket.once("room_created", (newRoomId: string) => {
			console.log("Room created:", newRoomId);
			navigate(`/game/${newRoomId}`);
			setIsCreatingRoom(false);
		});

		// ❌ Error handlers
		socket.once("cannot_create_game", () => {
			setError("Unable to create room. Please try again.");
			setIsCreatingRoom(false);
		});

		socket.once("server_error", (err) => {
			console.error("Server error:", err);
			setError(err.message || "Unexpected server error occurred.");
			setIsCreatingRoom(false);
		});
	}, [socket, navigate, isCreatingRoom, playerId]);

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
