import { isDesktop } from "@/lib/auth-client";

export type NotifyPermission = "granted" | "denied" | "default" | "unsupported";

const desktopPlugin = () => import("@tauri-apps/plugin-notification");

const browserSupported = () =>
	typeof window !== "undefined" && "Notification" in window;

export async function notificationPermission(): Promise<NotifyPermission> {
	if (isDesktop) {
		try {
			return (await (await desktopPlugin()).isPermissionGranted())
				? "granted"
				: "default";
		} catch {
			return "unsupported";
		}
	}
	if (!browserSupported()) return "unsupported";
	return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotifyPermission> {
	if (isDesktop) {
		try {
			const result = await (await desktopPlugin()).requestPermission();
			return result === "granted" ? "granted" : "denied";
		} catch {
			return "unsupported";
		}
	}
	if (!browserSupported()) return "unsupported";
	return Notification.requestPermission();
}

export async function showNotification(
	title: string,
	body: string,
	onClick?: () => void,
): Promise<boolean> {
	if ((await notificationPermission()) !== "granted") return false;
	if (isDesktop) {
		(await desktopPlugin()).sendNotification({ title, body });
		return true;
	}
	const notification = new Notification(title, { body, tag: title });
	notification.onclick = () => {
		window.focus();
		onClick?.();
		notification.close();
	};
	return true;
}

const SEEN_KEY = "wallet.notices.seen";
const SEEN_LIMIT = 300;

export function readSeen(): string[] {
	try {
		const parsed = JSON.parse(localStorage.getItem(SEEN_KEY) ?? "[]");
		return Array.isArray(parsed)
			? parsed.filter((k) => typeof k === "string")
			: [];
	} catch {
		return [];
	}
}

export function markSeen(keys: string[]) {
	try {
		const next = [...readSeen(), ...keys].slice(-SEEN_LIMIT);
		localStorage.setItem(SEEN_KEY, JSON.stringify(next));
	} catch {
		return;
	}
}
