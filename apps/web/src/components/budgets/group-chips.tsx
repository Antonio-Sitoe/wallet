import { BUDGET_GROUPS, type BudgetGroup, type MonthItem } from "@wallet/shared";

const SHORT_LABEL: Record<BudgetGroup, string> = {
	fixed: "Fixos",
	savings: "Poupança",
	variable: "Variáveis",
	oneoff: "Pontuais",
};

export function GroupChips({
	items,
	value,
	onChange,
}: {
	items: MonthItem[];
	value: BudgetGroup | "all";
	onChange: (value: BudgetGroup | "all") => void;
}) {
	const options = [
		{ key: "all" as const, label: "Todos", count: items.length },
		...BUDGET_GROUPS.map((g) => ({
			key: g,
			label: SHORT_LABEL[g],
			count: items.filter((i) => i.group === g).length,
		})).filter((o) => o.count > 0),
	];
	return (
		<div
			role="tablist"
			aria-label="Grupos"
			className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 md:hidden"
		>
			{options.map((o) => {
				const selected = value === o.key;
				return (
					<button
						key={o.key}
						type="button"
						role="tab"
						aria-selected={selected}
						onClick={() => onChange(o.key)}
						className={`h-9 shrink-0 cursor-pointer rounded-full border px-3.5 text-sm font-medium whitespace-nowrap ${selected ? "bg-fg text-canvas border-fg" : "bg-panel text-fg-2 border-line-strong"}`}
					>
						{o.label} <span className="num opacity-70">{o.count}</span>
					</button>
				);
			})}
		</div>
	);
}
