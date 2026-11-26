import type { PlannedOccurrence } from "@wallet/shared";
import { Button } from "@wallet/ui/components/button";
import { cn } from "@wallet/ui/lib/utils";
import {
	dayParts,
	FREQUENCY_LABEL,
	isOpen,
	statusMeta,
} from "@/components/planned/utils";
import { Pill } from "@/components/ui/pill";
import { money } from "@/utils/format";

export function OccurrenceRow({
	occurrence,
	route,
	selected,
	busy,
	onSelect,
	onConfirm,
	onUndo,
}: {
	occurrence: PlannedOccurrence;
	route: string;
	selected: boolean;
	busy: boolean;
	onSelect: () => void;
	onConfirm: () => void;
	onUndo: () => void;
}) {
	const { day, mon } = dayParts(occurrence.dueDate);
	const status = statusMeta(occurrence);
	const open = isOpen(occurrence);
	const done = occurrence.status === "paid";
	return (
		<div
			className={cn(
				"border-hover hover:bg-hover flex items-center gap-3 border-b px-3.5 py-2.5 last:border-0 max-md:gap-2 max-md:px-3",
				selected && "bg-hover",
			)}
		>
			<button
				type="button"
				aria-pressed={selected}
				onClick={onSelect}
				className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left"
			>
				<span
					className={cn(
						"rounded-control border-line bg-panel-2 flex h-[42px] w-[46px] shrink-0 flex-col items-center justify-center border",
						occurrence.status === "overdue" &&
							"border-danger-line bg-danger-bg text-danger",
						!open && "text-dim",
					)}
				>
					<span className="num text-[15px] leading-none font-semibold">
						{day}
					</span>
					<span className="num text-dim text-[10px] uppercase">{mon}</span>
				</span>
				<span className="flex min-w-0 flex-1 flex-col gap-0.5">
					<span className="flex min-w-0 items-center gap-2">
						<span
							className={cn(
								"truncate font-medium",
								occurrence.status === "skipped" && "text-dim line-through",
							)}
						>
							{occurrence.name}
						</span>
						<span className="max-md:hidden">
							<Pill>{FREQUENCY_LABEL[occurrence.frequency]}</Pill>
						</span>
					</span>
					<span className="num text-dim truncate text-[11px]">{route}</span>
				</span>
				<span className="flex flex-col items-end gap-1">
					<span className="num text-sm">
						{money(occurrence.paidAmount ?? occurrence.amount)}
					</span>
					<Pill tone={status.tone}>{status.label}</Pill>
				</span>
			</button>
			{open ? (
				<Button
					variant="primary"
					size="sm"
					className="min-w-[96px] max-md:h-10 max-md:min-w-0 max-md:px-3"
					disabled={busy}
					onClick={onConfirm}
					aria-label={`Confirmar ${occurrence.name}`}
				>
					Confirmar
				</Button>
			) : (
				<Button
					variant="quiet"
					size="sm"
					className="min-w-[96px] max-md:h-10 max-md:min-w-0 max-md:px-3"
					disabled={busy}
					onClick={onUndo}
					aria-label={`Desfazer ${occurrence.name}`}
				>
					{done ? "Desfazer" : "Repor"}
				</Button>
			)}
		</div>
	);
}
