import { createFileRoute } from "@tanstack/react-router";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { Account, Category, Transaction } from "@wallet/shared";
import { BusIcon, PlusIcon, XIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { useNewTransaction } from "@/components/app-shell";
import {
	Button,
	Card,
	CategoryOptions,
	ErrorNote,
	Field,
	MoneyInput,
	Page,
	PageHeader,
	PageTitle,
	Pill,
	Select,
	Skeleton,
	TextInput,
} from "@/components/kit";
import {
	addMonths,
	currentMonth,
	dateInputOf,
	dayKey,
	dayLabel,
	instantOf,
	money,
	moneyInput,
	monthLabel,
	parseMoney,
	signedMoney,
	todayInput,
} from "@/lib/format";
import {
	type TransactionFilters,
	useAccounts,
	useCategories,
	useCreateTransaction,
	useDeleteTransaction,
	useDeleteTransfer,
	useTransactionPages,
	useTransfer,
	useUpdateTransaction,
	useUpdateTransfer,
} from "@/lib/queries";

const PERIODS = {
	"30d": "últimos 30 dias",
	mes: "este mês",
	"mes-anterior": "mês anterior",
	ano: "este ano",
	tudo: "tudo",
} as const;
type Period = keyof typeof PERIODS;

export const Route = createFileRoute("/_auth/transacoes")({
	validateSearch: z.object({
		periodo: z.enum(Object.keys(PERIODS) as [Period, ...Period[]]).optional(),
		conta: z.string().optional(),
		categoria: z.string().optional(),
		tipo: z.enum(["expense", "income", "transfer"]).optional(),
		mes: z.string().optional(),
		q: z.string().optional(),
		id: z.string().optional(),
	}),
	component: TransactionsPage,
});

function periodRange(period: Period): { from?: string; to?: string } {
	const now = new Date();
	const startOfMonth = (y: number, m: number) =>
		new Date(Date.UTC(y, m, 1, -2)).toISOString(); // 00:00 in Maputo
	// Whole days only: the range is part of the query key, so it must not change between renders.
	if (period === "30d")
		return {
			from: new Date(
				Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() - 30, -2),
			).toISOString(),
		};
	if (period === "mes")
		return { from: startOfMonth(now.getFullYear(), now.getMonth()) };
	if (period === "mes-anterior")
		return {
			from: startOfMonth(now.getFullYear(), now.getMonth() - 1),
			to: startOfMonth(now.getFullYear(), now.getMonth()),
		};
	if (period === "ano") return { from: startOfMonth(now.getFullYear(), 0) };
	return {};
}

type Row =
	| { kind: "day"; key: string; total: number }
	| { kind: "tx"; tx: Transaction };

