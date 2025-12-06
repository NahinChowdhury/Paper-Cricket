import React from "react";
import { useSocket } from "../contexts/SocketContext";
import { useGame } from "../contexts/GameContext";
import { usePlayerId } from "../hooks/usePlayerId";
import "../views/views-common.css";
import pregameBackground from "../assets/PreGame Background.png";

const GameWaitingView: React.FC = () => {
	const { socket, isConnected } = useSocket();
	const { user, gameState } = useGame();
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

	// Handle disconnect
	const handleDisconnect = () => {
		if (!socket || !user) return;
		const confirm = window.confirm(
			"Are you sure you want to leave the room?",
		);
		if (!confirm) return;
		socket.emit("leave_room", user.id);
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
				backgroundColor: "#f9f9f9",
				fontFamily: "sans-serif",
				position: "relative",
				background: `url(${pregameBackground}) no-repeat center center fixed`,
				backgroundSize: "cover",
				color: "#d1cfcfff",
			}}
		>
			{/* Disconnect button */}
			{user && (
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
			)}
			<h2 className="pregame-h2" style={{ marginBottom: "10px" }}>
				⏳ Waiting Room
			</h2>
			<p className="pregame-p" style={{ marginBottom: "20px" }}>
				Waiting for all players to join...
			</p>

			{isConnected ? (
				<button
					onClick={handleJoin}
					className="pregame-button"
					style={{
						padding: "15px 30px",
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
				<p className="pregame-small">🔴 Not connected to server...</p>
			)}

			{gameState && (
				<p
					className="pregame-p"
					style={{ marginTop: "20px", color: "#555" }}
				>
					Players: {gameState.players?.length ?? 0}/2, Audience:{" "}
					{gameState.audience?.length ?? 0}
				</p>
			)}

			<p
				className="pregame-small"
				style={{ marginTop: "30px", color: "#ffffffff" }}
			>
				Share your room link with a friend to start the match.
			</p>
		</div>
	);
};

export default GameWaitingView;
