import type { Debt } from "@wallet/shared";
import { cn } from "@wallet/ui/lib/utils";
import { initials } from "@/components/accounts/utils";
import { debtLeft, debtState, receiving } from "@/components/debts/utils";
import { Pill } from "@/components/ui/pill";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Swatch } from "@/components/ui/swatch";
import { money } from "@/utils/format";

export function DebtRow({
	debt,
	selected,
	onSelect,
}: {
	debt: Debt;
	selected: boolean;
	onSelect: () => void;
}) {
	const state = debtState(debt);
	const left = debtLeft(debt);
	return (
		<button
			type="button"
			aria-pressed={selected}
			onClick={onSelect}
			className={cn(
				"border-hover hover:bg-hover flex w-full cursor-pointer items-center gap-3 border-b px-3.5 py-2.5 text-left last:border-0",
				selected && "bg-hover",
				debt.archived && "opacity-60",
			)}
		>
			<Swatch
				color={left === 0 ? "#3FB950" : receiving(debt) ? "#FFA657" : "#FF7B72"}
				label={initials(debt.person)}
			/>
			<span className="flex min-w-0 flex-1 flex-col gap-1">
				<span className="truncate font-medium">{debt.person}</span>
				<ProgressBar value={debt.paid} max={debt.amount} />
			</span>
			<span className="flex flex-col items-end gap-1">
				<span className="num">{money(left)}</span>
				<Pill tone={state.tone}>{state.label}</Pill>
			</span>
		</button>
	);
}
