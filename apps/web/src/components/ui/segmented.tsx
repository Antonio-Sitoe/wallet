import { cn } from "@wallet/ui/lib/utils";

export function Segmented<T extends string>({
	value,
	options,
	onChange,
	className,
}: {
	value: T;
	options: { value: T; label: string }[];
	onChange: (v: T) => void;
	className?: string;
}) {
	return (
		<div
			className={cn(
				"border-line bg-canvas flex gap-0.5 rounded-lg border p-[3px]",
				className,
			)}
		>
			{options.map((o) => (
				<button
					key={o.value}
					type="button"
					aria-pressed={value === o.value}
					onClick={() => onChange(o.value)}
					className={cn(
						"text-fg-2 h-7 flex-1 cursor-pointer rounded-md px-3 text-xs",
						value === o.value && "bg-info-bg text-info font-medium",
					)}
				>
					{o.label}
				</button>
			))}
		</div>
	);
}
