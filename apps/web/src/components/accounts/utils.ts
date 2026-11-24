export const initials = (name: string) =>
	name
		.replace(/[^\p{L}\p{N}]/gu, "")
		.slice(0, 2)
		.toUpperCase();
