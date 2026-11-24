import type { ErrorComponentProps } from "@tanstack/react-router";
import { Button } from "@wallet/ui/components/button";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@wallet/ui/components/collapsible";
import { cn } from "@wallet/ui/lib/utils";
import { RotateCwIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Illustration } from "@/components/feedback/connection-error-illustration";
import { ENV } from "@/env";
import { ApiError } from "@/lib/api";

export const SERVER = ENV.VITE_SERVER_URL.replace(/\/$/, "");

export const SERVER_HOST = SERVER.replace(/^https?:\/\//, "");

export const AUTO_RETRY_SECONDS = 10;

export function isConnectionError(error: unknown) {
	if (error instanceof ApiError) return false;
	const message = error instanceof Error ? error.message : String(error);
	return (
		error instanceof TypeError ||
		/failed to fetch|load failed|networkerror|network request failed/i.test(
			message,
		)
	);
}

export async function serverIsUp() {
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

export function formatTime(date: Date) {
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

	const retry = useCallback(async () => {
		if (busyRef.current) return;
		busyRef.current = true;
		setBusy(true);
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

	const ledColor = busy ? "var(--color-caution)" : "var(--color-danger-2)";
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
						{offline ? "Não foi possível carregar os dados" : "Algo correu mal"}
					</h1>
					<p className="text-fg-2 m-0 text-sm leading-relaxed">
						{offline
							? "O app não conseguiu falar com o servidor. Os teus dados estão seguros: nada foi apagado. Verifica a ligação e tenta de novo."
							: "Ocorreu um erro ao mostrar esta página. Os teus dados estão seguros: nada foi apagado. Recarrega o app para tentar de novo."}
					</p>
				</div>

				<Button
					variant="primary"
					onClick={() => void retry()}
					aria-busy={busy}
					className="bg-money text-money-ink hover:bg-money-2 focus-visible:ring-offset-canvas focus-visible:ring-money rounded-card inline-flex h-11 cursor-pointer items-center justify-center gap-2.5 px-[22px] text-[15px] font-semibold outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
				>
					<RotateCwIcon
						aria-hidden="true"
						className={cn("size-[17px]", busy && "animate-spin")}
						strokeWidth={2.4}
					/>
					{busy ? "A tentar…" : "Tentar de novo"}
					<span className="num bg-money-ink/18 rounded px-[5px] text-[11px]">
						⌘R
					</span>
				</Button>

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

				<Collapsible className="group border-line bg-panel rounded-card w-full border text-left">
					<CollapsibleTrigger className="text-fg-2 flex w-full cursor-pointer items-center justify-between px-3.5 py-2.5 text-xs">
						Detalhes técnicos
						<span className="num text-dim group-data-open:hidden">mostrar</span>
						<span className="num text-dim hidden group-data-open:inline">
							esconder
						</span>
					</CollapsibleTrigger>
					<CollapsibleContent>
						<div className="num border-line text-dim flex flex-col gap-1 border-t px-3.5 pt-2.5 pb-3 text-xs break-all">
							<span>
								<span className="text-danger-2">✗</span> {details[0]}
							</span>
							{details.slice(1).map((line) => (
								<span key={line}>{line}</span>
							))}
						</div>
						<div className="flex gap-2 px-3.5 pb-3">
							<Button
								variant="neutral"
								size="sm"
								onClick={copyDetails}
								className="border-line-strong text-fg-2 hover:bg-hover hover:text-fg rounded-control inline-flex h-8 cursor-pointer items-center gap-1.5 border bg-transparent px-2.5 text-xs"
							>
								Copiar detalhes
							</Button>
						</div>
					</CollapsibleContent>
				</Collapsible>
			</section>
		</main>
	);
}
