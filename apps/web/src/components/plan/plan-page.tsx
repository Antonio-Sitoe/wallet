import { getRouteApi } from "@tanstack/react-router";
import { BUDGET_GROUPS, type PlanItemYear } from "@wallet/shared";
import { PlusIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useCategories } from "@/actions/categories/use-categories";
import { useGeneratePlan } from "@/actions/plan/use-generate-plan";
import { usePlan } from "@/actions/plan/use-plan";
import { usePlans } from "@/actions/plan/use-plans";
import { useUpdatePlan } from "@/actions/plan/use-update-plan";
import { CreatePlan } from "@/components/plan/create-plan";
import { Legend } from "@/components/plan/legend";
import { PlanItemDialog } from "@/components/plan/plan-item-dialog";
import { Th } from "@/components/plan/th";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { MoneyInput } from "@/components/ui/money-input";
import { Page } from "@/components/ui/page";
import { PageHeader } from "@/components/ui/page-header";
import { PageTitle } from "@/components/ui/page-title";
import { Pill } from "@/components/ui/pill";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Stat } from "@/components/ui/stat";
import { StatRow } from "@/components/ui/stat-row";
import { ApiError } from "@/lib/api";
import {
	currentMonth,
	GROUP_LABEL,
	MONTH_INITIALS,
	MONTH_SHORT,
	money,
	moneyInput,
	parseMoney,
} from "@/utils/format";

const route = getRouteApi("/_private/plan");

export function describeFrequency(item: PlanItemYear) {
	if (item.frequency === "monthly")
		return item.partial ? "mensal · aos poucos" : "mensal";
	const names = item.months.map((m) => MONTH_SHORT[m - 1]);
	return item.frequency === "once" ? `uma vez · ${names[0]}` : names.join(", ");
}

