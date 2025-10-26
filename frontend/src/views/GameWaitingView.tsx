import React from "react";
import { useSocket } from "../contexts/SocketContext";
import { useGame } from "../contexts/GameContext";
import { usePlayerId } from "../hooks/usePlayerId";

const GameWaitingView: React.FC = () => {
	const { socket, isConnected } = useSocket();
	const { user, setUser } = useGame();
	const { playerId } = usePlayerId();

	// Handle button click
	const handleJoin = () => {
		if (!socket || !user) return;

		if (user.isPlaying) {
			console.log("Joining as Audience");
			socket.emit("join_as_audience", playerId);
		} else {
			console.log("Joining as Player");
			socket.emit("join_as_player", playerId);
		}
	};

	// Determine label based on user role
	const buttonLabel = user?.isPlaying ? "Join as Audience" : "Join as Player";

	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				justifyContent: "center",
				height: "100vh",
				textAlign: "center",
				backgroundColor: "#f9f9f9",
				color: "#333",
				fontFamily: "sans-serif",
			}}
		>
			<h2 style={{ fontSize: "2rem", marginBottom: "10px" }}>
				⏳ Waiting Room
			</h2>
			<p style={{ fontSize: "1.2rem", marginBottom: "20px" }}>
				Waiting for all players to join...
			</p>

			{isConnected ? (
				<button
					onClick={handleJoin}
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
					{buttonLabel}
				</button>
			) : (
				<p>🔴 Not connected to server...</p>
			)}

			<p style={{ marginTop: "30px", fontSize: "0.9rem", color: "#777" }}>
				Share your room link with a friend to start the match.
			</p>
		</div>
	);
};

export default GameWaitingView;
