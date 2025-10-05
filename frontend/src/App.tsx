import React from "react";
import "./App.css";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import SpinPie from "./Spin";
import RoomLobby from "./RoomLobby";
import { SocketProvider } from "./contexts/SocketContext";

function App() {
	return (
		<SocketProvider>
			<Router>
				<div className="App">
					<Routes>
						<Route path="/" element={<RoomLobby />} />
						<Route path="/game/:roomId" element={<SpinPie />} />
					</Routes>
				</div>
			</Router>
		</SocketProvider>
	);
}

export default App;
