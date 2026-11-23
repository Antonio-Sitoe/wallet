import { Delta } from "@/components/charts/delta";
import { Loading } from "@/components/dashboard/loading";
import { monthOfPeriod } from "@/components/dashboard/utils";
import {
	type Period,
	useAccounts,
	useMonthBudget,
	useOverview,
} from "@/lib/queries";
import { MONTH_SHORT, money } from "@/utils/format";

export function SummaryCard({ period }: { period: Period }) {
	const overview = useOverview(period);
	const budget = useMonthBudget(monthOfPeriod(period));
	const accounts = useAccounts().data ?? [];
	const o = overview.data;
	const b = budget.data;
	if (!o) return <Loading />;
	const unset = accounts.filter((a) => a.initialBalance === 0 && a.balance < 0);
	const spentPct =
		b?.hasList && b.totals.planned
			? Math.round((b.totals.spent / b.totals.planned) * 100)
			: null;
	return (
		<div className="[&>*]:border-line grid grid-cols-1 gap-y-5 sm:grid-cols-2 xl:grid-cols-4 xl:[&>*:not(:first-child)]:border-l sm:[&>*:nth-child(even)]:border-l">
			<div className="flex flex-col gap-1.5 px-4">
				<span className="num text-dim text-[11px] tracking-[.06em] uppercase">
					Saldo total · {accounts.length} contas
				</span>
				<span className="num text-[22px] whitespace-nowrap xl:text-[26px]">
					{money(o.balance.end)}{" "}
					<span className="text-dim text-[13px]">MZN</span>
				</span>
				{unset.length ? (
					<span className="text-warn text-xs">
						Sem saldos iniciais definidos
					</span>
				) : (
					<Delta now={o.balance.end} before={o.balance.start} goodWhenUp />
				)}
			</div>
			<div className="flex flex-col gap-1.5 px-4">
				<span className="num text-dim text-[11px] tracking-[.06em] uppercase">
					Entradas
				</span>
				<span className="num text-[22px] whitespace-nowrap xl:text-[26px]">
					{money(o.income)}
				</span>
				<Delta now={o.income} before={o.previousTotals.income} goodWhenUp />
			</div>
			<div className="flex flex-col gap-1.5 px-4">
				<span className="num text-dim text-[11px] tracking-[.06em] uppercase">
					Saídas
				</span>
				<span className="num text-[22px] whitespace-nowrap xl:text-[26px]">
					{money(o.expense)}
				</span>
				<Delta
					now={o.expense}
					before={o.previousTotals.expense}
					goodWhenUp={false}
				/>
			</div>
			<div className="flex flex-col gap-1.5 px-4">
				<span className="num text-dim text-[11px] tracking-[.06em] uppercase">
					Falta gastar ·{" "}
					{MONTH_SHORT[Number(monthOfPeriod(period).slice(5)) - 1]}
				</span>
				<span className="num text-[22px] whitespace-nowrap xl:text-[26px]">
					{b?.hasList ? money(b.totals.remaining) : "—"}
				</span>
				{b?.hasList ? (
					<span className="flex items-center gap-2">
						<span className="bg-hover h-1 flex-1 overflow-hidden rounded-sm">
							<span
								className="bg-money block h-1"
								style={{ width: `${Math.min(100, spentPct ?? 0)}%` }}
							/>
						</span>
						<span className="num text-dim text-[11px]">
							{spentPct}% de {money(b.totals.planned)}
						</span>
					</span>
				) : (
					<span className="text-dim text-xs">sem lista neste mês</span>
				)}
			</div>
		</div>
	);
}