export function PlanPage() {
	const { year: yearParam } = route.useSearch();
	const year = yearParam ?? Number(currentMonth().slice(0, 4));
	const navigate = route.useNavigate();
	const plan = usePlan(year);
	const plans = usePlans().data ?? [];
	const categories = useCategories().data ?? [];
	const generate = useGeneratePlan();
	const updatePlan = useUpdatePlan();
	const [editing, setEditing] = useState<PlanItemYear | "new" | null>(null);
	const [income, setIncome] = useState<string | null>(null);
	const missing = plan.error instanceof ApiError && plan.error.status === 404;
	const nowMonth = currentMonth();
	const categoryName = (id: string | null) =>
		categories.find((c) => c.id === id)?.name ?? "sem categoria";
	const data = plan.data;

	return (
		<>
			<PageHeader crumb={["orçamento", `plano-${year}`]}>
				<Select
					className="h-8 w-auto"
					aria-label="Ano"
					value={year}
					onChange={(e) =>
						navigate({ search: { year: Number(e.target.value) } })
					}
				>
					{[...new Set([...plans.map((p) => p.year), year - 1, year, year + 1])]
						.sort()
						.map((y) => (
							<option key={y} value={y}>
								{y}
								{plans.some((p) => p.year === y) ? "" : " · sem plano"}
							</option>
						))}
				</Select>
				{data ? (
					<>
						<Button onClick={() => setEditing("new")}>
							<PlusIcon className="size-3.5" strokeWidth={2.6} /> Item
						</Button>
						<Button
							variant="primary"
							disabled={generate.isPending || data.items.length === 0}
							onClick={async () => {
								const res = await generate.mutateAsync(year);
								toast.success(
									res.created
										? `${res.created} itens criados nas listas mensais`
										: "As listas já estavam todas criadas",
								);
							}}
						>
							{data.generated ? "Actualizar listas" : "Gerar 12 listas"}
						</Button>
					</>
				) : null}
			</PageHeader>
			<Page>
				<PageTitle
					title={`Plano anual ${year}`}
					meta={
						data
							? data.generated
								? "listas mensais geradas · editar um valor muda só os meses seguintes não pagos"
								: "ainda sem listas mensais"
							: " "
					}
				/>
				{missing ? (
					<CreatePlan
						year={year}
						hasPrevious={plans.some((p) => p.year === year - 1)}
					/>
				) : !data ? (
					<Skeleton className="h-96" />
				) : (
					<>
						<StatRow>
							<div className="flex min-w-0 flex-col gap-1.5 px-4 py-3.5">
								<span className="num text-dim text-[11px] tracking-[.06em] uppercase">
									Salário previsto / mês
								</span>
								<form
									className="flex gap-2"
									onSubmit={async (e) => {
										e.preventDefault();
										const cents = income === null ? null : parseMoney(income);
										if (cents === null) return;
										await updatePlan.mutateAsync({
											year,
											expectedIncome: cents,
										});
										setIncome(null);
									}}
								>
									<MoneyInput
										className="h-8 text-base"
										value={income ?? moneyInput(data.expectedIncome)}
										onChange={(e) => setIncome(e.target.value)}
									/>
									{income !== null ? (
										<Button type="submit" size="sm" variant="primary">
											OK
										</Button>
									) : null}
								</form>
							</div>
							<Stat
								label="Total do ano"
								value={money(data.totals.year)}
								note={`${data.items.length} itens`}
							/>
							<Stat
								label="Média por mês"
								value={money(data.totals.monthlyAverage)}
								tone={
									data.expectedIncome &&
									data.totals.monthlyAverage > data.expectedIncome
										? "warn"
										: undefined
								}
							/>
							<Stat
								label="Acima do ritmo"
								value={data.totals.itemsOverPace}
								tone={data.totals.itemsOverPace ? "warn" : "ok"}
								note={`até ${MONTH_SHORT[Number(data.asOf.slice(5)) - 1]}`}
							/>
						</StatRow>

						{data.items.length === 0 ? (
							<EmptyState
								title="O plano está vazio"
								actions={
									<Button variant="primary" onClick={() => setEditing("new")}>
										Adicionar item
									</Button>
								}
							>
								Adicione os itens que se repetem (Moradia, Escola, Internet…),
								os sazonais e os de uma vez.
							</EmptyState>
						) : (
							<Card className="overflow-x-auto">
								<table className="w-full min-w-[980px] border-collapse">
									<thead>
										<tr className="bg-panel-2">
											<Th>Item</Th>
											<Th>Frequência</Th>
											<Th right>Valor</Th>
											{MONTH_INITIALS.map((m, i) => (
												<th
													key={MONTH_SHORT[i]}
													scope="col"
													className={`num border-line border-b px-0.5 py-2 text-center text-[11px] font-medium ${`${year}-${String(i + 1).padStart(2, "0")}` === nowMonth ? "text-money" : "text-dim"}`}
												>
													{m}
												</th>
											))}
											<Th right>Ano</Th>
											<Th right>Gasto</Th>
											<Th>Ritmo</Th>
										</tr>
									</thead>
									<tbody>
										{BUDGET_GROUPS.flatMap((group) =>
											data.items.filter((i) => i.group === group),
										).map((item) => (
											<tr
												key={item.id}
												className="border-hover hover:bg-hover cursor-pointer border-b"
												onClick={() => setEditing(item)}
											>
												<td className="px-3 py-2">
													<button
														type="button"
														className="cursor-pointer text-left font-medium"
													>
														{item.name}
													</button>
													<div className="num text-dim text-[11px]">
														{categoryName(item.categoryId)} ·{" "}
														{GROUP_LABEL[item.group].toLowerCase()}
													</div>
												</td>
												<td className="num text-fg-2 px-3 py-2 text-xs">
													{describeFrequency(item)}
												</td>
												<td className="num px-3 py-2 text-right">
													{money(item.amount)}
												</td>
												{Array.from({ length: 12 }, (_, i) => {
													const month = `${year}-${String(i + 1).padStart(2, "0")}`;
													const cell = item.byMonth.find(
														(m) => m.month === month,
													);
													const color = !cell
														? "#161B22"
														: cell.status === "over"
															? "#F0883E"
															: cell.status === "paid"
																? "#3FB950"
																: cell.status === "partial"
																	? "#58A6FF"
																	: month < nowMonth
																		? "#5A3416"
																		: "#1F5F33";
													return (
														<td key={month} className="px-0.5 py-2">
															<span
																title={
																	cell
																		? `${month}: ${money(cell.spent)} / ${money(cell.planned)}`
																		: undefined
																}
																className={`mx-auto block h-3.5 w-full max-w-[22px] rounded-[3px] ${month === nowMonth ? "ring-fg-2 ring-1" : ""}`}
																style={{ background: color }}
															/>
														</td>
													);
												})}
												<td className="num text-fg-2 px-3 py-2 text-right">
													{money(item.projected)}
												</td>
												<td className="num px-3 py-2 text-right">
													{item.spentToDate ? money(item.spentToDate) : "—"}
												</td>
												<td className="px-3 py-2">
													{item.pace === "no_data" ? (
														<Pill>sem dados</Pill>
													) : item.pace === "over" ? (
														<Pill tone="warn">
															acima +{(item.pacePercent ?? 100) - 100}%
														</Pill>
													) : (
														<Pill tone="ok">dentro</Pill>
													)}
												</td>
											</tr>
										))}
									</tbody>
									<tfoot>
										<tr className="bg-panel-2">
											<td
												className="num text-dim px-3 py-2 text-[11px] uppercase"
												colSpan={3}
											>
												por mês
											</td>
											{data.months.map((m) => (
												<td
													key={m.month}
													className={`num px-0.5 py-2 text-center text-[10px] ${m.overIncome ? "text-warn" : "text-dim"}`}
													title={money(m.planned)}
												>
													{Math.round(m.planned / 100_000)}k
												</td>
											))}
											<td className="num px-3 py-2 text-right">
												{money(data.totals.year)}
											</td>
											<td colSpan={2} />
										</tr>
									</tfoot>
								</table>
								<div className="num border-line text-dim flex flex-wrap gap-4 border-t px-3 py-2 text-[11px]">
									<Legend color="#1F5F33">planeado</Legend>
									<Legend color="#58A6FF">parcial</Legend>
									<Legend color="#3FB950">pago</Legend>
									<Legend color="#F0883E">acima</Legend>
									<Legend color="#5A3416">passou sem pagamento</Legend>
									<span>
										meses acima do salário previsto a laranja · clique num item
										para editar
									</span>
								</div>
							</Card>
						)}
					</>
				)}
			</Page>
			{editing && data ? (
				<PlanItemDialog
					year={year}
					item={editing === "new" ? null : editing}
					onClose={() => setEditing(null)}
				/>
			) : null}
		</>
	);
}
