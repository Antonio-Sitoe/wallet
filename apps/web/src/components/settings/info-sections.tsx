import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import type { ExportFormat } from "@wallet/shared";
import { Button } from "@wallet/ui/components/button";
import { cn } from "@wallet/ui/lib/utils";
import { useState } from "react";
import { toast } from "sonner";
import { MOD, NAV } from "@/components/layout/app-shell";
import {
	SettingsRow,
	SettingsSection,
	SettingsValue,
} from "@/components/settings/settings-row";
import { ENV } from "@/env";
import { apiDownload, errorMessage } from "@/lib/api";

const SERVER = ENV.VITE_SERVER_URL.replace(/\/$/, "");
const SERVER_LABEL = SERVER.replace(/^https?:\/\//, "");
export const APP_VERSION = "v0.1 · mvp";

function Kbd({ children }: { children: string }) {
	return (
		<kbd className="border-line-strong bg-canvas num text-fg-2 inline-flex h-6 min-w-6 items-center justify-center rounded-md border px-1.5 text-[11px]">
			{children}
		</kbd>
	);
}

export function ShortcutsSection() {
	const shortcuts: { label: string; keys: string }[] = [
		{ label: "Nova transacção", keys: `${MOD}N` },
		{ label: "Definições", keys: `${MOD},` },
		{ label: "Ocultar dinheiro", keys: `⇧${MOD}H` },
		{ label: "Mudar de tema", keys: `⇧${MOD}L` },
		...NAV.slice(0, 10).map((item, i) => ({
			label: item.label,
			keys: `${MOD}${(i + 1) % 10}`,
		})),
		{ label: "Fechar janela", keys: "Esc" },
	];
	return (
		<SettingsSection
			title="Atalhos de teclado"
			description="Funcionam em qualquer ecrã. Em Windows e Linux, ⌘ é Ctrl."
		>
			<div className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
				{shortcuts.map((s) => (
					<div
						key={s.label}
						className="border-line flex items-center justify-between gap-3 border-b py-2.5"
					>
						<span className="text-[13px]">{s.label}</span>
						<Kbd>{s.keys}</Kbd>
					</div>
				))}
			</div>
		</SettingsSection>
	);
}

function useServerStatus() {
	return useQuery({
		queryKey: ["server-status"],
		queryFn: async () => {
			const started = performance.now();
			const res = await fetch(`${SERVER}/`);
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			return Math.round(performance.now() - started);
		},
		refetchInterval: 30_000,
		retry: false,
	});
}

export function DataSection({ onNavigate }: { onNavigate: () => void }) {
	const navigate = useNavigate();
	const status = useServerStatus();
	const [exporting, setExporting] = useState<ExportFormat | null>(null);

	async function download(format: ExportFormat) {
		setExporting(format);
		try {
			const filename = await apiDownload("/settings/export", { format });
			toast.success(`Exportado · ${filename}`);
		} catch (e) {
			toast.error(errorMessage(e));
		} finally {
			setExporting(null);
		}
	}

	const online = status.isSuccess;
	return (
		<SettingsSection title="Dados">
			<SettingsRow
				title="Servidor"
				description="API Node + PostgreSQL. A web e o desktop usam o mesmo."
			>
				<span className="num text-fg-2 inline-flex items-center gap-1.5 text-xs">
					<span
						className={cn(
							"inline-block size-[7px] rounded-full",
							status.isPending ? "bg-faint" : online ? "bg-money" : "bg-danger",
						)}
					/>
					{SERVER_LABEL} ·{" "}
					{status.isPending
						? "a verificar"
						: online
							? `ligado · ${status.data} ms`
							: "sem ligação"}
				</span>
			</SettingsRow>
			<SettingsRow
				title="Histórico de imports"
				description="Cada import pode ser desfeito."
			>
				<Button
					variant="neutral"
					onClick={() => {
						onNavigate();
						navigate({ to: "/import" });
					}}
				>
					Ver imports
				</Button>
			</SettingsRow>
			<SettingsRow
				title="Exportar transacções"
				description="Todas as transacções, com conta, categoria, payee e nota. O CSV usa ; como separador."
			>
				<Button
					variant="neutral"
					disabled={!!exporting}
					onClick={() => download("csv")}
				>
					{exporting === "csv" ? "A exportar…" : "CSV"}
				</Button>
				<Button
					variant="neutral"
					disabled={!!exporting}
					onClick={() => download("xlsx")}
				>
					{exporting === "xlsx" ? "A exportar…" : "Excel"}
				</Button>
			</SettingsRow>
		</SettingsSection>
	);
}

export function AboutSection() {
	return (
		<SettingsSection title="Sobre">
			<SettingsRow title="Versão">
				<SettingsValue>{APP_VERSION}</SettingsValue>
			</SettingsRow>
			<SettingsRow
				title="Privacidade"
				description="Os dados financeiros ficam na base de dados do servidor a que o app está ligado. O app não os envia a mais ninguém."
			/>
			<SettingsRow
				title="Termos de uso"
				description="Ainda por escrever. Entram antes de o app ser partilhado com outras pessoas."
			/>
		</SettingsSection>
	);
}
