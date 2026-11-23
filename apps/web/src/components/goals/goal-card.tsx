import type { Goal } from "@wallet/shared";
import { cn } from "@wallet/ui/lib/utils";
import { initials } from "@/components/accounts/utils";
import { goalPace, goalPct } from "@/components/goals/utils";
import { Pill } from "@/components/ui/pill";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Swatch } from "@/components/ui/swatch";
import { money } from "@/utils/format";

export function GoalCard({
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
	const pace = goalPace(goal);
	const pct = goalPct(goal);
	return (
		<button
			type="button"
			aria-pressed={selected}
			onClick={onSelect}
			className={cn(
				"border-line bg-panel hover:border-line-strong flex w-full cursor-pointer flex-col gap-3 rounded-[10px] border p-4 text-left",
				selected && "border-line-strong bg-hover",
				goal.archived && "opacity-60",
			)}
		>
			<span className="flex items-center gap-3">
				<Swatch color={color} label={initials(goal.name)} className="size-9" />
				<span className="flex min-w-0 flex-1 flex-col">
					<span className="truncate font-semibold">{goal.name}</span>
					<span className="num text-dim truncate text-[11px]">
						{accountName}
					</span>
				</span>
				<Pill tone={pace.tone}>{goal.archived ? "arquivada" : pace.label}</Pill>
			</span>
			<span className="flex items-baseline justify-between gap-2">
				<span className="num text-xl">
					{money(goal.saved)}
					<span className="text-dim text-[13px]"> / {money(goal.target)}</span>
				</span>
				<span className="num text-fg-2 text-xs">{pct}%</span>
			</span>
			<ProgressBar value={goal.saved} max={goal.target} />
		</button>
	);
}
