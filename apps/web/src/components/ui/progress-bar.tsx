import { Progress } from "@wallet/ui/components/progress";
import { cn } from "@wallet/ui/lib/utils";

export function ProgressBar({
	value,
	max,
	over,
}: {
	value: number;
	max: number;
	over?: boolean;
}) {
	const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
	return (
		<Progress
			value={pct}
			className={cn(
				"**:data-[slot=progress-track]:bg-hover block **:data-[slot=progress-track]:rounded-sm",
				over
					? "**:data-[slot=progress-indicator]:bg-[#f0883e]"
					: "**:data-[slot=progress-indicator]:bg-money",
			)}
		/>
	);
}
