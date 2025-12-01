import React, { useRef, useEffect, useState, useCallback, act } from "react";
import { useSocket } from "../contexts/SocketContext";
import { useGame } from "../contexts/GameContext";
import LiveScorecard from "../components/LiveScorecard";
import {
	batsmanPowerUpNames,
	fielderPowerUpNames,
	PowerUpStatus,
} from "../types";
import PowerUpCircles from "../components/PowerUpCircles";
import FielderPresets from "../components/FielderPresets";
import { buildPowerUpStatusMap } from "../utils/helperFunctions";
import "./views-common.css";

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
		powerUpContext,
	} = displayState;

	const usedPowerUps: string[] = displayState.batsmanUsedPowerups || [];
	const unusedPowerUps: string[] = displayState.batsmanUnusedPowerups || [];
	const activePowerUps: string[] = displayState.batsmanActivePowerups || [];

	const batsmanPowerUpsStatusMap: Map<string, PowerUpStatus> =
		buildPowerUpStatusMap(usedPowerUps, unusedPowerUps, activePowerUps);

	const fielderPowerUpsStatusMap: Map<string, PowerUpStatus> =
		buildPowerUpStatusMap(
			displayState.fielderUsedPowerups || [],
			displayState.fielderUnusedPowerups || [],
			displayState.fielderActivePowerups || [],
		);

	const rotation = currentBallRotation || 0;
	const isBattingTurn =
		playerBatting === user.id &&
		gamePhase === "batting" &&
		!recapState.isRecapping;

	// 🎯 Handle surrender
	const handleSurrender = () => {
		if (!socket || !user) return;
		const confirm = window.confirm("Are you sure you want to surrender?");
		if (!confirm) return;
		socket.emit("surrender", user.id);
	};

	// 🎯 Handle shot selection
	const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
		if (!isBattingTurn) return; // disable during recap
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

		if (
			activePowerUps.includes("Scout Report") &&
			!("Scout Report" in (powerUpContext ?? {}))
		) {
			handlePowerUpUsed("Scout Report", { pieIndex: index });
			return; // do not select shot if power-up is being used
		}

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
				const revealPie =
					recapState.isRecapping ||
					(activePowerUps.includes("Scout Report") &&
						"Scout Report" in (powerUpContext ?? {}) &&
						i === powerUpContext["Scout Report"]);

				if (revealPie) {
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
				if (revealPie) {
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
			activePowerUps,
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

	const handlePowerUpUsed = useCallback(
		(powerUpKey: string, modifications: Record<string, any> = {}) => {
			if (!socket || !user) return;
			console.log(`Using power-up: ${powerUpKey}`);

			if (activePowerUps.includes(powerUpKey)) {
				// send modifications if the server has been notified about the power-up activation
				switch (powerUpKey) {
					case "Scout Report":
						console.log(
							"Scout Report power-up used:",
							modifications,
						);
						// Ensure modifications has presetChosen and newWicketIndex
						if (modifications.pieIndex === null) {
							console.error(
								"Scout Report power-up used without necessary modifications.",
							);
							return;
						}
						break;
					default:
						break;
				}
			}

			console.log("Modifications:", modifications);
			if (Object.keys(modifications).length > 0) {
				socket.emit(
					"power_up_used",
					user.id,
					user.roomId,
					powerUpKey,
					modifications,
				);
				return;
			}

			socket.emit("power_up_used", user.id, user.roomId, powerUpKey);
		},
		[socket, user, activePowerUps, shotSelected],
	);

	// =========================
	//  UI RENDER (grid-based, reusing shared styles)
	// =========================
	return (
		<div className="view-root">
			{/* LEFT COLUMN: Scorecard, vertical batsman powerups, fielder horizontal powerups */}
			<div className="left-col">
				{/* Top: Live scorecard */}
				<div
					style={{
						justifyItems: "start",
						alignSelf: "center",
						gridRow: "1",
						width: "fit-content",
					}}
				>
					<LiveScorecard
						gameState={gameState ? gameState : displayState}
					/>
				</div>

				{/* Middle: vertical batsman powerups */}
				<div
					style={{
						justifyItems: "start",
						alignSelf: "center",
						gridRow: "2",
						width: "fit-content",
					}}
				>
					<PowerUpCircles
						powerUpNames={batsmanPowerUpNames}
						powerUps={batsmanPowerUpsStatusMap}
						onClick={handlePowerUpUsed}
						disabled={!isBattingTurn}
					/>
				</div>

				{/* Bottom: fielder's horizontal powerups */}
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
							fontSize: "clamp(11px, 1.2vmin, 14px)",
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
						horizontal={true}
					/>
				</div>
			</div>

			{/* CENTER COLUMN: header, canvas wheel, submit button - centered */}
			<div className="center-col">
				<div
					className="view-header"
					style={{ gridRow: "1", textAlign: "center" }}
				>
					<h2 className="view-title">🏏 Batter View</h2>
					<p className="view-subtitle">
						{recapState.isRecapping
							? "Recap in progress — reviewing the last ball..."
							: gamePhase === "setting field"
								? "Opponent is setting their field..."
								: gamePhase === "batting"
									? "Field is ready — pick your shot carefully!"
									: "Waiting for next phase..."}
					</p>
				</div>

				{/* Canvas wrapper - fixed center */}
				<div>
					<div
						style={{
							width: "clamp(220px, 36vmin, 420px)",
							height: "clamp(220px, 36vmin, 420px)",
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
								boxSizing: "border-box",
								cursor:
									isBattingTurn && !recapState.isRecapping
										? "pointer"
										: "not-allowed",
							}}
							onClick={handleClick}
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

				{/* Submit button centered */}
				{isBattingTurn && (
					<button
						onClick={handleSubmitShot}
						className="submit-btn"
						disabled={unableToSubmitShot}
					>
						Submit Shot
					</button>
				)}
			</div>

			{/* RIGHT COLUMN: surrender top, spacer middle, presets bottom */}
			<div className="right-col">
				{/* Top: surrender */}
				<div
					style={{
						justifySelf: "end",
						gridRow: "1",
					}}
				>
					<button onClick={handleSurrender} className="surrender-btn">
						Surrender
					</button>
				</div>

				{/* Bottom: presets */}
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

export default BatterView;
