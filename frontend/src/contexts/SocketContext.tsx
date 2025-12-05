// src/contexts/SocketContext.tsx
import React, {
	createContext,
	useContext,
	useEffect,
	useState,
	ReactNode,
} from "react";
import { io, Socket } from "socket.io-client";
import { ServerEvents, ClientEvents } from "../types";

interface SocketContextType {
	socket: Socket<ServerEvents, ClientEvents> | null;
	isConnected: boolean;
	error: string | null;
	setError: (msg: string | null) => void;
	redirectPath: string | null;
	setRedirectPath: (path: string | null) => void;
}

const SocketContext = createContext<SocketContextType>({
	socket: null,
	isConnected: false,
	error: null,
	setError: () => {},
	redirectPath: null,
	setRedirectPath: () => {},
});

export const SocketProvider: React.FC<{ children: ReactNode }> = ({
	children,
}) => {
	const [socket, setSocket] = useState<Socket<
		ServerEvents,
		ClientEvents
	> | null>(null);
	const [isConnected, setIsConnected] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [redirectPath, setRedirectPath] = useState<string | null>(null);

	useEffect(() => {
		const serverUrl =
			import.meta.env.VITE_BACKEND_URL || "http://localhost:3002"; // intentional set to 3002 which is incorrect to catch bugs
		const s = io(serverUrl);

		s.on("connect", () => {
			console.log("✅ Connected to socket server");
			setIsConnected(true);
			setError(null);
		});

		s.on("disconnect", () => {
			console.warn("❌ Disconnected from server");
			setIsConnected(false);
		});

		// 🌐 Global error handlers
		s.on("server_error", (err) => {
			console.error("⚠️ Server error:", err);
			setError(err.message || "Unexpected server error.");
			if (["FORBIDDEN", "UNAUTHORIZED"].includes(err.code)) {
				setRedirectPath("/forbidden");
			} else {
				setRedirectPath("/");
			}
		});

		s.on("room_not_found", () => {
			setError("The requested room could not be found.");
			setRedirectPath("/");
		});

		s.on("room_full", () => {
			setError("This room is already full. Please try another one.");
			setRedirectPath("/");
		});

		s.on("cannot_create_game", () => {
			setError("Unable to create a new game. Please try again later.");
			setRedirectPath("/");
		});

		s.on("cannot_join_game", () => {
			setError("You cannot join this game at the moment.");
			setRedirectPath("/");
		});

		s.on("user_left", () => {
			// no need to do anything. We handle it in AudienceView directly
		});

		setSocket(s);
		return () => {
			s.off();
			s.disconnect();
		};
	}, []);

	return (
		<SocketContext.Provider
			value={{
				socket,
				isConnected,
				error,
				setError,
				redirectPath,
				setRedirectPath,
			}}
		>
			{children}
		</SocketContext.Provider>
	);
};

export const useSocket = () => useContext(SocketContext);
