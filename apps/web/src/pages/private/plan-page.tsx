import { BUDGET_GROUPS, type PlanItemYear } from "@wallet/shared";
import { Button } from "@wallet/ui/components/button";
import { Skeleton } from "@wallet/ui/components/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableFooter,
	TableHead,
	TableHeader,
	TableRow,
} from "@wallet/ui/components/table";
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
import { STICKY_COLUMN, Th } from "@/components/plan/th";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Hint } from "@/components/ui/hint";
import { MoneyInput } from "@/components/ui/money-input";
import { Page } from "@/components/ui/page";
import { PageHeader } from "@/components/ui/page-header";
import { PageTitle } from "@/components/ui/page-title";
import { Pill } from "@/components/ui/pill";
import { Select } from "@/components/ui/select";
import { Stat } from "@/components/ui/stat";
import { StatRow } from "@/components/ui/stat-row";
import { ApiError } from "@/lib/api";
import { usePageNavigate, usePageSearch } from "@/lib/search-params";
import {
	currentMonth,
	GROUP_LABEL,
	MONTH_INITIALS,
	MONTH_SHORT,
	money,
	moneyInput,
	parseMoney,
} from "@/utils/format";

export function describeFrequency(item: PlanItemYear) {
	if (item.frequency === "monthly")
		return item.partial ? "mensal · aos poucos" : "mensal";
	const names = item.months.map((m) => MONTH_SHORT[m - 1]);
	return item.frequency === "once" ? `uma vez · ${names[0]}` : names.join(", ");
}

export function PlanPage() {
	const { year: yearParam } = usePageSearch("plan");
	const year = yearParam ?? Number(currentMonth().slice(0, 4));
	const navigate = usePageNavigate("plan");
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
					size="md"
					className="w-auto"
					aria-label="Ano"
					value={year}
					onValueChange={(value) =>
						navigate({ search: { year: Number(value) } })
					}
					items={[
						...[
							...new Set([
								...plans.map((p) => p.year),
								year - 1,
								year,
								year + 1,
							]),
						]
							.sort()
							.map((y) => ({
								value: String(y),
								label: `${y} ${plans.some((p) => p.year === y) ? "" : " · sem plano"}`,
							})),
					]}
				/>
				{data ? (
					<>
						<Button variant="neutral" onClick={() => setEditing("new")}>
							<PlusIcon className="size-3.5" strokeWidth={2.6} /> Item
						</Button>
						<Button
							variant="primary"
							disabled={data.items.length === 0}
							isLoading={generate.isPending}
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
								<Table className="w-full min-w-[980px] border-collapse text-[13px]">
									<TableHeader>
										<TableRow className="bg-panel-2 border-0 hover:bg-transparent">
											<Th sticky>Item</Th>
											<Th>Frequência</Th>
											<Th right>Valor</Th>
											{MONTH_INITIALS.map((m, i) => (
												<TableHead
													key={MONTH_SHORT[i]}
													scope="col"
													className={`num border-line border-b px-0.5 py-2 text-center text-[11px] font-medium ${`${year}-${String(i + 1).padStart(2, "0")}` === nowMonth ? "text-money" : "text-dim"} h-auto whitespace-normal`}
												>
													{m}
												</TableHead>
											))}
											<Th right>Ano</Th>
											<Th right>Gasto</Th>
											<Th>Ritmo</Th>
										</TableRow>
									</TableHeader>
									<TableBody>
										{BUDGET_GROUPS.flatMap((group) =>
											data.items.filter((i) => i.group === group),
										).map((item) => (
											<TableRow
												key={item.id}
												className="group border-hover hover:bg-hover cursor-pointer border-b"
												onClick={() => setEditing(item)}
											>
												<TableCell
													className={`${STICKY_COLUMN} bg-panel group-hover:bg-hover max-w-[160px] px-3 py-2 whitespace-normal md:max-w-none`}
												>
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
												</TableCell>
												<TableCell className="num text-fg-2 px-3 py-2 text-xs whitespace-normal">
													{describeFrequency(item)}
												</TableCell>
												<TableCell className="num px-3 py-2 text-right whitespace-normal">
													{money(item.amount)}
												</TableCell>
												{Array.from({ length: 12 }, (_, i) => {
													const month = `${year}-${String(i + 1).padStart(2, "0")}`;
													const cell = item.byMonth.find(
														(m) => m.month === month,
													);
													const color = !cell
														? "var(--color-hover)"
														: cell.status === "over"
															? "var(--color-over)"
															: cell.status === "paid"
																? "var(--color-money)"
																: cell.status === "partial"
																	? "var(--color-info-2)"
																	: month < nowMonth
																		? "var(--color-missed)"
																		: "var(--color-planned)";
													return (
														<TableCell
															key={month}
															className="px-0.5 py-2 whitespace-normal"
														>
															<Hint
																label={
																	cell
																		? `${month}: ${money(cell.spent)} / ${money(cell.planned)}`
																		: undefined
																}
															>
																<span
																	className={`mx-auto block h-3.5 w-full max-w-[22px] rounded-[3px] ${month === nowMonth ? "ring-fg-2 ring-1" : ""}`}
																	style={{ background: color }}
																/>
															</Hint>
														</TableCell>
													);
												})}
												<TableCell className="num text-fg-2 px-3 py-2 text-right whitespace-normal">
													{money(item.projected)}
												</TableCell>
												<TableCell className="num px-3 py-2 text-right whitespace-normal">
													{item.spentToDate ? money(item.spentToDate) : "—"}
												</TableCell>
												<TableCell className="px-3 py-2 whitespace-normal">
													{item.pace === "no_data" ? (
														<Pill>sem dados</Pill>
													) : item.pace === "over" ? (
														<Pill tone="warn">
															acima +{(item.pacePercent ?? 100) - 100}%
														</Pill>
													) : (
														<Pill tone="ok">dentro</Pill>
													)}
												</TableCell>
											</TableRow>
										))}
									</TableBody>
									<TableFooter>
										<TableRow className="bg-panel-2 border-0 hover:bg-transparent">
											<TableCell
												className="num text-dim px-3 py-2 text-[11px] whitespace-normal uppercase"
												colSpan={3}
											>
												por mês
											</TableCell>
											{data.months.map((m) => (
												<Hint key={m.month} label={money(m.planned)}>
													<TableCell
														className={`num px-0.5 py-2 text-center text-[10px] ${m.overIncome ? "text-warn" : "text-dim"} whitespace-normal`}
													>
														{Math.round(m.planned / 100_000)}k
													</TableCell>
												</Hint>
											))}
											<TableCell className="num px-3 py-2 text-right whitespace-normal">
												{money(data.totals.year)}
											</TableCell>
											<TableCell
												className="px-0 py-0 whitespace-normal"
												colSpan={2}
											/>
										</TableRow>
									</TableFooter>
								</Table>
								<div className="num border-line text-dim flex flex-wrap gap-4 border-t px-3 py-2 text-[11px]">
									<Legend color="var(--color-planned)">planeado</Legend>
									<Legend color="var(--color-info-2)">parcial</Legend>
									<Legend color="var(--color-money)">pago</Legend>
									<Legend color="var(--color-over)">acima</Legend>
									<Legend color="var(--color-missed)">
										passou sem pagamento
									</Legend>
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
