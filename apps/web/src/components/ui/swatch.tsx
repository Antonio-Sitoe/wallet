import { cn } from "@wallet/ui/lib/utils";

export function Swatch({
	color,
	label,
	className,
}: {
	color?: string | null;
	label?: string;
	className?: string;
}) {
	const c = color ?? "#8B949E";
	return (
		<span
			aria-hidden="true"
			className={cn(
				"num inline-flex size-7 shrink-0 items-center justify-center rounded-md text-xs font-semibold",
				className,
			)}
			style={{ background: `${c}24`, color: c }}
		>
			{label}
		</span>
	);
}
