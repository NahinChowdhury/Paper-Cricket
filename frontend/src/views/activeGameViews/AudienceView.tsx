import React, { useRef, useEffect, useCallback } from "react";
import GameWaitingView from "../GameWaitingView";
import { useGame } from "../../contexts/GameContext";
import { useSocket } from "../../contexts/SocketContext";
import PreGameJoiningView from "../PreGameJoiningView";
import PreGameDecisionMakerView from "../tossViews/PreGameDecisionMakerView";
import PreGameDecisionSpectatorView from "../tossViews/PreGameDecisionSpectatorView";
import LiveScorecard from "../../components/LiveScorecard";
import PowerUpCircles from "../../components/PowerUpCircles";
import {
	PowerUpStatus,
	batsmanPowerUpNames,
	fielderPowerUpNames,
} from "../../types";
import { buildPowerUpStatusMap } from "../../utils/helperFunctions";
import FielderPresets from "../../components/FielderPresets";
import "../views-common.css";

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
	const { socket } = useSocket();
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

	// Handle disconnect
	const handleDisconnect = () => {
		if (!socket || !user) return;
		const confirm = window.confirm(
			"Are you sure you want to leave the room?",
		);
		if (!confirm) return;
		socket.emit("leave_room", user.id);
		window.location.href = "/";
	};

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
		<div className="view-root">
			{/* LEFT COLUMN: LiveScore, fielder powerups (vertical), batsman horizontal powerups */}
			<div className="left-col">
				{/* Top: Live scorecard */}
				{gameState && (
					<div
						style={{
							justifyItems: "start",
							alignSelf: "center",
							gridRow: "1",
						}}
					>
						<LiveScorecard gameState={gameState} />
					</div>
				)}

				{/* Middle: fielder powerups (vertical, read-only) */}
				<div
					style={{
						justifySelf: "start",
						alignSelf: "center",
						gridRow: "2",
						width: "fit-content",
					}}
				>
					<div style={{ textAlign: "center" }}>
						<div
							style={{
								fontSize: "clamp(11px,1.2vmin,14px)",
								color: "#333",
								fontWeight: 600,
								marginBottom: 6,
							}}
						>
							Fielder's power ups
						</div>
						<PowerUpCircles
							powerUpNames={fielderPowerUpNames}
							powerUps={fielderPowerUpsStatusMap}
							onClick={() => {}}
							disabled={true}
						/>
					</div>
				</div>

				{/* Bottom: batsman's horizontal powerups (read-only) */}
				<div
					style={{
						justifyItems: "start",
						alignSelf: "center",
						gridRow: "3",
						width: "fit-content",
					}}
				>
					<div
						style={{
							fontSize: "clamp(11px,1.2vmin,14px)",
							color: "#333",
							fontWeight: 600,
							marginBottom: 6,
						}}
					>
						Batsman's power ups
					</div>
					<PowerUpCircles
						powerUpNames={batsmanPowerUpNames}
						powerUps={batsmanPowerUpsStatusMap}
						onClick={() => {}}
						disabled={true}
						horizontal={true}
					/>
				</div>
			</div>

			{/* CENTER COLUMN: header, canvas (read-only), recap banner */}
			<div className="center-col">
				<div
					className="view-header"
					style={{ gridRow: "1", textAlign: "center" }}
				>
					<h2 className="view-title">🎟️ Audience View</h2>
					<p className="view-subtitle">
						{recapState.isRecapping
							? "Replay in progress — watch how the last delivery unfolded!"
							: gamePhase === "setting field"
								? "The fielder is setting up their formation — let's see the strategy unfold."
								: gamePhase === "batting"
									? "The batter is preparing their shot — tension's in the air!"
									: "You're watching the match live — the field updates in real time!"}
					</p>
				</div>

				{/* Read-only wheel */}
				<div>
					<div
						style={{
							width: "clamp(220px,36vmin,420px)",
							height: "clamp(220px,36vmin,420px)",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
						}}
					>
						<canvas
							ref={canvasRef}
							width={400}
							height={400}
							style={{
								width: "100%",
								height: "100%",
								border: "2px solid #ddd",
								borderRadius: "50%",
								cursor: "not-allowed",
								boxSizing: "border-box",
							}}
						/>

						{recapState.isRecapping && (
							<div className="recap-banner">
								User chose{" "}
								<span className="recap-choice">
									{recapState.recapChoice ?? "?"}
								</span>
							</div>
						)}
					</div>
				</div>

				{/* Audience has no submit controls (read-only) */}
			</div>

			{/* RIGHT COLUMN: presets (bottom) and spare space */}
			<div className="right-col">
				{/* Top: surrender */}
				<div
					style={{
						justifySelf: "end",
						gridRow: "1",
						display: "flex",
						flexDirection: "column",
						alignItems: "end",
					}}
				>
					<button
						onClick={handleDisconnect}
						className="surrender-btn"
					>
						Disconnect
					</button>
					<div
						style={{
							textAlign: "center",
							fontSize: "14px",
							color: "#666",
						}}
					>
						👁️ {displayState.audience?.length ?? 0}
					</div>
				</div>

				{/* Bottom: presets (read-only) */}
				<div
					style={{
						justifySelf: "end",
						gridRow: "3",
					}}
				>
					<FielderPresets
						modifiedPresets={displayState.originalPresets}
						style={{
							pointerEvents: "none",
							cursor: "not-allowed",
							boxSizing: "border-box",
						}}
					/>
				</div>
			</div>
		</div>
	);
};

export default AudienceView;
