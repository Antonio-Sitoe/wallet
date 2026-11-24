import { type ReactNode, useCallback, useState } from "react";
import { SettingsDialog } from "@/components/settings/settings-dialog";
import {
	SettingsContext,
	type SettingsSection,
} from "@/contexts/settings-context";
import { useShortcuts } from "@/lib/shortcuts";

export function SettingsProvider({ children }: { children: ReactNode }) {
	const [open, setOpen] = useState(false);
	const [section, setSection] = useState<SettingsSection>("profile");

	const openSettings = useCallback((next?: SettingsSection) => {
		if (next) setSection(next);
		setOpen(true);
	}, []);

	useShortcuts({ settings: () => setOpen((current) => !current) });

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
