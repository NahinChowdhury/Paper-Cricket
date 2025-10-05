import React, { useState } from "react";
import { useRoom } from "./hooks/useRoom";
import { useSocket } from "./contexts/SocketContext";

const RoomLobby: React.FC = () => {
	const { socket, isConnected } = useSocket();
	const { createRoom, joinRoom, isCreatingRoom } = useRoom(socket);
	const [inputRoomId, setInputRoomId] = useState("");

	const handleJoinRoom = () => {
		if (inputRoomId.trim()) {
			joinRoom(inputRoomId.trim());
		}
	};

	return (
		<div style={{ textAlign: "center", padding: "50px" }}>
			<h1>Paper Cricket - Multiplayer</h1>

			<div style={{ margin: "30px 0" }}>
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
					{isCreatingRoom ? "Creating Room..." : "Create New Room"}
				</button>
			</div>

			<div style={{ margin: "30px 0" }}>
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

			<div style={{ marginTop: "40px", color: "#666", fontSize: "14px" }}>
				<p>Share the room URL with a friend to start playing!</p>
				<p>Room creator always takes the first turn.</p>
			</div>
		</div>
	);
};

export default RoomLobby;
