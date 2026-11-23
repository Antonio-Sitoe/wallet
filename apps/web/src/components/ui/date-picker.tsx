import { Calendar } from "@wallet/ui/components/calendar";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@wallet/ui/components/popover";
import { cn } from "@wallet/ui/lib/utils";
import { CalendarIcon } from "lucide-react";
import { useState } from "react";
import { pt } from "react-day-picker/locale";
import { dayLabel } from "@/utils/format";

const pad = (n: number) => String(n).padStart(2, "0");

const toKey = (date: Date) =>
	`${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const fromKey = (key: string) => {
	const [y, m, d] = key.split("-").map(Number) as [number, number, number];
	return new Date(y, m - 1, d);
};

export function DatePicker({
	value,
	onChange,
	max,
	id,
	className,
	"aria-label": ariaLabel,
}: {
	value: string;
	onChange: (value: string) => void;
	max?: string;
	id?: string;
	className?: string;
	"aria-label"?: string;
}) {
	const [open, setOpen] = useState(false);
	const selected = value ? fromKey(value) : undefined;

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger
				id={id}
				aria-label={ariaLabel}
				className={cn(
					"border-input bg-background hover:bg-secondary focus-visible:border-ring focus-visible:ring-ring/50 num flex h-[34px] w-full min-w-0 cursor-pointer items-center justify-between gap-2 rounded-md border px-2.5 text-left text-[13px] outline-none focus-visible:ring-3",
					!value && "text-muted-foreground",
					className,
				)}
			>
				{value ? `${dayLabel(value)} ${value.slice(0, 4)}` : "Escolher data"}
				<CalendarIcon className="text-dim size-4 shrink-0" />
			</PopoverTrigger>
			<PopoverContent align="start" className="bg-panel w-auto p-0">
				<Calendar
					mode="single"
					locale={pt}
					weekStartsOn={1}
					className="[--cell-size:--spacing(9)]"
					selected={selected}
					defaultMonth={selected}
					disabled={max ? { after: fromKey(max) } : undefined}
					onSelect={(date) => {
						if (!date) return;
						onChange(toKey(date));
						setOpen(false);
					}}
				/>
			</PopoverContent>
		</Popover>
	);
}
