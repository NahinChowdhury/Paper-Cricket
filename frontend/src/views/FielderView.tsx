import React, { useRef, useEffect, useState, useCallback } from "react";
import { useSocket } from "../contexts/SocketContext";
import { useGame } from "../contexts/GameContext";
import LiveScorecard from "../components/LiveScorecard";
import FielderPresets from "../components/FielderPresets";
import PowerUpCircles from "../components/PowerUpCircles";
import { DraggableList } from "../components/DraggableList";
import {
	GameState,
	PowerUpStatus,
	batsmanPowerUpNames,
	fielderPowerUpNames,
} from "../types";
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

const FielderView: React.FC = () => {
	const { socket } = useSocket();
	const { gameState, setGameState, recapState, user } = useGame();

	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const [rotation, setRotation] = useState(0);
	const [isDragging, setIsDragging] = useState(false);
	const [startAngle, setStartAngle] = useState(0);
	const [localPresetChoice, setLocalPresetChoice] = useState<number>(0);
	const [specialIndex, setSpecialIndex] = useState<number | null>(null);

	// ✅ Choose which state to display
	const displayState: GameState | null =
		recapState.isRecapping && recapState.frozenState
			? recapState.frozenState
			: gameState;

	if (!displayState || !user) return null;

	const isFieldingTurn =
		displayState.playerFielding === user.id &&
		displayState.gamePhase === "setting field" &&
		!recapState.isRecapping;

	const frozenHandsPowerUpUsed: boolean =
		displayState.powerUpContext?.["Frozen Hands"] ===
		displayState.currentBall;

	const shotSelected: number | null =
		displayState.currentBallBatsmanChoice !== undefined
			? displayState.currentBallBatsmanChoice
			: null;

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

	// 🔹 Handle surrender
	const handleSurrender = () => {
		if (!socket || !user) return;
		if (!window.confirm("Are you sure you want to surrender?")) return;
		socket.emit("surrender", user.id);
	};

	// 🔹 Draw pie
	const drawPie = useCallback(
		(
			ctx: CanvasRenderingContext2D,
			rotationAngle: number,
			localPresetChoice: number,
		) => {
			const sliceAngle =
				(2 * Math.PI) /
				displayState.modifiedPresets[localPresetChoice].length;
			const cx = ctx.canvas.width / 2;
			const cy = ctx.canvas.height / 2;

			const currentPreset =
				displayState.modifiedPresets[localPresetChoice];
			currentPreset.forEach((outcome, i) => {
				// Subtract Math.PI/2 because canvas 0 radians points right (3 o’clock), but our pie’s first slice is visually at the top (12 o’clock)
				const start = i * sliceAngle + rotationAngle - Math.PI / 2;
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
		[shotSelected, displayState.modifiedPresets, localPresetChoice],
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
		drawPie(ctx, rotation, localPresetChoice);

		if (!isFieldingTurn) {
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
	}, [rotation, drawPie, isFieldingTurn, localPresetChoice]);

	useEffect(() => {
		// Reset rotation when entering "setting field"
		if (displayState.gamePhase === "setting field") {
			console.log(
				"Entering field setting phase. presetChosen:",
				displayState.presetChosen,
			);
			setRotation(displayState.currentBallRotation || 0);
			setLocalPresetChoice(displayState.presetChosen || 0);
		}
	}, [displayState.gamePhase]);

	// 🧩 Prevents mobile browsers from scrolling the page while the user is dragging the wheel.
	// Without this, touchmove events would trigger page scroll or bounce even inside the canvas.
	useEffect(() => {
		const preventScroll = (e: TouchEvent) => {
			if (isDragging) e.preventDefault();
		};
		document.addEventListener("touchmove", preventScroll, {
			passive: false,
		});
		return () => document.removeEventListener("touchmove", preventScroll);
	}, [isDragging]);

	// 🔹 Drag logic
	const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
		if (!isFieldingTurn || frozenHandsPowerUpUsed) return;

		// Disable scrolling while dragging
		document.body.style.overflow = "hidden";

		const rect = canvasRef.current!.getBoundingClientRect();
		const cx = rect.left + rect.width / 2;
		const cy = rect.top + rect.height / 2;
		const dx = e.clientX - cx;
		const dy = e.clientY - cy;
		setIsDragging(true);
		setStartAngle(Math.atan2(dy, dx) - rotation);
	};

	const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
		if (!isDragging || !isFieldingTurn || frozenHandsPowerUpUsed) return;
		const rect = canvasRef.current!.getBoundingClientRect();
		const cx = rect.left + rect.width / 2;
		const cy = rect.top + rect.height / 2;
		const dx = e.clientX - cx;
		const dy = e.clientY - cy;
		const newRot = normalizeRotation(Math.atan2(dy, dx) - startAngle);
		setRotation(newRot);

		// Emit live rotation to server
		emitRotatePie(newRot, localPresetChoice);
	};

	const handlePresetClick = (index: number) => {
		console.log(
			"Selected preset:",
			index,
			"Pattern:",
			displayState.modifiedPresets[index],
		);
		setLocalPresetChoice(index);

		// Reset rotation when preset is changed
		setRotation(0);

		// Emit live rotation to server with new preset
		emitRotatePie(0, index);
	};

	const emitRotatePie = useCallback(
		(rotationAngle: number, presetChoice: number) => {
			if (socket && user?.roomId) {
				socket.emit(
					"rotate_pie",
					user.roomId,
					user.id,
					rotationAngle,
					presetChoice,
				);
			}
		},
		[socket, user],
	);

	const handleMouseUp = () => {
		setIsDragging(false);
		document.body.style.overflow = ""; // Re-enable scroll
	};

	// 🔹 Submit rotation
	const handleSubmitRotation = () => {
		if (!socket || !user || !isFieldingTurn) return;
		console.log("Submitting field setup:", {
			rotation,
			presetIndex: localPresetChoice,
			presetPattern: displayState.modifiedPresets[localPresetChoice],
		});
		socket.emit(
			"field_set",
			user.id,
			user.roomId,
			rotation,
			localPresetChoice,
		);
	};

	// Add useEffect for tracking Third Man power-up index
	useEffect(() => {
		if (!displayState.powerUpContext?.["Third Man"]) {
			setSpecialIndex(null);
			return;
		}
		setSpecialIndex(
			displayState.powerUpContext["Third Man"][localPresetChoice],
		);
	}, [displayState.powerUpContext, localPresetChoice]);

	const handlePowerUpUsed = useCallback(
		(powerUpKey: string, modifications: Record<string, any> = {}) => {
			if (!socket || !user) return;
			console.log(`Using power-up: ${powerUpKey}`);

			if (displayState.fielderActivePowerups.includes(powerUpKey)) {
				// send modifications if the server has been notified about the power-up activation
				switch (powerUpKey) {
					case "Third Man":
						console.log("Third Man power-up used:", modifications);
						// Ensure modifications has presetChosen and newWicketIndex
						if (
							modifications.presetChosen === null ||
							modifications.newWicketIndex === null
						) {
							console.error(
								"Third Man power-up used without necessary modifications.",
							);
							return;
						}
						break;
					case "Field Shift":
						console.log(
							"Field Shift power-up used:",
							modifications,
						);
						// Ensure modifications has presetChosen and newPreset
						if (
							modifications.presetChosen === null ||
							!modifications.newPreset
						) {
							console.error(
								"Field Shift power-up used without necessary modifications.",
							);
							return;
						}
						break;
					// Add more cases as needed for different power-ups
					case "Mirror Field":
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
		[
			socket,
			user,
			displayState.fielderActivePowerups,
			displayState.modifiedPresets,
			localPresetChoice,
			specialIndex,
		],
	);

	return (
		<div className="view-root">
			{/* LEFT COLUMN: Scorecard, vertical fielder powerups, batsman's horizontal powerups */}
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

				{/* Middle: vertical fielder powerups */}
				<div
					style={{
						justifyItems: "start",
						alignSelf: "center",
						gridRow: "2",
						width: "fit-content",
					}}
				>
					<PowerUpCircles
						powerUpNames={fielderPowerUpNames}
						powerUps={fielderPowerUpsStatusMap}
						onClick={handlePowerUpUsed}
						disabled={!isFieldingTurn}
					/>
				</div>

				{/* Bottom: batsman's horizontal powerups */}
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

			{/* CENTER COLUMN: header, canvas wheel, submit button - always centered */}
			<div className="center-col">
				<div
					className="view-header"
					style={{ gridRow: "1", textAlign: "center" }}
				>
					<h2 className="view-title">🧤 Fielder View</h2>
					<p className="view-subtitle">
						{recapState.isRecapping
							? "Recap in progress — replaying the last delivery..."
							: displayState.gamePhase === "setting field"
								? "Set your field rotation!"
								: displayState.gamePhase === "batting"
									? "Waiting for batter to play the shot..."
									: ""}
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
								cursor: isFieldingTurn
									? frozenHandsPowerUpUsed
										? "not-allowed"
										: isDragging
											? "grabbing"
											: "grab"
									: "not-allowed",
								opacity: isFieldingTurn ? 1 : 0.5,
								transition: "opacity 0.3s ease",
								touchAction: "none",
								userSelect: "none",
								background: "white",
							}}
							onMouseDown={handleMouseDown}
							onMouseMove={handleMouseMove}
							onMouseUp={handleMouseUp}
							onMouseLeave={handleMouseUp}
							onTouchStart={(e) =>
								handleMouseDown(e.touches[0] as any)
							}
							onTouchMove={(e) =>
								handleMouseMove(e.touches[0] as any)
							}
							onTouchEnd={handleMouseUp}
						/>

						{recapState.isRecapping && (
							<div className="recap-banner">
								Batter chose{" "}
								<span className="recap-choice">
									{recapState.recapChoice ?? "?"}
								</span>
							</div>
						)}
					</div>
				</div>

				{/* Submit button centered */}
				{isFieldingTurn && (
					<button
						onClick={handleSubmitRotation}
						className="submit-btn"
					>
						Submit Rotation
					</button>
				)}
			</div>

			{/* RIGHT COLUMN: surrender, draggable list, presets */}
			<div className="right-col">
				{/* Top: surrender */}
				<div
					style={{
						justifySelf: "end",
						gridRow: "1",
						width: "fit-content",
					}}
				>
					<button onClick={handleSurrender} className="surrender-btn">
						Surrender
					</button>
				</div>

				{/* Middle: DraggableList when active */}
				<div
					style={{
						justifySelf: "end",
						alignSelf: "center",
						gridRow: "2",
						width: "fit-content",
					}}
				>
					{isFieldingTurn &&
						(displayState.fielderActivePowerups.includes(
							"Field Shift",
						) ||
							displayState.fielderActivePowerups.includes(
								"Third Man",
							)) && (
							<div
								style={{
									backgroundColor: "white",
									padding: "10px",
									borderRadius: "8px",
									boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
								}}
							>
								<DraggableList
									items={
										displayState.modifiedPresets[
											localPresetChoice
										] || []
									}
									specialIndex={
										displayState.fielderActivePowerups.includes(
											"Field Shift",
										)
											? null
											: specialIndex
									}
									onReorder={(newItems, specialIndex) => {
										console.log(
											"Reordering items:",
											newItems,
										);
										setGameState(
											(prev: GameState | null) => {
												if (!prev) return prev;
												const newPresets = [
													...prev.modifiedPresets,
												];
												newPresets[localPresetChoice] =
													[...newItems];
												if (
													specialIndex !==
														undefined &&
													specialIndex !== null
												) {
													if (
														!prev.powerUpContext?.[
															"Third Man"
														]
													)
														return prev;
													const newPowerUpContext = {
														...prev.powerUpContext,
														"Third Man": {
															...prev
																.powerUpContext[
																"Third Man"
															],
															[localPresetChoice]:
																specialIndex,
														},
													};
													return {
														...prev,
														modifiedPresets:
															newPresets,
														powerUpContext:
															newPowerUpContext,
													};
												}
												return {
													...prev,
													modifiedPresets: newPresets,
												};
											},
										);

										if (
											displayState.fielderActivePowerups.includes(
												"Field Shift",
											)
										) {
											const modifications = {
												presetChosen: localPresetChoice,
												newPreset: newItems,
											};
											handlePowerUpUsed(
												"Field Shift",
												modifications,
											);
										}
										if (
											displayState.fielderActivePowerups.includes(
												"Third Man",
											)
										) {
											const modifications = {
												presetChosen: localPresetChoice,
												newWicketIndex: specialIndex,
											};
											handlePowerUpUsed(
												"Third Man",
												modifications,
											);
										}
									}}
									renderItem={(item) => (
										<span
											style={{
												color:
													colorsMap[item] ||
													"#000000",
											}}
										>
											{item}
										</span>
									)}
								/>
							</div>
						)}
				</div>

				{/* Bottom: presets */}
				<div
					style={{
						justifySelf: "end",
						gridRow: "3",
					}}
				>
					<FielderPresets
						modifiedPresets={displayState.modifiedPresets}
						selectedPreset={localPresetChoice}
						onPresetClick={
							isFieldingTurn ? handlePresetClick : undefined
						}
						style={{
							opacity: isFieldingTurn ? 1 : 0.5,
							transition: "opacity 0.3s ease",
							pointerEvents: isFieldingTurn ? "auto" : "none",
							cursor: isFieldingTurn ? "pointer" : "not-allowed",
							width: "fit-content",
						}}
					/>
				</div>
			</div>
		</div>
	);
};

export default FielderView;
