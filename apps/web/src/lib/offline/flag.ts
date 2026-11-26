import { isDesktop } from "@/lib/auth-client";

export const offlineEnabled =
	import.meta.env.VITE_DESKTOP === "1" && isDesktop;
