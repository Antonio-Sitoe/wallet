import { cn } from "@wallet/ui/lib/utils";
import { ink, tint } from "@/utils/color";

export function Swatch({
	color,
	label,
	className,
}: {
	color?: string | null;
	label?: string;
	className?: string;
}) {
	const c = color ?? "var(--color-dim)";
	return (
		<span
			aria-hidden="true"
			className={cn(
				"num inline-flex size-7 shrink-0 items-center justify-center rounded-md text-xs font-semibold",
				className,
			)}
			style={{ background: tint(c), color: ink(c) }}
		>
			{label}
		</span>
	);
}
