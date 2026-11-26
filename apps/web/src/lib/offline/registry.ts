import type { OfflineCollections } from "@/lib/offline/collections";
import type { OfflineWrites } from "@/lib/offline/writes";

let current: OfflineCollections | null = null;

export function setOfflineCollections(collections: OfflineCollections | null) {
	current = collections;
}

export function offlineCollections() {
	if (!current) throw new Error("Offline collections are not ready");
	return current;
}

let writes: OfflineWrites | null = null;

export function setOfflineWrites(next: OfflineWrites | null) {
	writes = next;
}

export function offlineWrites() {
	if (!writes) throw new Error("Offline writes are not ready");
	return writes;
}

export const loadOffline = () =>
	import.meta.env.VITE_DESKTOP === "1"
		? import("@/lib/offline/collections")
		: Promise.reject(new Error("Offline is desktop only"));
