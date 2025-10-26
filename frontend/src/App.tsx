import React from "react";
import "./App.css";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
// import SpinPie from "./views/Spin";
import RoomLobby from "./views/RoomLobby";
import { SocketProvider } from "./contexts/SocketContext";
import GameRoom from "./views/GameRoom";

function App() {
	return (
		<SocketProvider>
			<Router>
				<div className="App">
					<Routes>
						<Route path="/" element={<RoomLobby />} />
						<Route path="/game/:roomId" element={<GameRoom />} />
					</Routes>
				</div>
			</Router>
		</SocketProvider>
	);
}

export default App;
