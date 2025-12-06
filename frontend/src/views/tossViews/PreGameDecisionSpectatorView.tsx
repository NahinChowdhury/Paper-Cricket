import React, { useMemo } from "react";
import { useSocket } from "../../contexts/SocketContext";
import { useGame } from "../../contexts/GameContext";
import "../../views/views-common.css";
import pregameBackground from "../../assets/Pregame Background.png";

const PreGameDecisionSpectatorView: React.FC = () => {
	const { socket } = useSocket();
	const { gameState, user } = useGame();

	if (!gameState || !user) return null;

	const { gamePhase, tossSelector } = gameState;

	// 🔹 Handle surrender click
	const handleSurrender = () => {
		if (!socket || !gameState || !user) return;

		const confirm = window.confirm("Are you sure you want to surrender?");
		if (!confirm) return;

		console.log("Player surrendered:", user.id);
		socket.emit("surrender", user.id);
	};

	// 🔹 Handle disconnect click (for audience)
	const handleDisconnect = () => {
		if (!socket || !user) return;
		const confirm = window.confirm(
			"Are you sure you want to leave the room?",
		);
		if (!confirm) return;
		socket.emit("leave_room", user.id);
		window.location.href = "/";
	};

	// 🔹 Determine what to display based on phase
	const content = useMemo(() => {
		if (gamePhase === "side selection") {
			return {
				title: "🏏 Side Selection",
				message:
					tossSelector === user.id
						? "You're choosing to bat or field..."
						: "Waiting for toss winner to choose batting or fielding...",
			};
		}
		// Default = Toss
		return {
			title: "🪙 Toss Spectator",
			message:
				tossSelector === user.id
					? "You're choosing heads or tails..."
					: "Waiting for toss selector to choose heads or tails...",
		};
	}, [gamePhase, tossSelector, user.id]);

	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				justifyContent: "center",
				height: "100vh",
				textAlign: "center",
				backgroundColor: "#fafafa",
				fontFamily: "sans-serif",
				position: "relative",
				background: `url(${pregameBackground}) no-repeat center center fixed`,
				backgroundSize: "cover",
				color: "#d1cfcfff",
			}}
		>
			{/* 🔹 Conditional surrender button (only for players) */}
			{user.isPlaying && (
				<button
					onClick={handleSurrender}
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
					Surrender
				</button>
			)}

			{/* 🔹 Disconnect button (only for audience) */}
			{!user.isPlaying && (
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
				{content.title}
			</h2>
			<p className="pregame-p" style={{ marginBottom: "20px" }}>
				{content.message}
			</p>

			<div
				style={{
					width: "40px",
					height: "40px",
					border: "5px solid #ccc",
					borderTop: "5px solid #2196F3",
					borderRadius: "50%",
					animation: "spin 1s linear infinite",
				}}
			></div>

			<style>
				{`
					@keyframes spin {
						0% { transform: rotate(0deg); }
						100% { transform: rotate(360deg); }
					}
				`}
			</style>
		</div>
	);
};

export default PreGameDecisionSpectatorView;
