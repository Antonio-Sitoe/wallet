export const tint = (color: string, percent = 14) =>
	`color-mix(in srgb, ${color} ${percent}%, transparent)`;
