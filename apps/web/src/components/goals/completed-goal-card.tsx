import type { Goal } from "@wallet/shared";
import { cn } from "@wallet/ui/lib/utils";
import { CheckIcon } from "lucide-react";
import { initials } from "@/components/accounts/utils";
import { Pill } from "@/components/ui/pill";
import { Swatch } from "@/components/ui/swatch";
import { money } from "@/utils/format";

export function CompletedGoalCard({
	goal,
	color,
	accountName,
	selected,
	onSelect,
}: {
	goal: Goal;
	color: string;
	accountName: string;
	selected: boolean;
	onSelect: () => void;
}) {
	const extra = goal.saved - goal.target;
	return (
		<button
			type="button"
			aria-pressed={selected}
			onClick={onSelect}
			className={cn(
				"border-line bg-panel hover:border-money-line group relative flex w-full cursor-pointer flex-col gap-3 overflow-hidden rounded-[10px] border p-4 text-left transition-colors",
				selected && "border-money-line bg-hover",
				goal.archived && "opacity-60",
			)}
		>
			<span
				aria-hidden
				className="from-money-bg pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b to-transparent"
			/>
			<span className="relative flex items-center gap-3">
				<span className="relative">
					<Swatch
						color={color}
						label={initials(goal.name)}
						className="size-9"
					/>
					<span className="bg-money text-canvas ring-panel absolute -right-1 -bottom-1 flex size-4 items-center justify-center rounded-full ring-2">
						<CheckIcon className="size-2.5" strokeWidth={3.5} />
					</span>
				</span>
				<span className="flex min-w-0 flex-1 flex-col">
					<span className="truncate font-semibold">{goal.name}</span>
					<span className="num text-dim truncate text-[11px]">
						{accountName}
					</span>
				</span>
				<Pill tone="ok">{goal.archived ? "arquivada" : "concluída"}</Pill>
			</span>
			<span className="relative flex items-baseline justify-between gap-2">
				<span className="num text-money text-xl">{money(goal.target)}</span>
				<span className="num text-dim text-[11px]">
					{extra > 0 ? `+${money(extra)} acima do alvo` : "alvo atingido"}
				</span>
			</span>
			<span className="bg-money relative h-1.5 w-full rounded-full" />
		</button>
	);
}
