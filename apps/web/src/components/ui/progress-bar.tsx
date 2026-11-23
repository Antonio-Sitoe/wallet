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
		<span
			className="bg-hover block h-1 overflow-hidden rounded-sm"
			role="progressbar"
			aria-valuenow={pct}
			aria-valuemin={0}
			aria-valuemax={100}
		>
			<span
				className={cn("block h-1", over ? "bg-[#f0883e]" : "bg-money")}
				style={{ width: `${pct}%` }}
			/>
		</span>
	);
}