function TransactionsPage() {
	const search = Route.useSearch();
	const navigate = Route.useNavigate();
	const period = search.periodo ?? (search.mes ? "tudo" : "30d");
	const accounts = useAccounts(true).data ?? [];
	const categories = useCategories().data ?? [];
	const openNew = useNewTransaction();
	const create = useCreateTransaction();
	const [q, setQ] = useState(search.q ?? "");

	useEffect(() => {
		const t = setTimeout(() => {
			if ((search.q ?? "") !== q)
				navigate({
					search: (s) => ({ ...s, q: q || undefined }),
					replace: true,
				});
		}, 300);
		return () => clearTimeout(t);
	}, [q, search.q, navigate]);

	const filters: TransactionFilters = {
		...periodRange(period),
		accountId: search.conta ? [search.conta] : undefined,
		categoryId: search.categoria ? [search.categoria] : undefined,
		type: search.tipo,
		referenceMonth: search.mes,
		q: search.q,
	};
	const pages = useTransactionPages(filters);
	const txs = useMemo(
		() => pages.data?.pages.flatMap((p) => p.items) ?? [],
		[pages.data],
	);

	const rows = useMemo(() => {
		const out: Row[] = [];
		let current: Extract<Row, { kind: "day" }> | null = null;
		for (const tx of txs) {
			const key = dayKey(tx.occurredAt);
			if (!current || current.key !== key) {
				current = { kind: "day", key, total: 0 };
				out.push(current);
			}
			if (tx.type !== "transfer") current.total += tx.amount;
			out.push({ kind: "tx", tx });
		}
		return out;
	}, [txs]);

	const scrollRef = useRef<HTMLDivElement>(null);
	const virtualizer = useVirtualizer({
		count: rows.length,
		getScrollElement: () => scrollRef.current,
		estimateSize: (i) => (rows[i]?.kind === "day" ? 32 : 50),
		overscan: 12,
	});
	const virtualItems = virtualizer.getVirtualItems();
	const lastIndex = virtualItems.at(-1)?.index ?? 0;
	useEffect(() => {
		if (
			lastIndex >= rows.length - 20 &&
			pages.hasNextPage &&
			!pages.isFetchingNextPage
		)
			pages.fetchNextPage();
	}, [lastIndex, rows.length, pages]);

	const accountName = (id: string | null) =>
		accounts.find((a) => a.id === id)?.name ?? "—";
	const categoryOf = (id: string | null) => categories.find((c) => c.id === id);
	const set = (patch: Partial<typeof search>) =>
		navigate({ search: (s) => ({ ...s, ...patch }) });

	async function quickRide() {
		const transporte = categories.find(
			(c) => c.name === "Transporte" && !c.parentId,
		);
		const cash =
			accounts.find((a) => a.type === "cash" && !a.archived) ??
			accounts.find((a) => !a.archived);
		if (!cash) return toast.error("Crie uma conta primeiro");
		await create.mutateAsync({
			type: "expense",
			accountId: cash.id,
			categoryId: transporte?.id ?? null,
			amount: 10_000,
			occurredAt: new Date().toISOString(),
		});
		toast.success(`Transporte −100 · ${cash.name}`);
	}

	const selectedTx = txs.find((t) => t.id === search.id);

	return (
		<>
			<PageHeader crumb={["transacções"]}>
				<Button onClick={quickRide} disabled={create.isPending}>
					<BusIcon className="size-3.5" /> Transporte 100
				</Button>
				<Button variant="primary" onClick={() => openNew()}>
					<PlusIcon className="size-3.5" strokeWidth={2.6} /> Transacção
				</Button>
			</PageHeader>
			<Page>
				<PageTitle
					title="Transacções"
					meta={
						pages.data
							? `${txs.length}${pages.hasNextPage ? "+" : ""} transacções`
							: " "
					}
				/>

				<div className="flex flex-wrap gap-2">
					<Select
						className="h-8 w-auto"
						aria-label="Período"
						value={period}
						onChange={(e) => set({ periodo: e.target.value as Period })}
					>
						{Object.entries(PERIODS).map(([k, label]) => (
							<option key={k} value={k}>
								período: {label}
							</option>
						))}
					</Select>
					<Select
						className="h-8 w-auto"
						aria-label="Conta"
						value={search.conta ?? ""}
						onChange={(e) => set({ conta: e.target.value || undefined })}
					>
						<option value="">conta: todas</option>
						{accounts.map((a) => (
							<option key={a.id} value={a.id}>
								{a.name}
							</option>
						))}
					</Select>
					<Select
						className="h-8 w-auto max-w-[240px]"
						aria-label="Categoria"
						value={search.categoria ?? ""}
						onChange={(e) => set({ categoria: e.target.value || undefined })}
					>
						<option value="">categoria: todas</option>
						<CategoryOptions categories={categories} />
					</Select>
					<Select
						className="h-8 w-auto"
						aria-label="Tipo"
						value={search.tipo ?? ""}
						onChange={(e) =>
							set({ tipo: (e.target.value || undefined) as typeof search.tipo })
						}
					>
						<option value="">tipo: todos</option>
						<option value="expense">saídas</option>
						<option value="income">entradas</option>
						<option value="transfer">transferências</option>
					</Select>
					<Select
						className="h-8 w-auto"
						aria-label="Mês do orçamento"
						value={search.mes ?? ""}
						onChange={(e) => set({ mes: e.target.value || undefined })}
					>
						<option value="">mês: todos</option>
						{Array.from({ length: 18 }, (_, i) =>
							addMonths(currentMonth(), 1 - i),
						).map((m) => (
							<option key={m} value={m}>
								{monthLabel(m)}
							</option>
						))}
					</Select>
					<TextInput
						className="h-8 max-w-[220px]"
						placeholder="procurar nota ou payee…"
						value={q}
						onChange={(e) => setQ(e.target.value)}
						aria-label="Procurar"
					/>
					{search.conta ||
					search.categoria ||
					search.tipo ||
					search.mes ||
					search.q ? (
						<Button
							variant="ghost"
							size="sm"
							onClick={() => {
								setQ("");
								navigate({ search: { periodo: search.periodo } });
							}}
						>
							<XIcon className="size-3" /> limpar
						</Button>
					) : null}
				</div>

				{pages.error ? <ErrorNote error={pages.error} /> : null}

				<div className="flex flex-wrap items-start gap-[18px]">
					<Card className="min-w-0 flex-[3_1_520px] overflow-hidden">
						{pages.isPending ? (
							<div className="flex flex-col gap-2 p-3">
								{["a", "b", "c", "d", "e", "f", "g", "h"].map((k) => (
									<Skeleton key={k} className="h-10" />
								))}
							</div>
						) : rows.length === 0 ? (
							<p className="text-dim px-4 py-10 text-center">
								Nenhuma transacção com estes filtros.
							</p>
						) : (
							<div
								ref={scrollRef}
								className="h-[calc(100svh-260px)] min-h-[360px] overflow-y-auto"
							>
								<div
									className="relative w-full"
									style={{ height: virtualizer.getTotalSize() }}
								>
									{virtualItems.map((v) => {
										const row = rows[v.index]!;
										return (
											<div
												key={v.key}
												data-index={v.index}
												ref={virtualizer.measureElement}
												className="absolute top-0 left-0 w-full"
												style={{ transform: `translateY(${v.start}px)` }}
											>
												{row.kind === "day" ? (
													<div className="num border-line bg-panel-2 text-dim flex justify-between border-b px-3.5 py-2 text-[11px] tracking-[.06em] uppercase">
														<span>{dayLabel(row.key)}</span>
														<span>{signedMoney(row.total)}</span>
													</div>
												) : (
													<TxRow
														tx={row.tx}
														selected={row.tx.id === search.id}
														category={categoryOf(row.tx.categoryId)}
														account={accountName(row.tx.accountId)}
														counterpart={
															row.tx.counterpartAccountId
																? accountName(row.tx.counterpartAccountId)
																: null
														}
														onSelect={() =>
															set({
																id:
																	row.tx.id === search.id
																		? undefined
																		: row.tx.id,
															})
														}
													/>
												)}
											</div>
										);
									})}
								</div>
								{pages.isFetchingNextPage ? (
									<p className="text-dim py-3 text-center text-xs">
										a carregar…
									</p>
								) : null}
							</div>
						)}
					</Card>
					{search.id ? (
						<TransactionDetail
							key={search.id}
							id={search.id}
							tx={selectedTx}
							accounts={accounts}
							categories={categories}
							onClose={() => set({ id: undefined })}
						/>
					) : null}
				</div>
			</Page>
		</>
	);
}

