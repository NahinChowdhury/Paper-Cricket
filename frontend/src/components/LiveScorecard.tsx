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
	maxBallsToShow?: number; // e.g., 12 to show only recent deliveries
}

const LiveScorecard: React.FC<LiveScorecardProps> = ({
	gameState,
	maxBallsToShow = 12,
}) => {
	if (!gameState) return null;

	const {
		innings,
		deliveryHistory,
		inningsOneRuns,
		inningsTwoRuns,
		inningsOneWicketCurrentCount,
		inningsTwoWicketCurrentCount,
		totalWickets,
	} = gameState;

	// Determine which innings we’re in
	const currentRuns = innings === 1 ? inningsOneRuns : inningsTwoRuns;
	const wickets =
		innings === 1
			? inningsOneWicketCurrentCount
			: inningsTwoWicketCurrentCount;

	// Show only deliveries from current innings
	const currentDeliveries = deliveryHistory
		.filter((d) => d.innings === innings)
		.slice(-maxBallsToShow);

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
					const hasOverflow = allDeliveries.length > 10;
					const deliveries = hasOverflow
						? allDeliveries.slice(-10)
						: allDeliveries;

					const runs =
						inn === 1
							? gameState.inningsOneRuns
							: gameState.inningsTwoRuns;

					const wickets =
						inn === 1
							? gameState.inningsOneWicketCurrentCount
							: gameState.inningsTwoWicketCurrentCount;

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
									<span
										style={{
											color: "#FFD166",
											fontWeight: "bold",
										}}
									>
										{runs}
									</span>{" "}
									/{" "}
									<span
										style={{
											color: "#F94144",
											fontWeight: "bold",
										}}
									>
										{wickets}
									</span>{" "}
									<small style={{ color: "#aaa" }}>
										({gameState.totalWickets})
									</small>
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
								{/* Ellipsis if there are older balls */}
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
		</div>
	);
};

export default LiveScorecard;
