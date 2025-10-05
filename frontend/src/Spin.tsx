import React, { useRef, useEffect, useState, useCallback } from "react";
import { useParams } from 'react-router-dom';
import { useSocket, Player, GameState } from './contexts/SocketContext';
import { usePlayerId } from './hooks/usePlayerId';

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
];


const SpinPie: React.FC = () => {
	// Get room ID from URL params
	const { roomId } = useParams<{ roomId: string }>();
	const { socket } = useSocket();
	const { playerId } = usePlayerId();

	// Player state management
	const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);

	// Canvas and interaction state
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const [rotation, setRotation] = useState<number>(0); // radians
	const [isDragging, setIsDragging] = useState<boolean>(false);
	const [startAngle, setStartAngle] = useState<number>(0);
	const [message, setMessage] = useState<string>("");
	const [inputDeg, setInputDeg] = useState<string>("");

	// Turn-based game state
	const [gameState, setGameState] = useState<GameState>({
		players: [],
		currentTurn: 1,
		currentPlayerId: '',
		totalTurns: 6,
		gamePhase: 'waiting',
	});

	const SPINNER_RADIUS = 150; // Static radius for the spinner

	const drawPie = (
		ctx: CanvasRenderingContext2D,
		centerX: number,
		centerY: number,
		radius: number,
		rotationAngle: number
	) => {
		const sliceAngle = (2 * Math.PI) / slices.length;

		slices.forEach((slice, i) => {
		const start = i * sliceAngle + rotationAngle;
		const end = start + sliceAngle;

		ctx.beginPath();
		ctx.moveTo(centerX, centerY);
		ctx.arc(centerX, centerY, radius, start, end);
		ctx.closePath();
		ctx.fillStyle = slice.color;
		ctx.fill();

		// Label
		ctx.save();
		ctx.translate(centerX, centerY);
		ctx.rotate(start + sliceAngle / 2);
		ctx.textAlign = "right";
		ctx.fillStyle = "white";
		ctx.font = "16px sans-serif";
		ctx.fillText(slice.label, radius - 10, 5);
		ctx.restore();
		});
	};

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		ctx.clearRect(0, 0, canvas.width, canvas.height);
		drawPie(ctx, canvas.width / 2, canvas.height / 2, SPINNER_RADIUS, rotation);
	}, [rotation]);

	// Socket event handlers for turn-based gameplay
	useEffect(() => {
		if (!socket || !roomId) return;

		// First, join the room (this adds the player to the room)
		if (!currentPlayer?.connected) {
			console.log('Joining room:', roomId, 'as player:', playerId);
			socket.emit('join_room', roomId, playerId!);
		}
		// Event handler functions (defined outside useEffect for dependencies)
		const handlePlayerJoined = (gameState: GameState, player: Player) => {
			console.log('Player joined room:', player);
			console.log('Game state on player joined:', gameState.players);
			setCurrentPlayer(player); // Set the current player information
			setGameState(prev => ({
				...prev,
				...gameState
			}));

			socket.emit('player_joined', player);
		};

		const handleRoomNotFound = () => {
			console.error('Room not found');
			alert('Room not found! Please check the room ID and try again.');
		};

		const handleRoomFull = () => {
			console.error('Room is full');
			alert('Room is full! Maximum 2 players allowed.');
		};

		const handleGameStarted = (gameState: GameState) => {
			console.log('Game started received:', gameState);
			setGameState(prev => ({
				...prev,
				...gameState
			}));
		};

		const handleRotationUpdate = (gameState: GameState, rotation: number) => {
			// Get gamestate too and prevent handling if not opponent's turn
			if (gameState.currentPlayerId === playerId) {
				return;
			}
			// rotation is in radians
			console.log('Rotation update received:', rotation);
			// We need to ensure we don't send our own rotation back to us in socket 
			handleSetRotation(rotation); // Update display with opponent's rotation
		};

		const handleGameEnded = (gameState: GameState) => {
			console.log('Game ended, final state:', gameState);
			setGameState(prev => ({
				...prev,
				...gameState
			}));
		};

		// Register event listeners
		socket.on('player_joined', handlePlayerJoined);
		socket.on('room_not_found', handleRoomNotFound);
		socket.on('room_full', handleRoomFull);
		socket.on('game_started', handleGameStarted);
		socket.on('rotation_update', handleRotationUpdate);
		socket.on('game_ended', handleGameEnded);

		return () => {
			socket.off('player_joined', handlePlayerJoined);
			socket.off('room_not_found', handleRoomNotFound);
			socket.off('room_full', handleRoomFull);
			socket.off('game_started', handleGameStarted);
			socket.off('rotation_update', handleRotationUpdate);
			socket.off('game_ended', handleGameEnded);
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
		const isMyTurn = gameState.currentPlayerId === playerId; // change to gameState.playerBowling

		if (!canvas) return;

		const rect = canvas.getBoundingClientRect();
		const centerX = rect.left + rect.width / 2;
		const centerY = rect.top + rect.height / 2;

		const dx = e.clientX - centerX;
		const dy = e.clientY - centerY;
		const distance = Math.sqrt(dx * dx + dy * dy);

		if (distance <= SPINNER_RADIUS) {
			canvas.style.cursor = isDragging ? "grabbing" : "grab";
		} else {
			canvas.style.cursor = "default";
		}

		if (isDragging && isMyTurn && gameState.gamePhase === 'playing') { // gamePhase === 'setting field'
			// Continue rotation while dragging (only during player's turn)
			const angle = Math.atan2(dy, dx);
			const newRotation = angle - startAngle;
			console.log('Dragging, new rotation (radians):', newRotation);
			setRotation(newRotation);

			// Update game state with new rotation
			setGameState(prev => ({
				...prev,
				myRotation: newRotation
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

		setMessage(
			`You clicked: ${slices[sliceIndex].label} | Rotation: ${degrees.toFixed(1)}°`
		);
	};


	// should handle parameter in degrees
	const handleSetRotation = (radians: number) => {
		if (!isNaN(radians)) {
			setRotation(radians);
			setGameState(prev => ({
				...prev,
				myRotation: radians
			}));
			// Send manual rotation to server for opponent to see
			emitRotationChange(radians);
		}
	};

	// Emit rotation changes to server (only during player's turn)
	const emitRotationChange = useCallback((newRotation: number) => {
		const isMyTurn = gameState.currentPlayerId === playerId; // change to gameState.playerBowling

		if (socket && roomId && currentPlayer && isMyTurn) {
			console.log('Emitting rotation change (radians):', newRotation);
			socket.emit('rotate_pie', {
				roomId,
				playerId: currentPlayer.id,
				rotation: newRotation
			});
		}
	}, [socket, roomId, currentPlayer, gameState.currentPlayerId]);

	// End current player's turn
	const endTurn = useCallback(() => {
		const isMyTurn = gameState.currentPlayerId === playerId; // change to gameState.playerBowling

		if (socket && isMyTurn) { // Need to update logic to switch between bowler and batsman
			socket.emit('end_turn', roomId!, rotation); // send 
		}
	}, [socket, gameState.currentPlayerId]);

	return (
		<div style={{ textAlign: "center" }}>
			{/* Turn indicator */}
			<div style={{ marginBottom: "20px" }}>
				{gameState.gamePhase === 'finished' ? (
					<h2 style={{ color: "#4CAF50" }}>Game Finished!</h2>
				) : gameState.currentPlayerId === playerId ? (
					<h2 style={{ color: "#2196F3" }}>Your Turn (Turn {gameState.currentTurn}/6)</h2>
				) : (
					<h2 style={{ color: "#FF9800" }}>Opponent's Turn (Turn {gameState.currentTurn}/6)</h2>
				)}
			</div>

			{/* Main game canvas */}
			<div style={{ position: "relative", display: "inline-block" }}>
				<canvas
					ref={canvasRef}
					width={400}
					height={400}
					style={{
						border: "2px solid #ddd",
						borderRadius: "50%",
						cursor: gameState.currentPlayerId === playerId && gameState.gamePhase === 'playing' ? "grab" : "not-allowed",
						touchAction: "none",
						opacity: gameState.currentPlayerId === playerId && gameState.gamePhase === 'playing' ? 1 : 0.7
					}}
					onMouseDown={gameState.currentPlayerId === playerId && gameState.gamePhase === 'playing' ? handleMouseDown : undefined}
					onMouseMove={gameState.currentPlayerId === playerId && gameState.gamePhase === 'playing' ? handleMouseMoveCursor : undefined}
					onMouseUp={gameState.currentPlayerId === playerId && gameState.gamePhase === 'playing' ? handleMouseUp : undefined}
					onMouseLeave={handleMouseUp}
					onClick={handleClick}
					onTouchStart={gameState.currentPlayerId === playerId && gameState.gamePhase === 'playing' ?
						(e) => handleMouseDown(e.touches[0] as any) : undefined}
					onTouchMove={gameState.currentPlayerId === playerId && gameState.gamePhase === 'playing' ?
						(e) => handleMouseMoveCursor(e.touches[0] as any) : undefined}
					onTouchEnd={handleMouseUp}
				/>

				{/* Overlay message when not player's turn */}
				{(gameState.currentPlayerId !== playerId || gameState.gamePhase !== 'playing') && (
					<div style={{
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
						color: "#666"
					}}>
						{gameState.gamePhase === 'finished' ? 'Game Complete!' : 'Waiting for opponent...'}
					</div>
				)}
			</div>

			{/* Game message */}
			<p style={{ fontSize: "20px", fontWeight: "bold", margin: "20px 0" }}>{message}</p>

			{/* End turn button - only show during player's turn */}
			{gameState.currentPlayerId === playerId && gameState.gamePhase === 'playing' && (
				<div style={{ margin: "20px 0" }}>
					<button
						onClick={endTurn}
						style={{
							padding: "12px 24px",
							fontSize: "16px",
							backgroundColor: "#FF5722",
							color: "white",
							border: "none",
							borderRadius: "5px",
							cursor: "pointer"
						}}
					>
						End Turn ({gameState.currentTurn}/6)
					</button>
				</div>
			)}

			{/* Manual rotation input (for testing)
			<div style={{ marginTop: "20px" }}>
				<input
					type="number"
					value={inputDeg}
					onChange={(e) => setInputDeg(e.target.value)}
					placeholder="Enter rotation in degrees"
					disabled={!gameState.isMyTurn || gameState.gamePhase !== 'playing'}
					style={{
						padding: "8px 12px",
						fontSize: "14px",
						border: "1px solid #ddd",
						borderRadius: "3px",
						marginRight: "10px",
						opacity: gameState.isMyTurn && gameState.gamePhase === 'playing' ? 1 : 0.5
					}}
				/>
				<button
					onClick={handleSetRotation}
					disabled={!gameState.isMyTurn || gameState.gamePhase !== 'playing'}
					style={{
						padding: "8px 16px",
						fontSize: "14px",
						backgroundColor: "#4CAF50",
						color: "white",
						border: "none",
						borderRadius: "3px",
						cursor: gameState.isMyTurn && gameState.gamePhase === 'playing' ? "pointer" : "not-allowed",
						opacity: gameState.isMyTurn && gameState.gamePhase === 'playing' ? 1 : 0.5
					}}
				>
					Set Rotation
				</button>
			</div> */}

			{/* Game history (when finished) */}
			{gameState.gamePhase === 'finished' && (
				<div style={{
					marginTop: "30px",
					padding: "20px",
					backgroundColor: "#f5f5f5",
					borderRadius: "5px",
					maxWidth: "400px",
					margin: "30px auto"
				}}>
					<h3>Game Complete!</h3>
					<p>Total moves played: {gameState.gamePhase === 'finished' ? gameState.currentTurn : gameState.currentTurn - 1}</p>
					<p>Thanks for playing!</p>
				</div>
			)}
		</div>
	);
};

export default SpinPie;
