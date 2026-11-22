/** Full-screen error page (design board "Erro de ligação · ecrã inteiro"). Replaces the router's default error. */
import type { ErrorComponentProps } from "@tanstack/react-router";
import { cn } from "@wallet/ui/lib/utils";
import { RotateCwIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { ENV } from "../env";
import { ApiError } from "@/lib/api";

const SERVER = ENV.VITE_SERVER_URL.replace(/\/$/, "");
const SERVER_HOST = SERVER.replace(/^https?:\/\//, "");
const AUTO_RETRY_SECONDS = 10;

/** `fetch` rejects with a TypeError when the server can't be reached ("Failed to fetch" / "Load failed"). */
function isConnectionError(error: unknown) {
	if (error instanceof ApiError) return false;
	const message = error instanceof Error ? error.message : String(error);
	return (
		error instanceof TypeError ||
		/failed to fetch|load failed|networkerror|network request failed/i.test(
			message,
		)
	);
}

/** True when the server answers at all. `no-cors` avoids CORS getting in the way of a plain reachability check. */
async function serverIsUp() {
	try {
		await fetch(`${SERVER}/`, {
			mode: "no-cors",
			cache: "no-store",
			signal: AbortSignal.timeout(5000),
		});
		return true;
	} catch {
		return false;
	}
}

function formatTime(date: Date) {
	const day = date.toLocaleDateString("pt-PT", {
		day: "numeric",
		month: "short",
		year: "numeric",
	});
	const time = date.toLocaleTimeString("pt-PT", { hour12: false });
	return `${day.replace(/\./g, "").replace(/ de /g, " ")} · ${time}`;
}

export function ConnectionError({ error }: ErrorComponentProps) {
	const offline = isConnectionError(error);
	const [busy, setBusy] = useState(false);
	const [tries, setTries] = useState(1);
	const [countdown, setCountdown] = useState(AUTO_RETRY_SECONDS);
	const [failedAt, setFailedAt] = useState(() => new Date());
	const busyRef = useRef(false);

	/** Reload the whole app (web page or desktop webview) once the server answers again. */
	const retry = useCallback(async () => {
		if (busyRef.current) return;
		busyRef.current = true;
		setBusy(true);
		// Non-connection errors: the server may be fine, so just reload.
		if (!offline || (await serverIsUp())) {
			window.location.reload();
			return;
		}
		busyRef.current = false;
		setBusy(false);
		setTries((n) => n + 1);
		setFailedAt(new Date());
		setCountdown(AUTO_RETRY_SECONDS);
	}, [offline]);

	// Automatic retry every 10 s while the server is offline.
	useEffect(() => {
		if (!offline || busy) return;
		const id = window.setInterval(() => {
			setCountdown((s) => Math.max(0, s - 1));
		}, 1000);
		return () => window.clearInterval(id);
	}, [offline, busy]);

	useEffect(() => {
		if (offline && countdown === 0) void retry();
	}, [offline, countdown, retry]);

	// ⌘R / Ctrl+R retries here too (the desktop webview has no reload menu).
	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "r") {
				e.preventDefault();
				void retry();
			}
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [retry]);

	const message =
		error instanceof Error ? `${error.name}: ${error.message}` : String(error);
	const details = [
		message,
		`servidor ${SERVER}`,
		`página ${typeof window === "undefined" ? "" : window.location.pathname}`,
		`tentativa ${tries} · ${formatTime(failedAt)}`,
	];

	const copyDetails = async () => {
		try {
			await navigator.clipboard.writeText(details.join("\n"));
			toast.success("Detalhes copiados");
		} catch {
			toast.error("Não foi possível copiar");
		}
	};

	const ledColor = busy ? "#D29922" : "#F85149";
	const status = busy
		? `a ligar a ${SERVER_HOST}…`
		: offline
			? `${SERVER_HOST} · sem resposta · nova tentativa automática em ${countdown}s`
			: `${SERVER_HOST} · erro inesperado`;

	return (
		<main className="bg-canvas flex min-h-[calc(100svh-28px)] w-full flex-1 items-center justify-center bg-[radial-gradient(#141920_1px,transparent_1px)] [background-size:24px_24px] px-6 py-12">
			<section
				aria-labelledby="err-title"
				className="flex w-[520px] max-w-full flex-col items-center gap-[22px] text-center"
			>
				<Illustration ledColor={ledColor} />

				<div className="flex flex-col gap-2">
					<span className="num text-danger text-xs">
						{offline ? "sem ligação ao servidor" : "erro inesperado"}
					</span>
					<h1
						id="err-title"
						className="m-0 text-2xl font-semibold tracking-[-.01em]"
					>
						{offline
							? "Não foi possível carregar os dados"
							: "Algo correu mal"}
					</h1>
					<p className="text-fg-2 m-0 text-sm leading-relaxed">
						{offline
							? "O app não conseguiu falar com o servidor. Os teus dados estão seguros: nada foi apagado. Verifica a ligação e tenta de novo."
							: "Ocorreu um erro ao mostrar esta página. Os teus dados estão seguros: nada foi apagado. Recarrega o app para tentar de novo."}
					</p>
				</div>

				<button
					type="button"
					onClick={() => void retry()}
					aria-busy={busy}
					className="bg-money text-money-ink hover:bg-money-2 focus-visible:ring-offset-canvas focus-visible:ring-money inline-flex h-11 cursor-pointer items-center justify-center gap-2.5 rounded-[10px] px-[22px] text-[15px] font-semibold outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
				>
					<RotateCwIcon
						aria-hidden="true"
						className={cn("size-[17px]", busy && "animate-spin")}
						strokeWidth={2.4}
					/>
					{busy ? "A tentar…" : "Tentar de novo"}
					<span className="num rounded bg-[rgba(4,19,10,.18)] px-[5px] text-[11px]">
						⌘R
					</span>
				</button>

				<div
					role="status"
					className="num text-dim inline-flex items-center gap-2 text-[11px]"
				>
					<span
						className="size-[7px] rounded-full"
						style={{ background: ledColor }}
					/>
					{status}
				</div>

				<details className="group border-line bg-panel w-full rounded-[10px] border text-left">
					<summary className="text-fg-2 flex cursor-pointer list-none items-center justify-between px-3.5 py-2.5 text-xs [&::-webkit-details-marker]:hidden">
						Detalhes técnicos
						<span className="num text-dim group-open:hidden">mostrar</span>
						<span className="num text-dim hidden group-open:inline">
							esconder
						</span>
					</summary>
					<div className="num border-line text-dim flex flex-col gap-1 border-t px-3.5 pt-2.5 pb-3 text-xs break-all">
						<span>
							<span className="text-[#F85149]">✗</span> {details[0]}
						</span>
						{details.slice(1).map((line) => (
							<span key={line}>{line}</span>
						))}
					</div>
					<div className="flex gap-2 px-3.5 pb-3">
						<button
							type="button"
							onClick={copyDetails}
							className="border-line-strong text-fg-2 hover:bg-hover hover:text-fg inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-[7px] border bg-transparent px-2.5 text-xs"
						>
							Copiar detalhes
						</button>
					</div>
				</details>
			</section>
		</main>
	);
}

