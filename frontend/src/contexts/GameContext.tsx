import React, {
	createContext,
	useContext,
	useEffect,
	useState,
	ReactNode,
} from "react";
import { GameState, User } from "../types";
import { useSocket } from "./SocketContext";

interface GameContextType {
	gameState: GameState | null;
	setGameState: React.Dispatch<React.SetStateAction<GameState | null>>;
	user?: User | null;
	setUser: React.Dispatch<React.SetStateAction<User | null>>;
}

const GameContext = createContext<GameContextType>({
	gameState: null,
	setGameState: () => {},
	user: null,
	setUser: () => {},
});

export const GameProvider: React.FC<{ children: ReactNode }> = ({
	children,
}) => {
	const { socket } = useSocket();

	const [gameState, setGameState] = useState<GameState | null>(null);
	const [user, setUser] = useState<User | null>(null);

	useEffect(() => {
		console.log("Setting up GameContext socket listeners");
		if (!socket) return;

		// TODO: Need to investigate if needed here
		socket.on("joined_as_player", (gameState: GameState, player: User) => {
			console.log("Joined as player:", player);
			console.log("User right now:", user);
			setGameState(gameState);
			setUser(player);
		});
		socket.on("joined_as_audience", (state: GameState, player: User) => {
			console.log("Joined as audience:", player);
			console.log("User right now:", user);
			setGameState(state);
			setUser(player);
		});
		socket.on("user_already_joined", (state: GameState, player: User) => {
			console.log("User already joined:", player);
			console.log("User right now:", user);
			setGameState(state);
			setUser(player);
		});
		socket.on("toss_started", (state: GameState) => {
			console.log("Toss started:", state);
			console.log("User right now:", user);
			setGameState(state);
		});
		socket.on("game_surrendered", (state: GameState) => {
			console.log("Game surrendered:", state);
			console.log("User right now:", user);
			setGameState(state);
		});
		socket.on("side_selection_started", (state: GameState) => {
			console.log("Side selection started:", state);
			console.log("User right now:", user);
			setGameState(state);
		});
		socket.on("game_started", (state: GameState) => {
			console.log("Game started:", state);
			console.log("User right now:", user);
			setGameState(state);
		});
		socket.on("game_ended", (state: GameState) => {
			console.log("Game ended:", state);
			console.log("User right now:", user);
			setGameState(state);
		});
		socket.on("game_updated", (state) => {
			console.log("Game updated:", state);
			console.log("User right now:", user);
			setGameState(state);
		});
		socket.on("rotation_update", (state: GameState, rotation: number) => {
			// Although the currentBallRotation is probably 0 in the actual gameState, we handle it separately for temporary UI purposes
			setGameState((prev) => {
				if (!prev) return { ...state, currentBallRotation: rotation };
				return {
					...prev,
					...state,
					currentBallRotation: rotation,
				};
			});
		});
		socket.on(
			"shot_selection_hover_update",
			(gameState: GameState, choice: string) => {
				// Although the currentBatsmanChoice is probably undefined in the actual gameState, we handle it separately for temporary UI purposes
				console.log("Shot selection hover update received:", choice);
				setGameState((prev) => {
					if (!prev)
						return {
							...gameState,
							currentBallBatsmanChoice: choice,
						};
					return {
						...prev,
						...gameState,
						currentBallBatsmanChoice: choice,
					};
				});
			},
		);
		socket.on("play_shot", (state: GameState) => {
			console.log("Play shot event received:", state);
			setGameState(state);
		});
		socket.on("set_field", (state: GameState) => {
			console.log("Set field event received:", state);
			setGameState(state);
		});

		return () => {
			socket.off("joined_as_player");
			socket.off("joined_as_audience");
			socket.off("user_already_joined");
			socket.off("toss_started");
			socket.off("game_surrendered");
			socket.off("side_selection_started");
			socket.off("game_started");
			socket.off("game_ended");
			socket.off("game_updated");
		};
	}, [socket]);

	return (
		<GameContext.Provider
			value={{
				gameState,
				setGameState,
				user,
				setUser,
			}}
		>
			{children}
		</GameContext.Provider>
	);
};

export const useGame = () => {
	return useContext(GameContext);
};
