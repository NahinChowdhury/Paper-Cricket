import React, { useRef, useEffect, useCallback } from "react";
import GameWaitingView from "./GameWaitingView";
import { useGame } from "../contexts/GameContext";
import PreGameJoiningView from "./PreGameJoiningView";
import PreGameDecisionMakerView from "./PreGameDecisionMakerView";
import PreGameDecisionSpectatorView from "./PreGameDecisionSpectatorView";
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
const OVERLAY_COLOR = "rgba(0, 0, 0, 1)";

const AudienceView: React.FC = () => {
	const { gameState, recapState, user } = useGame();
	const canvasRef = useRef<HTMLCanvasElement | null>(null);

	// =========================
	//  SELECT WHICH STATE TO DISPLAY
	// =========================
	const displayState =
		recapState.isRecapping && recapState.frozenState
			? recapState.frozenState
			: gameState;

	if (!displayState) return;

	const {
		currentBallRotation: rotation = 0,
		presetChosen = 0,
		currentBallBatsmanChoice,
		gamePhase,
		tossSelector,
		modifiedPresets,
		inningsOneRuns,
		inningsTwoRuns,
		playerBatting,
		playerFielding,
	} = displayState;

	const shotSelected = currentBallBatsmanChoice ?? null;

	// =========================
	//  DRAWING LOGIC
	// =========================
	const drawPie = useCallback(
		(ctx: CanvasRenderingContext2D) => {
			const currentPreset = modifiedPresets[presetChosen];
			const sliceAngle = (2 * Math.PI) / currentPreset.length;
			const cx = ctx.canvas.width / 2;
			const cy = ctx.canvas.height / 2;

			currentPreset.forEach((outcome, i) => {
				const start = i * sliceAngle + rotation;
				const end = start + sliceAngle;
				const radius =
					shotSelected === i ? SPINNER_RADIUS + 10 : SPINNER_RADIUS;

				ctx.beginPath();
				ctx.moveTo(cx, cy);
				ctx.arc(cx, cy, radius, start, end);
				ctx.closePath();
				ctx.fillStyle = colorsMap[outcome] || "#000000"; // Fallback color if outcome not in map
				ctx.fill();

				ctx.save();
				ctx.translate(cx, cy);
				ctx.rotate(start + sliceAngle / 2);
				ctx.textAlign = "right";
				ctx.fillStyle = "white";
				ctx.font = "16px sans-serif";
				ctx.fillText(outcome, SPINNER_RADIUS - 10, 5);
				ctx.restore();
			});
		},
		[rotation, shotSelected, presetChosen],
	);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		drawPie(ctx);
	}, [drawPie]);

	// =========================
	//  PRE-GAME SCREENS
	// =========================
	if (!gameState || !user) return <PreGameJoiningView />;
	if (gamePhase === "waiting") return <GameWaitingView />;
	if (gamePhase === "toss" || gamePhase === "side selection") {
		return tossSelector === user.id ? (
			<PreGameDecisionMakerView />
		) : (
			<PreGameDecisionSpectatorView />
		);
	}

	// =========================
	//  IN-GAME DISPLAY (READ-ONLY)
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
				backgroundColor: "#fafafa",
				fontFamily: "sans-serif",
				position: "relative",
			}}
		>
			{/* 🏏 Live Scorecard (top-left) */}
			{gameState && (
				<div
					style={{
						position: "absolute",
						top: "20px",
						left: "20px",
						zIndex: 5,
					}}
				>
					{/* Scorecard should be updated immediately even if recap is playing*/}
					<LiveScorecard gameState={gameState} />
				</div>
			)}

			<h2 style={{ marginBottom: "10px" }}>🎟️ Audience View</h2>
			<p style={{ fontSize: "1.2rem", marginBottom: "20px" }}>
				{recapState.isRecapping
					? "Replay in progress — watch how the last delivery unfolded!"
					: gamePhase === "setting field"
						? "The fielder is setting up their formation — let's see the strategy unfold."
						: gamePhase === "batting"
							? "The batter is preparing their shot — tension's in the air!"
							: "You're watching the match live — the field updates in real time!"}
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
						borderRadius: "50%",
						pointerEvents: "none",
						overflow: "hidden",
						transform: `rotate(${rotation}rad)`,
						transition: "opacity 0.8s ease-in-out",
						opacity: recapState.isRecapping ? 0 : 1, // fade out during recap
						backgroundColor:
							gamePhase === "setting field"
								? "rgba(131, 131, 131, 1)" // solid black — blocks interaction and visibility
								: OVERLAY_COLOR, // fully transparent for active phases
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
						{Array.from({
							length: modifiedPresets[presetChosen]?.length ?? 8,
						}).map((_, i) => {
							const angle =
								(i * 2 * Math.PI) /
									(modifiedPresets[presetChosen]?.length ??
										8) -
								Math.PI / 2;
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

				{/* 🔹 Recap banner overlay */}
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
							{recapState.recapChoice ?? "?"}
						</span>
					</div>
				)}
			</div>
		</div>
	);
};

export default AudienceView;
