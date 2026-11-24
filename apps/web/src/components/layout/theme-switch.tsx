import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useState } from "react";
import { usePreferencesContext } from "@/contexts/preferences-context";
import { useShortcuts } from "@/lib/shortcuts";

export const THEMES = [
	{ value: "system", label: "Seguir o sistema", icon: MonitorIcon },
	{ value: "light", label: "Claro", icon: SunIcon },
	{ value: "dark", label: "Escuro", icon: MoonIcon },
] as const;
export type ThemeName = (typeof THEMES)[number]["value"];

const nextTheme = (current: string | undefined): ThemeName => {
	const index = THEMES.findIndex((t) => t.value === current);
	return THEMES[(index + 1) % THEMES.length]?.value ?? "system";
};

export function useThemeSetter() {
	const { theme, setTheme } = useTheme();
	const { preferences, update } = usePreferencesContext();
	const set = useCallback(
		(next: ThemeName) => {
			setTheme(next);
			if (preferences) update({ theme: next });
		},
		[setTheme, preferences, update],
	);
	return { theme, setTheme: set };
}

function useMounted() {
	const [mounted, setMounted] = useState(false);
	useEffect(() => setMounted(true), []);
	return mounted;
}

export function useThemeShortcut() {
	const { theme, setTheme } = useThemeSetter();
	useShortcuts({ theme: () => setTheme(nextTheme(theme)) });
}

export function ThemeSwitch() {
	const { theme, setTheme } = useThemeSetter();
	const mounted = useMounted();
	const current = mounted ? (theme ?? "system") : "system";
	return (
		<fieldset className="border-line bg-canvas rounded-control flex border p-0.5">
			<legend className="sr-only">Tema</legend>
			{THEMES.map(({ value, label, icon: Icon }) => (
				<button
					key={value}
					type="button"
					aria-label={label}
					aria-pressed={current === value}
					title={`${label} · ⇧⌘L alterna`}
					onClick={() => setTheme(value)}
					className={`flex h-7 flex-1 cursor-pointer items-center justify-center rounded-md ${current === value ? "bg-selected text-fg" : "text-dim hover:text-fg"}`}
				>
					<Icon className="size-3.5" aria-hidden="true" />
				</button>
			))}
		</fieldset>
	);
}

export function ThemeCycleButton({ className }: { className?: string }) {
	const { theme, setTheme } = useThemeSetter();
	const mounted = useMounted();
	const current = THEMES.find((t) => t.value === (mounted ? theme : "system"));
	const Icon = current?.icon ?? MonitorIcon;
	return (
		<button
			type="button"
			aria-label={`Tema: ${current?.label ?? "Seguir o sistema"}. Mudar`}
			onClick={() => setTheme(nextTheme(theme))}
			className={className}
		>
			<Icon className="size-4" strokeWidth={1.8} aria-hidden="true" />
		</button>
	);
}
