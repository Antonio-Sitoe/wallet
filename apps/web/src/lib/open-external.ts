import { isDesktop } from "@/lib/auth-client";

export async function openExternal(url: string) {
	if (!isDesktop) {
		window.open(url, "_blank", "noopener,noreferrer");
		return;
	}
	const { openUrl } = await import("@tauri-apps/plugin-opener");
	await openUrl(url);
}
