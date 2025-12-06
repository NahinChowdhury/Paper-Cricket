import React, { useState, useEffect } from "react";
import { useSocket } from "../contexts/SocketContext";
import { useGame } from "../contexts/GameContext";
import { useParams } from "react-router-dom";
import { usePlayerId } from "../hooks/usePlayerId";
import { apiClient } from "../api/client";
import { GameState } from "../types";
import pregameBackground from "../assets/Pregame Background.png";
import "./views-common.css";

const PreGameJoiningView: React.FC = () => {
	const { socket, isConnected } = useSocket();
	const { roomId } = useParams();
	const { playerId } = usePlayerId();
	const [gameState, setGameState] = useState<GameState | null>(null);

	useEffect(() => {
		if (!roomId) return;

		const poll = async () => {
			try {
				const response = await apiClient.get<GameState>(
					`/games/${roomId}`,
				);
				setGameState(response.data);
			} catch (error) {
				console.error("Failed to fetch game state:", error);
			}
		};

		poll(); // initial poll
		const interval = setInterval(poll, 10000); // every 10 seconds

		return () => clearInterval(interval);
	}, [roomId]);

	const handleJoinAsPlayer = () => {
		if (!socket || !isConnected || !roomId) return;

		console.log("Emitting join_as_player with playerId:", playerId);
		socket.emit("join_as_player", playerId);
	};

	const handleJoinAsAudience = () => {
		if (!socket || !isConnected || !roomId) return;

		console.log("Emitting join_as_audience with playerId:", playerId);
		socket.emit("join_as_audience", playerId);
	};

	const playerCount = gameState?.players?.length ?? 0;
	const audienceCount = gameState?.audience?.length ?? 0;
	const isFull = gameState ? playerCount >= 2 : false;

	// Handle disconnect
	const handleDisconnect = () => {
		window.location.href = "/";
	};

	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				justifyContent: "center",
				height: "100vh",
				textAlign: "center",
				background: `url(${pregameBackground}) no-repeat center center fixed`,
				backgroundSize: "cover",
				position: "relative",
			}}
		>
			{/* Disconnect button */}
			<button
				onClick={handleDisconnect}
				style={{
					position: "absolute",
					top: "20px",
					right: "20px",
					padding: "8px 14px",
					backgroundColor: "#e53935",
					color: "white",
					fontWeight: 600,
					border: "none",
					borderRadius: "6px",
					cursor: "pointer",
				}}
			>
				Disconnect
			</button>
			<h2 className="pregame-h2">Waiting for game to start...</h2>
			<p className="pregame-p" style={{ color: "#ffffffff" }}>
				Room ID: {roomId}
			</p>
			<p className="pregame-small" style={{ color: "#ffffffff" }}>
				{isConnected ? "🟢 Connected" : "🔴 Disconnected"}
			</p>

			<div style={{ marginTop: "30px", display: "flex", gap: "20px" }}>
				<button
					onClick={handleJoinAsPlayer}
					disabled={isFull}
					className="pregame-button"
					style={{
						padding: "15px 30px",
						backgroundColor: isFull ? "#ccc" : "#4CAF50",
						color: "white",
						border: "none",
						borderRadius: "8px",
						cursor: isFull ? "not-allowed" : "pointer",
					}}
				>
					Join as Player{gameState ? ` (${playerCount}/2)` : ""}
				</button>

				<button
					onClick={handleJoinAsAudience}
					className="pregame-button"
					style={{
						padding: "15px 30px",
						backgroundColor: "#2196F3",
						color: "white",
						border: "none",
						borderRadius: "8px",
						cursor: "pointer",
					}}
				>
					Join as Audience{gameState ? ` (${audienceCount})` : ""}
				</button>
			</div>

			<p
				className="pregame-small"
				style={{ marginTop: "40px", color: "#c7c6c6ff" }}
			>
				Share the room link with your friend to start a match!
			</p>
		</div>
	);
};

export default PreGameJoiningView;
