import React, { useState, useEffect, useCallback } from "react";
import { validate as uuidValidate } from "uuid";
import { useRoom } from "../hooks/useRoom";
import { useSocket } from "../contexts/SocketContext";
import { usePlayerId } from "../hooks/usePlayerId";
import { GameRoleResponse } from "../types/api";
import { apiClient } from "../api/client";
import { GameState } from "../types";

type ActiveGame = { roomId: string; gameState: GameState };

// Reusable button style
const buttonStyle = (bg: string, disabled = false) => ({
	padding: "10px 20px",
	fontSize: "16px",
	backgroundColor: bg,
	color: "white",
	border: "none",
	borderRadius: "6px",
	cursor: disabled ? "not-allowed" : "pointer",
});

// Component for ongoing game display
const OngoingGameCard: React.FC<{
	game: GameRoleResponse;
	onRejoin: () => void;
}> = ({ game, onRejoin }) => {
	const isLive = game.status === "In Progress";
	return (
		<div
			style={{
				marginTop: 30,
				padding: "16px 22px",
				background: "linear-gradient(135deg, #e3f2fd, #f8fbff)",
				border: "1px solid #bbdefb",
				borderRadius: 10,
				display: "flex",
				justifyContent: "space-between",
				alignItems: "center",
				boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
				maxWidth: 420,
				marginInline: "auto",
			}}
		>
			<div style={{ color: "#0d47a1", fontSize: 15 }}>
				<div style={{ display: "flex", alignItems: "center", gap: 6 }}>
					<span role="img" aria-label="controller">
						🎮
					</span>
					<span>
						<span style={{ opacity: 0.85 }}>Active game as</span>{" "}
						<strong>{game.role}</strong>
					</span>
				</div>
				<div
					style={{
						display: "flex",
						alignItems: "center",
						marginTop: 6,
					}}
				>
					<div
						style={{
							display: "inline-flex",
							alignItems: "center",
							gap: 6,
							padding: "4px 10px",
							fontSize: 13,
							borderRadius: 6,
							backgroundColor: isLive ? "#c8e6c9" : "#fff3cd",
							color: isLive ? "#2e7d32" : "#8a6d3b",
							fontWeight: 500,
						}}
					>
						<div
							style={{
								width: 10,
								height: 10,
								borderRadius: "50%",
								backgroundColor: isLive ? "green" : "orange",
								border: "1px solid rgba(0,0,0,0.3)",
							}}
						/>
						{isLive ? "Live Match" : "Waiting for Players"}
					</div>
				</div>
			</div>
			<button
				onClick={onRejoin}
				style={{
					...buttonStyle("#1565c0"),
					padding: "8px 14px",
					fontSize: 14,
					fontWeight: 500,
				}}
			>
				Rejoin
			</button>
		</div>
	);
};

// Component for active game card
const ActiveGameCard: React.FC<{
	game: ActiveGame;
	onJoin: (id: string) => void;
}> = ({ game, onJoin }) => {
	const status =
		game.gameState?.gamePhase === "waiting"
			? "Waiting for Players"
			: "In Progress";
	const playerCount = game.gameState?.players?.length ?? 0;
	const audienceCount = game.gameState?.audience?.length ?? 0;

	return (
		<div
			style={{
				padding: 12,
				borderRadius: 8,
				border: "1px solid #e0e0e0",
				background: "#fff",
				display: "flex",
				justifyContent: "space-between",
				alignItems: "center",
			}}
		>
			<div>
				<div style={{ fontWeight: 600, color: "#333" }}>
					{game.roomId}
				</div>
				<div style={{ fontSize: 12, color: "#666" }}>{status}</div>
				{status === "Waiting for Players" && (
					<div style={{ fontSize: 12, color: "#666", marginTop: 6 }}>
						<span style={{ marginRight: 8 }}>
							Players: {playerCount} / 2
						</span>
						<span>Audience: {audienceCount}</span>
					</div>
				)}
			</div>
			<button
				onClick={() => onJoin(game.roomId)}
				style={buttonStyle("#1976d2")}
			>
				Join
			</button>
		</div>
	);
};

