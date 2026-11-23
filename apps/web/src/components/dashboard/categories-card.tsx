import { BarList } from "@/components/charts/bar-list";
import { Delta } from "@/components/charts/delta";
import { Empty } from "@/components/dashboard/empty";
import { Loading } from "@/components/dashboard/loading";
import { PeriodNote } from "@/components/dashboard/period-note";
import { type Period, useCategorySpending } from "@/lib/queries";
import { money } from "@/utils/format";

export function CategoriesCard({ period }: { period: Period }) {
	const data = useCategorySpending(period).data;
	if (!data) return <Loading />;
	if (data.total === 0) return <Empty>Sem saídas neste período.</Empty>;
	const rows = data.items.map((i) => ({
		key: i.categoryId ?? "none",
		name: i.name,
		value: i.expense,
		dot: i.color,
		note: `${Math.round(i.share * 100)}% · anterior ${money(i.previousExpense)}`,
	}));
	if (data.others > 0)
		rows.push({
			key: "others",
			name: "Outras",
			value: data.others,
			dot: null,
			note: "",
		});
	return (
		<div className="flex flex-col gap-3">
			<div className="flex items-start justify-between gap-2">
				<div className="flex flex-col">
					<PeriodNote p={period} />
					<span className="num text-[22px]">{money(data.total)}</span>
				</div>
				<Delta
					now={data.total}
					before={data.previousTotal}
					goodWhenUp={false}
				/>
			</div>
			<BarList label="Saídas por categoria" rows={rows} />
		</div>
	);
}
