import React, { useEffect } from "react";
import { useParams } from "react-router-dom";
import { useSocket } from "../contexts/SocketContext";
import { GameProvider, useGame } from "../contexts/GameContext";
import PreGameJoiningView from "./PreGameJoiningView";
import PlayerView from "./PlayerView";
import AudienceView from "./AudienceView";
import { usePlayerId } from "../hooks/usePlayerId";

const GameRoomInner: React.FC = () => {
	const { roomId } = useParams();
	const { socket } = useSocket();
	const { gameState, user, setUser } = useGame();
	const { playerId } = usePlayerId();

	// 🔹 Step 1: Join the room if we haven't yet
	useEffect(() => {
		console.log("GameState:", gameState);
		console.log("User in GameRoom:", user);
		if (!socket || !roomId || user) return; // already joined

		console.log("Joining room:", roomId, "with player ID:", playerId);

		socket.emit("join_room", roomId, playerId);
	}, [socket, roomId, user]);

	// 🔹 Step 2: Conditionally render based on state
	if (!gameState) return <PreGameJoiningView />;
	if (gameState?.players.includes(user?.id || "")) {
		return <PlayerView />;
	}
	if (gameState?.audience.includes(user?.id || "")) return <AudienceView />;

	return <PreGameJoiningView />;
};

const GameRoom: React.FC = () => {
	const { roomId } = useParams();

	return (
		<GameProvider>
			<GameRoomInner />
		</GameProvider>
	);
};

export default GameRoom;