function TxRow({
	tx,
	selected,
	category,
	account,
	counterpart,
	onSelect,
}: {
	tx: Transaction;
	selected: boolean;
	category?: Category;
	account: string;
	counterpart: string | null;
	onSelect: () => void;
}) {
	const isTransfer = tx.type === "transfer";
	const title = isTransfer
		? tx.amount < 0
			? `→ ${counterpart}`
			: `← ${counterpart}`
		: (category?.name ?? "Sem categoria");
	const meta = [
		account,
		tx.payee,
		tx.note,
		`mês ${monthLabel(tx.referenceMonth).toLowerCase()}`,
	]
		.filter(Boolean)
		.join(" · ");
	const color = category?.color ?? "#8B949E";
	return (
		<button
			type="button"
			onClick={onSelect}
			aria-pressed={selected}
			className={`border-hover hover:bg-hover flex w-full cursor-pointer items-center gap-3 border-b px-3.5 py-2.5 text-left ${selected ? "bg-hover shadow-[inset_0_0_0_1px_#58A6FF]" : ""}`}
		>
			<span
				aria-hidden="true"
				className="num flex size-7 shrink-0 items-center justify-center rounded-md text-xs font-semibold"
				style={
					isTransfer
						? { background: "#161B22", color: "#8B949E" }
						: { background: `${color}24`, color }
				}
			>
				{isTransfer ? "⇄" : title[0]}
			</span>
			<span className="flex min-w-0 flex-1 flex-col gap-0.5">
				<span className="truncate font-medium">
					{title}{" "}
					{tx.monthItemId ? (
						<Pill tone="ok" className="ml-1">
							lista
						</Pill>
					) : null}
				</span>
				<span className="num text-dim truncate text-[11px]">{meta}</span>
			</span>
			<span
				className={`num ${tx.amount > 0 && !isTransfer ? "text-money" : isTransfer ? "text-dim" : ""}`}
			>
				{signedMoney(tx.amount)}
			</span>
		</button>
	);
}

