import { getRouteApi, Link } from "@tanstack/react-router";
import { BUDGET_GROUPS, type MonthItem } from "@wallet/shared";
import { Button } from "@wallet/ui/components/button";
import { Skeleton } from "@wallet/ui/components/skeleton";
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useAccounts } from "@/actions/accounts/use-accounts";
import { useMonthBudget } from "@/actions/budgets/use-month-budget";
import { usePayMonthItem } from "@/actions/budgets/use-pay-month-item";
import { useUnpayMonthItem } from "@/actions/budgets/use-unpay-month-item";
import { useCategories } from "@/actions/categories/use-categories";
import { EditMonthItemDialog } from "@/components/budgets/edit-month-item-dialog";
import { GroupCard } from "@/components/budgets/group-card";
import { NoListState } from "@/components/budgets/no-list-state";
import { PayDialog } from "@/components/budgets/pay-dialog";
import { UnplannedItemDialog } from "@/components/budgets/unplanned-item-dialog";
import { ErrorNote } from "@/components/ui/error-note";
import { Page } from "@/components/ui/page";
import { PageHeader } from "@/components/ui/page-header";
import { PageTitle } from "@/components/ui/page-title";
import { Stat } from "@/components/ui/stat";
import { StatRow } from "@/components/ui/stat-row";
import { useConfirm } from "@/contexts/confirm-context";
import { usePreferencesContext } from "@/contexts/preferences-context";
import {
	addMonths,
	currentMonth,
	money,
	monthLabel,
	shortMonth,
} from "@/utils/format";

const route = getRouteApi("/_private/budget");

