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

let nextDesktopId = Math.floor(Date.now() / 1000) % 1_000_000_000;
const desktopHrefs = new Map<number, string>();

export async function listenDesktopNotificationClicks(
	open: (href: string) => void,
): Promise<() => void> {
	if (!isDesktop) return () => {};
	try {
		const listener = await (
			await desktopPlugin()
		).onAction((event) => {
			if (event.actionId !== "tap") return;
			const notification = event.notification;
			const extraHref = notification?.extra?.href;
			const href =
				typeof extraHref === "string"
					? extraHref
					: notification
						? desktopHrefs.get(notification.id)
						: undefined;
			void focusDesktopWindow();
			if (href) open(href);
		});
		return () => void listener.unregister();
	} catch {
		return () => {};
	}
}

async function focusDesktopWindow() {
	try {
		const { getCurrentWindow } = await import("@tauri-apps/api/window");
		const win = getCurrentWindow();
		await win.unminimize();
		await win.show();
		await win.setFocus();
	} catch {
		return;
	}
}

export async function showNotification(
	title: string,
	body: string,
	href?: string,
	onClick?: () => void,
): Promise<boolean> {
	if ((await notificationPermission()) !== "granted") return false;
	if (isDesktop) {
		const id = nextDesktopId++;
		if (href) desktopHrefs.set(id, href);
		(await desktopPlugin()).sendNotification({
			id,
			title,
			body,
			extra: href ? { href } : undefined,
		});
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
const KEYS_LIMIT = 300;

function readKeys(storageKey: string): string[] {
	try {
		const parsed = JSON.parse(localStorage.getItem(storageKey) ?? "[]");
		return Array.isArray(parsed)
			? parsed.filter((k) => typeof k === "string")
			: [];
	} catch {
		return [];
	}
}

function addKeys(storageKey: string, keys: string[]) {
	try {
		const current = readKeys(storageKey);
		const next = [...current, ...keys.filter((k) => !current.includes(k))];
		localStorage.setItem(storageKey, JSON.stringify(next.slice(-KEYS_LIMIT)));
	} catch {
		return;
	}
}

export const readSeen = () => readKeys(SEEN_KEY);
export const markSeen = (keys: string[]) => addKeys(SEEN_KEY, keys);
