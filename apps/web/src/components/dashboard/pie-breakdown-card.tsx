import type { BreakdownDimension, MoneyFlow } from "@wallet/shared";
import type { Period } from "@/@types/period";
import { useBreakdown } from "@/actions/analytics/use-breakdown";
import { Delta } from "@/components/charts/delta";
import {
	Donut,
	type DonutSlice,
	distinctColors,
	OTHERS_COLOR,
} from "@/components/charts/donut";
import { Empty } from "@/components/dashboard/empty";
import { Loading } from "@/components/dashboard/loading";
import { PeriodNote } from "@/components/dashboard/period-note";
import { money } from "@/utils/format";

const FLOW_LABEL: Record<MoneyFlow, string> = {
	expense: "saídas",
	income: "entradas",
};

const DIMENSION_LABEL: Record<BreakdownDimension, string> = {
	category: "categoria",
	account: "conta",
};

const DIMENSION_PLURAL: Record<BreakdownDimension, string> = {
	category: "categorias",
	account: "contas",
};

export function PieBreakdownCard({
	period,
	by,
	flow,
}: {
	period: Period;
	by: BreakdownDimension;
	flow: MoneyFlow;
}) {
	const data = useBreakdown(period, by, flow).data;
	if (!data) return <Loading />;
	if (data.total === 0)
		return <Empty>Sem {FLOW_LABEL[flow]} neste período.</Empty>;

	const colors = distinctColors(data.items.map((item) => item.color));
	const slices: DonutSlice[] = data.items.map((item, index) => ({
		key: item.id ?? "none",
		label: item.name,
		value: item.value,
		color: colors[index] ?? OTHERS_COLOR,
		note: `anterior ${money(item.previousValue)}`,
	}));
	if (data.others > 0)
		slices.push({
			key: "others",
			label: "Outras",
			value: data.others,
			color: OTHERS_COLOR,
		});

	return (
		<div className="flex flex-col gap-4">
			<div className="flex items-start justify-between gap-2">
				<div className="flex flex-col">
					<PeriodNote p={period} />
					<span className="num text-[22px] whitespace-nowrap">
						{money(data.total)}
					</span>
				</div>
				<Delta
					now={data.total}
					before={data.previousTotal}
					goodWhenUp={flow === "income"}
				/>
			</div>
			<Donut
				label={`${FLOW_LABEL[flow]} por ${DIMENSION_LABEL[by]}`}
				centerCaption={`Total de ${FLOW_LABEL[flow]}`}
				centerNote={`${slices.length} ${DIMENSION_PLURAL[by]}`}
				slices={slices}
			/>
		</div>
	);
}
