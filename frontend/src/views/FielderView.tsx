import React, { useRef, useEffect, useState, useCallback } from "react";
import { useSocket } from "../contexts/SocketContext";
import { useGame } from "../contexts/GameContext";
import LiveScorecard from "../components/LiveScorecard";

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

const FielderView: React.FC = () => {
	const { socket } = useSocket();
	const { gameState, recapState, user } = useGame();

	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const [rotation, setRotation] = useState(0);
	const [isDragging, setIsDragging] = useState(false);
	const [startAngle, setStartAngle] = useState(0);

	// ✅ Choose which state to display
	const displayState =
		recapState.isRecapping && recapState.frozenState
			? recapState.frozenState
			: gameState;

	if (!displayState || !user) return null;

	const canRotate =
		displayState.gamePhase === "setting field" && !recapState.isRecapping;
	const shotSelected: string | null =
		displayState.currentBallBatsmanChoice !== undefined
			? displayState.currentBallBatsmanChoice
			: null;

	// 🔹 Handle surrender
	const handleSurrender = () => {
		if (!socket || !user) return;
		if (!window.confirm("Are you sure you want to surrender?")) return;
		socket.emit("surrender", user.id);
	};

	// 🔹 Draw pie
	const drawPie = useCallback(
		(ctx: CanvasRenderingContext2D, rotationAngle: number) => {
			const sliceAngle = (2 * Math.PI) / slices.length;
			const cx = ctx.canvas.width / 2;
			const cy = ctx.canvas.height / 2;

			slices.forEach((slice, i) => {
				const start = i * sliceAngle + rotationAngle;
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
				ctx.fillText(slice.label, SPINNER_RADIUS - 10, 5);
				ctx.restore();
			});
		},
		[shotSelected],
	);

	const normalizeRotation = (r: number) =>
		((r % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);

	// 🔹 Redraw whenever rotation changes
	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		drawPie(ctx, rotation);

		if (!canRotate) {
			ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
			ctx.beginPath();
			ctx.arc(
				canvas.width / 2,
				canvas.height / 2,
				SPINNER_RADIUS,
				0,
				2 * Math.PI,
			);
			ctx.fill();
		}
	}, [rotation, drawPie, canRotate]);

	useEffect(() => {
		// Reset rotation when entering "setting field"
		if (displayState.gamePhase === "setting field") {
			setRotation(0);
		}
	}, [displayState.gamePhase]);

	// 🔹 Drag logic
	const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
		if (!canRotate) return;
		const rect = canvasRef.current!.getBoundingClientRect();
		const cx = rect.left + rect.width / 2;
		const cy = rect.top + rect.height / 2;
		const dx = e.clientX - cx;
		const dy = e.clientY - cy;
		setIsDragging(true);
		setStartAngle(Math.atan2(dy, dx) - rotation);
	};

	const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
		if (!isDragging || !canRotate) return;
		const rect = canvasRef.current!.getBoundingClientRect();
		const cx = rect.left + rect.width / 2;
		const cy = rect.top + rect.height / 2;
		const dx = e.clientX - cx;
		const dy = e.clientY - cy;
		const newRot = normalizeRotation(Math.atan2(dy, dx) - startAngle);
		setRotation(newRot);

		// Emit live rotation to server
		if (socket && user?.roomId) {
			socket.emit("rotate_pie", {
				roomId: user.roomId,
				playerId: user.id,
				rotation: newRot,
			});
		}
	};

	const handleMouseUp = () => setIsDragging(false);

	// 🔹 Submit rotation
	const handleSubmitRotation = () => {
		if (!socket || !user || !canRotate) return;
		console.log("Submitting final rotation:", rotation);
		socket.emit("field_set", user.id, user.roomId, rotation, 1);
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
				position: "relative",
				backgroundColor: "#fafafa",
				fontFamily: "sans-serif",
			}}
		>
			{/* 🏏 Live Scorecard (top-left) */}
			<div
				style={{
					position: "absolute",
					top: "20px",
					left: "20px",
					zIndex: 5,
				}}
			>
				{/* Scorecard should be updated immediately even if recap is playing*/}
				<LiveScorecard
					gameState={gameState ? gameState : displayState}
				/>
			</div>

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

			<h2 style={{ marginBottom: "10px" }}>🧤 Fielder View</h2>
			<p style={{ fontSize: "1.2rem", marginBottom: "20px" }}>
				{recapState.isRecapping
					? "Recap in progress..."
					: canRotate
						? "Drag to rotate and set your field."
						: "Waiting for the batter..."}
			</p>

			{/* 🔹 Canvas */}
			<div style={{ position: "relative", display: "inline-block" }}>
				<canvas
					ref={canvasRef}
					width={400}
					height={400}
					style={{
						border: "2px solid #ddd",
						borderRadius: "50%",
						cursor: canRotate
							? isDragging
								? "grabbing"
								: "grab"
							: "not-allowed",
						opacity: canRotate ? 1 : 0.5,
						transition: "opacity 0.3s ease",
					}}
					onMouseDown={handleMouseDown}
					onMouseMove={handleMouseMove}
					onMouseUp={handleMouseUp}
					onMouseLeave={handleMouseUp}
				/>

				{/* 🔹 Recap banner only */}
				{recapState.isRecapping && (
					<div
						style={{
							position: "absolute",
							top: "50%",
							left: "50%",
							transform: "translate(-50%, -50%)",
							color: "white",
							fontSize: "1.6rem",
							fontWeight: "bold",
							textShadow: "0 0 8px rgba(0,0,0,0.7)",
							backgroundColor: "rgba(0,0,0,0.6)",
							padding: "12px 24px",
							borderRadius: "8px",
						}}
					>
						Batter chose{" "}
						<span style={{ color: "#ffd166" }}>
							{recapState.recapChoice ?? "?"}
						</span>
					</div>
				)}
			</div>

			{/* 🔹 Submit button */}
			{canRotate && (
				<button
					onClick={handleSubmitRotation}
					style={{
						marginTop: "20px",
						padding: "10px 20px",
						fontSize: "16px",
						backgroundColor: "#4CAF50",
						color: "white",
						border: "none",
						borderRadius: "6px",
						cursor: "pointer",
						fontWeight: 600,
					}}
				>
					Submit Rotation
				</button>
			)}
		</div>
	);
};

export default FielderView;
