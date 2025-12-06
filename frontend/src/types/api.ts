// REST API endpoint response types
export interface GameRoleResponse {
	roomId: string;
	role: "Player" | "Audience";
	status: "Waiting for Players" | "In Progress";
}
