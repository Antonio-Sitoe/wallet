import { useSyncExternalStore } from "react";
import { ENV } from "@/env";

const PROBE_MS = 5_000;
const BASE = ENV.VITE_SERVER_URL.replace(/\/$/, "");

let online = true;
let probe: ReturnType<typeof setInterval> | null = null;
const listeners = new Set<() => void>();

function emit() {
	for (const listener of listeners) listener();
}

function stopProbe() {
	if (probe) clearInterval(probe);
	probe = null;
}

async function reachable() {
	try {
		const res = await fetch(`${BASE}/`, { cache: "no-store" });
		return res.ok;
	} catch {
		return false;
	}
}

export function reportOnline() {
	if (online) return;
	online = true;
	stopProbe();
	emit();
}

export function reportOffline() {
	if (import.meta.env.VITE_DESKTOP !== "1" || !online) return;
	online = false;
	stopProbe();
	probe = setInterval(async () => {
		if (await reachable()) reportOnline();
	}, PROBE_MS);
	emit();
}

export const isOnline = () => online;

export function subscribeConnection(listener: () => void) {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

const alwaysOnline = () => true;

export const useOnline =
	import.meta.env.VITE_DESKTOP === "1"
		? () => useSyncExternalStore(subscribeConnection, isOnline)
		: alwaysOnline;