function TransactionDetail({
	id,
	tx,
	accounts,
	categories,
	onClose,
}: {
	id: string;
	tx?: Transaction;
	accounts: Account[];
	categories: Category[];
	onClose: () => void;
}) {
	if (!tx) {
		return (
			<Card className="text-dim flex-[2_1_340px] p-4">
				A transacção {id.slice(0, 8)} não está na lista filtrada.{" "}
				<Button size="sm" onClick={onClose}>
					Fechar
				</Button>
			</Card>
		);
	}
	return tx.type === "transfer" && tx.transferId ? (
		<TransferEditor
			transferId={tx.transferId}
			accounts={accounts}
			onClose={onClose}
		/>
	) : (
		<TransactionEditor
			tx={tx}
			accounts={accounts}
			categories={categories}
			onClose={onClose}
		/>
	);
}

function DetailCard({
	title,
	children,
	onClose,
}: {
	title: string;
	children: React.ReactNode;
	onClose: () => void;
}) {
	return (
		<Card className="sticky top-4 min-w-0 flex-[2_1_340px] overflow-hidden">
			<div className="border-line flex items-center justify-between border-b px-4 py-3">
				<h2 className="text-sm font-semibold">{title}</h2>
				<Button size="sm" onClick={onClose}>
					esc
				</Button>
			</div>
			<div className="flex flex-col gap-3 p-4">{children}</div>
		</Card>
	);
}

function monthChoices(around: string) {
	return [-3, -2, -1, 0, 1, 2].map((d) => addMonths(around, d));
}

