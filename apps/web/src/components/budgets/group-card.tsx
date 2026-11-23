import type { BudgetGroup, MonthItem } from "@wallet/shared";
import { Button } from "@wallet/ui/components/button";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusPill } from "@/components/ui/status-pill";
import { GROUP_LABEL, money } from "@/utils/format";

export function GroupCard({
	group,
	items,
	accountName,
	categoryName,
	onCheck,
	onUncheck,
	onLaunch,
	onEdit,
}: {
	group: BudgetGroup;
	items: MonthItem[];
	accountName: (id: string | null) => string;
	categoryName: (id: string | null) => string;
	onCheck: (item: MonthItem) => void;
	onUncheck: (item: MonthItem) => void;
	onLaunch: (item: MonthItem) => void;
	onEdit: (item: MonthItem) => void;
}) {
	const planned = items.reduce((s, i) => s + i.plannedAmount, 0);
	const spent = items.reduce((s, i) => s + i.spent, 0);
	return (
		<Card className="overflow-hidden">
			<div className="num border-line bg-panel-2 text-fg-2 flex justify-between border-b px-3.5 py-2.5 text-[11px] tracking-[.06em] uppercase">
				<h2 className="font-semibold">{GROUP_LABEL[group]}</h2>
				<span className="text-dim">
					{money(spent)} / {money(planned)}
				</span>
			</div>
			{items.map((item) => {
				const account = accountName(item.defaultAccountId);
				const meta = [
					categoryName(item.categoryId),
					item.toAccountId
						? `${account} → ${accountName(item.toAccountId)}`
						: account,
					item.unplanned
						? "não planeado"
						: item.partial
							? "vários lançamentos"
							: null,
					item.matchedSpent
						? `${money(item.matchedSpent)} registado fora da lista`
						: null,
				]
					.filter(Boolean)
					.join(" · ");
				const done = item.status === "paid" || item.status === "over";
				return (
					<div
						key={item.id}
						className="border-hover flex min-h-12 flex-wrap items-center gap-3 border-b px-3.5 py-2 last:border-0"
					>
						{item.partial ? (
							<span
								className="num border-line-strong text-dim flex size-[18px] items-center justify-center rounded-[5px] border text-[10px]"
								aria-hidden="true"
							>
								≈
							</span>
						) : (
							<button
								type="button"
								aria-pressed={item.checked}
								aria-label={
									item.checked
										? `Desmarcar ${item.name}`
										: `Marcar ${item.name} como pago`
								}
								onClick={() =>
									item.payments.length > 0 ? onUncheck(item) : onCheck(item)
								}
								className={`flex size-[18px] cursor-pointer items-center justify-center rounded-[5px] border-[1.5px] ${item.checked ? "border-money bg-money text-money-ink" : "hover:border-info-2 border-[#6E7681]"}`}
							>
								{item.checked ? (
									<svg
										width="11"
										height="11"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										strokeWidth="4"
										aria-hidden="true"
									>
										<path d="M5 12l5 5L20 7" />
									</svg>
								) : null}
							</button>
						)}
						<button
							type="button"
							className="flex min-w-[180px] flex-1 cursor-pointer flex-col gap-0.5 text-left"
							onClick={() => onEdit(item)}
						>
							<span
								className={
									done && item.status !== "over" ? "text-dim" : "font-medium"
								}
							>
								{item.name}
							</span>
							<span className="num text-dim text-[11px]">{meta}</span>
						</button>
						{item.partial ? (
							<div className="flex w-[200px] flex-col gap-1">
								<ProgressBar
									value={item.spent}
									max={item.plannedAmount}
									over={item.status === "over"}
								/>
								<span className="num text-dim text-[11px]">
									{money(item.spent)} / {money(item.plannedAmount)} · falta{" "}
									{money(item.remaining)}
								</span>
							</div>
						) : (
							<span className="num text-fg-2 w-[200px] text-right text-xs">
								{item.spent ? `${money(item.spent)} / ` : ""}
								{money(item.plannedAmount)}
							</span>
						)}
						<StatusPill status={item.status} />
						{item.partial ? (
							<div className="flex gap-1">
								{item.step ? (
									<Button
										variant="neutral"
										size="sm"
										onClick={() => onLaunch(item)}
									>
										+{money(item.step)}
									</Button>
								) : null}
								<Button size="sm" variant="quiet" onClick={() => onCheck(item)}>
									lançar…
								</Button>
							</div>
						) : null}
					</div>
				);
			})}
		</Card>
	);
}
