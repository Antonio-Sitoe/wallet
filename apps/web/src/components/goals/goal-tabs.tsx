import { cn } from "@wallet/ui/lib/utils";
import { CircleCheckIcon, TargetIcon } from "lucide-react";

export type GoalTab = "active" | "done";

const TABS = [
	{ value: "active", label: "Metas activas", icon: TargetIcon },
	{ value: "done", label: "Metas concluídas", icon: CircleCheckIcon },
] as const;

export function GoalTabs({
	value,
	counts,
	onChange,
}: {
	value: GoalTab;
	counts: Record<GoalTab, number>;
	onChange: (tab: GoalTab) => void;
}) {
	return (
		<div role="tablist" className="border-line flex gap-1 border-b">
			{TABS.map((tab) => {
				const selected = tab.value === value;
				const Icon = tab.icon;
				return (
					<button
						key={tab.value}
						type="button"
						role="tab"
						aria-selected={selected}
						onClick={() => onChange(tab.value)}
						className={cn(
							"-mb-px flex cursor-pointer items-center gap-2 border-b-2 px-3 pt-1 pb-2.5 text-[13px] transition-colors",
							selected
								? "border-fg text-fg font-medium"
								: "text-dim hover:text-fg-2 border-transparent",
						)}
					>
						<Icon
							className={cn(
								"size-3.5",
								selected && tab.value === "done" && "text-money",
							)}
						/>
						{tab.label}
						<span
							className={cn(
								"num rounded-full px-1.5 py-px text-[11px]",
								selected
									? tab.value === "done"
										? "bg-money-bg text-money"
										: "bg-info-bg text-info"
									: "bg-hover text-dim",
							)}
						>
							{counts[tab.value]}
						</span>
					</button>
				);
			})}
		</div>
	);
}
