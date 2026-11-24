import {
	resolveShortcuts,
	SHORTCUT_KEYS,
	type ShortcutAction,
} from "@wallet/shared";
import { useEffect, useMemo, useRef } from "react";
import { usePreferencesContext } from "@/contexts/preferences-context";

export const isMacPlatform =
	typeof navigator !== "undefined" &&
	/Mac|iPhone|iPad/.test(navigator.platform);

const CODE_KEYS: Record<string, string> = {
	Comma: ",",
	Period: ".",
	Semicolon: ";",
	Slash: "/",
	BracketLeft: "[",
	BracketRight: "]",
	Minus: "-",
	Equal: "=",
	Backquote: "`",
	Quote: "'",
};

function keyOf(e: KeyboardEvent) {
	const letter = /^Key([A-Z])$/.exec(e.code)?.[1];
	if (letter) return letter.toLowerCase();
	const digit = /^Digit(\d)$/.exec(e.code)?.[1];
	if (digit) return digit;
	if (CODE_KEYS[e.code]) return CODE_KEYS[e.code];
	const typed = e.key.toLowerCase();
	return typed.length === 1 && SHORTCUT_KEYS.includes(typed) ? typed : null;
}

export function comboFromEvent(e: KeyboardEvent): string | null {
	const key = keyOf(e);
	if (!key) return null;
	const mod = isMacPlatform ? e.metaKey : e.ctrlKey;
	return [mod && "mod", e.altKey && "alt", e.shiftKey && "shift", key]
		.filter(Boolean)
		.join("+");
}

const KEY_LABEL: Record<string, string> = { ",": ",", ".": ".", "/": "/" };

export function formatCombo(combo: string) {
	const parts = combo.split("+");
	const key = parts.at(-1) ?? "";
	const label = KEY_LABEL[key] ?? key.toUpperCase();
	if (isMacPlatform)
		return [
			parts.includes("shift") && "⇧",
			parts.includes("alt") && "⌥",
			parts.includes("mod") && "⌘",
			label,
		]
			.filter(Boolean)
			.join("");
	return [
		parts.includes("mod") && "Ctrl",
		parts.includes("alt") && "Alt",
		parts.includes("shift") && "Shift",
		label,
	]
		.filter(Boolean)
		.join("+");
}

export function useShortcutMap() {
	const { preferences } = usePreferencesContext();
	const overrides = preferences?.shortcuts;
	return useMemo(() => resolveShortcuts(overrides), [overrides]);
}

export function useShortcuts(
	handlers: Partial<Record<ShortcutAction, () => void>>,
) {
	const bindings = useShortcutMap();
	const latest = useRef(handlers);
	latest.current = handlers;
	useEffect(() => {
		const byCombo = new Map(
			(Object.keys(bindings) as ShortcutAction[]).map((action) => [
				bindings[action],
				action,
			]),
		);
		const onKey = (e: KeyboardEvent) => {
			if (e.defaultPrevented) return;
			const combo = comboFromEvent(e);
			if (!combo) return;
			const action = byCombo.get(combo);
			const run = action ? latest.current[action] : undefined;
			if (!run) return;
			e.preventDefault();
			run();
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [bindings]);
}
