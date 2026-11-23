import { ENV } from "@/env";
import { isDesktop, readDesktopToken } from "@/lib/auth-client";

const BASE = ENV.VITE_SERVER_URL.replace(/\/$/, "");

export class ApiError extends Error {
	constructor(
		readonly status: number,
		readonly code: string,
		message: string,
		readonly details?: unknown,
	) {
		super(message);
		this.name = "ApiError";
	}
}

type Query = Record<
	string,
	string | number | boolean | string[] | null | undefined
>;

function toSearch(query?: Query) {
	if (!query) return "";
	const params = new URLSearchParams();
	for (const [key, value] of Object.entries(query)) {
		if (value === undefined || value === null || value === "") continue;
		if (Array.isArray(value)) for (const v of value) params.append(key, v);
		else params.set(key, String(value));
	}
	const text = params.toString();
	return text ? `?${text}` : "";
}

export async function api<T>(
	path: string,
	options: {
		method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
		body?: unknown;
		query?: Query;
	} = {},
): Promise<T> {
	const headers: Record<string, string> = {};
	if (options.body !== undefined) headers["Content-Type"] = "application/json";
	if (isDesktop) headers.Authorization = `Bearer ${readDesktopToken()}`;

	const res = await fetch(`${BASE}/api${path}${toSearch(options.query)}`, {
		method: options.method ?? "GET",
		headers,
		credentials: "include",
		body: options.body === undefined ? undefined : JSON.stringify(options.body),
	});
	if (res.status === 204) return undefined as T;
	const data = await res.json().catch(() => null);
	if (!res.ok) {
		const error = data?.error;
		throw new ApiError(
			res.status,
			error?.code ?? "HTTP_ERROR",
			error?.message ?? `Erro ${res.status}`,
			error?.details,
		);
	}
	return data as T;
}

export function errorMessage(error: unknown): string {
	if (error instanceof ApiError) {
		const first = Array.isArray(error.details) ? error.details[0] : undefined;
		if (first && typeof first === "object" && "message" in first) {
			return `${error.message}: ${(first as { message: string }).message}`;
		}
		return error.message;
	}
	return error instanceof Error ? error.message : "Erro inesperado";
}
