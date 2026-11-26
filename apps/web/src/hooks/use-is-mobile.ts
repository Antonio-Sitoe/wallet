import { useSyncExternalStore } from "react";

const QUERY = "(width < 48rem)";

function subscribe(onChange: () => void) {
	const media = window.matchMedia(QUERY);
	media.addEventListener("change", onChange);
	return () => media.removeEventListener("change", onChange);
}

function getSnapshot() {
	return window.matchMedia(QUERY).matches;
}

function getServerSnapshot() {
	return false;
}

export function useIsMobile() {
	return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
