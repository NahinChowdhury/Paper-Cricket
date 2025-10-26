import React, { useRef, useEffect, useState, useCallback } from "react";
import { useSocket } from "../contexts/SocketContext";
import { useGame } from "../contexts/GameContext";

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

const SPINNER_RADIUS = 150;
const OVERLAY_COLOR = "rgba(0, 0, 0, 1)";

const BatterView: React.FC = () => {
	const { socket } = useSocket();
	const { gameState, user } = useGame();

	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const [shotSelected, setShotSelected] = useState<string | null>(null);

	if (!gameState || !user) return null;

	const rotation = gameState.currentBallRotation || 0; // 🔹 derive from gameState, not local state

	// 🎯 Handle surrender
	const handleSurrender = () => {
		if (!socket || !user) return;
		const confirm = window.confirm("Are you sure you want to surrender?");
		if (!confirm) return;
		socket.emit("surrender", user.id, user.roomId);
	};

	// 🎯 Handle shot selection
	const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const rect = canvas.getBoundingClientRect();
		const cx = rect.left + rect.width / 2;
		const cy = rect.top + rect.height / 2;
		const dx = e.clientX - cx;
		const dy = e.clientY - cy;
		const distance = Math.sqrt(dx * dx + dy * dy);

		if (distance > SPINNER_RADIUS) return; // outside wheel

		const fullCircle = 2 * Math.PI;
		const angle = Math.atan2(dy, dx) - rotation;
		const normalized = ((angle % fullCircle) + fullCircle) % fullCircle;
		const sliceAngle = fullCircle / slices.length;
		const index = Math.floor(normalized / sliceAngle) % slices.length;
		// Update selected shot
		if (
			gameState.playerBatting === user.id &&
			gameState.gamePhase === "batting"
		) {
			setShotSelected(slices[index].label);
			// Notify server of hover
			if (socket && user?.roomId) {
				socket.emit(
					"shot_selection_hover",
					user.id,
					slices[index].label,
				);
			}
		}
	};

	// 🎯 Handle shot submission
	const handleSubmitShot = () => {
		if (!socket || !user || !shotSelected) {
			alert("Please select a shot first!");
			return;
		}
		socket.emit("shot_played", user.id, user.roomId, shotSelected);
		setShotSelected(null);
	};

	// 🧠 Draw pie segments (read-only)
	const drawPie = useCallback(
		(ctx: CanvasRenderingContext2D) => {
			const sliceAngle = (2 * Math.PI) / slices.length;
			const cx = ctx.canvas.width / 2;
			const cy = ctx.canvas.height / 2;

			slices.forEach((slice, i) => {
				const start = i * sliceAngle + rotation;
				const end = start + sliceAngle;

				const radius =
					shotSelected === slice.label
						? SPINNER_RADIUS + 10
						: SPINNER_RADIUS;

				ctx.beginPath();
				ctx.moveTo(cx, cy);
				ctx.arc(cx, cy, radius, start, end);
				ctx.closePath();
				ctx.fillStyle = slice.color;
				ctx.fill();

				ctx.save();
				ctx.translate(cx, cy);
				ctx.rotate(start + sliceAngle / 2);
				ctx.textAlign = "right";
				ctx.fillStyle = "white";
				ctx.font = "16px sans-serif";
				ctx.fillText(slice.label, radius - 10, 5);
				ctx.restore();
			});
		},
		[rotation, shotSelected],
	);

	// Redraw whenever rotation or selection changes
	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		console.log("Redrawing pie with rotation:", rotation, "and shotSelected:", shotSelected);
		drawPie(ctx);
	}, [rotation, shotSelected, drawPie]);

	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				justifyContent: "center",
				height: "100vh",
				textAlign: "center",
				position: "relative",
				backgroundColor: "#fafafa",
				fontFamily: "sans-serif",
			}}
		>
			{/* 🔹 Surrender Button */}
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

			<h2 style={{ marginBottom: "10px" }}>🏏 Batter View</h2>
			<p style={{ fontSize: "1.2rem", marginBottom: "20px" }}>
				The field is set. Pick your shot carefully!
			</p>

			{/* 🔹 Pie + Mask */}
			<div style={{ position: "relative", display: "inline-block" }}>
				<canvas
					ref={canvasRef}
					width={400}
					height={400}
					style={{
						border: "2px solid #ddd",
						borderRadius: "50%",
						cursor: (gameState.playerBatting === user.id && gameState.gamePhase === "batting") ? "pointer" : "not-allowed",
					}}
					onClick={handleClick}
				/>

				{/* 🔹 Black overlay mask */}
				<div
					style={{
						position: "absolute",
						top: 50,
						left: 50,
						width: SPINNER_RADIUS * 2 + 2,
						height: SPINNER_RADIUS * 2 + 2,
						backgroundColor: OVERLAY_COLOR,
						borderRadius: "50%",
						pointerEvents: "none",
						overflow: "hidden",
						transform: `rotate(${rotation}rad)`,
					}}
				>
					<svg
						width={SPINNER_RADIUS * 2 + 2}
						height={SPINNER_RADIUS * 2 + 2}
						style={{
							position: "absolute",
							top: 0,
							left: 0,
							pointerEvents: "none",
						}}
					>
						{Array.from({ length: slices.length }).map((_, i) => {
							const angle =
								(i * 2 * Math.PI) / slices.length - Math.PI / 2;
							const x =
								SPINNER_RADIUS +
								SPINNER_RADIUS * Math.cos(angle);
							const y =
								SPINNER_RADIUS +
								SPINNER_RADIUS * Math.sin(angle);
							return (
								<line
									key={i}
									x1={SPINNER_RADIUS}
									y1={SPINNER_RADIUS}
									x2={x}
									y2={y}
									stroke="white"
									strokeWidth="2"
								/>
							);
						})}
					</svg>
				</div>
			</div>

			{/* 🔹 Submit Shot Button */}
			<div style={{ marginTop: "30px" }}>
				<button
					onClick={handleSubmitShot}
					disabled={!shotSelected}
					style={{
						padding: "12px 24px",
						fontSize: "16px",
						backgroundColor: shotSelected ? "#4CAF50" : "#ccc",
						color: "white",
						border: "none",
						borderRadius: "5px",
						cursor: shotSelected ? "pointer" : "not-allowed",
					}}
				>
					Submit Shot
				</button>
			</div>
		</div>
	);
};

export default BatterView;
