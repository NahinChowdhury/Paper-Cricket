import { PowerUpStatus } from "../types";

export function buildPowerUpStatusMap(
	used: string[] = [],
	unused: string[] = [],
	active: string[] = [],
): Map<string, PowerUpStatus> {
	return new Map<string, PowerUpStatus>([
		...used.map((p: string) => [p, "used" as PowerUpStatus]),
		...unused.map((p: string) => [p, "unused" as PowerUpStatus]),
		...active.map((p: string) => [p, "active" as PowerUpStatus]),
	] as [string, PowerUpStatus][]);
}
