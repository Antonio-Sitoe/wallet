import { Link, useNavigate } from "@tanstack/react-router";
import type { SearchHit } from "@wallet/shared";
import {
	DialogContent,
	Dialog as DialogRoot,
	DialogTitle,
} from "@wallet/ui/components/dialog";
import { cn } from "@wallet/ui/lib/utils";
import { SearchIcon, SparklesIcon } from "lucide-react";
import {
	type KeyboardEvent,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { useAssistantStatus } from "@/actions/assistant/use-assistant-status";
import { useSearch } from "@/actions/search/use-search";
import {
	ChatMessages,
	SUGGESTIONS,
} from "@/components/assistant/chat-messages";
import { useChat } from "@/components/assistant/use-chat";
import { NAV } from "@/components/layout/app-shell";
import { useNewTransaction } from "@/contexts/new-transaction-context";
import { useOpenSettings } from "@/contexts/settings-context";
import { formatCombo, useShortcutMap } from "@/lib/shortcuts";
import { ink, tint } from "@/utils/color";
import { signedMoney } from "@/utils/format";

export type PaletteMode = "search" | "ask";

type Item = {
	key: string;
	group: string;
	title: string;
	subtitle?: string;
	right?: string;
	rightTone?: "money" | "warn";
	icon: string;
	color: string;
	keywords?: string;
	run: () => void;
};

const normalize = (text: string) =>
	text
		.normalize("NFD")
		.replace(/\p{Diacritic}/gu, "")
		.toLowerCase()
		.trim();

const initials = (text: string) =>
	text
		.replace(/[^\p{L}\p{N} ]/gu, "")
		.split(" ")
		.filter(Boolean)
		.slice(0, 2)
		.map((w) => w[0]?.toUpperCase())
		.join("") || "·";

function parse(raw: string) {
	const text = raw.trimStart();
	const prefix = text[0];
	if (prefix === "@")
		return { scope: "accounts" as const, q: text.slice(1).trim() };
	if (prefix === "#")
		return { scope: "categories" as const, q: text.slice(1).trim() };
	if (prefix === ">")
		return { scope: "actions" as const, q: text.slice(1).trim() };
	return { scope: "all" as const, q: text.trim() };
}

function useDebounced(value: string, ms = 180) {
	const [debounced, setDebounced] = useState(value);
	useEffect(() => {
		const t = setTimeout(() => setDebounced(value), ms);
		return () => clearTimeout(t);
	}, [value, ms]);
	return debounced;
}

export function CommandPalette({
	open,
	mode: initialMode,
	onOpenChange,
}: {
	open: boolean;
	mode: PaletteMode;
	onOpenChange: (open: boolean) => void;
}) {
	return (
		<DialogRoot open={open} onOpenChange={onOpenChange}>
			<DialogContent
				showCloseButton={false}
				className={cn(
					"bg-panel text-fg shadow-overlay top-[12vh] flex max-h-[76vh] w-[calc(100vw-32px)] max-w-[720px] translate-y-0 flex-col gap-0 overflow-hidden rounded-[14px] border p-0 text-[13px] ring-0 sm:max-w-[720px]",
				)}
			>
				{open ? (
					<Palette
						initialMode={initialMode}
						close={() => onOpenChange(false)}
					/>
				) : null}
			</DialogContent>
		</DialogRoot>
	);
}

function Palette({
	initialMode,
	close,
}: {
	initialMode: PaletteMode;
	close: () => void;
}) {
	const navigate = useNavigate();
	const openNew = useNewTransaction();
	const openSettings = useOpenSettings();
	const status = useAssistantStatus().data;
	const keys = useShortcutMap();
	const [mode, setMode] = useState<PaletteMode>(initialMode);
	const [text, setText] = useState("");
	const [selected, setSelected] = useState(0);
	const [conversationId, setConversationId] = useState<string>();
	const chat = useChat(conversationId, setConversationId);
	const listRef = useRef<HTMLDivElement>(null);
	const askRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		inputRef.current?.focus();
	}, []);

	const parsed = parse(text);
	const debounced = useDebounced(parsed.q);
	const serverScope =
		parsed.scope === "actions"
			? null
			: parsed.scope === "all"
				? "all"
				: parsed.scope;
	const search = useSearch(serverScope ? debounced : "", serverScope ?? "all");

	const go = (run: () => void) => () => {
		close();
		run();
	};

	const statics = useMemo<Item[]>(
		() => [
			{
				key: "new-expense",
				group: "Acções",
				title: "Nova despesa",
				subtitle: "abre o modal",
				right: formatCombo(keys.newTransaction),
				icon: "+",
				color: "var(--color-money)",
				keywords: "transaccao registar saida gasto",
				run: () => openNew({ kind: "expense" }),
			},
			{
				key: "new-income",
				group: "Acções",
				title: "Nova entrada",
				subtitle: "salário, reembolso…",
				icon: "+",
				color: "var(--color-money)",
				keywords: "transaccao receber rendimento",
				run: () => openNew({ kind: "income" }),
			},
			{
				key: "new-transfer",
				group: "Acções",
				title: "Nova transferência",
				subtitle: "entre contas",
				icon: "⇄",
				color: "var(--color-info-2)",
				keywords: "transferir mover",
				run: () => openNew({ kind: "transfer" }),
			},
			{
				key: "assistant",
				group: "Acções",
				title: "Abrir o assistente",
				subtitle: "conversas com histórico",
				right: formatCombo(keys.assistant),
				icon: "✦",
				color: "var(--color-ai)",
				keywords: "ia chat perguntar conversa",
				run: () => navigate({ to: "/assistant" }),
			},
			{
				key: "settings",
				group: "Acções",
				title: "Definições",
				subtitle: "salário, tema, dados",
				right: formatCombo(keys.settings),
				icon: "⚙",
				color: "var(--color-dim)",
				keywords: "config preferencias tema exportar",
				run: () => openSettings(),
			},
			...NAV.map((n, i) => ({
				key: `nav-${n.to}`,
				group: "Ecrãs",
				title: n.label,
				subtitle: "ir para",
				right:
					i < 10
						? formatCombo(keys[`nav${i + 1}` as keyof typeof keys])
						: undefined,
				icon: initials(n.label).slice(0, 1),
				color: "var(--color-dim)",
				run: () => navigate({ to: n.to }),
			})),
		],
		[navigate, openNew, openSettings, keys],
	);

	const items = useMemo<Item[]>(() => {
		const needle = normalize(parsed.q);
		const staticMatches = statics.filter((s) => {
			if (parsed.scope === "accounts" || parsed.scope === "categories")
				return false;
			if (parsed.scope === "actions" && s.group !== "Acções") return false;
			if (!needle)
				return (
					parsed.scope === "actions" ||
					s.group === "Acções" ||
					s.key === "nav-/budget" ||
					s.key === "nav-/dashboard"
				);
			return normalize(
				`${s.title} ${s.subtitle ?? ""} ${s.keywords ?? ""}`,
			).includes(needle);
		});
		if (!needle || !serverScope) return staticMatches;
		const data = search.data;
		const fromHits = (
			hits: SearchHit[] | undefined,
			group: string,
			to: (h: SearchHit) => () => void,
			fallbackColor: string,
		): Item[] =>
			(hits ?? []).map((h) => ({
				key: `${group}-${h.id}`,
				group,
				title: h.title,
				subtitle: h.subtitle,
				right: h.amount === null ? undefined : signedMoney(h.amount),
				rightTone:
					h.amount === null
						? undefined
						: h.amount < 0
							? "warn"
							: group === "Transacções"
								? "money"
								: undefined,
				icon: initials(h.title),
				color: h.color ?? fallbackColor,
				run: to(h),
			}));
		return [
			...staticMatches,
			...fromHits(
				data?.accounts,
				"Contas",
				(h) => () => navigate({ to: "/accounts", search: { id: h.id } }),
				"#58a6ff",
			),
			...fromHits(
				data?.categories,
				"Categorias",
				(h) => () =>
					navigate({
						to: "/transactions",
						search: { period: "all", category: h.id },
					}),
				"#8b949e",
			),
			...fromHits(
				data?.transactions,
				"Transacções",
				(h) => () =>
					navigate({
						to: "/transactions",
						search: { period: "all", q: parsed.q, id: h.id },
					}),
				"#8b949e",
			),
		];
	}, [statics, parsed.q, parsed.scope, serverScope, search.data, navigate]);

	const current = Math.min(selected, Math.max(0, items.length - 1));
	useEffect(() => {
		listRef.current
			?.querySelector(`[data-index="${current}"]`)
			?.scrollIntoView({ block: "nearest" });
	}, [current]);

	useEffect(() => {
		askRef.current?.scrollTo({ top: askRef.current.scrollHeight });
	});

	const ask = (question: string) => {
		setMode("ask");
		setText("");
		void chat.ask(question);
	};

	const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Tab") {
			e.preventDefault();
			setMode(mode === "ask" ? "search" : "ask");
			return;
		}
		if (mode === "ask") {
			if (e.key === "Enter" && text.trim()) {
				e.preventDefault();
				ask(text);
			}
			return;
		}
		if (e.key === "ArrowDown") {
			e.preventDefault();
			setSelected(Math.min(current + 1, items.length - 1));
		} else if (e.key === "ArrowUp") {
			e.preventDefault();
			setSelected(Math.max(current - 1, 0));
		} else if (e.key === "Enter") {
			e.preventDefault();
			const item = items[current];
			if (item) go(item.run)();
			else if (text.trim()) ask(text);
		}
	};

	const groups: { title: string; items: (Item & { index: number })[] }[] = [];
	items.forEach((item, index) => {
		const title = !parsed.q && item.group === "Ecrãs" ? "Recentes" : item.group;
		let group = groups.find((g) => g.title === title);
		if (!group) {
			group = { title, items: [] };
			groups.push(group);
		}
		group.items.push({ ...item, index });
	});

	const isAsk = mode === "ask";
	const notConnected = status && !status.connected;
	const asked = new Set(
		chat.messages.filter((m) => m.role === "user").map((m) => m.content),
	);
	const hints = isAsk
		? [
				["↵", "enviar"],
				["tab", "pesquisar"],
				["esc", "fechar"],
			]
		: [
				["↑↓", "navegar"],
				["↵", "abrir"],
				["tab", "perguntar"],
				["esc", "fechar"],
			];

	return (
		<div
			className={cn(
				"flex min-h-0 flex-col",
				isAsk ? "border-ai-line" : "border-line-overlay",
			)}
		>
			<DialogTitle className="sr-only">Procurar ou perguntar</DialogTitle>
			<div className="border-line flex items-center gap-3 border-b px-3.5 py-3">
				{isAsk ? (
					<SparklesIcon
						aria-hidden="true"
						className="text-ai size-[18px] shrink-0"
						fill="currentColor"
					/>
				) : (
					<SearchIcon
						aria-hidden="true"
						className="text-dim size-[18px] shrink-0"
					/>
				)}
				<input
					ref={inputRef}
					aria-label={isAsk ? "Pergunta" : "Procurar"}
					value={text}
					onChange={(e) => {
						setText(e.target.value);
						setSelected(0);
					}}
					onKeyDown={onKeyDown}
					placeholder={
						isAsk
							? "Pergunta qualquer coisa sobre o teu dinheiro…"
							: "Procurar transacções, contas, ecrãs…  @conta  #categoria  >acção"
					}
					className="placeholder:text-faint h-[34px] min-w-0 flex-1 bg-transparent text-base outline-none"
				/>
				<div
					role="tablist"
					aria-label="Modo"
					className="border-line bg-canvas flex shrink-0 gap-0.5 rounded-lg border p-[3px]"
				>
					<button
						type="button"
						role="tab"
						aria-selected={!isAsk}
						onClick={() => setMode("search")}
						className={cn(
							"flex h-7 cursor-pointer items-center gap-1.5 rounded-md px-2.5 text-xs font-medium",
							!isAsk ? "bg-track text-fg" : "text-dim hover:text-fg",
						)}
					>
						<SearchIcon
							aria-hidden="true"
							className="size-3"
							strokeWidth={2.4}
						/>
						Pesquisar
					</button>
					<button
						type="button"
						role="tab"
						aria-selected={isAsk}
						onClick={() => setMode("ask")}
						className={cn(
							"flex h-7 cursor-pointer items-center gap-1.5 rounded-md px-2.5 text-xs font-medium",
							isAsk ? "bg-ai-bg text-ai-fg" : "text-dim hover:text-fg",
						)}
					>
						<SparklesIcon
							aria-hidden="true"
							className="size-3"
							fill="currentColor"
						/>
						Perguntar
					</button>
				</div>
			</div>

			{isAsk ? (
				<div
					ref={askRef}
					aria-live="polite"
					className="flex min-h-[300px] flex-1 flex-col gap-3.5 overflow-y-auto p-4"
				>
					{chat.messages.length === 0 && !chat.pending ? (
						<div className="flex flex-col gap-1.5 px-0.5 pt-2 pb-1">
							<span className="text-[15px] font-semibold">
								Pergunta sobre o teu dinheiro
							</span>
							<span className="text-fg-2 leading-relaxed">
								Respondo com as tuas transacções, contas e plano. Posso também
								preparar uma transacção para confirmares.
							</span>
						</div>
					) : (
						<ChatMessages messages={chat.messages} pending={chat.pending} />
					)}
					<div className="mt-auto flex flex-wrap gap-1.5 pt-1.5">
						{SUGGESTIONS.filter((s) => !asked.has(s)).map((s) => (
							<button
								key={s}
								type="button"
								disabled={!!chat.pending}
								onClick={() => ask(s)}
								className="border-ai-line bg-ai-chip text-ai-fg hover:border-ai inline-flex h-[30px] cursor-pointer items-center rounded-full border px-3 text-xs disabled:opacity-50"
							>
								{s}
							</button>
						))}
					</div>
				</div>
			) : (
				<div
					ref={listRef}
					role="listbox"
					aria-label="Resultados"
					className="min-h-[300px] flex-1 overflow-y-auto px-1.5 pt-1 pb-2"
				>
					{groups.map((g) => (
						<div key={g.title}>
							<div className="num text-dim px-3 pt-2.5 pb-1 text-[11px] tracking-[.06em] uppercase">
								{g.title}
							</div>
							{g.items.map((item) => {
								const on = item.index === current;
								return (
									<button
										key={item.key}
										type="button"
										role="option"
										aria-selected={on}
										data-index={item.index}
										onMouseMove={() => setSelected(item.index)}
										onClick={go(item.run)}
										className={cn(
											"flex min-h-10 w-full cursor-pointer items-center gap-3 rounded-lg px-3 text-left",
											on &&
												"bg-info-bg shadow-[inset_0_0_0_1px_var(--color-info-line)]",
										)}
									>
										<span
											aria-hidden="true"
											className="num flex size-[26px] shrink-0 items-center justify-center rounded-[7px] text-[11px] font-semibold"
											style={{
												background: tint(item.color),
												color: ink(item.color),
											}}
										>
											{item.icon}
										</span>
										<span className="flex min-w-0 flex-1 flex-col gap-px">
											<span className="truncate">{item.title}</span>
											{item.subtitle ? (
												<span className="num text-dim truncate text-[11px]">
													{item.subtitle}
												</span>
											) : null}
										</span>
										{item.right ? (
											<span
												className={cn(
													"num text-xs",
													item.rightTone === "money"
														? "text-money"
														: item.rightTone === "warn"
															? "text-warn"
															: "text-fg-2",
												)}
											>
												{item.right}
											</span>
										) : null}
										{on ? (
											<kbd className="num border-line-strong bg-hover text-fg-2 rounded border px-1.5 text-[11px]">
												↵
											</kbd>
										) : null}
									</button>
								);
							})}
						</div>
					))}
					{items.length === 0 && parsed.q && !search.isFetching ? (
						<div className="flex flex-col items-center gap-2.5 px-3 py-10 text-center">
							<span className="font-medium">
								Nada encontrado para “{parsed.q}”
							</span>
							<button
								type="button"
								onClick={() => ask(parsed.q)}
								className="border-ai-line bg-ai-chip text-ai-fg hover:border-ai inline-flex h-[30px] cursor-pointer items-center rounded-full border px-3 text-xs"
							>
								Perguntar à IA: “{parsed.q}”
							</button>
						</div>
					) : null}
				</div>
			)}

			<div className="num border-line bg-panel-2 text-dim flex flex-wrap items-center gap-3.5 border-t px-3.5 py-2 text-[11px]">
				{hints.map(([k, t]) => (
					<span key={t}>
						<kbd className="border-line-strong bg-hover text-fg-2 rounded border px-1.5">
							{k}
						</kbd>{" "}
						{t}
					</span>
				))}
				<span className={cn("ml-auto", isAsk ? "text-ai" : "text-dim")}>
					{isAsk
						? notConnected
							? "IA por ligar · as perguntas ficam guardadas"
							: "responde só com os teus dados · nada sai sem confirmares"
						: `${items.length} resultados`}
				</span>
				{isAsk ? (
					<Link
						to="/assistant"
						search={conversationId ? { id: conversationId } : {}}
						onClick={close}
						className="text-ai-fg hover:underline"
					>
						abrir em conversa {formatCombo(keys.assistant)}
					</Link>
				) : null}
			</div>
		</div>
	);
}