function TransactionEditor({
	tx,
	accounts,
	categories,
	onClose,
}: {
	tx: Transaction;
	accounts: Account[];
	categories: Category[];
	onClose: () => void;
}) {
	const update = useUpdateTransaction();
	const remove = useDeleteTransaction();
	const [type, setType] = useState<"expense" | "income">(
		tx.type === "income" ? "income" : "expense",
	);
	const [amount, setAmount] = useState(moneyInput(Math.abs(tx.amount)));
	const [accountId, setAccountId] = useState(tx.accountId);
	const [categoryId, setCategoryId] = useState(tx.categoryId ?? "");
	const [date, setDate] = useState(dateInputOf(tx.occurredAt));
	const [referenceMonth, setReferenceMonth] = useState(tx.referenceMonth);
	const [note, setNote] = useState(tx.note ?? "");
	const [payee, setPayee] = useState(tx.payee ?? "");
	const cents = parseMoney(amount);

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [onClose]);

	return (
		<DetailCard title="Detalhe" onClose={onClose}>
			<div className="flex items-baseline justify-between">
				<span className="num text-[26px] font-medium">
					{signedMoney(tx.amount)}
					<span className="text-dim text-[13px]"> MZN</span>
				</span>
				<Pill tone={tx.amount > 0 ? "ok" : "warn"}>
					{tx.amount > 0 ? "entrada" : "saída"}
				</Pill>
			</div>
			<form
				className="flex flex-col gap-3"
				onSubmit={async (e) => {
					e.preventDefault();
					if (cents === null || cents <= 0) return;
					await update.mutateAsync({
						id: tx.id,
						type,
						amount: cents,
						accountId,
						categoryId: categoryId || null,
						occurredAt:
							date === dateInputOf(tx.occurredAt) ? undefined : instantOf(date),
						referenceMonth,
						note: note || null,
						payee: payee || null,
					});
					toast.success("Transacção guardada");
				}}
			>
				<div className="grid grid-cols-2 gap-2.5">
					<Field label="Tipo">
						<Select
							value={type}
							onChange={(e) => setType(e.target.value as "expense" | "income")}
						>
							<option value="expense">Saída</option>
							<option value="income">Entrada</option>
						</Select>
					</Field>
					<Field label="Valor (MZN)">
						<MoneyInput
							value={amount}
							onChange={(e) => setAmount(e.target.value)}
						/>
					</Field>
					<Field label="Conta">
						<Select
							value={accountId}
							onChange={(e) => setAccountId(e.target.value)}
						>
							{accounts.map((a) => (
								<option key={a.id} value={a.id}>
									{a.name}
								</option>
							))}
						</Select>
					</Field>
					<Field label="Categoria">
						<Select
							value={categoryId}
							onChange={(e) => setCategoryId(e.target.value)}
						>
							<option value="">Sem categoria</option>
							<CategoryOptions categories={categories} />
						</Select>
					</Field>
					<Field label="Data">
						<TextInput
							type="date"
							className="num"
							value={date}
							onChange={(e) => setDate(e.target.value)}
						/>
					</Field>
					<Field label="Mês do orçamento">
						<Select
							value={referenceMonth}
							onChange={(e) => setReferenceMonth(e.target.value)}
						>
							{monthChoices(tx.referenceMonth).map((m) => (
								<option key={m} value={m}>
									{monthLabel(m)}
								</option>
							))}
						</Select>
					</Field>
				</div>
				<Field label="Payee">
					<TextInput
						value={payee}
						onChange={(e) => setPayee(e.target.value)}
						placeholder="sem payee"
					/>
				</Field>
				<Field label="Nota">
					<TextInput
						value={note}
						onChange={(e) => setNote(e.target.value)}
						placeholder="sem nota"
					/>
				</Field>
				<div className="num border-line bg-canvas text-dim flex flex-col gap-1 rounded-md border px-3 py-2.5 text-[11px]">
					<span>
						{tx.monthItemId
							? "paga um item da lista do mês"
							: "sem item da lista"}
					</span>
					<span>
						{tx.importBatchId
							? `importada · lote ${tx.importBatchId.slice(0, 8)}`
							: "registo manual"}
					</span>
				</div>
				<div className="flex gap-2 pt-1">
					<Button
						variant="danger"
						onClick={async () => {
							if (!confirm("Apagar esta transacção?")) return;
							await remove.mutateAsync(tx.id);
							toast.success("Transacção apagada");
							onClose();
						}}
					>
						Apagar
					</Button>
					<Button
						type="submit"
						variant="primary"
						className="ml-auto"
						disabled={cents === null || cents <= 0 || update.isPending}
					>
						Guardar
					</Button>
				</div>
			</form>
		</DetailCard>
	);
}

