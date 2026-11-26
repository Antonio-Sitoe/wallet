import {
	SelectContent,
	SelectItem,
	Select as SelectRoot,
	SelectTrigger,
	SelectValue,
} from "@wallet/ui/components/select";
import { cn } from "@wallet/ui/lib/utils";

export type SelectOption = { value: string; label: string };

export function Select({
	value,
	onValueChange,
	items,
	id,
	placeholder,
	disabled,
	size = "default",
	className,
	"aria-label": ariaLabel,
}: {
	value: string | number;
	onValueChange: (value: string) => void;
	items: SelectOption[];
	id?: string;
	placeholder?: string;
	disabled?: boolean;
	size?: "default" | "md" | "sm";
	className?: string;
	"aria-label"?: string;
}) {
	const known = items.some((item) => item.value === String(value));
	return (
		<SelectRoot
			items={items}
			value={known ? String(value) : null}
			onValueChange={(next) => {
				if (next !== null) onValueChange(String(next));
			}}
			disabled={disabled}
		>
			<SelectTrigger
				id={id}
				size={size === "sm" ? "sm" : "default"}
				aria-label={ariaLabel}
				className={cn(
					"w-full min-w-0 max-md:text-sm max-md:data-[size=default]:h-11",
					size === "md" && "data-[size=default]:h-8",
					size === "sm" && "text-xs",
					className,
				)}
			>
				<SelectValue placeholder={placeholder} />
			</SelectTrigger>
			<SelectContent>
				{items.map((item) => (
					<SelectItem
						key={item.value}
						value={item.value}
						className="max-md:min-h-11 max-md:text-[15px]"
					>
						{item.label}
					</SelectItem>
				))}
			</SelectContent>
		</SelectRoot>
	);
}
