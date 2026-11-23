import { money } from "@/utils/format";

export const SERIES = {
	income: "#199e70",
	expense: "#d95926",
	current: "#3987e5",
	previous: "#d95926",
	yearAgo: "#9085e9",
	magnitude: "#3987e5",
} as const;

export function BarList({
	rows,
	label,
}: {
	rows: {
		key: string;
		name: string;
		value: number;
		dot?: string | null;
		note?: string;
	}[];
	label: string;
}) {
	const max = Math.max(1, ...rows.map((r) => r.value));
	return (
		<ul aria-label={label} className="flex flex-col gap-2.5">
			{rows.map((r) => (
				<li
					key={r.key}
					className="grid grid-cols-[minmax(110px,1.2fr)_2fr_auto] items-center gap-3"
					title={r.note}
				>
					<span className="flex min-w-0 items-center gap-2 truncate">
						{r.dot ? (
							<span
								aria-hidden="true"
								className="size-2 shrink-0 rounded-sm"
								style={{ background: r.dot }}
							/>
						) : null}
						<span className="truncate">{r.name}</span>
					</span>
					<span className="bg-hover h-1.5 overflow-hidden rounded-full">
						<span
							className="block h-1.5 rounded-full"
							style={{
								width: `${(r.value / max) * 100}%`,
								background: SERIES.magnitude,
							}}
						/>
					</span>
					<span className="num min-w-[72px] text-right">{money(r.value)}</span>
				</li>
			))}
		</ul>
	);
}
