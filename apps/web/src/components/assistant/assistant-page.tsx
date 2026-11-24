import { getRouteApi } from "@tanstack/react-router";
import type { Conversation } from "@wallet/shared";
import { Button } from "@wallet/ui/components/button";
import { Skeleton } from "@wallet/ui/components/skeleton";
import { cn } from "@wallet/ui/lib/utils";
import {
	ArrowUpIcon,
	PaperclipIcon,
	PinIcon,
	PlusIcon,
	SearchIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useAccounts } from "@/actions/accounts/use-accounts";
import { useAssistantStatus } from "@/actions/assistant/use-assistant-status";
import {
	useDeleteConversation,
	useUpdateConversation,
} from "@/actions/assistant/use-conversation-mutations";
import { useConversations } from "@/actions/assistant/use-conversations";
import {
	AiMark,
	ChatMessages,
	SUGGESTIONS,
} from "@/components/assistant/chat-messages";
import { useChat } from "@/components/assistant/use-chat";
import { MOD } from "@/components/layout/app-shell";
import { useConfirm } from "@/contexts/confirm-context";
import { apiDownload, errorMessage } from "@/lib/api";
import { currentMonth, monthLabel } from "@/utils/format";

const route = getRouteApi("/_private/assistant");

const DAY = 86_400_000;

function groupOf(c: Conversation, now: number) {
	if (c.pinned) return "Fixadas";
	const start = new Date(now);
	start.setHours(0, 0, 0, 0);
	const at = Date.parse(c.updatedAt);
	if (at >= start.getTime()) return "Hoje";
	if (at >= start.getTime() - DAY) return "Ontem";
	if (at >= start.getTime() - 6 * DAY) return "Esta semana";
	return "Mais antigas";
}

const GROUP_ORDER = ["Fixadas", "Hoje", "Ontem", "Esta semana", "Mais antigas"];

function History({
	current,
	onOpen,
	onNew,
}: {
	current: string | undefined;
	onOpen: (id: string) => void;
	onNew: () => void;
}) {
	const [q, setQ] = useState("");
	const [debounced, setDebounced] = useState("");
	useEffect(() => {
		const t = setTimeout(() => setDebounced(q.trim()), 250);
		return () => clearTimeout(t);
	}, [q]);
	const list = useConversations(debounced || undefined);
	const now = Date.now();
	const groups = GROUP_ORDER.map((title) => ({
		title,
		items: (list.data ?? []).filter((c) => groupOf(c, now) === title),
	})).filter((g) => g.items.length);

	return (
		<aside
			aria-label="Histórico de conversas"
			className="border-line bg-panel-2 flex max-h-[40vh] flex-col border-b md:max-h-none md:w-[288px] md:shrink-0 md:border-r md:border-b-0"
		>
			<div className="border-line flex flex-col gap-2.5 border-b px-3 pt-3.5 pb-2.5">
				<div className="flex items-center justify-between">
					<span className="font-semibold">Conversas</span>
					<Button variant="neutral" size="sm" onClick={onNew}>
						<PlusIcon className="size-3.5" /> Nova
					</Button>
				</div>
				<label className="border-line-strong bg-canvas rounded-control flex h-[30px] items-center gap-2 border px-2.5">
					<SearchIcon aria-hidden="true" className="text-dim size-3.5" />
					<span className="sr-only">Procurar conversas</span>
					<input
						type="search"
						value={q}
						onChange={(e) => setQ(e.target.value)}
						placeholder="procurar conversas…"
						className="placeholder:text-faint min-w-0 flex-1 bg-transparent text-[13px] outline-none"
					/>
				</label>
			</div>
			<div className="flex-1 overflow-y-auto px-2 pt-1 pb-3">
				{list.isPending ? (
					<div className="flex flex-col gap-2 p-2">
						{["a", "b", "c"].map((k) => (
							<Skeleton key={k} className="h-11" />
						))}
					</div>
				) : groups.length === 0 ? (
					<p className="text-dim px-2 py-6 text-center text-xs">
						{debounced
							? `Nenhuma conversa com “${debounced}”.`
							: "Ainda sem conversas."}
					</p>
				) : (
					groups.map((g) => (
						<div key={g.title}>
							<div className="num text-dim px-1.5 pt-3 pb-1.5 text-[11px] tracking-[.06em] uppercase">
								{g.title}
							</div>
							{g.items.map((c) => (
								<button
									key={c.id}
									type="button"
									onClick={() => onOpen(c.id)}
									aria-current={c.id === current ? "true" : undefined}
									className={cn(
										"flex w-full cursor-pointer flex-col gap-0.5 rounded-lg px-2.5 py-2 text-left",
										c.id === current
											? "bg-selected"
											: "hover:bg-surface-sunken",
									)}
								>
									<span className="flex min-w-0 items-center gap-1.5 font-medium">
										{c.pinned ? (
											<PinIcon
												aria-label="fixada"
												className="text-dim size-3 shrink-0"
											/>
										) : null}
										<span className="truncate">{c.title}</span>
									</span>
									{c.preview ? (
										<span className="text-dim truncate text-xs">
											{c.preview}
										</span>
									) : null}
								</button>
							))}
						</div>
					))
				)}
			</div>
			<div className="num border-line text-dim hidden border-t px-3.5 py-2.5 text-[11px] md:block">
				histórico guardado no teu servidor
			</div>
		</aside>
	);
}

