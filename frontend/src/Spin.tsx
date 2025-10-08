import React, { useRef, useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSocket, Player, GameState } from "./contexts/SocketContext";
import { usePlayerId } from "./hooks/usePlayerId";
import { useRoom } from "./hooks/useRoom";
import { DEFAULT_CANVAS_STATE, DEFAULT_GAME_STATE, DEFAULT_PLAYER } from "./utils/defaults";

interface Slice {
	label: string;
	color: string;
}

const slices: Slice[] = [
	{ label: "0", color: "#f94144" },
	{ label: "1", color: "#f3722c" },
	{ label: "2", color: "#f9c74f" },
	{ label: "4", color: "#90be6d" },
	{ label: "6", color: "#43aa8b" },
	{ label: "W", color: "#577590" },
	{ label: "NB", color: "#501111ff" },
	{ label: "WD", color: "#9b9b9bff" },
];

const OVERLAY_COLOR = "rgba(0, 0, 0, 1)";
const SELECTED_SHOT_OVERLAY_COLOR = "rgba(255, 0, 0, 1)";

const SpinPie: React.FC = () => {
	const navigate = useNavigate();

	// Get room ID from URL params
	const { roomId } = useParams<{ roomId: string }>();
	const { socket } = useSocket();
	const { createRoom, isCreatingRoom } = useRoom(socket);
	const { playerId } = usePlayerId();

	// Player state management
	const [currentPlayer, setCurrentPlayer] = useState<Player | null>(DEFAULT_PLAYER);

	// Canvas and interaction state
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const [rotation, setRotation] = useState<number>(DEFAULT_CANVAS_STATE.rotation); // radians
	const [isDragging, setIsDragging] = useState<boolean>(DEFAULT_CANVAS_STATE.isDragging);
	const [startAngle, setStartAngle] = useState<number>(DEFAULT_CANVAS_STATE.startAngle);
	const [message, setMessage] = useState<string>(DEFAULT_CANVAS_STATE.message);
	const [shotSelected, setShotSelected] = useState<string | undefined>(DEFAULT_CANVAS_STATE.shotSelected);

	// Turn-based game state
	const [gameState, setGameState] = useState<GameState>(DEFAULT_GAME_STATE);

	const SPINNER_RADIUS = 150; // Static radius for the spinner

	const drawPie = (
		ctx: CanvasRenderingContext2D,
		centerX: number,
		centerY: number,
		radius: number,
		rotationAngle: number,
	) => {
		const sliceAngle = (2 * Math.PI) / slices.length;

		slices.forEach((slice, i) => {
			const start = i * sliceAngle + rotationAngle;
			const end = start + sliceAngle;

			// Increase radius if selected
			const sliceRadius = shotSelected === slice.label ? radius + 10 : radius;

			ctx.beginPath();
			ctx.moveTo(centerX, centerY);
			ctx.arc(centerX, centerY, sliceRadius, start, end);
			ctx.closePath();
			ctx.fillStyle = slice.color;
			ctx.fill();

			// Overlay for selected slice (optional highlight)
			if (shotSelected === slice.label) {
				ctx.beginPath();
				ctx.moveTo(centerX, centerY);
				ctx.arc(centerX, centerY, sliceRadius, start, end);
				ctx.closePath();
				ctx.fillStyle = SELECTED_SHOT_OVERLAY_COLOR; // overlay
				ctx.fill();
			}

			// Label
			ctx.save();
			ctx.translate(centerX, centerY);
			ctx.rotate(start + sliceAngle / 2);
			ctx.textAlign = "right";
			ctx.fillStyle = "white";
			ctx.font = "16px sans-serif";
			ctx.fillText(slice.label, sliceRadius - 10, 5);
			ctx.restore();
		});
	};

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		ctx.clearRect(0, 0, canvas.width, canvas.height);
		drawPie(
			ctx,
			canvas.width / 2,
			canvas.height / 2,
			SPINNER_RADIUS,
			rotation,
		);
	}, [rotation, shotSelected]);

	// Socket event handlers for turn-based gameplay
	useEffect(() => {
		if (!socket || !roomId) return;

		// First, join the room (this adds the player to the room)
		if (!currentPlayer?.connected) {
			console.log("Joining room:", roomId, "as player:", playerId);
			socket.emit("join_room", roomId, playerId!);
		}
		// Event handler functions (defined outside useEffect for dependencies)
		const handlePlayerJoined = (gameState: GameState, player: Player) => {
			console.log("Player joined room:", player);
			console.log("Game state on player joined:", gameState.players);
			setCurrentPlayer(player); // Set the current player information
			setGameState((prev) => ({
				...prev,
				...gameState,
			}));

			socket.emit("player_joined", player);
		};

		const handleRoomNotFound = () => {
			console.error("Room not found");
			alert("Room not found! Please check the room ID and try again.");
		};

		const handleRoomFull = () => {
			console.error("Room is full");
			alert("Room is full! Maximum 2 players allowed.");
		};

		const handleGameStarted = (gameState: GameState) => {
			console.log("Game started received:", gameState);
			setGameState((prev) => ({
				...prev,
				...gameState,
			}));

			// Update the rotation too
			if (gameState.currentBallRotation !== undefined) {
				setRotation(gameState.currentBallRotation);
			}
		};

		const handleRotationUpdate = (
			gameState: GameState,
			rotation: number,
		) => {
			// Get gamestate too and prevent handling if not opponent's turn
			if (gameState.playerBowling === playerId) {
				return;
			}
			// rotation is in radians
			// console.log("Rotation update received:", rotation);
			// We need to ensure we don't send our own rotation back to us in socket
			handleSetRotation(rotation); // Update display with opponent's rotation
		};

		const handleGameEnded = (gameState: GameState) => {
			console.log("Game ended, final state:", gameState);
			setGameState((prev) => ({
				...prev,
				...gameState,
			}));
		};

		const handlePlayShot = (gameState: GameState) => {
			console.log("Play shot event received:", gameState);
			setGameState((prev) => ({
				...prev,
				...gameState,
			}));
		};

		const handleSetField = (gameState: GameState) => {
			console.log("Set field event received:", gameState);
			setGameState((prev) => ({
				...prev,
				...gameState,
			}));
		};

		// Register event listeners
		socket.on("player_joined", handlePlayerJoined);
		socket.on("room_not_found", handleRoomNotFound);
		socket.on("room_full", handleRoomFull);
		socket.on("game_started", handleGameStarted);
		socket.on("rotation_update", handleRotationUpdate);
		socket.on("game_ended", handleGameEnded);
		socket.on("play_shot", handlePlayShot);
		socket.on("set_field", handleSetField);

		return () => {
			socket.off("player_joined", handlePlayerJoined);
			socket.off("room_not_found", handleRoomNotFound);
			socket.off("room_full", handleRoomFull);
			socket.off("game_started", handleGameStarted);
			socket.off("rotation_update", handleRotationUpdate);
			socket.off("game_ended", handleGameEnded);
			socket.off("play_shot", handlePlayShot);
			socket.off("set_field", handleSetField);
		};
	}, [socket, roomId, currentPlayer]);

	const getAngle = (x: number, y: number, rect: DOMRect) => {
		const centerX = rect.left + rect.width / 2;
		const centerY = rect.top + rect.height / 2;
		return Math.atan2(y - centerY, x - centerX);
	};

	const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
		const rect = canvasRef.current!.getBoundingClientRect();
		const centerX = rect.left + rect.width / 2;
		const centerY = rect.top + rect.height / 2;

		const dx = e.clientX - centerX;
		const dy = e.clientY - centerY;
		const distance = Math.sqrt(dx * dx + dy * dy);

		if (distance > SPINNER_RADIUS) {
			// Click started outside the pie, ignore drag
			return;
		}

		setIsDragging(true);
		setStartAngle(Math.atan2(dy, dx) - rotation);
	};

	const handleMouseMoveCursor = (e: React.MouseEvent<HTMLCanvasElement>) => {
		const canvas = canvasRef.current;

		if (!canvas) return;

		const rect = canvas.getBoundingClientRect();
		const centerX = rect.left + rect.width / 2;
		const centerY = rect.top + rect.height / 2;

		const dx = e.clientX - centerX;
		const dy = e.clientY - centerY;
		const distance = Math.sqrt(dx * dx + dy * dy);

		if (distance <= SPINNER_RADIUS) {
			canvas.style.cursor = getCursorStyle();
		} else {
			canvas.style.cursor = "default";
		}

		if (
			isDragging &&
			gameState.playerBowling === playerId &&
			gameState.gamePhase === "setting field"
		) {
			// gamePhase === 'setting field'
			// Continue rotation while dragging (only during player's turn)
			const angle = Math.atan2(dy, dx);
			const newRotation = angle - startAngle;
			// console.log("Dragging, new rotation (radians):", newRotation);
			setRotation(newRotation);

			// Update game state with new rotation
			setGameState((prev) => ({
				...prev,
				myRotation: newRotation,
			}));

			// Send rotation to server for opponent to see
			emitRotationChange(newRotation);
		}
	};

	const handleMouseUp = () => setIsDragging(false);

	const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
		const rect = canvasRef.current!.getBoundingClientRect();
		const centerX = rect.left + rect.width / 2;
		const centerY = rect.top + rect.height / 2;
		const radius = SPINNER_RADIUS; // same as your pie radius

		const dx = e.clientX - centerX;
		const dy = e.clientY - centerY;
		const distance = Math.sqrt(dx * dx + dy * dy);

		if (distance > radius) {
			// Click is outside the pie
			setMessage("Clicked outside the pie");
			return;
		}

		const angle = Math.atan2(dy, dx) - rotation;
		const normalized = (angle + 2 * Math.PI) % (2 * Math.PI);
		const sliceAngle = (2 * Math.PI) / slices.length;
		const sliceIndex = Math.floor(normalized / sliceAngle) % slices.length;

		const degrees = ((rotation * 180) / Math.PI) % 360;

		// Update selected shot
		if(gameState.playerBowling !== playerId || gameState.gamePhase === "batting") {
			setShotSelected(slices[sliceIndex].label);
		}

		if (
			gameState.playerBowling === playerId &&
			gameState.gamePhase === "setting field"
		) {
			setMessage(`Rotation: ${degrees.toFixed(1)}°`);
		} else if (
			gameState.playerBowling !== playerId &&
			gameState.gamePhase === "batting"
		) {
			setMessage(`Shot selected: ${slices[sliceIndex].label}`);
		}
	};

	// should handle parameter in degrees
	const handleSetRotation = (radians: number) => {
		if (!isNaN(radians)) {
			setRotation(radians);
			setGameState((prev) => ({
				...prev,
				myRotation: radians,
			}));
			// Send manual rotation to server for opponent to see
			emitRotationChange(radians);
		}
	};

	const resetForNextBall = () => {
		setRotation(0);
		setShotSelected(undefined);
		setMessage("");
	};

	// // Emit rotation changes to server (only during player's turn)
	const emitRotationChange = useCallback(
		(newRotation: number) => {
			const isMyTurn = gameState.playerBowling === playerId; // change to gameState.playerBowling

			if (socket && roomId && currentPlayer && isMyTurn) {
				// console.log("Emitting rotation change (radians):", newRotation);
				socket.emit("rotate_pie", {
					roomId,
					playerId: currentPlayer.id,
					rotation: newRotation,
				});
			}
		},
		[socket, roomId, currentPlayer, gameState.playerBowling, playerId],
	);

	// End current player's turn
	// TODO: update logic for batter and bowler turns
	const endTurn = () => {
		const bowling = gameState.playerBowling === playerId; // change to gameState.playerBowling

		if (socket) {
			if (bowling) {
				console.log("Bowler setting field with rotation:", rotation);
				// Bowler sets the field
				socket.emit("field_set", currentPlayer!.id, roomId!, rotation);
			} else {
				if (!shotSelected) {
					alert(
						"Please select a shot by clicking on the pie before submitting.",
					);
					return;
				}
				// Batter shoots the ball
				socket.emit(
					"shot_played",
					currentPlayer!.id,
					roomId!,
					shotSelected!,
				);
			}
			resetForNextBall();
		}
	};

	// helper function
	const getCursorStyle = (): string => {
		if (
			gameState.playerBowling === playerId &&
			gameState.gamePhase === "setting field"
		) {
			if (isDragging) {
				return "grabbing";
			} else {
				return "grab";
			}
		} else if (
			gameState.playerBowling !== playerId &&
			gameState.gamePhase === "batting"
		) {
			return "default";
		} else {
			return "not-allowed";
		}
	};

	const resetToDefaults = () => {
		setCurrentPlayer(DEFAULT_PLAYER);
		setGameState(DEFAULT_GAME_STATE);
		setRotation(DEFAULT_CANVAS_STATE.rotation);
		setIsDragging(DEFAULT_CANVAS_STATE.isDragging);
		setStartAngle(DEFAULT_CANVAS_STATE.startAngle);
		setMessage(DEFAULT_CANVAS_STATE.message);
		setShotSelected(DEFAULT_CANVAS_STATE.shotSelected);
	};

	const handleCreateNewGame = () => {
		createRoom();
		resetToDefaults();
	};


	return (
		<div style={{ textAlign: "center" }}>
			<div
				onClick={() => navigate("/")}
				style={{
					position: "absolute",
					top: 20,
					left: 20,
					display: "flex",
					alignItems: "center",
					gap: "8px",
					cursor: "pointer",
					fontWeight: "bold",
					fontSize: "18px",
					color: "#2196F3",
					userSelect: "none",
				}}
				aria-label="Go to Home" // Accessibility label
			>
				<span style={{ fontSize: "24px" }}>🏠</span>
			</div>
			{/* Turn indicator */}
			<div
				style={{
					marginBottom: "20px",
				}}
			>
				{gameState.gamePhase === "finished" ? (
					<h2
						style={{
							color: "#4CAF50",
						}}
					>
						Game Finished!
					</h2>
				) : gameState.playerBowling === playerId &&
				  gameState.gamePhase === "setting field" ? (
					<h2
						style={{
							color: "#2196F3",
						}}
					>
						Your turn to set the field(Ball {gameState.currentBall}/
						{gameState.totalBalls})
					</h2>
				) : gameState.playerBowling !== playerId &&
				  gameState.gamePhase === "batting" ? (
					<h2
						style={{
							color: "#36aa12ff",
						}}
					>
						Your turn to choose a shot(Ball {gameState.currentBall}/
						{gameState.totalBalls})
					</h2>
				) : (
					<h2
						style={{
							color: "#FF9800",
						}}
					>
						Opponent is batting now (Ball {gameState.currentBall}/
						{gameState.totalBalls})
					</h2>
				)}
			</div>

			{/* Game action buttons */}
			<div
				style={{
					marginBottom: "20px",
					display: "flex",
					justifyContent: "center",
					gap: "10px",
				}}
			>
				{gameState.gamePhase === "finished" && (
					<button
						onClick={handleCreateNewGame}
						disabled={isCreatingRoom}
						style={{
							padding: "10px 20px",
							fontSize: "16px",
							backgroundColor: isCreatingRoom ? "#ccc" : "#4CAF50",
							color: "white",
							border: "none",
							borderRadius: "5px",
							cursor: isCreatingRoom ? "not-allowed" : "pointer",
						}}
					>
						{isCreatingRoom ? "Creating Game..." : "Create New Game"}
					</button>
				)}
			</div>

			{/* Main game canvas */}
			<div
				style={{
					position: "relative",
					display: "inline-block",
				}}
			>
				<canvas
					ref={canvasRef}
					width={400}
					height={400}
					style={{
						border: "2px solid #ddd",
						borderRadius: "50%",
						cursor: getCursorStyle(),
						touchAction: "none",
						opacity:
							(gameState.playerBowling === playerId &&
								gameState.gamePhase === "setting field") ||
							(gameState.playerBowling !== playerId &&
								gameState.gamePhase === "batting")
								? 1
								: 0.7,
					}}
					onMouseDown={
						gameState.playerBowling === playerId &&
						gameState.gamePhase === "setting field"
							? handleMouseDown
							: undefined
					}
					onMouseMove={
						(gameState.playerBowling === playerId &&
							gameState.gamePhase === "setting field") ||
						(gameState.playerBowling !== playerId &&
							gameState.gamePhase === "batting")
							? handleMouseMoveCursor
							: undefined
					}
					onMouseUp={
						gameState.playerBowling === playerId &&
						gameState.gamePhase === "setting field"
							? handleMouseUp
							: undefined
					}
					onMouseLeave={handleMouseUp}
					onClick={handleClick}
					onTouchStart={
						gameState.playerBowling === playerId &&
						gameState.gamePhase === "setting field"
							? (e) => handleMouseDown(e.touches[0] as any)
							: undefined
					}
					onTouchMove={
						gameState.playerBowling === playerId &&
						gameState.gamePhase === "setting field"
							? (e) => handleMouseMoveCursor(e.touches[0] as any)
							: undefined
					}
					onTouchEnd={handleMouseUp}
				/>
				{/* Dark overlay to dim the pie when player is batting only */}
				{(gameState.playerBowling !== playerId && !(gameState.gamePhase === "finished" || gameState.gamePhase === "waiting")) && (
					<div
						style={{
							position: "absolute",
							top: 50,
							left: 50,
							width: SPINNER_RADIUS * 2+2,
							height: SPINNER_RADIUS * 2+2,
							backgroundColor: OVERLAY_COLOR, // fully black, can reduce opacity if you want slight transparency
							borderRadius: "50%",
							pointerEvents: "none", // allows clicks to go through to canvas
							overflow: "hidden",
							transform: `rotate(${rotation}rad)`, // 🔁 rotate with canvas
							transition: "transform 0.1s linear", // smooth optional
						}}
				>
					{/* Slice division lines drawn on top */}
					<svg
						width={SPINNER_RADIUS * 2+2}
						height={SPINNER_RADIUS * 2+2}
						style={{
							position: "absolute",
							top: 0,
							left: 0,
							pointerEvents: "none",
						}}
					>
						{Array.from({ length: slices.length }).map((_, i) => {
							const angle = (i * 2 * Math.PI) / slices.length - Math.PI / 2; // start from top
							const x = SPINNER_RADIUS + SPINNER_RADIUS * Math.cos(angle);
							const y = SPINNER_RADIUS + SPINNER_RADIUS * Math.sin(angle);
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
				)}
				{/* Overlay message when not player's turn */}
				{((gameState.gamePhase === "setting field" &&
					gameState.playerBowling !== playerId) ||
					(gameState.gamePhase === "batting" &&
						gameState.playerBowling === playerId) ||
					gameState.gamePhase === "finished") && (
					<div
						style={{
							position: "absolute",
							top: 0,
							left: 0,
							right: 0,
							bottom: 0,
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							backgroundColor: "rgba(255, 255, 255, 0.8)",
							borderRadius: "50%",
							fontSize: "18px",
							fontWeight: "bold",
							color: "#666",
						}}
					>
						{gameState.gamePhase === "finished"
							? "Game Complete!"
							: "Waiting for opponent..."}
					</div>
				)}
			</div>

			{/* Game message: For debugging only */}
			{/* <p
				style={{
					fontSize: "20px",
					fontWeight: "bold",
					margin: "20px 0",
				}}
			>
				{message}
			</p> */}

			{/* End turn button - only show during player's turn */}
			{((gameState.gamePhase === "setting field" &&
				gameState.playerBowling === playerId) ||
				(gameState.gamePhase === "batting" &&
					gameState.playerBowling !== playerId)) && (
				<div
					style={{
						margin: "20px 0",
					}}
				>
					<button
						onClick={endTurn}
						style={{
							padding: "12px 24px",
							fontSize: "16px",
							backgroundColor:
								gameState.gamePhase === "batting" && shotSelected === undefined
									? "#ccc"
									: "#4CAF50",
							color: "white",
							border: "none",
							borderRadius: "5px",
							cursor:
								gameState.gamePhase === "batting" && shotSelected === undefined
									? "not-allowed"
									: "pointer",
						}}
						disabled={gameState.gamePhase === "batting" && shotSelected === undefined}
					>
						{gameState.gamePhase === "setting field"
							? "Submit Field Setup"
							: "Submit Shot"}
					</button>
				</div>
			)}

			{/* Delivery Summary (Live + Final) */}
			{(gameState.gamePhase === "batting" ||
				gameState.gamePhase === "setting field" ||
				gameState.gamePhase === "finished") && (
					<div
						style={{
							marginTop: "30px",
							padding: "20px",
							backgroundColor: "#f5f5f5",
							borderRadius: "10px",
							maxWidth: "450px",
							margin: "30px auto",
							textAlign: "center",
						}}
					>
						{/* Title */}
						<h3>
							{gameState.gamePhase === "finished"
								? "Game Over!"
								: "Live Match"}
						</h3>

						<h3>
							{gameState.gamePhase === "finished"
								? "Final Scores"
								: `Current Innings: ${gameState.innings}`}
						</h3>

						{/* Show winner only when finished */}
						{gameState.gamePhase === "finished" && (
							<>
								{/* If Innings 1 scored more than Innings 2, player who bowled first wins */}
								{gameState.inningsOneRuns > gameState.inningsTwoRuns ? (
									<p style={{ color: gameState.playerBowling === playerId ? "green" : "red"}}>{gameState.playerBowling === playerId ? "You" : "Your Opponent"} Won!</p>
								) : gameState.inningsTwoRuns > gameState.inningsOneRuns ? (
									<p style={{ color: gameState.playerBowling === playerId ? "red" : "green" }}>{gameState.playerBowling === playerId ? "You" : "Your Opponent"} Won!</p>
								) : (
									<p style={{ color: "orange" }}>It's a Tie!</p>
								)}
							</>
						)}

						{/* Delivery history */}
						<div style={{ marginTop: "20px" }}>
						<h3>Delivery Summary</h3>

						{[1, 2].map((innings) => {
							const deliveries = gameState.deliveryHistory.filter(
							(d) => d.innings === innings,
							);

							// Get total runs for this innings
							const totalRuns = innings === 1 ? gameState.inningsOneRuns : gameState.inningsTwoRuns;

							return (
							<div key={innings} style={{ marginBottom: "15px" }}>
								<div
								style={{
									display: "flex",
									alignItems: "center",
									justifyContent: "flex-start",
									marginBottom: "4px",
								}}
								>
								<strong
									style={{
									width: "100px",
									textAlign: "right",
									}}
								>
									Innings {innings}
								</strong>
								<span style={{ marginLeft: "10px", fontWeight: "bold", color: "red" }}>
									Runs: {totalRuns}
								</span>
								</div>

								<div
								style={{
									display: "flex",
									flexWrap: "wrap",
									gap: "8px",
									marginLeft: "110px", // align with balls
								}}
								>
								{deliveries.map((delivery, i) => {
									const color =
									slices.find((s) => s.label === delivery.batsmanChoice)?.color || "#ccc";

									return (
									<div
										key={i}
										style={{
										width: "30px",
										height: "30px",
										borderRadius: "50%",
										backgroundColor: color,
										color: "#fff",
										display: "flex",
										alignItems: "center",
										justifyContent: "center",
										fontWeight: "bold",
										}}
									>
										{delivery.batsmanChoice}
									</div>
									);
								})}
								</div>
							</div>
							);
						})}
						</div>

					</div>
			)}


			{/* Ongoing game stats */}
			{/* {gameState.gamePhase !== "finished" && (
				<div
					style={{
						marginTop: "30px",
						padding: "20px",
						backgroundColor: "#f5f5f5",
						borderRadius: "5px",
						maxWidth: "400px",
						margin: "30px auto",
					}}
				>
					<h3>Game Info</h3>
					<h3>Innings: 1</h3>
					{gameState.innings === 1 && (
						<>
							<p style={{ color: "red" }}>
								First Innings in Progress
							</p>
							<p>
								Balls Bowled: {gameState.currentBall - 1} /{" "}
								{gameState.totalBalls}
							</p>
						</>
					)}
					<p>
						Wickets Fallen: {gameState.inningsOneWicketCurrentCount}{" "}
						/ {gameState.totalWickets}
					</p>
					<p>Runs: {gameState.inningsOneRuns}</p>

					<h3>Innings: 2</h3>
					{gameState.innings === 2 && (
						<>
							<p style={{ color: "red" }}>
								Second Innings in Progress
							</p>
							<p>
								Balls Bowled: {gameState.currentBall - 1} /{" "}
								{gameState.totalBalls}
							</p>
						</>
					)}
					<p>
						Wickets Fallen: {gameState.inningsTwoWicketCurrentCount}{" "}
						/ {gameState.totalWickets}
					</p>
					<p>Runs: {gameState.inningsTwoRuns}</p>
				</div>
			)} */}
		</div>
	);
};

export default SpinPie;

