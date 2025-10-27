import React, { useEffect } from "react";
import { useParams } from "react-router-dom";
import { useSocket } from "../contexts/SocketContext";
import { GameProvider, useGame } from "../contexts/GameContext";
import PreGameJoiningView from "./PreGameJoiningView";
import PlayerView from "./PlayerView";
import AudienceView from "./AudienceView";
import GameEndView from "./GameEndView";
import ErrorOverlay from "../components/ErrorOverlay";
import { usePlayerId } from "../hooks/usePlayerId";

// ==============================
// INNER GAME ROOM LOGIC
// ==============================
const GameRoomInner: React.FC = () => {
	const { roomId } = useParams();
	const { socket, redirectPath } = useSocket();
	const { gameState, user } = useGame();
	const { playerId } = usePlayerId();

	// 🔹 Step 1: Join the room when mounted
	useEffect(() => {
		if (!socket || !roomId || user) return; // already joined
		console.log("Joining room:", roomId, "with player ID:", playerId);
		socket.emit("join_room", roomId, playerId);
	}, [socket, roomId, user]);

	// 🔹 Step 2: Handle redirect after an error
	useEffect(() => {
		if (redirectPath) {
			const timer = setTimeout(() => {
				window.location.href = redirectPath;
			}, 2000);
			return () => clearTimeout(timer);
		}
	}, [redirectPath]);

	// 🔹 Step 3: Game End Check
	if (
		gameState?.gamePhase === "finished" ||
		gameState?.gamePhase === "surrendered"
	) {
		return (
			<>
				<ErrorOverlay />
				<GameEndView />
			</>
		);
	}

	console.log("GameRoom rendering with GameState:");
	console.log(gameState);
	// 🔹 Step 4: Normal role-based rendering
	if (!gameState)
		return (
			<>
				<ErrorOverlay />
				<PreGameJoiningView />
			</>
		);

	if (gameState.players.includes(user?.id || ""))
		return (
			<>
				<ErrorOverlay />
				<PlayerView />
			</>
		);

	if (gameState.audience.includes(user?.id || ""))
		return (
			<>
				<ErrorOverlay />
				<AudienceView />
			</>
		);

	return (
		<>
			<ErrorOverlay />
			<PreGameJoiningView />
		</>
	);
};

// ==============================
// PROVIDER WRAPPER
// ==============================
const GameRoom: React.FC = () => {
	return (
		<GameProvider>
			<GameRoomInner />
		</GameProvider>
	);
};

export default GameRoom;
