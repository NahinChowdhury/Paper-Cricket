import React from "react";
import { useGame } from "../../contexts/GameContext";
import { usePlayerId } from "../../hooks/usePlayerId";
import { useNavigate } from "react-router-dom";

const GameEndView: React.FC = () => {
	const { gameState, user } = useGame();
	const { playerId } = usePlayerId(); // ✅ localStorage-based ID
	const navigate = useNavigate();
	if (!gameState) return null;

	const {
		surrenderedBy,
		gamePhase,
		inningsOneRuns,
		inningsTwoRuns,
		playerBatting,
		playerFielding,
	} = gameState;

	const surrendered = gamePhase === "surrendered";

	// ✅ Figure out who this viewer is
	const currentUserId = user?.id ?? playerId;

	const isBatter = currentUserId === playerBatting;
	const isFielder = currentUserId === playerFielding;
	const isSpectator = !isBatter && !isFielder;

	// =========================
	//  DETERMINE OUTCOME
	// =========================
	let resultText = "";
	let detailText = "";

	if (surrenderedBy) {
		// Someone surrendered
		if (currentUserId === surrenderedBy) {
			resultText = "🏳️ You surrendered";
			detailText = "Better luck next time!";
		} else if (isSpectator) {
			resultText = `🏳️ Player ${surrenderedBy} surrendered`;
			detailText = "Game ended early.";
		} else {
			resultText = "🏆 You win!";
			detailText = "Opponent surrendered.";
		}
	} else if (inningsTwoRuns > inningsOneRuns) {
		// Batting side won by chasing
		if (isBatter) {
			resultText = "🏆 You won!";
			detailText = "You chased the target successfully!";
		} else if (isFielder) {
			resultText = "💔 You lost";
			detailText = "Opponent chased the target successfully.";
		} else {
			resultText = `🏏 Player ${playerBatting} won`;
			detailText = "Chased the target successfully.";
		}
	} else if (inningsTwoRuns < inningsOneRuns) {
		// Fielding side defended successfully
		if (isFielder) {
			resultText = "🏆 You won!";
			detailText = "You defended the target successfully!";
		} else if (isBatter) {
			resultText = "💔 You lost";
			detailText = "You couldn’t chase the target.";
		} else {
			resultText = `🧤 Player ${playerFielding} won`;
			detailText = "Defended the target successfully.";
		}
	} else {
		// Tie game
		resultText = "🤝 It’s a tie!";
		detailText = "Both teams scored equally.";
	}

	// =========================
	//  RENDER UI
	// =========================
	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				justifyContent: "center",
				backgroundColor: "#111",
				color: "#fff",
				fontFamily: "sans-serif",
				textAlign: "center",
				minHeight: "100vh",
			}}
		>
			<h1 style={{ fontSize: "2rem", marginBottom: "10px" }}>
				{surrendered ? "🏳️ Game Surrendered" : "🏁 Game Finished"}
			</h1>

			<h2
				style={{
					fontSize: "1.6rem",
					marginBottom: "10px",
					color: "#FFD166",
				}}
			>
				{resultText}
			</h2>
			<p style={{ fontSize: "1.2rem", marginBottom: "25px" }}>
				{detailText}
			</p>

			<div
				style={{
					backgroundColor: "#222",
					padding: "20px 40px",
					borderRadius: "8px",
					fontSize: "1rem",
					lineHeight: "1.6",
				}}
			>
				<p>Innings 1: {inningsOneRuns} runs</p>
				<p>Innings 2: {inningsTwoRuns} runs</p>
			</div>

			<button
				style={{
					marginTop: "30px",
					padding: "10px 24px",
					backgroundColor: "#4CAF50",
					color: "#fff",
					border: "none",
					borderRadius: "8px",
					cursor: "pointer",
					fontSize: "1rem",
				}}
				onClick={() => navigate("/")}
			>
				Return to Main Menu
			</button>
		</div>
	);
};

export default GameEndView;
