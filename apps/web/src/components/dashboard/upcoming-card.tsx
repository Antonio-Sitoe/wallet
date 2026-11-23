import { Link } from "@tanstack/react-router";
import { Empty } from "@/components/dashboard/empty";
import { Loading } from "@/components/dashboard/loading";
import { monthOfPeriod } from "@/components/dashboard/utils";
import { StatusPill } from "@/components/ui/status-pill";
import { type Period, useMonthBudget } from "@/lib/queries";
import { money, monthLabel } from "@/utils/format";

export function UpcomingCard({ period }: { period: Period }) {
	const month = monthOfPeriod(period);
	const budget = useMonthBudget(month).data;
	if (!budget) return <Loading />;
	if (!budget.hasList)
		return <Empty>Sem lista para {monthLabel(month)}.</Empty>;
	const items = budget.items
		.filter((i) => i.status === "unpaid" || i.status === "partial")
		.sort((a, b) => b.remaining - a.remaining);
	if (items.length === 0)
		return (
			<p className="text-money py-8 text-center">
				Tudo pago em {monthLabel(month)}.
			</p>
		);
	return (
		<ul className="flex flex-col gap-2">
			{items.slice(0, 6).map((i) => (
				<li key={i.id}>
					<Link
						to="/budget"
						search={{ month: month }}
						className="border-line text-fg hover:bg-hover flex items-center gap-3 rounded-lg border px-3 py-2.5 no-underline"
					>
						<span
							aria-hidden="true"
							className="size-[18px] rounded-[5px] border-[1.5px] border-[#6E7681]"
						/>
						<span className="min-w-0 flex-1 truncate">{i.name}</span>
						{i.status === "partial" ? <StatusPill status="partial" /> : null}
						<span className="num">{money(i.remaining)}</span>
					</Link>
				</li>
			))}
			{items.length > 6 ? (
				<li className="num text-dim text-center text-[11px]">
					+ {items.length - 6} itens
				</li>
			) : null}
		</ul>
	);
}
