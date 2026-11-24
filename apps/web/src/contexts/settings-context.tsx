import { createContext, useContext } from "react";

export const SETTINGS_SECTIONS = [
	"profile",
	"budget",
	"general",
	"appearance",
	"templates",
	"notifications",
	"security",
	"shortcuts",
	"data",
	"about",
] as const;
export type SettingsSection = (typeof SETTINGS_SECTIONS)[number];

export const SettingsContext = createContext<
	(section?: SettingsSection) => void
>(() => {});

export const useOpenSettings = () => useContext(SettingsContext);
