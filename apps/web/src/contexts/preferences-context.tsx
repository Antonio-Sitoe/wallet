import type { Preferences, UpdatePreferencesInput } from "@wallet/shared";
import { createContext, useContext } from "react";

export type PreferencesValue = {
	preferences: Preferences | undefined;
	update: (patch: UpdatePreferencesInput) => void;
};

export const PreferencesContext = createContext<PreferencesValue>({
	preferences: undefined,
	update: () => {},
});

export const usePreferencesContext = () => useContext(PreferencesContext);
