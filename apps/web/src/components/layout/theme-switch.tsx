import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

const THEMES = [
	{ value: "system", label: "Seguir o sistema", icon: MonitorIcon },
	{ value: "light", label: "Claro", icon: SunIcon },
	{ value: "dark", label: "Escuro", icon: MoonIcon },
] as const;
type ThemeName = (typeof THEMES)[number]["value"];

const nextTheme = (current: string | undefined): ThemeName => {
	const index = THEMES.findIndex((t) => t.value === current);
	return THEMES[(index + 1) % THEMES.length]?.value ?? "system";
};

function useMounted() {
	const [mounted, setMounted] = useState(false);
	useEffect(() => setMounted(true), []);
	return mounted;
}

export function useThemeShortcut() {
	const { theme, setTheme } = useTheme();
	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (!(e.metaKey || e.ctrlKey) || !e.shiftKey || e.altKey) return;
			if (e.key.toLowerCase() !== "l") return;
			e.preventDefault();
			setTheme(nextTheme(theme));
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [theme, setTheme]);
}

export function ThemeSwitch() {
	const { theme, setTheme } = useTheme();
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
	const { theme, setTheme } = useTheme();
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