export function AssistantPage() {
	const search = route.useSearch();
	const navigate = route.useNavigate();
	const id = search.id;
	const inputRef = useRef<HTMLTextAreaElement>(null);
	const open = (next?: string) => {
		navigate({ search: next ? { id: next } : {} });
		inputRef.current?.focus();
	};
	const chat = useChat(id, (created) => open(created));
	const update = useUpdateConversation();
	const remove = useDeleteConversation();
	const confirmAction = useConfirm();
	const status = useAssistantStatus().data;
	const accounts = useAccounts().data ?? [];
	const [text, setText] = useState("");
	const [menu, setMenu] = useState(false);
	const scrollRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
	});

	useEffect(() => {
		inputRef.current?.focus();
	}, []);

	const send = (value = text) => {
		if (!value.trim() || chat.pending) return;
		setText("");
		void chat.ask(value);
	};

	const conversation = chat.conversation;
	const asked = new Set(
		chat.messages.filter((m) => m.role === "user").map((m) => m.content),
	);
	const empty = chat.messages.length === 0 && !chat.pending;

	return (
		<div className="flex min-h-svh min-w-0 flex-1 flex-col md:flex-row">
			<History current={id} onOpen={open} onNew={() => open()} />
			<main className="flex min-h-0 min-w-0 flex-1 flex-col md:h-svh">
				<header className="border-line bg-panel-2 flex min-h-[52px] flex-wrap items-center justify-between gap-2.5 border-b px-5 py-2">
					<div className="flex min-w-0 flex-col gap-0.5">
						<h1 className="truncate text-sm font-semibold">
							{conversation?.title ?? "Nova conversa"}
						</h1>
						<span className="num text-dim text-[11px]">
							contexto: {monthLabel(currentMonth()).toLowerCase()} ·{" "}
							{accounts.length} contas
							{status && !status.connected ? " · IA por ligar" : ""}
						</span>
					</div>
					{conversation ? (
						<div className="flex gap-1.5">
							<Button
								variant="neutral"
								size="sm"
								onClick={() =>
									update.mutate({
										id: conversation.id,
										pinned: !conversation.pinned,
									})
								}
							>
								{conversation.pinned ? "Desafixar" : "Fixar"}
							</Button>
							<Button
								variant="neutral"
								size="sm"
								onClick={async () => {
									try {
										await apiDownload(
											`/assistant/conversations/${conversation.id}/export`,
										);
									} catch (error) {
										toast.error(errorMessage(error));
									}
								}}
							>
								Exportar
							</Button>
							<Button
								variant="neutral"
								size="sm"
								className="text-danger"
								onClick={async () => {
									if (
										!(await confirmAction({
											title: "Apagar esta conversa?",
										}))
									)
										return;
									await remove.mutateAsync(conversation.id);
									toast.success("Conversa apagada");
									open();
								}}
							>
								Apagar
							</Button>
						</div>
					) : null}
				</header>

				<div
					ref={scrollRef}
					aria-live="polite"
					className="flex flex-1 flex-col items-center overflow-y-auto px-5 py-6"
				>
					<div className="flex w-full max-w-[760px] flex-col gap-[18px]">
						{chat.loading ? (
							<Skeleton className="h-24" />
						) : empty ? (
							<div className="flex flex-col items-center gap-2.5 pt-14 pb-2.5 text-center">
								<AiMark size="lg" />
								<span className="text-lg font-semibold">
									Em que posso ajudar com o teu dinheiro?
								</span>
								<span className="text-fg-2 max-w-[460px] leading-relaxed">
									Pergunta sobre gastos, contas e o plano. As conversas ficam
									guardadas no teu servidor.
								</span>
								{status && !status.connected ? (
									<span className="num border-ai-line bg-ai-chip text-ai-fg mt-1 rounded-full border px-3 py-1 text-[11px]">
										a IA ainda não está ligada · respondo com uma nota até lá
									</span>
								) : null}
							</div>
						) : (
							<ChatMessages messages={chat.messages} pending={chat.pending} />
						)}
					</div>
				</div>

				<div className="flex justify-center px-5 pb-[18px]">
					<div className="relative flex w-full max-w-[760px] flex-col gap-2">
						<div className="flex flex-wrap gap-1.5">
							{SUGGESTIONS.filter((s) => !asked.has(s))
								.slice(0, 3)
								.map((s) => (
									<button
										key={s}
										type="button"
										disabled={!!chat.pending}
										onClick={() => send(s)}
										className="border-ai-line bg-ai-chip text-ai-fg hover:border-ai inline-flex h-[30px] cursor-pointer items-center rounded-full border px-3 text-xs disabled:opacity-50"
									>
										{s}
									</button>
								))}
						</div>

						{menu ? (
							<div
								role="menu"
								aria-label="Anexar"
								className="border-line-overlay bg-hover shadow-popover absolute bottom-[104px] left-0 z-10 flex w-[300px] flex-col gap-0.5 rounded-xl border p-1.5"
							>
								{[
									[
										"CSV",
										"Carregar CSV",
										"export do Wallet ou extracto do banco",
									],
									["XLS", "Carregar Excel", "folha Calculo Financeiro"],
									["IMG", "Foto de recibo", "ler valor, data e loja"],
								].map(([badge, title, note]) => (
									<button
										key={badge}
										type="button"
										role="menuitem"
										aria-disabled="true"
										onClick={() =>
											toast("Os anexos chegam com a integração da IA")
										}
										className="flex w-full cursor-not-allowed items-center gap-2.5 rounded-[7px] px-2.5 py-2 text-left opacity-60"
									>
										<span className="num bg-track text-fg-2 flex size-[30px] shrink-0 items-center justify-center rounded-[7px] text-[10px] font-semibold">
											{badge}
										</span>
										<span className="flex flex-col">
											{title}
											<small className="text-dim text-[11px]">
												{note} · em breve
											</small>
										</span>
									</button>
								))}
							</div>
						) : null}

						<form
							className="border-line-strong bg-panel focus-within:border-ai-line flex flex-col gap-2 rounded-[14px] border p-2.5"
							onSubmit={(e) => {
								e.preventDefault();
								send();
							}}
						>
							<label>
								<span className="sr-only">Mensagem</span>
								<textarea
									ref={inputRef}
									rows={2}
									value={text}
									onChange={(e) => setText(e.target.value)}
									onKeyDown={(e) => {
										if (e.key === "Enter" && !e.shiftKey) {
											e.preventDefault();
											send();
										}
										if (e.key === "u" && (e.metaKey || e.ctrlKey)) {
											e.preventDefault();
											setMenu((m) => !m);
										}
									}}
									placeholder="Pergunta sobre o teu dinheiro…"
									className="placeholder:text-faint w-full resize-none bg-transparent px-1 py-0.5 text-sm leading-normal outline-none"
								/>
							</label>
							<div className="flex items-center gap-2">
								<Button
									type="button"
									variant="neutral"
									size="icon-sm"
									aria-label="Anexar ficheiro"
									aria-expanded={menu}
									onClick={() => setMenu((m) => !m)}
									className="size-8"
								>
									<PaperclipIcon className="size-4" />
								</Button>
								<span className="num text-dim hidden text-[11px] sm:inline">
									usa só os teus dados · nada é gravado sem confirmares
								</span>
								<Button
									type="submit"
									size="icon-sm"
									aria-label="Enviar"
									disabled={!text.trim() || !!chat.pending}
									className="bg-ai hover:bg-ai-fg text-canvas ml-auto size-8"
								>
									<ArrowUpIcon className="size-4" strokeWidth={2.4} />
								</Button>
							</div>
						</form>
						<div className="num text-dim flex gap-3.5 text-[11px]">
							<span>
								<kbd className="border-line-strong bg-hover text-fg-2 rounded border px-1.5">
									↵
								</kbd>{" "}
								enviar
							</span>
							<span>
								<kbd className="border-line-strong bg-hover text-fg-2 rounded border px-1.5">
									⇧↵
								</kbd>{" "}
								nova linha
							</span>
							<span>
								<kbd className="border-line-strong bg-hover text-fg-2 rounded border px-1.5">
									{MOD}U
								</kbd>{" "}
								anexar
							</span>
						</div>
					</div>
				</div>
			</main>
		</div>
	);
}
