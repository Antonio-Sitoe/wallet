import { Switch as SwitchPrimitive } from "@base-ui/react/switch";
import { cn } from "@wallet/ui/lib/utils";

export function Switch({
	checked,
	onCheckedChange,
	disabled,
	id,
	"aria-label": ariaLabel,
	className,
}: {
	checked: boolean;
	onCheckedChange: (checked: boolean) => void;
	disabled?: boolean;
	id?: string;
	"aria-label"?: string;
	className?: string;
}) {
	return (
		<SwitchPrimitive.Root
			id={id}
			checked={checked}
			onCheckedChange={(next) => onCheckedChange(next)}
			disabled={disabled}
			aria-label={ariaLabel}
			className={cn(
				"bg-track data-checked:bg-money focus-visible:ring-focus/40 relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-colors outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50",
				className,
			)}
		>
			<SwitchPrimitive.Thumb className="bg-fg data-checked:bg-money-ink size-4 rounded-full shadow-sm transition-transform data-checked:translate-x-4" />
		</SwitchPrimitive.Root>
	);
}
