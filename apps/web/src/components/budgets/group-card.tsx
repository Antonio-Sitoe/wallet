import type { BudgetGroup, MonthItem } from "@wallet/shared";
import { Button } from "@wallet/ui/components/button";
import { CheckIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusPill } from "@/components/ui/status-pill";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { GROUP_LABEL, money } from "@/utils/format";

type RowProps = {
	item: MonthItem;
	meta: string;
	onCheck: (item: MonthItem) => void;
	onUncheck: (item: MonthItem) => void;
	onLaunch: (item: MonthItem) => void;
	onEdit: (item: MonthItem) => void;
};

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
	const isMobile = useIsMobile();
	const planned = items.reduce((s, i) => s + i.plannedAmount, 0);
	const spent = items.reduce((s, i) => s + i.spent, 0);
	const metaOf = (item: MonthItem) => {
		const account = accountName(item.defaultAccountId);
		return [
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
	};
	const handlers = { onCheck, onUncheck, onLaunch, onEdit };

	if (isMobile) {
		const paid = items.filter(
			(i) => i.status === "paid" || i.status === "over",
		).length;
		return (
			<section className="flex flex-col gap-2">
				<div className="flex items-baseline justify-between px-1">
					<h2 className="num text-dim text-xs font-medium tracking-[.06em] uppercase">
						{GROUP_LABEL[group]}
					</h2>
					<span className="num text-dim text-[13px]">
						{paid}/{items.length} · {money(planned)}
					</span>
				</div>
				<div className="bg-panel border-line overflow-hidden rounded-[18px] border">
					{items.map((item) => (
						<MobileRow
							key={item.id}
							item={item}
							meta={metaOf(item)}
							{...handlers}
						/>
					))}
				</div>
			</section>
		);
	}

	return (
		<Card className="overflow-hidden">
			<div className="num border-line bg-panel-2 text-fg-2 flex justify-between border-b px-3.5 py-2.5 text-[11px] tracking-[.06em] uppercase">
				<h2 className="font-semibold">{GROUP_LABEL[group]}</h2>
				<span className="text-dim">
					{money(spent)} / {money(planned)}
				</span>
			</div>
			{items.map((item) => (
				<DesktopRow key={item.id} item={item} meta={metaOf(item)} {...handlers} />
			))}
		</Card>
	);
}

function MobileRow({ item, meta, onCheck, onUncheck, onLaunch, onEdit }: RowProps) {
	const done = item.status === "paid" || item.status === "over";
	return (
		<div className="border-line flex min-h-16 items-center gap-2 border-t py-2.5 pr-3.5 pl-1.5 first:border-t-0">
			{item.partial ? (
				<span
					aria-hidden="true"
					className="flex size-11 shrink-0 items-center justify-center"
				>
					<span className="num border-line-strong text-dim flex size-[26px] items-center justify-center rounded-full border-2 text-xs">
						≈
					</span>
				</span>
			) : (
				<button
					type="button"
					aria-pressed={item.checked}
					aria-label={
						item.checked ? `Desmarcar ${item.name}` : `Marcar ${item.name} como pago`
					}
					onClick={() =>
						item.payments.length > 0 ? onUncheck(item) : onCheck(item)
					}
					className="flex size-11 shrink-0 cursor-pointer items-center justify-center"
				>
					<span
						className={`flex size-[26px] items-center justify-center rounded-full border-2 ${item.checked ? "border-money bg-money text-money-ink" : "border-control"}`}
					>
						{item.checked ? (
							<CheckIcon aria-hidden="true" className="size-3.5" strokeWidth={3.4} />
						) : null}
					</span>
				</button>
			)}
			<button
				type="button"
				onClick={() => onEdit(item)}
				className="flex min-w-0 flex-1 cursor-pointer flex-col gap-[3px] text-left"
			>
				<span
					className={`truncate text-[15px] font-medium ${done && item.status !== "over" ? "text-dim" : ""}`}
				>
					{item.name}
				</span>
				<span className="text-dim truncate text-xs">{meta}</span>
				{item.partial ? (
					<span className="mt-[3px] block">
						<ProgressBar
							value={item.spent}
							max={item.plannedAmount}
							over={item.status === "over"}
						/>
					</span>
				) : null}
			</button>
			<div className="flex shrink-0 flex-col items-end gap-1">
				<span
					className={`num font-semibold ${item.partial || item.spent ? "text-[13px]" : "text-[15px]"} ${done && item.status !== "over" ? "text-dim" : ""}`}
				>
					{item.partial || item.spent ? `${money(item.spent)} / ` : ""}
					{money(item.plannedAmount)}
				</span>
				<StatusPill status={item.status} />
			</div>
			{item.partial ? (
				<Button
					variant="neutral"
					onClick={() => (item.step ? onLaunch(item) : onCheck(item))}
					className="border-info-line bg-info-bg text-info num h-11 min-w-[52px] shrink-0 rounded-[12px] px-2 text-[13px] font-semibold"
				>
					{item.step ? `+${money(item.step)}` : "lançar"}
				</Button>
			) : null}
		</div>
	);
}

function DesktopRow({ item, meta, onCheck, onUncheck, onLaunch, onEdit }: RowProps) {
	const done = item.status === "paid" || item.status === "over";
	return (
		<div className="border-hover flex min-h-12 flex-wrap items-center gap-3 border-b px-3.5 py-2 last:border-0">
			{item.partial ? (
				<span
					className="num border-line-strong text-dim size-check rounded-check flex items-center justify-center border text-[10px]"
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
					className={`size-check rounded-check flex cursor-pointer items-center justify-center border-[1.5px] ${item.checked ? "border-money bg-money text-money-ink" : "hover:border-info-2 border-control"}`}
				>
					{item.checked ? (
						<CheckIcon
							aria-hidden="true"
							className="size-[11px]"
							strokeWidth={4}
						/>
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
}
