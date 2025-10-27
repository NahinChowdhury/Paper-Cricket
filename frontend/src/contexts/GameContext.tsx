import React, {
	createContext,
	useContext,
	useEffect,
	useState,
	ReactNode,
} from "react";
import { GameState, User } from "../types";
import { useSocket } from "./SocketContext";

interface RecapState {
	isRecapping: boolean;
	frozenState: GameState | null;
	recapChoice: string | null;
}

interface GameContextType {
	gameState: GameState | null;
	setGameState: React.Dispatch<React.SetStateAction<GameState | null>>;
	user?: User | null;
	setUser: React.Dispatch<React.SetStateAction<User | null>>;
	recapState: RecapState;
	setRecapState: React.Dispatch<React.SetStateAction<RecapState>>;
}

const GameContext = createContext<GameContextType>({
	gameState: null,
	setGameState: () => {},
	user: null,
	setUser: () => {},
	recapState: { isRecapping: false, frozenState: null, recapChoice: null },
	setRecapState: () => {},
});

export const GameProvider: React.FC<{ children: ReactNode }> = ({
	children,
}) => {
	const { socket } = useSocket();

	const [gameState, setGameState] = useState<GameState | null>(null);
	const [user, setUser] = useState<User | null>(null);
	const [recapState, setRecapState] = useState<RecapState>({
		isRecapping: false,
		frozenState: null,
		recapChoice: null,
	});

	useEffect(() => {
		if (!socket) return;

		const basicUpdate = (state: GameState, event: string) => {
			console.log(`Game event received: ${event}`);
			console.log("User right now:", user);
			console.log("New game state:", state);
			setGameState(state);
		};

		console.log("Setting up GameContext socket listeners");

		// ------------------------------------
		// JOIN / REJOIN EVENTS
		// ------------------------------------
		socket.on("joined_as_player", (state: GameState, player: User) => {
			console.log("Joined as player:", player);
			console.log("User right now:", user);
			setGameState(state);
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

		// ------------------------------------
		// GENERAL GAME FLOW EVENTS
		// ------------------------------------
		socket.on("toss_started", (state: GameState) =>
			basicUpdate(state, "toss_started"),
		);
		socket.on("game_started", (state: GameState) =>
			basicUpdate(state, "game_started"),
		);
		socket.on("side_selection_started", (state: GameState) =>
			basicUpdate(state, "side_selection_started"),
		);
		socket.on("play_shot", (state: GameState) =>
			basicUpdate(state, "play_shot"),
		);
		socket.on("game_updated", (state: GameState) =>
			basicUpdate(state, "game_updated"),
		);
		socket.on("game_surrendered", (state: GameState) =>
			basicUpdate(state, "game_surrendered"),
		);
		socket.on("game_ended", (state: GameState) =>
			basicUpdate(state, "game_ended"),
		);

		// ------------------------------------
		// SPECIAL CASES (NO RECAP)
		// ------------------------------------
		socket.on("rotation_update", (state: GameState, rotation: number) => {
			// Although the currentBallRotation is probably 0 in the actual gameState, we handle it separately for temporary UI purposes
			setGameState((prev) => {
				if (!prev) return { ...state, currentBallRotation: rotation };
				return { ...prev, ...state, currentBallRotation: rotation };
			});
		});

		socket.on(
			"shot_selection_hover_update",
			(state: GameState, choice: string) => {
				// Although the currentBatsmanChoice is probably undefined in the actual gameState, we handle it separately for temporary UI purposes
				console.log("Shot selection hover update received:", choice);
				setGameState((prev) => {
					if (!prev)
						return { ...state, currentBallBatsmanChoice: choice };
					return {
						...prev,
						...state,
						currentBallBatsmanChoice: choice,
					};
				});
			},
		);

		// ------------------------------------
		// SET FIELD → triggers recap
		// ------------------------------------
		socket.on("set_field", (state: GameState) => {
			console.log("In set field, current game state:", gameState);
			console.log("In set field, new game state:", state);

			// 🧩 Skip recap if client has no prior deliveries or this update isn't new
			// - `!gameState`: user just joined or reloaded; nothing to compare.
			// - `state.deliveryHistory.length <= gameState.deliveryHistory.length`:
			//    the server isn't ahead of what the client has already rendered.
			// Works correctly across innings because deliveryHistory never resets.
			if (
				!gameState ||
				state.deliveryHistory.length <=
					(gameState.deliveryHistory.length ?? 0)
			) {
				setGameState(state);
				return;
			}

			console.log("Set field received, triggering recap.");
			// console.log("Previous game state:", gameState);
			// console.log("New game state:", state);
			// Snapshot current game state for recap display
			setRecapState({
				isRecapping: true,
				frozenState: gameState,
				// get the last ball's batsman choice from the new game state's delivery history
				recapChoice:
					state.deliveryHistory.length > 0
						? state.deliveryHistory[
								state.deliveryHistory.length - 1
							].batsmanChoice
						: null,
			});

			// Immediately update live game state in background
			setGameState(state);

			// End recap after 1 seconds
			setTimeout(() => {
				setRecapState({
					isRecapping: false,
					frozenState: null,
					recapChoice: null,
				});
			}, 1500);
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
			socket.off("play_shot");
			socket.off("set_field");
			socket.off("rotation_update");
			socket.off("shot_selection_hover_update");
		};
	}, [socket, gameState]);

	return (
		<GameContext.Provider
			value={{
				gameState,
				setGameState,
				user,
				setUser,
				recapState,
				setRecapState,
			}}
		>
			{children}
		</GameContext.Provider>
	);
};

export const useGame = () => useContext(GameContext);
