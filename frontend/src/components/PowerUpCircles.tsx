import React, { useState } from "react";

interface PowerUpCirclesProps {
	powerUpNames: string[];
	powerUps: Map<string, "used" | "active" | "unused">;
	onClick: (powerUpKey: string) => void;
	disabled?: boolean;
}

const PowerUpCircles: React.FC<PowerUpCirclesProps> = ({
	powerUpNames,
	powerUps,
	onClick,
	disabled = false,
}) => {
	const getCircleStyle = (
		status: "used" | "active" | "unused",
	): React.CSSProperties => {
		const baseStyle: React.CSSProperties = {
			width: "50px",
			height: "50px",
			borderRadius: "50%",
			margin: "5px 0",
			cursor: status === "used" || disabled ? "default" : "pointer",
			transition: "all 0.2s ease-in-out",
			display: "flex",
			alignItems: "center",
			justifyContent: "center",
			fontSize: "12px",
			fontWeight: "bold",
			color: "white",
			userSelect: "none",
		};

		switch (status) {
			case "used":
				return {
					...baseStyle,
					backgroundColor: "#666",
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
					backgroundColor: "#2196F3",
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
				flexDirection: "column",
				alignItems: "center",
				padding: "10px",
				backgroundColor: "rgba(255, 255, 255, 0.9)",
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
							if (!disabled) setHoveredPowerUp(powerUpName);
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
							{powerUpName.replace("powerUp", "")}
						</div>

						{isHovered && (
							<div
								style={{
									position: "absolute",
									left: "60px",
									top: "50%",
									transform: "translateY(-50%)",
									background: "rgba(0,0,0,0.85)",
									color: "#fff",
									padding: "6px 8px",
									borderRadius: "4px",
									whiteSpace: "nowrap",
									fontSize: "12px",
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
