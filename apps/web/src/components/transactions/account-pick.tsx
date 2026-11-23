import { cn } from "@wallet/ui/lib/utils";
import { useId } from "react";
import { Select } from "@/components/ui/select";
import { money } from "@/utils/format";

export function AccountPick({
	label,
	value,
	onChange,
	accounts,
}: {
	label: string;
	value: string;
	onChange: (id: string) => void;
	accounts: { id: string; name: string; balance: number }[];
}) {
	const id = useId();
	return (
		<div className="bg-canvas border-line-strong focus-within:border-info-2 rounded-card flex w-full min-w-0 flex-col items-start gap-[3px] border px-3 py-2.5">
			<label
				htmlFor={id}
				className="num text-dim text-[11px] tracking-[.06em] uppercase"
			>
				{label}
			</label>
			<Select
				id={id}
				value={value}
				onValueChange={onChange}
				items={[
					{ value: "", label: "Escolher" },
					...accounts.map((a) => ({
						value: a.id,
						label: `${a.name} · ${money(a.balance)}`,
					})),
				]}
				className={cn(
					"border-0 bg-transparent p-0 text-[15px] font-medium focus-visible:ring-0 data-[size=default]:h-auto dark:bg-transparent dark:hover:bg-transparent",
					value ? "text-fg" : "text-info",
				)}
			/>
		</div>
	);
}
