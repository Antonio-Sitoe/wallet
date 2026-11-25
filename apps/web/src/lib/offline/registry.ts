import type { OfflineCollections } from "@/lib/offline/collections";

let current: OfflineCollections | null = null;

export function setOfflineCollections(collections: OfflineCollections | null) {
	current = collections;
}

export function offlineCollections() {
	if (!current) throw new Error("Offline collections are not ready");
	return current;
}

export const loadOffline = () => import("@/lib/offline/collections");
