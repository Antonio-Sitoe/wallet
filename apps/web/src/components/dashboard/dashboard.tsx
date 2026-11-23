import {
	closestCenter,
	DndContext,
	type DragEndEvent,
	KeyboardSensor,
	PointerSensor,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import {
	rectSortingStrategy,
	SortableContext,
	sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { getRouteApi, Link } from "@tanstack/react-router";
import { Button } from "@wallet/ui/components/button";
import { Skeleton } from "@wallet/ui/components/skeleton";
import {
	ChevronLeftIcon,
	ChevronRightIcon,
	PlusIcon,
	RotateCcwIcon,
	TriangleAlertIcon,
} from "lucide-react";
import { useState } from "react";
import type { Period } from "@/@types/period";
import { useAccounts } from "@/actions/accounts/use-accounts";
import { useMonthBudget } from "@/actions/budgets/use-month-budget";
import { useDashboardCards } from "@/actions/dashboard/use-dashboard-cards";
import { useReorderCards } from "@/actions/dashboard/use-reorder-cards";
import { useResetCards } from "@/actions/dashboard/use-reset-cards";
import { AccountTiles } from "@/components/dashboard/account-tiles";
import { AddCardDialog } from "@/components/dashboard/add-card-dialog";
import { DashboardCardFrame } from "@/components/dashboard/dashboard-card-frame";
import { Greeting } from "@/components/dashboard/greeting";
import { EmptyState } from "@/components/ui/empty-state";
import { Page } from "@/components/ui/page";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import { useConfirm } from "@/contexts/confirm-context";
import { useNewTransaction } from "@/contexts/new-transaction-context";
import {
	addMonths,
	currentMonth,
	MONTH_SHORT,
	money,
	monthLabel,
	todayInput,
} from "@/utils/format";

const route = getRouteApi("/_private/dashboard");

export const KINDS = { month: "mês", "30d": "30 dias", year: "ano" } as const;

export type Kind = keyof typeof KINDS;

export const DAY = 86_400_000;

export const addDays = (d: string, n: number) =>
	new Date(Date.parse(`${d}T00:00:00Z`) + n * DAY).toISOString().slice(0, 10);

export const lastDayOf = (month: string) => {
	const [y, m] = month.split("-").map(Number) as [number, number];
	return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
};

export function periodOf(kind: Kind, from?: string): Period {
	if (kind === "year") {
		const y = (from ?? todayInput()).slice(0, 4);
		return { from: `${y}-01-01`, to: `${y}-12-31` };
	}
	if (kind === "30d") {
		const start = from ?? addDays(todayInput(), -29);
		return { from: start, to: addDays(start, 29) };
	}
	const month = (from ?? currentMonth()).slice(0, 7);
	return { from: `${month}-01`, to: lastDayOf(month) };
}

export function shift(kind: Kind, p: Period, dir: -1 | 1): string {
	if (kind === "year") return `${Number(p.from.slice(0, 4)) + dir}-01-01`;
	if (kind === "30d") return addDays(p.from, 30 * dir);
	return `${addMonths(p.from.slice(0, 7), dir)}-01`;
}

export function periodLabel(kind: Kind, p: Period) {
	if (kind === "year") return p.from.slice(0, 4);
	if (kind === "month") return monthLabel(p.from.slice(0, 7));
	const d = (x: string) =>
		`${Number(x.slice(8))} ${MONTH_SHORT[Number(x.slice(5, 7)) - 1]}`;
	return `${d(p.from)} – ${d(p.to)} ${p.to.slice(0, 4)}`;
}

export function Dashboard() {
	const confirmAction = useConfirm();
	const search = route.useSearch();
	const navigate = route.useNavigate();
	const kind: Kind = search.period ?? "month";
	const period = periodOf(kind, search.from);
	const cards = useDashboardCards();
	const accounts = useAccounts().data ?? [];
	const budget = useMonthBudget(period.to.slice(0, 7)).data;
	const openNew = useNewTransaction();
	const reorder = useReorderCards();
	const reset = useResetCards();
	const [adding, setAdding] = useState(false);
	const list = cards.data ?? [];
	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		}),
	);

	const move = (id: string, to: number) => {
		const ids = list.map((c) => c.id).filter((x) => x !== id);
		ids.splice(Math.max(0, Math.min(to, ids.length)), 0, id);
		reorder.mutate(ids);
	};

	const onDragEnd = ({ active, over }: DragEndEvent) => {
		if (!over || active.id === over.id) return;
		move(
			String(active.id),
			list.findIndex((c) => c.id === over.id),
		);
	};

	const unset = accounts
		.filter((a) => a.initialBalance === 0 && a.balance < 0)
		.sort((a, b) => a.balance - b.balance);
	const items = budget?.items ?? [];
	const listMeta = budget?.hasList
		? `${items.length} itens na lista · ${items.filter((i) => i.status === "paid" || i.status === "over").length} pagos · ${items.filter((i) => i.status === "partial").length} parcial · ${items.filter((i) => i.status === "unpaid").length} por pagar`
		: "sem lista neste mês";

	return (
		<>
			<PageHeader crumb={["painel"]}>
				<div className="flex items-center gap-1">
					<Button
						variant="neutral"
						aria-label="Período anterior"
						className="w-[30px] px-0"
						onClick={() =>
							navigate({
								search: { period: kind, from: shift(kind, period, -1) },
							})
						}
					>
						<ChevronLeftIcon className="size-4" />
					</Button>
					<Select
						size="md"
						aria-label="Tipo de período"
						className="num w-auto"
						value={kind}
						onValueChange={(value) =>
							navigate({ search: { period: value as Kind } })
						}
						items={[
							...(Object.keys(KINDS) as Kind[]).map((k) => ({
								value: k,
								label: `período: ${KINDS[k]}`,
							})),
						]}
					/>
					<span className="num min-w-[120px] px-2 text-center text-xs whitespace-nowrap">
						{periodLabel(kind, period)}
					</span>
					<Button
						variant="neutral"
						aria-label="Período seguinte"
						className="w-[30px] px-0"
						onClick={() =>
							navigate({
								search: { period: kind, from: shift(kind, period, 1) },
							})
						}
					>
						<ChevronRightIcon className="size-4" />
					</Button>
				</div>
				<Link to="/budget" search={{ month: period.to.slice(0, 7) }}>
					<Button variant="neutral">
						Lista de {monthLabel(period.to.slice(0, 7)).split(" ")[0]}
					</Button>
				</Link>
				<Button variant="primary" onClick={() => setAdding(true)}>
					<PlusIcon className="size-3.5" strokeWidth={2.6} /> Adicionar carta
				</Button>
			</PageHeader>
			<Page>
				<Greeting
					meta={`${monthLabel(period.to.slice(0, 7)).toLowerCase()} · ${listMeta}`}
				/>
				<AccountTiles />

				{unset[0] ? (
					<div className="border-warn-line flex flex-wrap items-center gap-3 rounded-[10px] border bg-[#221608] px-4 py-3 text-[#F0C9A2]">
						<TriangleAlertIcon
							className="text-warn size-4"
							aria-hidden="true"
						/>
						<span className="flex-1">
							A conta{" "}
							<b className="num text-warn font-medium">{unset[0].name}</b>{" "}
							mostra{" "}
							<span className="num whitespace-nowrap">
								{money(unset[0].balance)} MZN
							</span>{" "}
							porque o export do Wallet não traz saldos iniciais.
							{unset.length > 1 ? ` (+${unset.length - 1} contas)` : ""}
						</span>
						<Link
							to="/accounts"
							search={{ validate: true }}
							className="text-warn font-medium"
						>
							Definir saldos →
						</Link>
					</div>
				) : null}

				{cards.isPending ? (
					<Skeleton className="h-96" />
				) : list.length === 0 ? (
					<EmptyState
						title="O painel está vazio"
						actions={
							<>
								<Button variant="primary" onClick={() => setAdding(true)}>
									Adicionar carta
								</Button>
								<Button variant="neutral" onClick={() => reset.mutate()}>
									Repor o painel inicial
								</Button>
							</>
						}
					>
						Escolha as cartas que quer ver: fluxo de caixa, saldo, categorias,
						contas…
					</EmptyState>
				) : (
					<DndContext
						sensors={sensors}
						collisionDetection={closestCenter}
						onDragEnd={onDragEnd}
					>
						<SortableContext
							items={list.map((c) => c.id)}
							strategy={rectSortingStrategy}
						>
							<div className="grid grid-cols-1 gap-[18px] lg:grid-cols-2">
								{list.map((card, index) => (
									<DashboardCardFrame
										key={card.id}
										card={card}
										period={period}
										index={index}
										count={list.length}
										onMove={(to) => move(card.id, to)}
									/>
								))}
							</div>
						</SortableContext>
					</DndContext>
				)}

				{list.length > 0 ? (
					<div className="flex flex-wrap justify-end gap-2">
						<Button variant="quiet" size="sm" onClick={() => openNew()}>
							Nova transacção
						</Button>
						<Button
							variant="quiet"
							size="sm"
							onClick={async () => {
								if (
									await confirmAction({
										title:
											"Repor o painel inicial? As cartas actuais são substituídas.",
									})
								)
									reset.mutate();
							}}
						>
							<RotateCcwIcon className="size-3" /> Repor painel inicial
						</Button>
					</div>
				) : null}
			</Page>
			<AddCardDialog
				open={adding}
				onClose={() => setAdding(false)}
				period={period}
				existing={list}
			/>
		</>
	);
}
