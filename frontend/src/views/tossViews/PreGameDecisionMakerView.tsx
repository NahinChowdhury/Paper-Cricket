import React, { useMemo } from "react";
import { useSocket } from "../../contexts/SocketContext";
import { useGame } from "../../contexts/GameContext";
import pregameBackground from "../../assets/PreGame Background.png";
import "../../views/views-common.css";

const PreGameDecisionMakerView: React.FC = () => {
	const { socket } = useSocket();
	const { gameState, user } = useGame();

	if (!gameState || !user) return null;

	const { gamePhase } = gameState;

	// 🔹 Common click handler for toss / side selection
	const handleChoice = (choice: string) => {
		if (!socket || !user) return;

		if (gamePhase === "toss") {
			console.log("🪙 Toss choice made:", choice);
			socket.emit(
				"toss_selection_made",
				user,
				choice as "heads" | "tails",
			);
		} else if (gamePhase === "side selection") {
			console.log("🏏 Side selection made:", choice);
			socket.emit(
				"side_selection_made",
				user,
				choice as "batting" | "fielding",
			);
		}
	};

	// 🔹 Handle surrender click
	const handleSurrender = () => {
		if (!socket || !gameState || !user) return;

		const confirm = window.confirm("Are you sure you want to surrender?");
		if (!confirm) return;

		console.log("Player surrendered:", user.id);
		socket.emit("surrender", user.id); // server expects (playerId)
	};

	// 🔹 Dynamic UI setup
	const config = useMemo(() => {
		if (gamePhase === "side selection") {
			return {
				title: "🏏 Side Selection",
				subtitle: "You won the toss! Choose to bat or field first.",
				options: [
					{ label: "Bat", value: "batting", color: "#f57c00" },
					{ label: "Field", value: "fielding", color: "#388e3c" },
				],
			};
		}
		// Default = toss
		return {
			title: "🪙 Toss Selection",
			subtitle: "Choose heads or tails for the toss.",
			options: [
				{ label: "Heads", value: "heads", color: "#fbc02d" },
				{ label: "Tails", value: "tails", color: "#0288d1" },
			],
		};
	}, [gamePhase]);

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
				fontFamily: "sans-serif",
				position: "relative",
				color: "#d1cfcfff",
			}}
		>
			{/* 🔹 Surrender Button (top-right corner) */}
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

			<h2 className="pregame-h2" style={{ marginBottom: "10px" }}>
				{config.title}
			</h2>
			<p className="pregame-p" style={{ marginBottom: "20px" }}>
				{config.subtitle}
			</p>

			<div style={{ display: "flex", gap: "20px" }}>
				{config.options.map((opt) => (
					<button
						key={opt.value}
						onClick={() => handleChoice(opt.value)}
						className="pregame-button"
						style={{
							padding: "15px 30px",
							backgroundColor: opt.color,
							color: opt.label === "Tails" ? "white" : "black",
							border: "none",
							borderRadius: "8px",
							cursor: "pointer",
							fontWeight: 600,
						}}
					>
						{opt.label}
					</button>
				))}
			</div>
		</div>
	);
};

export default PreGameDecisionMakerView;
