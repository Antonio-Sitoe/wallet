import { Link } from "@tanstack/react-router";
import type { Breakdown, BreakdownSlice } from "@wallet/shared";
import { Delta } from "@/components/charts/delta";
import { distinctColors, OTHERS_COLOR } from "@/components/charts/donut";
import { money } from "@/utils/format";

export type RowLink = {
	search: {
		period?: "30d" | "month" | "last-month" | "year" | "all";
		category?: string;
		account?: string;
		payee?: string;
		label?: string;
		type?: "expense" | "income";
	};
};

const HEAD =
	"num text-dim h-8 px-3.5 text-[11px] font-normal tracking-[.06em] uppercase";

function Dot({ color }: { color: string }) {
	return (
		<i
			aria-hidden="true"
			className="size-2 shrink-0 rounded-full"
			style={{ background: color }}
		/>
	);
}

export function Ranking({
	data,
	label,
	linkOf,
}: {
	data: Breakdown;
	label: string;
	linkOf: (slice: BreakdownSlice) => RowLink | null;
}) {
	const colors = distinctColors(data.items.map((item) => item.color));
	const top = data.items[0]?.value ?? 1;
	const goodWhenUp = data.flow === "income";

	return (
		<table className="w-full table-fixed border-collapse text-[13px]">
			<caption className="sr-only">{label}</caption>
			<colgroup>
				<col />
				<col className="hidden w-[32%] sm:table-column" />
				<col className="w-[110px]" />
				<col className="hidden w-[160px] sm:table-column" />
			</colgroup>
			<thead>
				<tr className="border-line border-b">
					<th scope="col" className={`${HEAD} text-left`}>
						Nome
					</th>
					<th scope="col" className={`${HEAD} hidden text-left sm:table-cell`}>
						Parte
					</th>
					<th scope="col" className={`${HEAD} text-right`}>
						Valor
					</th>
					<th scope="col" className={`${HEAD} hidden text-right sm:table-cell`}>
						vs anterior
					</th>
				</tr>
			</thead>
			<tbody>
				{data.items.map((item, index) => {
					const color = colors[index] ?? OTHERS_COLOR;
					const link = linkOf(item);
					const name = (
						<span className="flex min-w-0 items-center gap-2">
							<Dot color={color} />
							<span className="truncate">{item.name}</span>
						</span>
					);
					return (
						<tr
							key={item.id ?? "none"}
							className="border-hover hover:bg-hover h-10 border-b"
						>
							<th scope="row" className="min-w-0 px-3.5 text-left font-normal">
								{link ? (
									<Link
										to="/transactions"
										search={link.search}
										className="hover:text-info-fg block min-w-0"
									>
										{name}
									</Link>
								) : (
									name
								)}
							</th>
							<td className="hidden px-3.5 sm:table-cell">
								<span className="flex items-center gap-2">
									<span className="bg-track h-1.5 flex-1 overflow-hidden rounded-sm">
										<span
											className="block h-1.5 rounded-sm"
											style={{
												width: `${Math.max(2, (item.value / top) * 100)}%`,
												background: color,
											}}
										/>
									</span>
									<span className="num text-dim w-9 text-right text-[11px]">
										{Math.round(item.share * 100)}%
									</span>
								</span>
							</td>
							<td className="num px-3.5 text-right">{money(item.value)}</td>
							<td className="hidden px-3.5 sm:table-cell">
								<span className="flex justify-end">
									<Delta
										now={item.value}
										before={item.previousValue}
										goodWhenUp={goodWhenUp}
									/>
								</span>
							</td>
						</tr>
					);
				})}
				{data.others > 0 ? (
					<tr className="text-dim h-10">
						<th scope="row" className="px-3.5 text-left font-normal">
							<span className="flex items-center gap-2">
								<Dot color={OTHERS_COLOR} />
								Outras
							</span>
						</th>
						<td className="hidden sm:table-cell" />
						<td className="num px-3.5 text-right">{money(data.others)}</td>
						<td className="hidden sm:table-cell" />
					</tr>
				) : null}
			</tbody>
		</table>
	);
}
