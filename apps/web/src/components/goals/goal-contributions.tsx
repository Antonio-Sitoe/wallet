import type { GoalDetail } from "@wallet/shared";
import { dayKey, dayLabel, money } from "@/utils/format";

export function GoalContributions({
	goal,
	accountName,
}: {
	goal: GoalDetail;
	accountName: (id: string) => string;
}) {
	const count = goal.contributions.length + (goal.startingAmount > 0 ? 1 : 0);
	return (
		<section className="flex flex-col gap-2">
			<div className="flex items-baseline justify-between">
				<h3 className="text-sm font-semibold">Contribuições</h3>
				<span className="num text-dim text-[11px]">{count} registos</span>
			</div>
			{count === 0 ? (
				<p className="text-dim text-xs">Ainda sem contribuições.</p>
			) : (
				<ul className="border-line divide-line flex flex-col divide-y rounded-lg border">
					{goal.contributions.map((c) => (
						<li
							key={c.transferId}
							className="flex items-center gap-3 px-3 py-2"
						>
							<span className="num text-dim w-24 shrink-0 text-[11px]">
								{dayLabel(dayKey(c.occurredAt))}
							</span>
							<span className="min-w-0 flex-1 truncate">
								{accountName(c.fromAccountId)} → {accountName(goal.accountId)}
								{c.viaMonthItem ? (
									<span className="text-dim"> · lista do mês</span>
								) : null}
							</span>
							<span className="num text-money">+{money(c.amount)}</span>
						</li>
					))}
					{goal.startingAmount > 0 ? (
						<li className="flex items-center gap-3 px-3 py-2">
							<span className="num text-dim w-24 shrink-0 text-[11px]">
								início
							</span>
							<span className="text-fg-2 min-w-0 flex-1 truncate">
								Saldo inicial da meta
							</span>
							<span className="num text-dim">{money(goal.startingAmount)}</span>
						</li>
					) : null}
				</ul>
			)}
		</section>
	);
}
