import React, { useState, useEffect } from "react";
import { useRoom } from "../hooks/useRoom";
import { useSocket } from "../contexts/SocketContext";
import { usePlayerId } from "../hooks/usePlayerId";
import { GameRoleResponse } from "../types/api";
import { apiClient } from "../api/client";

const RoomLobby: React.FC = () => {
	const { socket, isConnected } = useSocket();
	const { createRoom, joinRoom, isCreatingRoom } = useRoom(socket);
	const [inputRoomId, setInputRoomId] = useState("");
	const { playerId } = usePlayerId();
	const [activeGame, setActiveGame] = useState<GameRoleResponse | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		const checkActiveGame = async () => {
			try {
				const { data } = await apiClient.get<GameRoleResponse>(
					`/games?playerId=${playerId}`,
				);
				setActiveGame(data);
			} catch (error) {
				console.error("Error checking active game:", error);
			} finally {
				setIsLoading(false);
			}
		};

		if (playerId) {
			checkActiveGame();
		}
	}, [playerId]);

	const handleRejoinGame = () => {
		if (activeGame) {
			joinRoom(activeGame.roomId);
		}
	};

	const handleJoinRoom = () => {
		if (inputRoomId.trim()) {
			joinRoom(inputRoomId.trim());
		}
	};

	return (
		<div
			style={{
				textAlign: "center",
				padding: "50px",
			}}
		>
			<h1>Paper Cricket - Multiplayer</h1>

			<div
				style={{
					margin: "30px 0",
				}}
			>
				<button
					onClick={createRoom}
					disabled={isCreatingRoom}
					style={{
						padding: "15px 30px",
						fontSize: "18px",
						marginRight: "20px",
						backgroundColor: "#4CAF50",
						color: "white",
						border: "none",
						borderRadius: "5px",
						cursor: isCreatingRoom ? "not-allowed" : "pointer",
					}}
				>
					{isCreatingRoom ? "Creating Game..." : "Create New Game"}
				</button>
			</div>

			<div
				style={{
					margin: "30px 0",
				}}
			>
				<h3>Or join an existing room:</h3>
				<div
					style={{
						display: "flex",
						justifyContent: "center",
						gap: "10px",
						marginTop: "15px",
					}}
				>
					<input
						type="text"
						placeholder="Enter Room ID"
						value={inputRoomId}
						onChange={(e) => setInputRoomId(e.target.value)}
						style={{
							padding: "10px 15px",
							fontSize: "16px",
							border: "2px solid #ddd",
							borderRadius: "5px",
							width: "200px",
						}}
					/>
					<button
						onClick={handleJoinRoom}
						disabled={!inputRoomId.trim()}
						style={{
							padding: "10px 20px",
							fontSize: "16px",
							backgroundColor: "#2196F3",
							color: "white",
							border: "none",
							borderRadius: "5px",
							cursor: !inputRoomId.trim()
								? "not-allowed"
								: "pointer",
						}}
					>
						Join Room
					</button>
				</div>
			</div>

			{!isLoading && activeGame && (
				<div
					style={{
						marginTop: "30px",
						padding: "16px 22px",
						background: "linear-gradient(135deg, #e3f2fd, #f8fbff)",
						border: "1px solid #bbdefb",
						borderRadius: "10px",
						display: "flex",
						justifyContent: "space-between",
						alignItems: "center",
						boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
						maxWidth: "420px",
						marginInline: "auto",
					}}
				>
					<div style={{ color: "#0d47a1", fontSize: "15px" }}>
						{/* Header line (icon + text) */}
						<div
							style={{
								display: "flex",
								alignItems: "center",
								gap: "6px",
							}}
						>
							<span role="img" aria-label="controller">
								🎮
							</span>
							<span>
								<span style={{ opacity: 0.85 }}>
									Active game as
								</span>{" "}
								<strong>{activeGame.role}</strong>
							</span>
						</div>

						{/* Status blob aligned with the icon */}
						<div
							style={{
								display: "flex",
								alignItems: "center",
								marginTop: "6px",
							}}
						>
							<div
								style={{
									display: "inline-flex",
									alignItems: "center",
									gap: "6px",
									padding: "4px 10px",
									fontSize: "13px",
									borderRadius: "6px",
									backgroundColor:
										activeGame.status === "In Progress"
											? "#c8e6c9"
											: "#fff3cd",
									color:
										activeGame.status === "In Progress"
											? "#2e7d32"
											: "#8a6d3b",
									fontWeight: 500,
								}}
							>
								<div
									style={{
										width: "10px",
										height: "10px",
										borderRadius: "50%",
										backgroundColor:
											activeGame.status === "In Progress"
												? "green"
												: "orange",
										border: "1px solid rgba(0,0,0,0.3)",
									}}
								></div>
								{activeGame.status === "In Progress"
									? "Live Match"
									: "Waiting for Players"}
							</div>
						</div>
					</div>

					<button
						onClick={handleRejoinGame}
						style={{
							background: "#1565c0",
							color: "white",
							border: "none",
							borderRadius: "6px",
							padding: "8px 14px",
							cursor: "pointer",
							fontSize: "14px",
							fontWeight: "500",
							boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
						}}
					>
						Rejoin
					</button>
				</div>
			)}

			<div
				style={{
					marginTop: "40px",
					color: "#666",
					fontSize: "14px",
				}}
			>
				<p>Share the room URL with a friend to start playing!</p>
				<p>Room creator always takes the first turn.</p>
			</div>
		</div>
	);
};

export default RoomLobby;
