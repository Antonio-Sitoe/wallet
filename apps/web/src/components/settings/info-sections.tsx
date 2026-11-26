import { useQuery } from "@tanstack/react-query";
import {
	DEFAULT_SHORTCUTS,
	type ExportFormat,
	SHORTCUT_ACTIONS,
	type ShortcutAction,
	type ShortcutOverrides,
} from "@wallet/shared";
import { Button } from "@wallet/ui/components/button";
import { cn } from "@wallet/ui/lib/utils";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { NAV } from "@/components/layout/app-shell";
import {
	SettingsRow,
	SettingsSection,
	SettingsValue,
} from "@/components/settings/settings-row";
import { TERMS_UPDATED, TermsDialog } from "@/components/settings/terms";
import { usePreferencesContext } from "@/contexts/preferences-context";
import { ENV } from "@/env";
import { apiDownload, errorMessage } from "@/lib/api";
import {
	comboFromEvent,
	formatCombo,
	isMacPlatform,
	useShortcutMap,
} from "@/lib/shortcuts";

const SERVER = ENV.VITE_SERVER_URL.replace(/\/$/, "");
const SERVER_LABEL = SERVER.replace(/^https?:\/\//, "");
export const APP_VERSION = "v0.3";

function Kbd({ children }: { children: string }) {
	return (
		<kbd className="border-line-strong bg-canvas num text-fg-2 inline-flex h-6 min-w-6 items-center justify-center rounded-md border px-1.5 text-[11px]">
			{children}
		</kbd>
	);
}

const SHORTCUT_LABELS: Record<ShortcutAction, string> = {
	newTransaction: "Nova transacção",
	palette: "Procurar ou perguntar",
	assistant: "Assistente",
	settings: "Definições",
	hideMoney: "Ocultar dinheiro",
	theme: "Mudar de tema",
	...(Object.fromEntries(
		NAV.slice(0, 10).map((item, i) => [`nav${i + 1}`, `Ir para ${item.label}`]),
	) as Record<`nav${number}`, string>),
} as Record<ShortcutAction, string>;

function ShortcutRow({
	action,
	combo,
	custom,
	recording,
	onRecord,
	onReset,
}: {
	action: ShortcutAction;
	combo: string;
	custom: boolean;
	recording: boolean;
	onRecord: () => void;
	onReset: () => void;
}) {
	return (
		<div className="border-line flex items-center justify-between gap-3 border-b py-2">
			<span className="text-[13px]">{SHORTCUT_LABELS[action]}</span>
			<span className="flex items-center gap-1.5">
				{custom && !recording ? (
					<Button
						variant="quiet"
						size="sm"
						aria-label={`Repor o atalho de ${SHORTCUT_LABELS[action]}`}
						onClick={onReset}
					>
						Repor
					</Button>
				) : null}
				<Button
					variant="neutral"
					size="sm"
					aria-label={
						recording
							? "A gravar: carregue nas teclas, Esc para cancelar"
							: `Alterar o atalho de ${SHORTCUT_LABELS[action]} (${formatCombo(combo)})`
					}
					onClick={onRecord}
					className={cn(
						"num min-w-[88px]",
						recording && "border-info-2 text-info",
					)}
				>
					{recording ? "carregue…" : formatCombo(combo)}
				</Button>
			</span>
		</div>
	);
}

export function ShortcutsSection() {
	const { preferences, update } = usePreferencesContext();
	const bindings = useShortcutMap();
	const overrides = preferences?.shortcuts ?? {};
	const [recording, setRecording] = useState<ShortcutAction | null>(null);

	const save = useCallback(
		(next: ShortcutOverrides) => update({ shortcuts: next }),
		[update],
	);

	useEffect(() => {
		if (!recording) return;
		const onKey = (e: KeyboardEvent) => {
			e.preventDefault();
			e.stopImmediatePropagation();
			if (e.key === "Escape") {
				setRecording(null);
				return;
			}
			const combo = comboFromEvent(e);
			if (!combo) return;
			if (!combo.startsWith("mod+") && !combo.startsWith("alt+")) {
				toast.error(
					`Use ${isMacPlatform ? "⌘ ou ⌥" : "Ctrl ou Alt"} com a tecla`,
				);
				return;
			}
			const taken = (Object.keys(bindings) as ShortcutAction[]).find(
				(a) => a !== recording && bindings[a] === combo,
			);
			if (taken) {
				toast.error(
					`${formatCombo(combo)} já é usado por «${SHORTCUT_LABELS[taken]}»`,
				);
				return;
			}
			const next: ShortcutOverrides = { ...overrides };
			if (combo === DEFAULT_SHORTCUTS[recording]) delete next[recording];
			else next[recording] = combo;
			save(next);
			toast.success(`${SHORTCUT_LABELS[recording]}: ${formatCombo(combo)}`);
			setRecording(null);
		};
		window.addEventListener("keydown", onKey, { capture: true });
		return () =>
			window.removeEventListener("keydown", onKey, { capture: true });
	}, [recording, bindings, overrides, save]);

	const customCount = Object.keys(overrides).length;
	return (
		<SettingsSection
			title="Atalhos de teclado"
			description="Clique num atalho e carregue nas novas teclas (com ⌘/Ctrl ou ⌥/Alt). Ficam guardados na conta. Esc cancela."
		>
			{customCount ? (
				<div className="flex justify-end">
					<Button variant="neutral" size="sm" onClick={() => save({})}>
						Repor todos ({customCount})
					</Button>
				</div>
			) : null}
			<div className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
				{SHORTCUT_ACTIONS.map((action) => (
					<ShortcutRow
						key={action}
						action={action}
						combo={bindings[action]}
						custom={action in overrides}
						recording={recording === action}
						onRecord={() => setRecording(recording === action ? null : action)}
						onReset={() => {
							const next: ShortcutOverrides = { ...overrides };
							delete next[action];
							save(next);
						}}
					/>
				))}
				<div className="border-line flex items-center justify-between gap-3 border-b py-2">
					<span className="text-[13px]">Fechar janela ou diálogo</span>
					<Kbd>Esc</Kbd>
				</div>
				<div className="border-line flex items-center justify-between gap-3 border-b py-2">
					<span className="text-[13px]">Mover entre controlos</span>
					<Kbd>Tab</Kbd>
				</div>
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
						navigate("/import");
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
	const [termsOpen, setTermsOpen] = useState(false);
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
				description={`Conta, dados, limites do app e alterações. Actualizados a ${TERMS_UPDATED}.`}
			>
				<Button variant="neutral" onClick={() => setTermsOpen(true)}>
					Ler os termos
				</Button>
			</SettingsRow>
			<TermsDialog open={termsOpen} onOpenChange={setTermsOpen} />
		</SettingsSection>
	);
}
