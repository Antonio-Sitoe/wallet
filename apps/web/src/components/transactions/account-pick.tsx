import { cn } from "@wallet/ui/lib/utils";
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
	return (
		<label className="bg-canvas border-line-strong focus-within:border-info-2 flex w-full min-w-0 cursor-pointer flex-col items-start gap-[3px] rounded-[10px] border px-3 py-2.5">
			<small className="num text-dim text-[11px] tracking-[.06em] uppercase">
				{label}
			</small>
			<select
				value={value}
				onChange={(e) => onChange(e.target.value)}
				className={cn(
					"w-full cursor-pointer appearance-none truncate bg-transparent p-0 text-[15px] font-medium outline-none",
					value ? "text-fg" : "text-info",
				)}
			>
				<option value="">Escolher</option>
				{accounts.map((a) => (
					<option key={a.id} value={a.id}>
						{a.name} · {money(a.balance)}
					</option>
				))}
			</select>
		</label>
	);
}