export function BudgetPage() {
	const confirmAction = useConfirm();
	const { month: monthParam } = route.useSearch();
	const month = monthParam ?? currentMonth();
	const navigate = route.useNavigate();
	const budget = useMonthBudget(month);
	const accounts = useAccounts().data ?? [];
	const categories = useCategories().data ?? [];
	const [paying, setPaying] = useState<MonthItem | null>(null);
	const [editing, setEditing] = useState<MonthItem | null>(null);
	const [addingUnplanned, setAddingUnplanned] = useState(false);
	const unpay = useUnpayMonthItem();
	const pay = usePayMonthItem();
	const { preferences } = usePreferencesContext();
	const go = (delta: number) =>
		navigate({ search: { month: addMonths(month, delta) } });
	const data = budget.data;
	const accountName = (id: string | null) =>
		accounts.find((a) => a.id === id)?.name ?? "sem conta";
	const categoryName = (id: string | null) =>
		categories.find((c) => c.id === id)?.name ?? "sem categoria";

	async function check(item: MonthItem) {
		const mode = preferences?.confirmOnCheck ?? "always";
		const amount = item.partial
			? (item.step ?? item.remaining)
			: item.remaining || item.plannedAmount;
		const amountAsPlanned =
			!item.partial && item.remaining === item.plannedAmount;
		const skipSheet =
			!!item.defaultAccountId &&
			amount > 0 &&
			(mode === "never" || (mode === "changed" && amountAsPlanned));
		if (!skipSheet) return setPaying(item);
		const res = await pay.mutateAsync({ id: item.id, amount });
		toast.success(
			`${item.name} −${money(amount)} · ${accountName(res.payments[0]?.accountId ?? null)}`,
		);
	}

	return (
		<>
			<PageHeader crumb={["orçamento", month]}>
				<div className="flex gap-1">
					<Button
						variant="neutral"
						aria-label="Mês anterior"
						className="w-[30px] px-0"
						onClick={() => go(-1)}
					>
						<ChevronLeftIcon className="size-4" />
					</Button>
					<Button
						variant="neutral"
						aria-label="Mês seguinte"
						className="w-[30px] px-0"
						onClick={() => go(1)}
					>
						<ChevronRightIcon className="size-4" />
					</Button>
				</div>
				<div className="num flex gap-1 text-[11px]">
					{[-2, -1, 0, 1, 2].map((d) => {
						const m = addMonths(month, d);
						return (
							<Link
								key={m}
								to="/budget"
								search={{ month: m }}
								className={`rounded-check border px-2 py-1 no-underline ${d === 0 ? "border-line-strong text-fg bg-track" : "text-dim hover:text-fg border-transparent"}`}
							>
								{shortMonth(m)}
							</Link>
						);
					})}
				</div>
				{data?.hasList ? (
					<Button variant="primary" onClick={() => setAddingUnplanned(true)}>
						<PlusIcon className="size-3.5" strokeWidth={2.6} /> Item não
						planeado
					</Button>
				) : null}
			</PageHeader>
			<Page>
				<PageTitle
					title={monthLabel(month)}
					meta={
						data
							? data.hasList
								? `${data.items.length} itens · check = transacção`
								: "sem lista"
							: " "
					}
				/>
				{budget.error ? <ErrorNote error={budget.error} /> : null}
				{!data ? (
					<Skeleton className="h-96" />
				) : (
					<>
						<StatRow>
							<Stat
								label="Salário previsto"
								value={money(data.expectedIncome)}
								note={
									data.income
										? `recebido ${money(data.income)}`
										: "nada recebido ainda"
								}
							/>
							<Stat
								label="Planeado"
								value={data.hasList ? money(data.totals.planned) : "—"}
								tone={data.hasList ? undefined : "dim"}
								note={
									data.totals.unplanned
										? `${money(data.totals.unplanned)} não planeado`
										: undefined
								}
							/>
							<Stat
								label="Gasto"
								value={data.hasList ? money(data.totals.spent) : "—"}
								tone={data.hasList ? undefined : "dim"}
								note={
									data.totals.unassignedSpent
										? `+ ${money(data.totals.unassignedSpent)} fora da lista`
										: undefined
								}
							/>
							<Stat
								label="Falta gastar"
								value={data.hasList ? money(data.totals.remaining) : "—"}
								tone={data.hasList ? undefined : "dim"}
							/>
							<Stat
								label="Sobra do salário"
								value={data.hasList ? money(data.totals.leftover) : "—"}
								tone={
									!data.hasList
										? "dim"
										: data.totals.leftover < 0
											? "warn"
											: "ok"
								}
								note="previsto − planeado"
							/>
						</StatRow>

						{data.hasList ? (
							BUDGET_GROUPS.map((group) => {
								const items = data.items.filter((i) => i.group === group);
								if (items.length === 0) return null;
								return (
									<GroupCard
										key={group}
										group={group}
										items={items}
										accountName={accountName}
										categoryName={categoryName}
										onCheck={check}
										onUncheck={async (item) => {
											if (
												!(await confirmAction({
													title: `Desmarcar ${item.name}? ${item.payments.length} pagamento(s) da lista são apagados.`,
												}))
											)
												return;
											await unpay.mutateAsync(item.id);
											toast.success(
												`${item.name} desmarcado · transacção apagada`,
											);
										}}
										onLaunch={async (item) => {
											if (!item.defaultAccountId) return setPaying(item);
											const res = await pay.mutateAsync({ id: item.id });
											toast.success(
												`${item.name} −${money(item.step ?? 0)} · ${accountName(res.payments[0]?.accountId ?? null)}`,
											);
										}}
										onEdit={setEditing}
									/>
								);
							})
						) : (
							<NoListState month={month} />
						)}
					</>
				)}
			</Page>
			{paying ? (
				<PayDialog item={paying} onClose={() => setPaying(null)} />
			) : null}
			{addingUnplanned ? (
				<UnplannedItemDialog
					month={month}
					onClose={() => setAddingUnplanned(false)}
				/>
			) : null}
			{editing ? (
				<EditMonthItemDialog item={editing} onClose={() => setEditing(null)} />
			) : null}
		</>
	);
}
