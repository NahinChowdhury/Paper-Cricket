import React from "react";
import { useGame } from "../contexts/GameContext";
import PreGameDecisionMakerView from "./PreGameDecisionMakerView";
import PreGameDecisionSpectatorView from "./PreGameDecisionSpectatorView";
import AudienceView from "./AudienceView";
import BatterView from "./BatterView";
import FielderView from "./FielderView";
import PreGameJoiningView from "./PreGameJoiningView";
import GameWaitingView from "./GameWaitingView";

const PlayerView: React.FC = () => {
	const { gameState, user } = useGame();

	// 🔹 Safety check
	if (!gameState || !user) {
		return <PreGameJoiningView />;
	}

	const {
		gamePhase,
		tossSelector,
		tossWinner,
		playerBatting,
		playerFielding,
	} = gameState;

	if (gamePhase === "waiting") {
		return <GameWaitingView />;
	}

	// =========================
	//  TOSS + SIDE SELECTION
	// =========================
	if (gamePhase === "toss") {
		if (tossSelector === user.id) {
			return <PreGameDecisionMakerView />;
		} else {
			return <PreGameDecisionSpectatorView />;
		}
	}

	if (gamePhase === "side selection") {
		if (tossWinner === user.id) {
			return <PreGameDecisionMakerView />;
		} else {
			return <PreGameDecisionSpectatorView />;
		}
	}

	// =========================
	//  ACTIVE INNINGS PHASES
	// =========================
	if (playerBatting === user.id) {
		return <BatterView />;
	}

	if (playerFielding === user.id) {
		return <FielderView />;
	}

	return <PreGameJoiningView />;
};

export default PlayerView;
