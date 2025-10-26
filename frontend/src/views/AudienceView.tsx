import React, { useRef, useEffect, useCallback } from "react";
import GameWaitingView from "./GameWaitingView";
import { useGame } from "../contexts/GameContext";
import PreGameJoiningView from "./PreGameJoiningView";
import PreGameDecisionMakerView from "./PreGameDecisionMakerView";
import PreGameDecisionSpectatorView from "./PreGameDecisionSpectatorView";

// 🎨 Slice configuration (same as Batter/Fielder)
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

const AudienceView: React.FC = () => {
	const { gameState, user } = useGame();
	const canvasRef = useRef<HTMLCanvasElement | null>(null);

	// 🔹 Safety check
	if (!gameState || !user) return <PreGameJoiningView />;

	const {
		gamePhase,
		tossSelector,
		currentBallRotation = 0,
		currentBallBatsmanChoice = undefined,
	} = gameState;
	const shotSelected: string | null =
		currentBallBatsmanChoice !== undefined
			? currentBallBatsmanChoice
			: null;

	// =========================
	//  PRE-GAME PHASES
	// =========================
	if (gamePhase === "waiting") return <GameWaitingView />;

	if (gamePhase === "toss" || gamePhase === "side selection") {
		if (tossSelector === user.id) return <PreGameDecisionMakerView />;
		else return <PreGameDecisionSpectatorView />;
	}

	// =========================
	//  IN-GAME DISPLAY (READ-ONLY)
	// =========================
	const drawPie = useCallback(
		(ctx: CanvasRenderingContext2D) => {
			const sliceAngle = (2 * Math.PI) / slices.length;
			const cx = ctx.canvas.width / 2;
			const cy = ctx.canvas.height / 2;

			slices.forEach((slice, i) => {
				const start = i * sliceAngle + currentBallRotation;
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
		[currentBallRotation, shotSelected],
	);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		drawPie(ctx);
	}, [currentBallRotation, drawPie]);

	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				justifyContent: "center",
				height: "100vh",
				textAlign: "center",
				backgroundColor: "#fafafa",
				fontFamily: "sans-serif",
				position: "relative",
			}}
		>
			<h2 style={{ marginBottom: "10px" }}>🎟️ Audience View</h2>
			<p style={{ fontSize: "1.2rem", marginBottom: "20px" }}>
				You're watching the match live — the field updates in real time!
			</p>

			{/* 🔹 Read-only wheel */}
			<div style={{ position: "relative", display: "inline-block" }}>
				<canvas
					ref={canvasRef}
					width={400}
					height={400}
					style={{
						border: "2px solid #ddd",
						borderRadius: "50%",
						cursor: "not-allowed",
					}}
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
						transform: `rotate(${currentBallRotation}rad)`,
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
		</div>
	);
};

export default AudienceView;
