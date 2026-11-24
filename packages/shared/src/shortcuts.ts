import { z } from "zod";

export const SHORTCUT_ACTIONS = [
	"newTransaction",
	"palette",
	"assistant",
	"settings",
	"hideMoney",
	"theme",
	"nav1",
	"nav2",
	"nav3",
	"nav4",
	"nav5",
	"nav6",
	"nav7",
	"nav8",
	"nav9",
	"nav10",
] as const;
export type ShortcutAction = (typeof SHORTCUT_ACTIONS)[number];

export const DEFAULT_SHORTCUTS: Record<ShortcutAction, string> = {
	newTransaction: "mod+n",
	palette: "mod+k",
	assistant: "mod+j",
	settings: "mod+,",
	hideMoney: "mod+shift+h",
	theme: "mod+shift+l",
	nav1: "mod+1",
	nav2: "mod+2",
	nav3: "mod+3",
	nav4: "mod+4",
	nav5: "mod+5",
	nav6: "mod+6",
	nav7: "mod+7",
	nav8: "mod+8",
	nav9: "mod+9",
	nav10: "mod+0",
};

export const SHORTCUT_KEYS = "abcdefghijklmnopqrstuvwxyz0123456789,.;/[]-=`'";

export const shortcutCombo = z
	.string()
	.regex(/^(mod\+)?(alt\+)?(shift\+)?[a-z0-9,.;/[\]\-=`']$/, "Atalho inválido")
	.refine((combo) => combo.startsWith("mod+") || combo.startsWith("alt+"), {
		message: "O atalho tem de usar ⌘/Ctrl ou ⌥/Alt",
	});

export const shortcutOverrides = z
	.partialRecord(z.enum(SHORTCUT_ACTIONS), shortcutCombo)
	.refine(
		(map) => {
			const combos = Object.values(resolveShortcuts(map));
			return new Set(combos).size === combos.length;
		},
		{ message: "Dois atalhos com as mesmas teclas" },
	);
export type ShortcutOverrides = Partial<Record<ShortcutAction, string>>;

export function resolveShortcuts(
	overrides: ShortcutOverrides | null | undefined,
): Record<ShortcutAction, string> {
	return { ...DEFAULT_SHORTCUTS, ...(overrides ?? {}) };
}
