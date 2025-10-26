import React from "react";
import { useSocket } from "../contexts/SocketContext";
import { useGame } from "../contexts/GameContext";
import { useParams } from "react-router-dom";
import { usePlayerId } from "../hooks/usePlayerId";

const PreGameJoiningView: React.FC = () => {
	const { socket, isConnected } = useSocket();
	const { roomId } = useParams();
	const { playerId } = usePlayerId();

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

	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				justifyContent: "center",
				height: "100vh",
				textAlign: "center",
			}}
		>
			<h2>Waiting for game to start...</h2>
			<p>Room ID: {roomId}</p>
			<p>{isConnected ? "🟢 Connected" : "🔴 Disconnected"}</p>

			<div style={{ marginTop: "30px", display: "flex", gap: "20px" }}>
				<button
					onClick={handleJoinAsPlayer}
					style={{
						padding: "15px 30px",
						fontSize: "18px",
						backgroundColor: "#4CAF50",
						color: "white",
						border: "none",
						borderRadius: "8px",
						cursor: "pointer",
					}}
				>
					Join as Player
				</button>

				<button
					onClick={handleJoinAsAudience}
					style={{
						padding: "15px 30px",
						fontSize: "18px",
						backgroundColor: "#2196F3",
						color: "white",
						border: "none",
						borderRadius: "8px",
						cursor: "pointer",
					}}
				>
					Join as Audience
				</button>
			</div>

			<p style={{ marginTop: "40px", color: "#777" }}>
				Share the room link with your friend to start a match!
			</p>
		</div>
	);
};

export default PreGameJoiningView;
