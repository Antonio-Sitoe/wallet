import {
	ToggleGroup,
	ToggleGroupItem,
} from "@wallet/ui/components/toggle-group";
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
		<ToggleGroup
			value={[value]}
			onValueChange={(next) => {
				const picked = next[0];
				if (picked) onChange(picked as T);
			}}
			className={cn(
				"border-line bg-canvas flex w-auto gap-0.5 rounded-lg border p-[3px]",
				className,
			)}
		>
			{options.map((o) => (
				<ToggleGroupItem
					key={o.value}
					value={o.value}
					size="sm"
					className="text-fg-2 data-pressed:bg-info-bg data-pressed:text-info hover:text-fg h-7 flex-1 cursor-pointer rounded-md px-3 text-xs font-normal data-pressed:font-medium"
				>
					{o.label}
				</ToggleGroupItem>
			))}
		</ToggleGroup>
	);
}
