import React from "react";
import { GameState } from "../types";

const slices = [
	{ label: "0", color: "#f94144" },
	{ label: "1", color: "#f3722c" },
	{ label: "2", color: "#f9c74f" },
	{ label: "4", color: "#90be6d" },
	{ label: "6", color: "#43aa8b" },
	{ label: "W", color: "#577590" },
	{ label: "NB", color: "#501111" },
	{ label: "WD", color: "#9b9b9b" },
];

interface LiveScorecardProps {
	gameState: GameState;
	maxBallsToShow?: number;
}

const LiveScorecard: React.FC<LiveScorecardProps> = ({
	gameState,
	maxBallsToShow = 10,
}) => {
	if (!gameState) return null;

	return (
		<div
			style={{
				backgroundColor: "rgba(0,0,0,0.7)",
				color: "#fff",
				borderRadius: "10px",
				padding: "12px 16px",
				minWidth: "280px",
				fontFamily: "sans-serif",
				boxShadow: "0 2px 6px rgba(0,0,0,0.4)",
			}}
		>
			{[1, 2]
				.filter((inn) => gameState.innings >= inn)
				.map((inn) => {
					const allDeliveries = gameState.deliveryHistory.filter(
						(d) => d.innings === inn,
					);
					const hasOverflow = allDeliveries.length > maxBallsToShow;
					const deliveries = hasOverflow
						? allDeliveries.slice(-maxBallsToShow)
						: allDeliveries;

					const runs =
						inn === 1
							? gameState.inningsOneRuns
							: gameState.inningsTwoRuns;

					const wickets =
						inn === 1
							? gameState.inningsOneWicketCurrentCount
							: gameState.inningsTwoWicketCurrentCount;

					// Only show current ball count for the current innings
					const isCurrentInnings = gameState.innings === inn;
					const currentBall = isCurrentInnings
						? gameState.currentBall
						: allDeliveries.length;
					const totalBalls = gameState.totalBalls;

					return (
						<div
							key={inn}
							style={{
								marginBottom:
									gameState.innings === 2 && inn === 1
										? "10px"
										: "0",
								paddingBottom:
									gameState.innings === 2 && inn === 1
										? "10px"
										: "0",
								borderBottom:
									gameState.innings === 2 && inn === 1
										? "1px solid rgba(255,255,255,0.2)"
										: "none",
							}}
						>
							{/* Header line */}
							<div
								style={{
									display: "flex",
									justifyContent: "space-between",
									alignItems: "center",
									marginBottom: "6px",
									fontSize: "0.9rem",
								}}
							>
								<strong>Innings {inn}</strong>
								<span>
									<span style={{ color: "#FFD166", fontWeight: "bold" }}>{runs} runs</span>
									{" • "}
									<span style={{ color: "#F94144", fontWeight: "bold" }}>
									{wickets}/{gameState.totalWickets} wickets
									</span>


									{/* 🏏 Balls Played */}
									{isCurrentInnings && (
										<span
											style={{
												marginLeft: "10px",
												color: "#9ad4d6",
												fontWeight: 600,
												fontSize: "0.8rem",
											}}
										>
											• {currentBall}/{totalBalls} balls
										</span>
									)}
								</span>
							</div>

							{/* Delivery bubbles */}
							<div
								style={{
									display: "flex",
									alignItems: "center",
									gap: "6px",
									justifyContent: "flex-start",
								}}
							>
								{hasOverflow && (
									<span
										style={{
											color: "#aaa",
											fontSize: "1rem",
											marginRight: "2px",
										}}
									>
										...
									</span>
								)}

								{deliveries.length > 0 ? (
									deliveries.map((d, i) => {
										const sliceColor =
											slices.find(
												(s) =>
													s.label === d.batsmanChoice,
											)?.color || "#666";
										return (
											<div
												key={i}
												style={{
													width: "24px",
													height: "24px",
													borderRadius: "50%",
													backgroundColor: sliceColor,
													display: "flex",
													alignItems: "center",
													justifyContent: "center",
													fontWeight: "bold",
													fontSize: "0.8rem",
												}}
												title={`Ball ${i + 1}: ${d.batsmanChoice}`}
											>
												{d.batsmanChoice}
											</div>
										);
									})
								) : (
									<div
										style={{
											fontSize: "0.8rem",
											color: "#ccc",
											fontStyle: "italic",
										}}
									>
										No deliveries yet
									</div>
								)}
							</div>
						</div>
					);
				})}
				{/* Target Score and Runs required if 2nd Innings */}
				{gameState.innings === 2 && (
					<div
						style={{
							marginTop: "8px",
							paddingTop: "8px",
							borderTop: "1px solid rgba(255,255,255,0.2)",
							fontSize: "0.9rem",
						}}
					>
						<strong>Target: </strong>
						<span style={{ color: "#FFD166", fontWeight: "bold" }}>
							{gameState.inningsOneRuns + 1} runs
						</span>
						{" • "}
						<strong>Runs Required: </strong>
						<span style={{ color: "#90be6d", fontWeight: "bold" }}>
							{Math.max(
								0,
								gameState.inningsOneRuns +
									1 -
									gameState.inningsTwoRuns,
							)}{" "}
							runs
						</span>
					</div>
				)}
		</div>
	);
};

export default LiveScorecard;