const RoomLobby: React.FC = () => {
	const { socket } = useSocket();
	const { createRoom, joinRoom, isCreatingRoom } = useRoom(socket);
	const { playerId } = usePlayerId();

	const [inputRoomId, setInputRoomId] = useState("");
	const [ongoingGame, setOngoingGame] = useState<GameRoleResponse | null>(
		null,
	);
	const [activeGamesList, setActiveGamesList] = useState<ActiveGame[]>([]);
	const [isLoading, setIsLoading] = useState(true);

	// -----------------------------
	// Fetch functions declared separately
	// -----------------------------
	const fetchOngoingGame = useCallback(async () => {
		if (!playerId) return;
		try {
			const response = await apiClient.get<GameRoleResponse>(
				`/games?playerId=${playerId}`,
			);
			setOngoingGame(response.data);
		} catch {
			setOngoingGame(null);
		} finally {
			setIsLoading(false);
		}
	}, [playerId]);

	const fetchActiveGames = useCallback(async () => {
		try {
			const response = await apiClient.get<ActiveGame[]>("/games/active");
			const filtered: ActiveGame[] = (response.data || []).filter(
				(game) => game.roomId !== ongoingGame?.roomId,
			);
			console.log("Fetched active games:", filtered);
			setActiveGamesList(filtered);
		} catch {
			setActiveGamesList([]);
		}
	}, [ongoingGame]);

	// -----------------------------
	// Effects
	// -----------------------------
	useEffect(() => {
		fetchOngoingGame();
	}, [fetchOngoingGame]);

	useEffect(() => {
		if (isLoading) return;

		fetchActiveGames();
	}, [isLoading, ongoingGame, fetchActiveGames]);

	// -----------------------------
	// Callbacks
	// -----------------------------
	const handleJoinRoom = useCallback(() => {
		const trimmed = inputRoomId.trim();
		if (!trimmed) return;
		let roomId = trimmed;
		if (uuidValidate(roomId)) {
			// it's a direct UUID
		} else {
			// try to parse as URL
			try {
				const url = new URL(roomId);
				const pathSegments = url.pathname.split("/").filter(Boolean);
				const lastSegment = pathSegments[pathSegments.length - 1];
				if (lastSegment && uuidValidate(lastSegment)) {
					roomId = lastSegment;
				} else {
					// invalid
					alert("Invalid room ID or link");
					return;
				}
			} catch {
				// not a URL, invalid
				alert("Invalid room ID or link");
				return;
			}
		}
		joinRoom(roomId);
	}, [inputRoomId, joinRoom]);

	const handleRejoinGame = useCallback(() => {
		if (ongoingGame) joinRoom(ongoingGame.roomId);
	}, [ongoingGame, joinRoom]);

	// -----------------------------
	// JSX
	// -----------------------------
	return (
		<div
			style={{
				minHeight: "100vh",
				background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
				fontFamily: "Arial, sans-serif",
			}}
		>
			{/* Navigation Bar */}
			<nav
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					padding: "20px 50px",
					background: "rgba(255, 255, 255, 0.95)",
					boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
					backdropFilter: "blur(10px)",
				}}
			>
				<h1
					style={{
						margin: 0,
						color: "#333",
						fontSize: "28px",
						fontWeight: "bold",
					}}
				>
					Paper Cricket - Multiplayer
				</h1>
				<button
					style={{
						padding: "10px 20px",
						background: "#667eea",
						color: "white",
						border: "none",
						borderRadius: "25px",
						cursor: "pointer",
						fontSize: "16px",
						fontWeight: "500",
						transition: "all 0.3s ease",
					}}
					onMouseEnter={(e) =>
						(e.currentTarget.style.background = "#5a6fd8")
					}
					onMouseLeave={(e) =>
						(e.currentTarget.style.background = "#667eea")
					}
				>
					About
				</button>
			</nav>

			{/* Main Content */}
			<div
				style={{ textAlign: "center", padding: "50px", color: "white" }}
			>
				<div
					style={{
						maxWidth: "1200px",
						margin: "0 auto",
						background: "rgba(255, 255, 255, 0.1)",
						borderRadius: "20px",
						padding: "40px",
						boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
						backdropFilter: "blur(10px)",
					}}
				>
					<h1
						style={{
							color: "white",
							marginBottom: "40px",
							fontSize: "36px",
							fontWeight: "bold",
						}}
					>
						Welcome to Paper Cricket
					</h1>

					{/* Create room */}
					<div style={{ margin: "40px 0" }}>
						<button
							onClick={createRoom}
							disabled={isCreatingRoom}
							style={{
								...buttonStyle("#4CAF50", isCreatingRoom),
								padding: "15px 30px",
								fontSize: "18px",
								borderRadius: "30px",
								boxShadow: "0 4px 15px rgba(76, 175, 80, 0.3)",
								transition: "all 0.3s ease",
							}}
							onMouseEnter={(e) => {
								if (!isCreatingRoom) {
									e.currentTarget.style.transform =
										"translateY(-2px)";
									e.currentTarget.style.boxShadow =
										"0 6px 20px rgba(76, 175, 80, 0.4)";
								}
							}}
							onMouseLeave={(e) => {
								if (!isCreatingRoom) {
									e.currentTarget.style.transform =
										"translateY(0)";
									e.currentTarget.style.boxShadow =
										"0 4px 15px rgba(76, 175, 80, 0.3)";
								}
							}}
						>
							{isCreatingRoom
								? "Creating Game..."
								: "Create New Game"}
						</button>
					</div>

					{/* Join room */}
					<div style={{ margin: "40px 0" }}>
						<h3
							style={{
								color: "white",
								marginBottom: "20px",
								fontSize: "24px",
							}}
						>
							Or join an existing room:
						</h3>
						<div
							style={{
								display: "flex",
								justifyContent: "center",
								gap: 15,
								marginTop: 20,
								flexWrap: "wrap",
							}}
						>
							<input
								type="text"
								placeholder="Enter Room ID (UUID) or paste game link"
								value={inputRoomId}
								onChange={(e) => setInputRoomId(e.target.value)}
								style={{
									padding: "15px 20px",
									fontSize: 16,
									border: "2px solid rgba(255,255,255,0.3)",
									borderRadius: 30,
									width: "300px",
									maxWidth: "100%",
									background: "rgba(255,255,255,0.9)",
									color: "#333",
									outline: "none",
									transition: "border-color 0.3s ease",
								}}
								onFocus={(e) =>
									(e.currentTarget.style.borderColor =
										"#667eea")
								}
								onBlur={(e) =>
									(e.currentTarget.style.borderColor =
										"rgba(255,255,255,0.3)")
								}
							/>
							<button
								onClick={handleJoinRoom}
								disabled={!inputRoomId.trim()}
								style={{
									...buttonStyle(
										"#2196F3",
										!inputRoomId.trim(),
									),
									padding: "15px 30px",
									fontSize: "18px",
									borderRadius: "30px",
									boxShadow:
										"0 4px 15px rgba(33, 150, 243, 0.3)",
									transition: "all 0.3s ease",
								}}
								onMouseEnter={(e) => {
									if (inputRoomId.trim()) {
										e.currentTarget.style.transform =
											"translateY(-2px)";
										e.currentTarget.style.boxShadow =
											"0 6px 20px rgba(33, 150, 243, 0.4)";
									}
								}}
								onMouseLeave={(e) => {
									if (inputRoomId.trim()) {
										e.currentTarget.style.transform =
											"translateY(0)";
										e.currentTarget.style.boxShadow =
											"0 4px 15px rgba(33, 150, 243, 0.3)";
									}
								}}
							>
								Join Room
							</button>
						</div>
					</div>

					{/* Ongoing game card */}
					{!isLoading && ongoingGame && (
						<OngoingGameCard
							game={ongoingGame}
							onRejoin={handleRejoinGame}
						/>
					)}

					{/* Active games list */}
					{activeGamesList.length > 0 && (
						<div
							style={{
								marginTop: 40,
								maxWidth: 800,
								marginInline: "auto",
								textAlign: "left",
							}}
						>
							<h3
								style={{
									textAlign: "center",
									color: "white",
									marginBottom: "20px",
									fontSize: "24px",
								}}
							>
								Active Games
							</h3>
							<div
								style={{
									display: "grid",
									gap: 15,
									gridTemplateColumns:
										"repeat(auto-fit, minmax(280px, 1fr))",
								}}
							>
								{activeGamesList.map((g) => (
									<ActiveGameCard
										key={g.roomId}
										game={g}
										onJoin={joinRoom}
									/>
								))}
							</div>
						</div>
					)}

					{/* Footer */}
					<div
						style={{
							marginTop: 60,
							color: "rgba(255,255,255,0.8)",
							fontSize: 16,
						}}
					>
						<p>
							Share the room URL with a friend to start playing!
						</p>
						<p>Room creator always takes the first turn.</p>
					</div>
				</div>
			</div>
		</div>
	);
};

export default RoomLobby;
