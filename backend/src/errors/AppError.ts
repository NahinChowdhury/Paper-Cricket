import { Socket } from "socket.io";
import { ClientEvents, ServerEvents } from "../types";

/**
 * Custom application error class with error codes.
 * 
 * Example usage:
 *   throw new AppError("User not found", "USER_NOT_FOUND");
 * 
 *   if (err instanceof AppError) {
 *     console.error(err.code, err.message);
 *   }
 */

export type ErrorCode =
	| "ROOM_FULL"
	| "ROOM_NOT_FOUND"
	| "GAME_NOT_FOUND"
	| "USER_NOT_FOUND"
	| "GAMESTATE_NOT_FOUND"
	| "NOT_ENOUGH_PLAYERS"
	| "USER_ALREADY_PLAYING"
	| "USER_ALREADY_IN_AUDIENCE"
	| "UNABLE_TO_LEAVE_ROOM"
	| "UNABLE_TO_SURRENDER"
	| "CANNOT_JOIN_AUDIENCE_WHILE_PLAYING"
	| "MAX_PLAYERS_REACHED"
	| "INVALID_MOVE";

export class AppError extends Error {
	code: ErrorCode;

	constructor(message: string, code: ErrorCode) {
		super(message);
		this.name = "AppError";
		this.code = code;

		// Restore prototype chain for proper instanceof behavior
		Object.setPrototypeOf(this, new.target.prototype);
	}
}

/**
 * Optional helper to quickly create an AppError.
 */
export function createError(code: ErrorCode, message: string): AppError {
	return new AppError(message, code);
}



/**
 * Handles AppError-based responses to clients via socket emits.
 */
export function handleSocketError(socket: Socket<ClientEvents, ServerEvents>, error: unknown): void {
	if (error instanceof AppError) {
		switch (error.code) {
			case "ROOM_FULL":
				socket.emit("room_full");
				break;

			case "ROOM_NOT_FOUND":
				socket.emit("room_not_found");
				break;

			default:
				socket.emit("server_error", {
					code: error.code,
					message: error.message,
				});
				break;
		}
	} else {
		// Fallback for unexpected errors
		socket.emit("server_error", {
			code: "UNKNOWN_ERROR",
			message: error instanceof Error ? error.message : "An unknown error occurred",
		});
	}
}
