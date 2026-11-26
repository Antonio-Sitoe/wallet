import { useVirtualizer } from "@tanstack/react-virtual";
import type { Transaction } from "@wallet/shared";
import { Button } from "@wallet/ui/components/button";
import { Input } from "@wallet/ui/components/input";
import { Skeleton } from "@wallet/ui/components/skeleton";
import { PlusIcon, XIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { TransactionFilters } from "@/@types/transaction-filters";
import { useAccounts } from "@/actions/accounts/use-accounts";
import { useCategories } from "@/actions/categories/use-categories";
import { useTransactionPages } from "@/actions/transactions/use-transaction-pages";
import { QuickTemplates } from "@/components/transactions/quick-templates";
import { TransactionDetail } from "@/components/transactions/transaction-detail";
import { TxRow } from "@/components/transactions/tx-row";
import { PERIODS, type Period } from "@/components/transactions/utils";
import { Card } from "@/components/ui/card";
import { categoryItems } from "@/components/ui/category-items";
import { ErrorNote } from "@/components/ui/error-note";
import { Page } from "@/components/ui/page";
import { PageHeader } from "@/components/ui/page-header";
import { PageTitle } from "@/components/ui/page-title";
import { Select } from "@/components/ui/select";
import { useNewTransaction } from "@/contexts/new-transaction-context";
import { usePageNavigate, usePageSearch } from "@/lib/search-params";
import {
	addMonths,
	currentMonth,
	dayKey,
	dayLabel,
	monthLabel,
	signedMoney,
} from "@/utils/format";

export function periodRange(period: Period): { from?: string; to?: string } {
	const now = new Date();
	const startOfMonth = (y: number, m: number) =>
		new Date(Date.UTC(y, m, 1, -2)).toISOString();
	if (period === "30d")
		return {
			from: new Date(
				Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() - 30, -2),
			).toISOString(),
		};
	if (period === "month")
		return { from: startOfMonth(now.getFullYear(), now.getMonth()) };
	if (period === "last-month")
		return {
			from: startOfMonth(now.getFullYear(), now.getMonth() - 1),
			to: startOfMonth(now.getFullYear(), now.getMonth()),
		};
	if (period === "year") return { from: startOfMonth(now.getFullYear(), 0) };
	return {};
}

export type Row =
	| { kind: "day"; key: string; total: number }
	| { kind: "tx"; tx: Transaction };

export function TransactionsPage() {
	const search = usePageSearch("transactions");
	const navigate = usePageNavigate("transactions");
	const period = search.period ?? (search.month ? "all" : "30d");
	const accounts = useAccounts(true).data ?? [];
	const categories = useCategories().data ?? [];
	const openNew = useNewTransaction();
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
		accountId: search.account ? [search.account] : undefined,
		categoryId: search.category ? [search.category] : undefined,
		type: search.type,
		referenceMonth: search.month,
		payee: search.payee,
		label: search.label,
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
			if (tx.type === "expense" || tx.type === "income")
				current.total += tx.amount;
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

	const selectedTx = txs.find((t) => t.id === search.id);

	return (
		<>
			<PageHeader crumb={["transacções"]}>
				<QuickTemplates />
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
					<div className="max-md:no-scrollbar contents max-md:order-2 max-md:-mx-4 max-md:flex max-md:w-[calc(100%+2rem)] max-md:gap-2 max-md:overflow-x-auto max-md:px-4 max-md:*:shrink-0">
					<Select
						className="w-auto"
						aria-label="Período"
						value={period}
						onValueChange={(value) => set({ period: value as Period })}
						items={[
							...Object.entries(PERIODS).map(([k, label]) => ({
								value: k,
								label: `período: ${label}`,
							})),
						]}
					/>
					<Select
						className="w-auto"
						aria-label="Conta"
						value={search.account ?? ""}
						onValueChange={(value) => set({ account: value || undefined })}
						items={[
							{ value: "", label: "conta: todas" },
							...accounts.map((a) => ({
								value: a.id,
								label: a.name,
							})),
						]}
					/>
					<Select
						className="w-auto max-w-[240px]"
						aria-label="Categoria"
						value={search.category ?? ""}
						onValueChange={(value) => set({ category: value || undefined })}
						items={[
							{ value: "", label: "categoria: todas" },
							...categoryItems(categories),
						]}
					/>
					<Select
						className="w-auto"
						aria-label="Tipo"
						value={search.type ?? ""}
						onValueChange={(value) =>
							set({ type: (value || undefined) as typeof search.type })
						}
						items={[
							{ value: "", label: "tipo: todos" },
							{ value: "expense", label: "saídas" },
							{ value: "income", label: "entradas" },
							{ value: "transfer", label: "transferências" },
							{ value: "adjustment", label: "acertos" },
						]}
					/>
					<Select
						className="w-auto"
						aria-label="Mês do orçamento"
						value={search.month ?? ""}
						onValueChange={(value) => set({ month: value || undefined })}
						items={[
							{ value: "", label: "mês: todos" },
							...Array.from({ length: 18 }, (_, i) =>
								addMonths(currentMonth(), 1 - i),
							).map((m) => ({
								value: m,
								label: String(monthLabel(m)),
							})),
						]}
					/>
					</div>
					<Input
						className="max-w-[220px] max-md:order-1 max-md:max-w-none max-md:basis-full max-md:rounded-full max-md:px-4"
						placeholder="procurar nota ou pessoa…"
						value={q}
						onChange={(e) => setQ(e.target.value)}
						aria-label="Procurar"
					/>
					{search.payee ? (
						<Button
							variant="neutral"
							size="sm"
							aria-label={`Tirar o filtro pessoa ${search.payee}`}
							onClick={() => set({ payee: undefined })}
						>
							pessoa: {search.payee} <XIcon className="size-3" />
						</Button>
					) : null}
					{search.label ? (
						<Button
							variant="neutral"
							size="sm"
							aria-label={`Tirar o filtro etiqueta ${search.label}`}
							onClick={() => set({ label: undefined })}
						>
							#{search.label} <XIcon className="size-3" />
						</Button>
					) : null}
					{search.account ||
					search.category ||
					search.type ||
					search.month ||
					search.payee ||
					search.label ||
					search.q ? (
						<Button
							variant="quiet"
							size="sm"
							onClick={() => {
								setQ("");
								navigate({ search: { period: search.period } });
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