function TransferEditor({
	transferId,
	accounts,
	onClose,
}: {
	transferId: string;
	accounts: Account[];
	onClose: () => void;
}) {
	const transfer = useTransfer(transferId);
	const update = useUpdateTransfer();
	const remove = useDeleteTransfer();
	const [form, setForm] = useState<{
		from: string;
		to: string;
		amount: string;
		date: string;
		referenceMonth: string;
		note: string;
	} | null>(null);

	useEffect(() => {
		const t = transfer.data;
		if (t && !form)
			setForm({
				from: t.fromAccountId,
				to: t.toAccountId,
				amount: moneyInput(t.amount),
				date: dateInputOf(t.occurredAt),
				referenceMonth: t.referenceMonth,
				note: t.note ?? "",
			});
	}, [transfer.data, form]);

	if (!transfer.data || !form)
		return (
			<DetailCard title="Transferência" onClose={onClose}>
				<Skeleton className="h-40" />
			</DetailCard>
		);
	const t = transfer.data;
	const cents = parseMoney(form.amount);

	return (
		<DetailCard title="Transferência" onClose={onClose}>
			<span className="num text-[26px] font-medium">
				{money(t.amount)}
				<span className="text-dim text-[13px]"> MZN</span>
			</span>
			<form
				className="flex flex-col gap-3"
				onSubmit={async (e) => {
					e.preventDefault();
					if (cents === null || cents <= 0) return;
					await update.mutateAsync({
						id: t.id,
						fromAccountId: form.from,
						toAccountId: form.to,
						amount: cents,
						occurredAt:
							form.date === dateInputOf(t.occurredAt)
								? undefined
								: instantOf(form.date),
						referenceMonth: form.referenceMonth,
						note: form.note || null,
					});
					toast.success("Transferência guardada");
				}}
			>
				<div className="grid grid-cols-2 gap-2.5">
					<Field label="De">
						<Select
							value={form.from}
							onChange={(e) => setForm({ ...form, from: e.target.value })}
						>
							{accounts.map((a) => (
								<option key={a.id} value={a.id}>
									{a.name}
								</option>
							))}
						</Select>
					</Field>
					<Field label="Para">
						<Select
							value={form.to}
							onChange={(e) => setForm({ ...form, to: e.target.value })}
						>
							{accounts.map((a) => (
								<option key={a.id} value={a.id}>
									{a.name}
								</option>
							))}
						</Select>
					</Field>
					<Field label="Valor (MZN)">
						<MoneyInput
							value={form.amount}
							onChange={(e) => setForm({ ...form, amount: e.target.value })}
						/>
					</Field>
					<Field label="Data">
						<TextInput
							type="date"
							className="num"
							value={form.date}
							onChange={(e) => setForm({ ...form, date: e.target.value })}
							max={todayInput()}
						/>
					</Field>
					<Field label="Mês do orçamento" className="col-span-2">
						<Select
							value={form.referenceMonth}
							onChange={(e) =>
								setForm({ ...form, referenceMonth: e.target.value })
							}
						>
							{monthChoices(t.referenceMonth).map((m) => (
								<option key={m} value={m}>
									{monthLabel(m)}
								</option>
							))}
						</Select>
					</Field>
				</div>
				<Field label="Nota">
					<TextInput
						value={form.note}
						onChange={(e) => setForm({ ...form, note: e.target.value })}
						placeholder="sem nota"
					/>
				</Field>
				<div className="flex gap-2 pt-1">
					<Button
						variant="danger"
						onClick={async () => {
							if (!confirm("Apagar a transferência (as duas pernas)?")) return;
							await remove.mutateAsync(t.id);
							toast.success("Transferência apagada");
							onClose();
						}}
					>
						Apagar
					</Button>
					<Button
						type="submit"
						variant="primary"
						className="ml-auto"
						disabled={
							cents === null ||
							cents <= 0 ||
							form.from === form.to ||
							update.isPending
						}
					>
						Guardar
					</Button>
				</div>
			</form>
		</DetailCard>
	);
}
