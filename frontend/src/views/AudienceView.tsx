import React, { useRef, useEffect, useCallback } from "react";
import GameWaitingView from "./GameWaitingView";
import { useGame } from "../contexts/GameContext";
import PreGameJoiningView from "./PreGameJoiningView";
import PreGameDecisionMakerView from "./PreGameDecisionMakerView";
import PreGameDecisionSpectatorView from "./PreGameDecisionSpectatorView";
import LiveScorecard from "../components/LiveScorecard";
import PowerUpCircles from "../components/PowerUpCircles";
import {
	PowerUpStatus,
	batsmanPowerUpNames,
	fielderPowerUpNames,
} from "../types";
import { buildPowerUpStatusMap } from "../utils/helperFunctions";
import FielderPresets from "../components/FielderPresets";

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
	} = displayState;

	const shotSelected = currentBallBatsmanChoice ?? null;

	// Build power-up status map (read-only for audience)
	const fielderPowerUpsStatusMap: Map<string, PowerUpStatus> =
		buildPowerUpStatusMap(
			displayState.fielderUsedPowerups || [],
			displayState.fielderUnusedPowerups || [],
			displayState.fielderActivePowerups || [],
		);

	const batsmanPowerUpsStatusMap: Map<string, PowerUpStatus> =
		buildPowerUpStatusMap(
			displayState.batsmanUsedPowerups || [],
			displayState.batsmanUnusedPowerups || [],
			displayState.batsmanActivePowerups || [],
		);

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
				// Subtract Math.PI/2 because canvas 0 radians points right (3 o’clock), but our pie’s first slice is visually at the top (12 o’clock)
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
					ctx.fillStyle =
						gamePhase === "batting" ? "#000000" : "#808080";
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
			gamePhase,
		],
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

			{/* 🔹 Fielder Power Up Circles (left-side) */}
			<div
				style={{
					position: "absolute",
					left: "20px",
					top: "50%",
					transform: "translateY(-50%)",
					zIndex: 5,
				}}
			>
				<div
					style={{
						fontSize: "0.85rem",
						color: "#333",
						fontWeight: 600,
					}}
				>
					Fielder's power ups
				</div>
				<PowerUpCircles
					powerUpNames={fielderPowerUpNames}
					powerUps={fielderPowerUpsStatusMap}
					onClick={() => {}}
					disabled={true}
					// horizontal={true}
				/>
			</div>

			{/* 🔹 Batsman Power Up Circles (right-side) */}
			<div
				style={{
					position: "absolute",
					right: "20px",
					top: "50%",
					transform: "translateY(-50%)",
					zIndex: 5,
				}}
			>
				<div
					style={{
						fontSize: "0.85rem",
						color: "#333",
						fontWeight: 600,
					}}
				>
					Batsman's power ups
				</div>
				<PowerUpCircles
					powerUpNames={batsmanPowerUpNames}
					powerUps={batsmanPowerUpsStatusMap}
					onClick={() => {}}
					disabled={true}
					position="right"
				/>
			</div>

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

			{/* 🔹 Preset Selection */}
			<FielderPresets
				modifiedPresets={displayState.originalPresets}
				style={{
					pointerEvents: "none",
					cursor: "not-allowed",
				}}
			/>
		</div>
	);
};

export default AudienceView;
