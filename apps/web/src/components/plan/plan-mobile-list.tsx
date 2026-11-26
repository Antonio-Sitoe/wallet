import { BUDGET_GROUPS, type PlanItemYear } from "@wallet/shared";
import { ChevronRightIcon } from "lucide-react";
import { Legend } from "@/components/plan/legend";
import { Pill } from "@/components/ui/pill";
import { GROUP_LABEL, MONTH_INITIALS, money } from "@/utils/format";

export function monthColor(
	cell: PlanItemYear["byMonth"][number] | undefined,
	month: string,
	nowMonth: string,
) {
	if (!cell) return "var(--color-hover)";
	if (cell.status === "over") return "var(--color-over)";
	if (cell.status === "paid") return "var(--color-money)";
	if (cell.status === "partial") return "var(--color-info-2)";
	return month < nowMonth ? "var(--color-missed)" : "var(--color-planned)";
}

export function PlanMobileList({
	year,
	items,
	nowMonth,
	describe,
	categoryName,
	onEdit,
}: {
	year: number;
	items: PlanItemYear[];
	nowMonth: string;
	describe: (item: PlanItemYear) => string;
	categoryName: (id: string | null) => string;
	onEdit: (item: PlanItemYear) => void;
}) {
	const months = Array.from(
		{ length: 12 },
		(_, i) => `${year}-${String(i + 1).padStart(2, "0")}`,
	);
	return (
		<div className="flex flex-col gap-5 md:hidden">
			{BUDGET_GROUPS.map((group) => {
				const list = items.filter((i) => i.group === group);
				if (list.length === 0) return null;
				return (
					<section key={group} className="flex flex-col gap-2">
						<h2 className="num text-dim px-1 text-xs font-medium tracking-[.06em] uppercase">
							{GROUP_LABEL[group]}
						</h2>
						<div className="bg-panel border-line overflow-hidden rounded-[18px] border">
							{list.map((item) => (
								<button
									key={item.id}
									type="button"
									onClick={() => onEdit(item)}
									className="border-line active:bg-hover flex w-full cursor-pointer flex-col gap-2.5 border-t px-3.5 py-3 text-left first:border-t-0"
								>
									<span className="flex w-full items-start gap-3">
										<span className="flex min-w-0 flex-1 flex-col gap-0.5">
											<span className="truncate text-[15px] font-medium">
												{item.name}
											</span>
											<span className="text-dim truncate text-xs">
												{categoryName(item.categoryId)} · {describe(item)}
											</span>
										</span>
										<span className="flex shrink-0 flex-col items-end gap-1">
											<span className="num text-[15px] font-semibold">
												{money(item.amount)}
											</span>
											{item.pace === "over" ? (
												<Pill tone="warn">
													acima +{(item.pacePercent ?? 100) - 100}%
												</Pill>
											) : item.pace === "within" ? (
												<Pill tone="ok">dentro</Pill>
											) : null}
										</span>
										<ChevronRightIcon className="text-faint mt-1 size-4 shrink-0" />
									</span>
									<span className="grid w-full grid-cols-12 gap-1">
										{months.map((month, i) => (
											<span key={month} className="flex flex-col items-center gap-1">
												<span
													className={`block h-2.5 w-full rounded-[3px] ${month === nowMonth ? "ring-fg-2 ring-1" : ""}`}
													style={{
														background: monthColor(
															item.byMonth.find((m) => m.month === month),
															month,
															nowMonth,
														),
													}}
												/>
												<span
													className={`num text-[9px] ${month === nowMonth ? "text-money" : "text-faint"}`}
												>
													{MONTH_INITIALS[i]}
												</span>
											</span>
										))}
									</span>
									<span className="num text-dim flex w-full justify-between text-xs">
										<span>ano {money(item.projected)}</span>
										<span>
											gasto {item.spentToDate ? money(item.spentToDate) : "—"}
										</span>
									</span>
								</button>
							))}
						</div>
					</section>
				);
			})}
			<div className="num text-dim flex flex-wrap gap-x-4 gap-y-1.5 px-1 text-[11px]">
				<Legend color="var(--color-planned)">planeado</Legend>
				<Legend color="var(--color-info-2)">parcial</Legend>
				<Legend color="var(--color-money)">pago</Legend>
				<Legend color="var(--color-over)">acima</Legend>
				<Legend color="var(--color-missed)">sem pagamento</Legend>
			</div>
		</div>
	);
}
