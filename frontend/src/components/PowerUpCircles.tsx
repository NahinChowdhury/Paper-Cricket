import React, { useState } from "react";
import fieldShiftImg from "../assets/Field Shift.png";
import frozenHandsImg from "../assets/Frozen Hands.png";
import invulnerabilityImg from "../assets/Invulnerability.png";
import mirrorFieldImg from "../assets/Mirror Field.png";
import scoutReportImg from "../assets/Scout Report.png";
import thirdManImg from "../assets/Third Man.png";

interface PowerUpCirclesProps {
	powerUpNames: string[];
	powerUps: Map<string, "used" | "active" | "unused">;
	onClick: (powerUpKey: string) => void;
	disabled?: boolean;
	horizontal?: boolean;
	position?: "left" | "right";
}

const PowerUpCircles: React.FC<PowerUpCirclesProps> = ({
	powerUpNames,
	powerUps,
	onClick,
	disabled = false,
	horizontal = false,
	position = "left",
}) => {
	const getCircleStyle = (
		status: "used" | "active" | "unused",
	): React.CSSProperties => {
		// Use responsive sizing so circles scale down on small screens.
		const baseStyle: React.CSSProperties = {
			width: "clamp(32px, 5.5vmin, 50px)",
			height: "clamp(32px, 5.5vmin, 50px)",
			borderRadius: "50%",
			margin: horizontal
				? "0 clamp(4px,1vmin,8px)"
				: "clamp(4px,0.8vmin,6px) 0",
			cursor: status === "used" || disabled ? "default" : "pointer",
			transition: "all 0.18s ease-in-out",
			display: "flex",
			alignItems: "center",
			justifyContent: "center",
			userSelect: "none",
			boxSizing: "border-box",
			flexShrink: 0,
			overflow: "hidden",
		};

		switch (status) {
			case "used":
				return {
					...baseStyle,
					backgroundColor: "rgb(124, 124, 124)",
					boxShadow: "inset 0 2px 4px rgba(0, 0, 0, 0.3)",
					transform: "translateY(1px)",
				};
			case "active":
				return {
					...baseStyle,
					backgroundColor: "#4CAF50",
					boxShadow:
						"0 0 15px rgba(76, 175, 80, 0.6), 0 0 30px rgba(76, 175, 80, 0.4)",
					animation: "glow 1.5s ease-in-out infinite alternate",
				};
			case "unused":
			default:
				return {
					...baseStyle,
					backgroundColor: "rgb(255, 255, 255)",
					boxShadow: "0 2px 4px rgba(0, 0, 0, 0.2)",
				};
		}
	};

	const getHoverStyle = (
		status: "used" | "active" | "unused",
	): React.CSSProperties => {
		if (status === "used") return {};

		return {
			transform: "scale(1.05)",
			boxShadow:
				status === "active"
					? "0 0 20px rgba(76, 175, 80, 0.8), 0 0 40px rgba(76, 175, 80, 0.6)"
					: "0 4px 8px rgba(0, 0, 0, 0.3)",
		};
	};

	const [hoveredPowerUp, setHoveredPowerUp] = useState<string | null>(null);

	const imageMap: Record<string, string> = {
		"Field Shift": fieldShiftImg,
		"Frozen Hands": frozenHandsImg,
		Invulnerability: invulnerabilityImg,
		"Mirror Field": mirrorFieldImg,
		"Scout Report": scoutReportImg,
		"Third Man": thirdManImg,
	};

	const descriptions: Record<string, string> = {
		// Fielder power-ups
		"Third Man":
			"Player can add an extra wicket on the board. Player can move this Wicket to anywhere they like.",
		"Field Shift":
			"Player can shuffle the field for a turn. Player can manually modify the pie order as they please. It will reset to the default field view next round",
		"Mirror Field":
			"Player can reverse the order of the pies for the turn.",

		// Batsman power-ups
		"Scout Report":
			"Player can click on a pie and see what's under it before submitting the shot.",
		Invulnerability:
			"If the batter hits wicket, ignore the wicket for that ball",
		"Frozen Hands":
			"Temporarily locks the fielder's rotation for the next ball. Fielder must send the same rotation but they can change the preset",
	};

	return (
		<div
			style={{
				display: "flex",
				flexDirection: horizontal ? "row" : "column",
				alignItems: "center",
				padding: "10px",
				backgroundColor: "rgba(255, 255, 255, 0.5)",
				borderRadius: "8px",
				boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
				opacity: disabled ? 0.6 : 1,
				filter: disabled ? "grayscale(100%)" : undefined,
			}}
		>
			<style>
				{`
					@keyframes glow {
						from {
							box-shadow: 0 0 15px rgba(76, 175, 80, 0.6), 0 0 30px rgba(76, 175, 80, 0.4);
						}
						to {
							box-shadow: 0 0 25px rgba(76, 175, 80, 0.8), 0 0 50px rgba(76, 175, 80, 0.6);
						}
					}
				`}
			</style>
			{powerUpNames.map((powerUpName) => {
				const status = powerUps.get(powerUpName) || "unused";
				const isHovered = hoveredPowerUp === powerUpName;

				return (
					<div
						key={powerUpName}
						style={{
							position: "relative",
							display: "flex",
							alignItems: "center",
						}}
						onMouseEnter={() => {
							setHoveredPowerUp(powerUpName);
						}}
						onMouseLeave={() => {
							if (hoveredPowerUp === powerUpName)
								setHoveredPowerUp(null);
						}}
					>
						<div
							style={getCircleStyle(status)}
							onClick={() => {
								if (status !== "used" && !disabled) {
									console.log(
										`Clicked power-up: ${powerUpName}`,
									);
									onClick(powerUpName);
								}
							}}
							onMouseEnter={(e) => {
								if (status !== "used" && !disabled) {
									Object.assign(
										e.currentTarget.style,
										getHoverStyle(status),
									);
								}
							}}
							onMouseLeave={(e) => {
								Object.assign(
									e.currentTarget.style,
									getCircleStyle(status),
								);
							}}
						>
							<img
								src={imageMap[powerUpName]}
								alt={powerUpName}
								style={{
									width: "100%",
									height: "100%",
									borderRadius: "50%",
									objectFit: "cover",
								}}
							/>
						</div>

						{isHovered && (
							<div
								style={{
									position: "absolute",
									...(horizontal
										? {
												/* show above circle when horizontal */
												bottom: "clamp(40px,6vmin,80px)",
												left: "50%",
												transform: "translateX(-50%)",
											}
										: position === "right"
											? {
													/* for right-side container, show tooltip to the left */
													right: "clamp(46px,6vmin,80px)",
													top: "50%",
													transform:
														"translateY(-50%)",
												}
											: {
													/* default: show tooltip to the right */
													left: "clamp(46px,6vmin,80px)",
													top: "50%",
													transform:
														"translateY(-50%)",
												}),
									background: "rgba(0,0,0,0.85)",
									color: "#fff",
									padding: "6px 8px",
									borderRadius: "4px",
									whiteSpace: "nowrap",
									fontSize: "clamp(11px,1.6vmin,14px)",
									maxWidth: "min(36vmin, 360px)",
									overflow: "hidden",
									textOverflow: "ellipsis",
									boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
									zIndex: 100,
								}}
							>
								{descriptions[powerUpName] ||
									"Power-up description not found."}
							</div>
						)}
					</div>
				);
			})}
		</div>
	);
};

export default PowerUpCircles;
