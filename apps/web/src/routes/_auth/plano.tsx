import { createFileRoute, Link } from "@tanstack/react-router";
import {
	BUDGET_GROUPS,
	type BudgetGroup,
	type Frequency,
	type PlanItemYear,
} from "@wallet/shared";
import { PlusIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import {
	Button,
	Card,
	CardHeader,
	CategoryOptions,
	Dialog,
	EmptyState,
	Field,
	MoneyInput,
	Page,
	PageHeader,
	PageTitle,
	Pill,
	Select,
	Skeleton,
	Stat,
	StatRow,
	TextInput,
} from "@/components/kit";
import { ApiError } from "@/lib/api";
import {
	currentMonth,
	GROUP_LABEL,
	MONTH_INITIALS,
	MONTH_SHORT,
	money,
	moneyInput,
	parseMoney,
} from "@/lib/format";
import {
	useAccounts,
	useAddPlanItem,
	useCategories,
	useCreatePlan,
	useDeletePlanItem,
	useGeneratePlan,
	usePlan,
	usePlans,
	useUpdatePlan,
	useUpdatePlanItem,
} from "@/lib/queries";

export const Route = createFileRoute("/_auth/plano")({
	validateSearch: z.object({
		ano: z.number().int().min(2000).max(2100).optional(),
	}),
	component: PlanPage,
});

const FREQ_LABEL: Record<Frequency, string> = {
	monthly: "Mensal",
	months: "Meses escolhidos",
	once: "Uma vez",
};

function describeFrequency(item: PlanItemYear) {
	if (item.frequency === "monthly")
		return item.partial ? "mensal · aos poucos" : "mensal";
	const names = item.months.map((m) => MONTH_SHORT[m - 1]);
	return item.frequency === "once" ? `uma vez · ${names[0]}` : names.join(", ");
}

function PlanPage() {
	const { ano } = Route.useSearch();
	const year = ano ?? Number(currentMonth().slice(0, 4));
	const navigate = Route.useNavigate();
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
						navigate({ search: { ano: Number(e.target.value) } })
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

const Th = ({
	children,
	right,
}: {
	children: React.ReactNode;
	right?: boolean;
}) => (
	<th
		scope="col"
		className={`num border-line text-dim border-b px-3 py-2 text-[11px] font-medium tracking-[.06em] uppercase ${right ? "text-right" : "text-left"}`}
	>
		{children}
	</th>
);

const Legend = ({
	color,
	children,
}: {
	color: string;
	children: React.ReactNode;
}) => (
	<span className="inline-flex items-center gap-1.5">
		<span className="size-2.5 rounded-sm" style={{ background: color }} />
		{children}
	</span>
);

function CreatePlan({
	year,
	hasPrevious,
}: {
	year: number;
	hasPrevious: boolean;
}) {
	const create = useCreatePlan();
	const [income, setIncome] = useState("");
	const [copy, setCopy] = useState(hasPrevious);
	const [copySeasonal, setCopySeasonal] = useState(true);
	const [copyOneOff, setCopyOneOff] = useState(false);
	const cents = income === "" ? 0 : parseMoney(income);
	return (
		<Card className="max-w-[560px]">
			<CardHeader
				title={`Criar o plano de ${year}`}
				meta="planeia o ano uma vez; cada mês vira uma checklist"
			/>
			<form
				className="flex flex-col gap-3.5 p-4"
				onSubmit={async (e) => {
					e.preventDefault();
					if (cents === null) return;
					await create.mutateAsync({
						year,
						expectedIncome: cents,
						...(copy ? { copyFrom: year - 1, copySeasonal, copyOneOff } : {}),
					});
					toast.success(`Plano de ${year} criado`);
				}}
			>
				<Field
					label="Salário previsto por mês (MZN)"
					hint={copy ? "vazio = o mesmo do ano anterior" : undefined}
				>
					<MoneyInput
						value={income}
						onChange={(e) => setIncome(e.target.value)}
						placeholder="55 000"
					/>
				</Field>
				{hasPrevious ? (
					<div className="border-line flex flex-col gap-2 rounded-lg border p-3">
						<Check checked={copy} onChange={setCopy}>
							Copiar os itens de {year - 1}
						</Check>
						{copy ? (
							<>
								<Check checked={copySeasonal} onChange={setCopySeasonal}>
									Copiar itens sazonais (ex.: Escola de Inglês jun–ago)
								</Check>
								<Check checked={copyOneOff} onChange={setCopyOneOff}>
									Copiar itens de uma vez (ex.: iPhone, Obra)
								</Check>
							</>
						) : null}
					</div>
				) : null}
				<Button
					type="submit"
					variant="primary"
					disabled={cents === null || create.isPending}
					className="self-start"
				>
					Criar plano {year}
				</Button>
			</form>
		</Card>
	);
}

const Check = ({
	checked,
	onChange,
	children,
}: {
	checked: boolean;
	onChange: (v: boolean) => void;
	children: React.ReactNode;
}) => (
	<label className="text-fg-2 flex cursor-pointer items-center gap-2.5">
		<input
			type="checkbox"
			checked={checked}
			onChange={(e) => onChange(e.target.checked)}
			className="size-4 accent-[#3FB950]"
		/>
		{children}
	</label>
);

function PlanItemDialog({
	year,
	item,
	onClose,
}: {
	year: number;
	item: PlanItemYear | null;
	onClose: () => void;
}) {
	const accounts = useAccounts().data ?? [];
	const categories = useCategories().data ?? [];
	const add = useAddPlanItem();
	const update = useUpdatePlanItem();
	const remove = useDeletePlanItem();
	const now = currentMonth();
	const defaultApply = now.startsWith(String(year)) ? now : `${year}-01`;
	const [name, setName] = useState(item?.name ?? "");
	const [group, setGroup] = useState<BudgetGroup>(item?.group ?? "fixed");
	const [categoryId, setCategoryId] = useState(item?.categoryId ?? "");
	const [amount, setAmount] = useState(item ? moneyInput(item.amount) : "");
	const [frequency, setFrequency] = useState<Frequency>(
		item?.frequency ?? "monthly",
	);
	const [months, setMonths] = useState<number[]>(
		item && item.frequency !== "monthly" ? item.months : [],
	);
	const [accountId, setAccountId] = useState(item?.accountId ?? "");
	const [toAccountId, setToAccountId] = useState(item?.toAccountId ?? "");
	const [partial, setPartial] = useState(item?.partial ?? false);
	const [step, setStep] = useState(item?.step ? moneyInput(item.step) : "");
	const [applyFrom, setApplyFrom] = useState(defaultApply);

	const cents = parseMoney(amount);
	const stepCents = step === "" ? null : parseMoney(step);
	const monthsOk =
		frequency === "monthly" ||
		(frequency === "once" ? months.length === 1 : months.length > 0);
	const valid =
		!!name.trim() &&
		cents !== null &&
		cents > 0 &&
		monthsOk &&
		(!toAccountId || toAccountId !== accountId);

	async function save() {
		if (!valid || cents === null) return;
		const body = {
			name: name.trim(),
			group,
			categoryId: categoryId || null,
			amount: cents,
			frequency,
			months: frequency === "monthly" ? [] : months,
			accountId: accountId || null,
			toAccountId: toAccountId || null,
			partial,
			step: partial ? stepCents : null,
		};
		if (item) await update.mutateAsync({ id: item.id, ...body, applyFrom });
		else await add.mutateAsync({ year, ...body });
		toast.success(
			item
				? `${body.name} actualizado a partir de ${applyFrom}`
				: `${body.name} adicionado ao plano`,
		);
		onClose();
	}

	const toggleMonth = (m: number) =>
		setMonths((current) =>
			frequency === "once"
				? [m]
				: current.includes(m)
					? current.filter((x) => x !== m)
					: [...current, m].sort((a, b) => a - b),
		);

	return (
		<Dialog
			open
			onOpenChange={(o) => !o && onClose()}
			width={620}
			title={item ? `Editar ${item.name}` : `Novo item do plano ${year}`}
			description={
				item
					? "os meses anteriores a «aplicar a partir de» e os já pagos ficam como estão"
					: "entra nas listas a partir deste mês, se já foram geradas"
			}
			footer={
				<>
					{item ? (
						<Button
							variant="danger"
							className="mr-auto"
							onClick={async () => {
								if (
									!confirm(
										`Tirar ${item.name} do plano a partir de ${applyFrom}? Meses pagos ficam.`,
									)
								)
									return;
								await remove.mutateAsync({ id: item.id, applyFrom });
								toast.success(`${item.name} retirado do plano`);
								onClose();
							}}
						>
							Apagar
						</Button>
					) : null}
					<Button onClick={onClose}>Cancelar</Button>
					<Button
						variant="primary"
						disabled={!valid || add.isPending || update.isPending}
						onClick={save}
					>
						Guardar
					</Button>
				</>
			}
		>
			<div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
				<Field label="Nome">
					<TextInput
						autoFocus
						value={name}
						onChange={(e) => setName(e.target.value)}
						placeholder="Ex.: Escola de Sarita"
					/>
				</Field>
				<Field label="Valor por mês (MZN)">
					<MoneyInput
						value={amount}
						onChange={(e) => setAmount(e.target.value)}
					/>
				</Field>
				<Field label="Grupo">
					<Select
						value={group}
						onChange={(e) => setGroup(e.target.value as BudgetGroup)}
					>
						{BUDGET_GROUPS.map((g) => (
							<option key={g} value={g}>
								{GROUP_LABEL[g]}
							</option>
						))}
					</Select>
				</Field>
				<Field
					label="Categoria"
					hint="transacções desta categoria contam para o item"
				>
					<Select
						value={categoryId}
						onChange={(e) => setCategoryId(e.target.value)}
					>
						<option value="">Sem categoria</option>
						<CategoryOptions categories={categories} kind="expense" />
					</Select>
				</Field>
				<Field label="Frequência">
					<Select
						value={frequency}
						onChange={(e) => {
							setFrequency(e.target.value as Frequency);
							setMonths([]);
						}}
					>
						{(Object.keys(FREQ_LABEL) as Frequency[]).map((f) => (
							<option key={f} value={f}>
								{FREQ_LABEL[f]}
							</option>
						))}
					</Select>
				</Field>
				<Field label="Conta por defeito">
					<Select
						value={accountId}
						onChange={(e) => setAccountId(e.target.value)}
					>
						<option value="">Escolher ao marcar</option>
						{accounts.map((a) => (
							<option key={a.id} value={a.id}>
								{a.name}
							</option>
						))}
					</Select>
				</Field>
			</div>
			{frequency !== "monthly" ? (
				<fieldset className="flex flex-wrap gap-1 border-0 p-0">
					<legend className="sr-only">Meses</legend>
					{MONTH_SHORT.map((label, i) => {
						const on = months.includes(i + 1);
						return (
							<button
								key={label}
								type="button"
								aria-pressed={on}
								onClick={() => toggleMonth(i + 1)}
								className={`num h-7 w-11 cursor-pointer rounded-md border text-xs ${on ? "border-money-line bg-money-bg text-money-2" : "border-line-strong bg-canvas text-fg-2"}`}
							>
								{label}
							</button>
						);
					})}
				</fieldset>
			) : null}
			<div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
				<Field
					label="Conta destino (poupança)"
					hint="se escolher, pagar o item é uma transferência"
				>
					<Select
						value={toAccountId}
						onChange={(e) => setToAccountId(e.target.value)}
					>
						<option value="">Nenhuma (é uma despesa)</option>
						{accounts
							.filter((a) => a.id !== accountId)
							.map((a) => (
								<option key={a.id} value={a.id}>
									{a.name}
								</option>
							))}
					</Select>
				</Field>
				<div className="flex flex-col gap-2">
					<Check checked={partial} onChange={setPartial}>
						Gasta-se aos poucos (vários lançamentos)
					</Check>
					{partial ? (
						<Field label="Lançamento rápido (MZN)">
							<MoneyInput
								value={step}
								onChange={(e) => setStep(e.target.value)}
								placeholder="100"
							/>
						</Field>
					) : null}
				</div>
			</div>
			{item ? (
				<Field label="Aplicar a partir de">
					<Select
						value={applyFrom}
						onChange={(e) => setApplyFrom(e.target.value)}
					>
						{MONTH_SHORT.map((label, i) => {
							const m = `${year}-${String(i + 1).padStart(2, "0")}`;
							return (
								<option key={m} value={m}>
									{label} {year}
									{m === now ? " (este mês)" : ""}
								</option>
							);
						})}
					</Select>
				</Field>
			) : null}
			{!item ? null : (
				<Link to="/orcamento" search={{ mes: applyFrom }} className="text-xs">
					ver a lista de {applyFrom}
				</Link>
			)}
		</Dialog>
	);
}
