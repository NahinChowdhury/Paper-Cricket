import React, {
	createContext,
	useContext,
	useEffect,
	useRef,
	useState,
	ReactNode,
} from "react";
import { io, Socket } from "socket.io-client";
import { usePlayerId } from "../hooks/usePlayerId";
import { ClientEvents, ServerEvents } from "../types";

interface SocketContextType {
	socket: Socket<ServerEvents, ClientEvents> | null;
	isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({
	socket: null,
	isConnected: false,
});

export const SocketProvider: React.FC<{ children: ReactNode }> = ({
	children,
}) => {
	const socketRef = useRef<Socket<ServerEvents, ClientEvents> | null>(null);
	const [isConnected, setIsConnected] = useState(false);
	const { playerId } = usePlayerId();

	const backendURL =
		import.meta.env.VITE_BACKEND_URL || "http://localhost:3001"; // fallback

	if (!socketRef.current) {
		socketRef.current = io(backendURL, {
			transports: ["websocket", "polling"],
			query: playerId
				? {
						playerId,
					}
				: undefined, // Send persistent player ID to server
		});
	}

	useEffect(() => {
		const socket = socketRef.current!;
		socket.on("connect", () => {
			console.log(
				"Connected to server - Socket ID:",
				socket.id,
				"Player ID:",
				playerId,
			);
			setIsConnected(true);
		});
		socket.on("disconnect", () => {
			console.log("Disconnected from server");
			setIsConnected(false);
		});

		// 👇 don’t close on unmount unless you really want to
		return () => {
			// socket.close();
			socket.disconnect();
		};
	}, []);

	return (
		<SocketContext.Provider
			value={{
				socket: socketRef.current,
				isConnected,
			}}
		>
			{children}
		</SocketContext.Provider>
	);
};

export const useSocket = () => {
	return useContext(SocketContext);
};
