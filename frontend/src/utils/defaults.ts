import { GameState, Player } from "../contexts/SocketContext";

export const DEFAULT_GAME_STATE: GameState = {
		players: [],
		currentBall: 1,
		currentBallRotation: undefined,
		currentBallBatsmanChoice: undefined,
		playerBowling: "",
		originalTotalBalls: 6,
		totalBalls: 6,
		totalWickets: 1,
		inningsOneRuns: 0,
		inningsTwoRuns: 0,
		inningsOneWicketCurrentCount: 0,
		inningsTwoWicketCurrentCount: 0,
		gamePhase: "waiting",
		innings: 0,
		deliveryHistory: [],
	};

export const DEFAULT_PLAYER: Player | null = null;

export const DEFAULT_CANVAS_STATE = {
  rotation: 0,
  isDragging: false,
  startAngle: 0,
  shotSelected: undefined,
  message: "",
};

export const DEFAULT_SHOT_SELECTED: string | undefined = undefined;
