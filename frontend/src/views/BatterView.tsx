import React, { useRef, useEffect, useState, useCallback } from "react";
import { useSocket } from "../contexts/SocketContext";
import { useGame } from "../contexts/GameContext";
import LiveScorecard from "../components/LiveScorecard";

// Color mapping for different outcomes
const colorsMap: Record<string, string> = {
	"0": "#f94144",
	"1": "#f3722c",
	"2": "#f9c74f",
	"4": "#90be6d",
	"6": "#43aa8b",
	W: "#577590",
	NB: "#501111",
	WD: "#9b9b9b",
};

const SPINNER_RADIUS = 150;

const BatterView: React.FC = () => {
	const { socket } = useSocket();
	const { gameState, recapState, user } = useGame();

	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const [shotSelected, setShotSelected] = useState<number | null>(null);

	// =========================
	//  SELECT WHICH STATE TO DISPLAY
	// =========================
	const displayState =
		recapState.isRecapping && recapState.frozenState
			? recapState.frozenState
			: gameState;

	if (!displayState || !user) return null;

	const {
		currentBallRotation,
		presetChosen,
		modifiedPresets,
		gamePhase,
		playerBatting,
		surrenderedBy,
		inningsOneRuns,
		inningsTwoRuns,
	} = displayState;

	const rotation = currentBallRotation || 0;
	const isBattingTurn = playerBatting === user.id && gamePhase === "batting";

	// 🎯 Handle surrender
	const handleSurrender = () => {
		if (!socket || !user) return;
		const confirm = window.confirm("Are you sure you want to surrender?");
		if (!confirm) return;
		socket.emit("surrender", user.id);
	};

	// 🎯 Handle shot selection
	const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
		if (!isBattingTurn || recapState.isRecapping) return; // disable during recap
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
		// Subtract Math.PI/2 because canvas 0 radians points right (3 o’clock), but our pie’s first slice is visually at the top (12 o’clock)
		const angle = Math.atan2(dy, dx) - rotation + Math.PI / 2;
		const normalized = ((angle % fullCircle) + fullCircle) % fullCircle;
		const currentPreset = modifiedPresets[presetChosen];
		const sliceAngle = fullCircle / currentPreset.length;
		const index =
			Math.floor(normalized / sliceAngle) % currentPreset.length;
		setShotSelected(index);

		if (socket && user?.roomId) {
			socket.emit("shot_selection_hover", user.id, index);
		}
	};

	// 🎯 Handle shot submission
	const handleSubmitShot = () => {
		if (!socket || !user || shotSelected === null) {
			alert("Please select a shot first!");
			return;
		}

		console.log(
			"Submitting shot index:",
			shotSelected,
			"value:",
			modifiedPresets[presetChosen][shotSelected],
		);
		socket.emit("shot_played", user.id, user.roomId, shotSelected);
		// we do not clear the shotSelected here to allow user to see their choice until recap is over
	};

	useEffect(() => {
		// Reset shot selection when recap is over
		if (!recapState.isRecapping) {
			setShotSelected(null);
		}
	}, [recapState.isRecapping]);

	// 🧠 Draw pie segments
	const drawPie = useCallback(
		(ctx: CanvasRenderingContext2D) => {
			const currentPreset = modifiedPresets[presetChosen];
			const sliceAngle = (2 * Math.PI) / currentPreset.length;
			const cx = ctx.canvas.width / 2;
			const cy = ctx.canvas.height / 2;

			currentPreset.forEach((outcome, i) => {
				const start = i * sliceAngle + rotation - Math.PI / 2;
				const end = start + sliceAngle;
				const radius =
					shotSelected === i ? SPINNER_RADIUS + 10 : SPINNER_RADIUS;

				ctx.beginPath();
				ctx.moveTo(cx, cy);
				ctx.arc(cx, cy, radius, start, end);
				ctx.closePath();

				// Only use color when recapping, otherwise use black/grey
				if (recapState.isRecapping) {
					ctx.fillStyle = colorsMap[outcome] || "#000000";
				} else {
					ctx.fillStyle = isBattingTurn ? "#000000" : "#808080";
				}
				ctx.fill();

				// Add white stroke between segments
				ctx.strokeStyle = "white";
				ctx.lineWidth = 2;
				ctx.stroke();

				// Only show labels during recap
				if (recapState.isRecapping) {
					ctx.save();
					ctx.translate(cx, cy);
					ctx.rotate(start + sliceAngle / 2);
					ctx.textAlign = "right";
					ctx.fillStyle = "white";
					ctx.font = "16px sans-serif";
					ctx.fillText(outcome, radius - 10, 5);
					ctx.restore();
				}
			});
		},
		[
			rotation,
			shotSelected,
			presetChosen,
			recapState.isRecapping,
			isBattingTurn,
			modifiedPresets,
		],
	);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		drawPie(ctx);
	}, [rotation, shotSelected, drawPie]);

	const unableToSubmitShot = shotSelected === null || recapState.isRecapping;
	// =========================
	//  UI RENDER
	// =========================
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

			{/* 🎯 Dynamic message based on phase */}
			<h2 style={{ marginBottom: "10px" }}>🏏 Batter View</h2>
			<p style={{ fontSize: "1.2rem", marginBottom: "20px" }}>
				{recapState.isRecapping
					? "Recap in progress — reviewing the last ball..."
					: gamePhase === "setting field"
						? "Opponent is setting their field..."
						: gamePhase === "batting"
							? "Field is ready — pick your shot carefully!"
							: "Waiting for next phase..."}
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
						cursor:
							isBattingTurn && !recapState.isRecapping
								? "pointer"
								: "not-allowed",
					}}
					onClick={handleClick}
				/>

				{/* 🔹 Recap banner */}
				{recapState.isRecapping && (
					<div
						style={{
							position: "absolute",
							top: "50%",
							left: "50%",
							transform: "translate(-50%, -50%)",
							color: "white",
							fontSize: "1.5rem",
							fontWeight: "bold",
							textShadow: "0 0 10px rgba(0,0,0,0.7)",
						}}
					>
						User chose{" "}
						<span style={{ color: "#ffd166" }}>
							{recapState.recapChoice ?? "?"}{" "}
							{/* recapChoice is already the value string */}
						</span>
					</div>
				)}
			</div>

			{/* 🔹 Submit Shot Button */}
			<div style={{ marginTop: "30px" }}>
				<button
					onClick={handleSubmitShot}
					disabled={unableToSubmitShot}
					style={{
						padding: "12px 24px",
						fontSize: "16px",
						backgroundColor: unableToSubmitShot
							? "#ccc"
							: "#4CAF50",
						color: "white",
						border: "none",
						borderRadius: "5px",
						cursor: unableToSubmitShot ? "not-allowed" : "pointer",
					}}
				>
					Submit Shot
				</button>
			</div>
		</div>
	);
};

export default BatterView;
