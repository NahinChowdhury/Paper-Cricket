import React, { useEffect } from "react";

interface PowerUpCirclesProps {
	powerUpNames: string[];
	powerUps: Map<string, "used" | "active" | "unused">;
	onClick: (powerUpKey: string) => void;
}

const PowerUpCircles: React.FC<PowerUpCirclesProps> = ({
	powerUpNames,
	powerUps,
	onClick,
}) => {
	const getCircleStyle = (
		status: "used" | "active" | "unused",
	): React.CSSProperties => {
		const baseStyle: React.CSSProperties = {
			width: "50px",
			height: "50px",
			borderRadius: "50%",
			margin: "5px 0",
			cursor: status === "used" ? "default" : "pointer",
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
				return (
					<div
						key={powerUpName}
						style={getCircleStyle(status)}
						onClick={() => {
							if (status !== "used") {
								console.log(`Clicked power-up: ${powerUpName}`);
								onClick(powerUpName);
							}
						}}
						onMouseEnter={(e) => {
							if (status !== "used") {
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
				);
			})}
		</div>
	);
};

export default PowerUpCircles;
