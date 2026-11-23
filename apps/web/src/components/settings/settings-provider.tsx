import { type ReactNode, useCallback, useEffect, useState } from "react";
import { SettingsDialog } from "@/components/settings/settings-dialog";
import {
	SettingsContext,
	type SettingsSection,
} from "@/contexts/settings-context";

export function SettingsProvider({ children }: { children: ReactNode }) {
	const [open, setOpen] = useState(false);
	const [section, setSection] = useState<SettingsSection>("profile");

	const openSettings = useCallback((next?: SettingsSection) => {
		if (next) setSection(next);
		setOpen(true);
	}, []);

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (!(e.metaKey || e.ctrlKey) || e.shiftKey || e.altKey) return;
			if (e.key !== ",") return;
			e.preventDefault();
			setOpen((current) => !current);
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, []);

	return (
		<SettingsContext.Provider value={openSettings}>
			{children}
			<SettingsDialog
				open={open}
				section={section}
				onSectionChange={setSection}
				onOpenChange={setOpen}
			/>
		</SettingsContext.Provider>
	);
}
