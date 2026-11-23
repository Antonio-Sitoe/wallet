import type { UpdatePreferencesInput } from "@wallet/shared";
import { useTheme } from "next-themes";
import {
	Fragment,
	type ReactNode,
	useCallback,
	useEffect,
	useMemo,
	useRef,
} from "react";
import { toast } from "sonner";
import { usePreferences } from "@/actions/settings/use-preferences";
import { useUpdatePreferences } from "@/actions/settings/use-update-preferences";
import {
	PreferencesContext,
	usePreferencesContext,
} from "@/contexts/preferences-context";
import { setDisplayOptions } from "@/utils/format";

export function PreferencesProvider({ children }: { children: ReactNode }) {
	const { data: preferences } = usePreferences();
	const mutation = useUpdatePreferences();
	const { theme, setTheme } = useTheme();
	const themeSynced = useRef(false);

	if (preferences) setDisplayOptions(preferences);

	useEffect(() => {
		if (!preferences || themeSynced.current) return;
		themeSynced.current = true;
		if (preferences.theme !== theme) setTheme(preferences.theme);
	}, [preferences, theme, setTheme]);

	useEffect(() => {
		if (!preferences) return;
		document.documentElement.dataset.density = preferences.density;
	}, [preferences]);

	const update = useCallback(
		(patch: UpdatePreferencesInput) => {
			if (patch.theme) setTheme(patch.theme);
			mutation.mutate(patch);
		},
		[mutation.mutate, setTheme],
	);

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (!(e.metaKey || e.ctrlKey) || !e.shiftKey || e.altKey) return;
			if (e.key.toLowerCase() !== "h" || !preferences) return;
			e.preventDefault();
			const hideMoney = !preferences.hideMoney;
			update({ hideMoney });
			toast(hideMoney ? "Valores ocultos" : "Valores visíveis");
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [preferences, update]);

	const value = useMemo(() => ({ preferences, update }), [preferences, update]);

	return (
		<PreferencesContext.Provider value={value}>
			{children}
		</PreferencesContext.Provider>
	);
}

export function DisplayBoundary({ children }: { children: ReactNode }) {
	const { preferences } = usePreferencesContext();
	const key = preferences
		? `${preferences.hideMoney}-${preferences.numberFormat}`
		: "loading";
	return <Fragment key={key}>{children}</Fragment>;
}
