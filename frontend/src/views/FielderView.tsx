import React, { useRef, useEffect, useState, useCallback } from "react";
import { useSocket } from "../contexts/SocketContext";
import { useGame } from "../contexts/GameContext";
import LiveScorecard from "../components/LiveScorecard";
import FielderPresets from "../components/FielderPresets";
import PowerUpCircles from "../components/PowerUpCircles";
import { PowerUpStatus, fielderPowerUpNames } from "../types";

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
	const { gameState, recapState, user } = useGame();

	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const [rotation, setRotation] = useState(0);
	const [isDragging, setIsDragging] = useState(false);
	const [startAngle, setStartAngle] = useState(0);
	const [localPresetChoice, setLocalPresetChoice] = useState<number>(0);

	// ✅ Choose which state to display
	const displayState =
		recapState.isRecapping && recapState.frozenState
			? recapState.frozenState
			: gameState;

	if (!displayState || !user) return null;

	const canRotate =
		displayState.gamePhase === "setting field" && !recapState.isRecapping;
	const shotSelected: number | null =
		displayState.currentBallBatsmanChoice !== undefined
			? displayState.currentBallBatsmanChoice
			: null;

	const usedPowerUps: string[] = displayState.fielderUsedPowerups;
	const unusedPowerUps: string[] = displayState.fielderUnusedPowerups;
	const activePowerUps: string[] = displayState.fielderActivePowerups;

	const powerUpsStatusMap: Map<string, PowerUpStatus> = new Map([
		...usedPowerUps.map((p: string) => [p, "used" as PowerUpStatus]),
		...unusedPowerUps.map((p: string) => [p, "unused" as PowerUpStatus]),
		...activePowerUps.map((p: string) => [p, "active" as PowerUpStatus]),
	] as [string, PowerUpStatus][]);

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
				const start = i * sliceAngle + rotationAngle;
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
	}, [rotation, drawPie, canRotate, localPresetChoice]);

	useEffect(() => {
		// Reset rotation when entering "setting field"
		if (displayState.gamePhase === "setting field") {
			console.log(
				"Entering field setting phase. presetChosen:",
				displayState.presetChosen,
			);
			setRotation(0);
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
		if (!canRotate) return;

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
		if (!isDragging || !canRotate) return;
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
		if (!socket || !user || !canRotate) return;
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

	const handlePowerUpUsed = (powerUpKey: string) => {
		if (!socket || !user) return;
		console.log(`Using power-up: ${powerUpKey}`);

		const modifications: Record<string, any> = {};

		if (displayState.fielderActivePowerups.includes(powerUpKey)) {
			// send modifications if the server has been notified about the power-up activation
			switch (powerUpKey) {
				case "Third Man":
					modifications.presetChosen = localPresetChoice;
					modifications.newWicketIndex = 1; // TODO: should be tracked by some useState
					break;
				case "Field Shift":
					modifications.presetChosen = localPresetChoice;
					modifications.preset =
						displayState.modifiedPresets[localPresetChoice]; // TODO: should be tracked by some useState for modified preset or use setGameState directly
					break;
				// Add more cases as needed for different power-ups
				case "Mirror Field":
				default:
					break;
			}
		}

		socket.emit("power_up_used", user.id, user.roomId, powerUpKey);
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

			{/* 🔹 Power Up Circles (left side, vertically centered) */}
			<div
				style={{
					position: "absolute",
					left: "20px",
					top: "50%",
					transform: "translateY(-50%)",
					zIndex: 5,
				}}
			>
				<PowerUpCircles
					powerUpNames={fielderPowerUpNames}
					powerUps={powerUpsStatusMap}
					onClick={handlePowerUpUsed}
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
			<h2 style={{ marginBottom: "10px" }}>🧤 Fielder View</h2>
			<p style={{ fontSize: "1.2rem", marginBottom: "20px" }}>
				{recapState.isRecapping
					? "Recap in progress — replaying the last delivery..."
					: displayState.gamePhase === "setting field"
						? "Set your field rotation!"
						: displayState.gamePhase === "batting"
							? "Waiting for batter to play the shot..."
							: ""}
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
						// 🧱 Important interaction rules:
						touchAction: "none", // disable browser scrolling + pinch zoom on canvas
						userSelect: "none", // prevent text/image selection
					}}
					onMouseDown={handleMouseDown}
					onMouseMove={handleMouseMove}
					onMouseUp={handleMouseUp}
					onMouseLeave={handleMouseUp}
					onTouchStart={(e) => handleMouseDown(e.touches[0] as any)}
					onTouchMove={(e) => handleMouseMove(e.touches[0] as any)}
					onTouchEnd={handleMouseUp}
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
							{recapState.recapChoice ?? "?"}{" "}
							{/* recapChoice is already the value string */}
						</span>
					</div>
				)}
			</div>

			{/* 🔹 Preset Selection */}
			<FielderPresets
				modifiedPresets={displayState.modifiedPresets}
				selectedPreset={localPresetChoice}
				onPresetClick={canRotate ? handlePresetClick : undefined}
				style={{
					opacity: canRotate ? 1 : 0.5,
					transition: "opacity 0.3s ease",
					pointerEvents: canRotate ? "auto" : "none",
					cursor: canRotate ? "pointer" : "not-allowed",
				}}
			/>

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