function Illustration({ ledColor }: { ledColor: string }) {
	return (
		<svg
			role="img"
			aria-label="Ilustração: uma ficha desligada da tomada, com uma faísca entre as duas"
			viewBox="0 0 320 200"
			width="320"
			height="200"
			className="h-auto max-w-full"
		>
			<circle cx="160" cy="100" r="92" fill="none" stroke="#1F242B" strokeWidth="1.5" strokeDasharray="3 7" />
			<circle cx="160" cy="100" r="64" fill="#0F1216" stroke="#1A1F26" strokeWidth="1.5" />
			<path d="M0 116 C48 116 56 100 92 100" fill="none" stroke="#30363D" strokeWidth="7" strokeLinecap="round" />
			<rect x="88" y="80" width="40" height="40" rx="9" fill="#161B22" stroke="#6E7681" strokeWidth="2" />
			<rect x="96" y="92" width="6" height="16" rx="2" fill="#30363D" />
			<path d="M128 90 H143 M128 110 H143" stroke="#ADB5BD" strokeWidth="4.5" strokeLinecap="round" />
			<rect x="180" y="78" width="44" height="44" rx="10" fill="#161B22" stroke="#6E7681" strokeWidth="2" />
			<rect x="180" y="87" width="7" height="6" rx="1.5" fill="#0A0C0F" />
			<rect x="180" y="107" width="7" height="6" rx="1.5" fill="#0A0C0F" />
			<circle cx="211" cy="91" r="3.5" fill={ledColor} />
			<path d="M224 100 C260 100 270 84 320 84" fill="none" stroke="#30363D" strokeWidth="7" strokeLinecap="round" />
			<g className="animate-pulse">
				<polyline points="160,76 154,94 166,98 158,118" fill="none" stroke="#F85149" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
				<path d="M148 72 L151 79 M172 116 L176 123 M170 80 L176 76" stroke="#FFA657" strokeWidth="2.2" strokeLinecap="round" />
			</g>
			<circle cx="70" cy="46" r="2.5" fill="#30363D" />
			<circle cx="252" cy="152" r="2.5" fill="#30363D" />
			<circle cx="262" cy="40" r="1.8" fill="#30363D" />
			<circle cx="58" cy="160" r="1.8" fill="#30363D" />
		</svg>
	);
}
