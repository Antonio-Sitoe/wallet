export const tint = (color: string, percent = 14) =>
	`color-mix(in srgb, ${color} ${percent}%, transparent)`;

export const ink = (color: string) =>
	`color-mix(in srgb, ${color} 50%, var(--color-fg))`;
