import { createFileRoute, Link } from "@tanstack/react-router";
import {
	BUDGET_GROUPS,
	type BudgetGroup,
	isYearMonth,
	type MonthItem,
	parseYearMonth,
} from "@wallet/shared";
import {
	ChevronLeftIcon,
	ChevronRightIcon,
	PlusIcon,
	Trash2Icon,
} from "lucide-react";
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
	ErrorNote,
	Field,
	MoneyInput,
	Page,
	PageHeader,
	PageTitle,
	ProgressBar,
	Select,
	Skeleton,
	Stat,
	StatRow,
	StatusPill,
	TextInput,
} from "@/components/kit";
import {
	addMonths,
	currentMonth,
	GROUP_LABEL,
	instantOf,
	money,
	moneyInput,
	monthLabel,
	parseMoney,
	shortMonth,
	todayInput,
} from "@/lib/format";
import {
	useAccounts,
	useAddMonthItem,
	useCategories,
	useCreatePlan,
	useDeleteMonthItem,
	useGeneratePlan,
	useMonthBudget,
	usePayMonthItem,
	usePlans,
	useUnpayMonthItem,
	useUpdateMonthItem,
} from "@/lib/queries";

export const Route = createFileRoute("/_auth/orcamento")({
	validateSearch: z.object({ mes: z.string().refine(isYearMonth).optional() }),
	component: BudgetPage,
});

function BudgetPage() {
	const { mes } = Route.useSearch();
	const month = mes ?? currentMonth();
	const navigate = Route.useNavigate();
	const budget = useMonthBudget(month);
	const accounts = useAccounts().data ?? [];
	const categories = useCategories().data ?? [];
	const [paying, setPaying] = useState<MonthItem | null>(null);
	const [editing, setEditing] = useState<MonthItem | null>(null);
	const unpay = useUnpayMonthItem();
	const pay = usePayMonthItem();
	const go = (delta: number) =>
		navigate({ search: { mes: addMonths(month, delta) } });
	const data = budget.data;
	const accountName = (id: string | null) =>
		accounts.find((a) => a.id === id)?.name ?? "sem conta";
	const categoryName = (id: string | null) =>
		categories.find((c) => c.id === id)?.name ?? "sem categoria";

	return (
		<>
			<PageHeader crumb={["orçamento", month]}>
				<div className="flex gap-1">
					<Button
						aria-label="Mês anterior"
						className="w-[30px] px-0"
						onClick={() => go(-1)}
					>
						<ChevronLeftIcon className="size-4" />
					</Button>
					<Button
						aria-label="Mês seguinte"
						className="w-[30px] px-0"
						onClick={() => go(1)}
					>
						<ChevronRightIcon className="size-4" />
					</Button>
				</div>
				<div className="num flex gap-1 text-[11px]">
					{[-2, -1, 0, 1, 2].map((d) => {
						const m = addMonths(month, d);
						return (
							<Link
								key={m}
								to="/orcamento"
								search={{ mes: m }}
								className={`rounded-[5px] border px-2 py-1 no-underline ${d === 0 ? "border-line-strong text-fg bg-[#21262D]" : "text-dim hover:text-fg border-transparent"}`}
							>
								{shortMonth(m)}
							</Link>
						);
					})}
				</div>
			</PageHeader>
			<Page>
				<PageTitle
					title={monthLabel(month)}
					meta={
						data
							? data.hasList
								? `${data.items.length} itens · check = transacção`
								: "sem lista"
							: " "
					}
				/>
				{budget.error ? <ErrorNote error={budget.error} /> : null}
				{!data ? (
					<Skeleton className="h-96" />
				) : (
					<>
						<StatRow>
							<Stat
								label="Salário previsto"
								value={money(data.expectedIncome)}
								note={
									data.income
										? `recebido ${money(data.income)}`
										: "nada recebido ainda"
								}
							/>
							<Stat
								label="Planeado"
								value={data.hasList ? money(data.totals.planned) : "—"}
								tone={data.hasList ? undefined : "dim"}
								note={
									data.totals.unplanned
										? `${money(data.totals.unplanned)} não planeado`
										: undefined
								}
							/>
							<Stat
								label="Gasto"
								value={data.hasList ? money(data.totals.spent) : "—"}
								tone={data.hasList ? undefined : "dim"}
								note={
									data.totals.unassignedSpent
										? `+ ${money(data.totals.unassignedSpent)} fora da lista`
										: undefined
								}
							/>
							<Stat
								label="Falta gastar"
								value={data.hasList ? money(data.totals.remaining) : "—"}
								tone={data.hasList ? undefined : "dim"}
							/>
							<Stat
								label="Sobra do salário"
								value={data.hasList ? money(data.totals.leftover) : "—"}
								tone={
									!data.hasList
										? "dim"
										: data.totals.leftover < 0
											? "warn"
											: "ok"
								}
								note="previsto − planeado"
							/>
						</StatRow>

						{data.hasList ? (
							<>
								{BUDGET_GROUPS.map((group) => {
									const items = data.items.filter((i) => i.group === group);
									if (items.length === 0) return null;
									return (
										<GroupCard
											key={group}
											group={group}
											items={items}
											accountName={accountName}
											categoryName={categoryName}
											onCheck={(item) => setPaying(item)}
											onUncheck={async (item) => {
												if (
													!confirm(
														`Desmarcar ${item.name}? ${item.payments.length} pagamento(s) da lista são apagados.`,
													)
												)
													return;
												await unpay.mutateAsync(item.id);
												toast.success(
													`${item.name} desmarcado · transacção apagada`,
												);
											}}
											onLaunch={async (item) => {
												// Without a known account, ask for one instead of failing.
												if (!item.defaultAccountId) return setPaying(item);
												const res = await pay.mutateAsync({ id: item.id });
												toast.success(
													`${item.name} −${money(item.step ?? 0)} · ${accountName(res.payments[0]?.accountId ?? null)}`,
												);
											}}
											onEdit={setEditing}
										/>
									);
								})}
								<UnplannedForm month={month} />
							</>
						) : (
							<NoListState month={month} />
						)}
					</>
				)}
			</Page>
			{paying ? (
				<PayDialog item={paying} onClose={() => setPaying(null)} />
			) : null}
			{editing ? (
				<EditMonthItemDialog item={editing} onClose={() => setEditing(null)} />
			) : null}
		</>
	);
}

function GroupCard({
	group,
	items,
	accountName,
	categoryName,
	onCheck,
	onUncheck,
	onLaunch,
	onEdit,
}: {
	group: BudgetGroup;
	items: MonthItem[];
	accountName: (id: string | null) => string;
	categoryName: (id: string | null) => string;
	onCheck: (item: MonthItem) => void;
	onUncheck: (item: MonthItem) => void;
	onLaunch: (item: MonthItem) => void;
	onEdit: (item: MonthItem) => void;
}) {
	const planned = items.reduce((s, i) => s + i.plannedAmount, 0);
	const spent = items.reduce((s, i) => s + i.spent, 0);
	return (
		<Card className="overflow-hidden">
			<div className="num border-line bg-panel-2 text-fg-2 flex justify-between border-b px-3.5 py-2.5 text-[11px] tracking-[.06em] uppercase">
				<h2 className="font-semibold">{GROUP_LABEL[group]}</h2>
				<span className="text-dim">
					{money(spent)} / {money(planned)}
				</span>
			</div>
			{items.map((item) => {
				const account = accountName(item.defaultAccountId);
				const meta = [
					categoryName(item.categoryId),
					item.toAccountId
						? `${account} → ${accountName(item.toAccountId)}`
						: account,
					item.unplanned
						? "não planeado"
						: item.partial
							? "vários lançamentos"
							: null,
					item.matchedSpent
						? `${money(item.matchedSpent)} registado fora da lista`
						: null,
				]
					.filter(Boolean)
					.join(" · ");
				const done = item.status === "paid" || item.status === "over";
				return (
					<div
						key={item.id}
						className="border-hover flex min-h-12 flex-wrap items-center gap-3 border-b px-3.5 py-2 last:border-0"
					>
						{item.partial ? (
							<span
								className="num border-line-strong text-dim flex size-[18px] items-center justify-center rounded-[5px] border text-[10px]"
								aria-hidden="true"
							>
								≈
							</span>
						) : (
							<button
								type="button"
								aria-pressed={item.checked}
								aria-label={
									item.checked
										? `Desmarcar ${item.name}`
										: `Marcar ${item.name} como pago`
								}
								onClick={() =>
									item.payments.length > 0 ? onUncheck(item) : onCheck(item)
								}
								className={`flex size-[18px] cursor-pointer items-center justify-center rounded-[5px] border-[1.5px] ${item.checked ? "border-money bg-money text-money-ink" : "hover:border-info-2 border-[#6E7681]"}`}
							>
								{item.checked ? (
									<svg
										width="11"
										height="11"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										strokeWidth="4"
										aria-hidden="true"
									>
										<path d="M5 12l5 5L20 7" />
									</svg>
								) : null}
							</button>
						)}
						<button
							type="button"
							className="flex min-w-[180px] flex-1 cursor-pointer flex-col gap-0.5 text-left"
							onClick={() => onEdit(item)}
						>
							<span
								className={
									done && item.status !== "over" ? "text-dim" : "font-medium"
								}
							>
								{item.name}
							</span>
							<span className="num text-dim text-[11px]">{meta}</span>
						</button>
						{item.partial ? (
							<div className="flex w-[200px] flex-col gap-1">
								<ProgressBar
									value={item.spent}
									max={item.plannedAmount}
									over={item.status === "over"}
								/>
								<span className="num text-dim text-[11px]">
									{money(item.spent)} / {money(item.plannedAmount)} · falta{" "}
									{money(item.remaining)}
								</span>
							</div>
						) : (
							<span className="num text-fg-2 w-[200px] text-right text-xs">
								{item.spent ? `${money(item.spent)} / ` : ""}
								{money(item.plannedAmount)}
							</span>
						)}
						<StatusPill status={item.status} />
						{item.partial ? (
							<div className="flex gap-1">
								{item.step ? (
									<Button size="sm" onClick={() => onLaunch(item)}>
										+{money(item.step)}
									</Button>
								) : null}
								<Button size="sm" variant="ghost" onClick={() => onCheck(item)}>
									lançar…
								</Button>
							</div>
						) : null}
					</div>
				);
			})}
		</Card>
	);
}

function PayDialog({
	item,
	onClose,
}: {
	item: MonthItem;
	onClose: () => void;
}) {
	const accounts = useAccounts().data ?? [];
	const pay = usePayMonthItem();
	const suggested = item.partial
		? (item.step ?? item.remaining)
		: item.remaining || item.plannedAmount;
	const [amount, setAmount] = useState(moneyInput(suggested));
	const [accountId, setAccountId] = useState(item.defaultAccountId ?? "");
	const [date, setDate] = useState(todayInput());
	const [note, setNote] = useState("");
	const cents = parseMoney(amount);
	const after = item.spent + (cents ?? 0);
	const destination = accounts.find((a) => a.id === item.toAccountId);

	async function save() {
		if (cents === null || cents <= 0 || !accountId) return;
		await pay.mutateAsync({
			id: item.id,
			amount: cents,
			accountId,
			occurredAt: instantOf(date),
			note: note || null,
		});
		toast.success(
			`${item.name} −${money(cents)} MZN${destination ? ` → ${destination.name}` : ""}`,
		);
		onClose();
	}

	return (
		<Dialog
			open
			onOpenChange={(o) => !o && onClose()}
			width={540}
			title={
				<>
					{item.partial ? "Lançar em" : "Marcar"}{" "}
					<span className="text-money">{item.name}</span>
					{item.partial ? "" : " como pago"}
				</>
			}
			description={`planeado ${money(item.plannedAmount)} · já gasto ${money(item.spent)}`}
			footer={
				<>
					<Button onClick={onClose}>Cancelar</Button>
					<Button
						variant="primary"
						disabled={
							cents === null || cents <= 0 || !accountId || pay.isPending
						}
						onClick={save}
					>
						Confirmar
					</Button>
				</>
			}
		>
			<form
				className="flex flex-col gap-3.5"
				onSubmit={(e) => {
					e.preventDefault();
					save();
				}}
			>
				<Field label="Valor pago (MZN)">
					<MoneyInput
						large
						autoFocus
						value={amount}
						onChange={(e) => setAmount(e.target.value)}
					/>
				</Field>
				<div className="grid grid-cols-2 gap-2.5">
					<Field label={destination ? "Sai de" : "Conta"}>
						<Select
							value={accountId}
							onChange={(e) => setAccountId(e.target.value)}
						>
							<option value="">Escolher conta</option>
							{accounts
								.filter((a) => a.id !== item.toAccountId)
								.map((a) => (
									<option key={a.id} value={a.id}>
										{a.name}
										{a.id === item.defaultAccountId ? " · última usada" : ""}
									</option>
								))}
						</Select>
					</Field>
					<Field label="Data">
						<TextInput
							type="date"
							className="num"
							value={date}
							onChange={(e) => setDate(e.target.value)}
						/>
					</Field>
				</div>
				<Field label="Nota">
					<TextInput
						value={note}
						onChange={(e) => setNote(e.target.value)}
						placeholder="opcional"
					/>
				</Field>
				{cents !== null && cents > 0 ? (
					<div
						className={`rounded-md border px-3 py-2.5 text-xs leading-relaxed ${
							after > item.plannedAmount
								? "border-warn-line bg-[#221608] text-[#F0C9A2]"
								: after < item.plannedAmount
									? "border-info-line bg-info-bg text-[#B6D8FF]"
									: "border-money-line bg-money-bg text-money-2"
						}`}
					>
						{after > item.plannedAmount
							? `Acima do planeado em ${money(after - item.plannedAmount)} MZN. Conta como gasto extra do mês.`
							: after < item.plannedAmount
								? `Abaixo do planeado: faltam ${money(item.plannedAmount - after)} MZN. O item fica parcial e aceita mais lançamentos.`
								: "Fica pago."}
						{destination
							? ` É uma transferência para ${destination.name}.`
							: ""}
					</div>
				) : null}
			</form>
		</Dialog>
	);
}

function EditMonthItemDialog({
	item,
	onClose,
}: {
	item: MonthItem;
	onClose: () => void;
}) {
	const update = useUpdateMonthItem();
	const remove = useDeleteMonthItem();
	const [planned, setPlanned] = useState(moneyInput(item.plannedAmount));
	const [name, setName] = useState(item.name);
	const cents = parseMoney(planned);
	return (
		<Dialog
			open
			onOpenChange={(o) => !o && onClose()}
			title={`Editar ${item.name}`}
			description="muda só este mês; o plano anual fica igual"
			footer={
				<>
					{item.payments.length === 0 ? (
						<Button
							variant="danger"
							className="mr-auto"
							onClick={async () => {
								await remove.mutateAsync(item.id);
								toast.success(
									`${item.name} removido de ${monthLabel(item.month)}`,
								);
								onClose();
							}}
						>
							<Trash2Icon className="size-3.5" /> Remover do mês
						</Button>
					) : null}
					<Button onClick={onClose}>Cancelar</Button>
					<Button
						variant="primary"
						disabled={cents === null || cents <= 0 || !name.trim()}
						onClick={async () => {
							if (cents === null) return;
							await update.mutateAsync({
								id: item.id,
								plannedAmount: cents,
								name: name.trim(),
							});
							onClose();
						}}
					>
						Guardar
					</Button>
				</>
			}
		>
			<Field label="Nome">
				<TextInput value={name} onChange={(e) => setName(e.target.value)} />
			</Field>
			<Field label="Planeado neste mês (MZN)">
				<MoneyInput
					value={planned}
					onChange={(e) => setPlanned(e.target.value)}
				/>
			</Field>
			{item.payments.length > 0 ? (
				<div className="flex flex-col gap-1">
					<span className="text-fg-2 text-xs">Pagamentos da lista</span>
					{item.payments.map((p) => (
						<span key={p.transactionId} className="num text-dim text-xs">
							{p.occurredAt.slice(0, 10)} · −{money(p.amount)}
							{p.note ? ` · ${p.note}` : ""}
						</span>
					))}
				</div>
			) : null}
		</Dialog>
	);
}

function UnplannedForm({ month }: { month: string }) {
	const add = useAddMonthItem();
	const categories = useCategories().data ?? [];
	const accounts = useAccounts().data ?? [];
	const [name, setName] = useState("");
	const [amount, setAmount] = useState("");
	const [categoryId, setCategoryId] = useState("");
	const [accountId, setAccountId] = useState("");
	const cents = parseMoney(amount);
	return (
		<Card>
			<CardHeader
				title="Item não planeado"
				meta="presente, imprevisto… conta no total do mês"
			/>
			<form
				className="grid grid-cols-1 gap-2.5 p-3.5 sm:grid-cols-[2fr_1fr_1.5fr_1.5fr_auto] sm:items-end"
				onSubmit={async (e) => {
					e.preventDefault();
					if (!name.trim() || cents === null || cents <= 0) return;
					await add.mutateAsync({
						month,
						name: name.trim(),
						amount: cents,
						categoryId: categoryId || null,
						accountId: accountId || null,
					});
					setName("");
					setAmount("");
					toast.success(`${name} adicionado a ${monthLabel(month)}`);
				}}
			>
				<Field label="Nome">
					<TextInput
						value={name}
						onChange={(e) => setName(e.target.value)}
						placeholder="Ex.: Presente Mito"
					/>
				</Field>
				<Field label="Valor (MZN)">
					<MoneyInput
						value={amount}
						onChange={(e) => setAmount(e.target.value)}
					/>
				</Field>
				<Field label="Categoria">
					<Select
						value={categoryId}
						onChange={(e) => setCategoryId(e.target.value)}
					>
						<option value="">Sem categoria</option>
						<CategoryOptions categories={categories} kind="expense" />
					</Select>
				</Field>
				<Field label="Conta">
					<Select
						value={accountId}
						onChange={(e) => setAccountId(e.target.value)}
					>
						<option value="">Escolher depois</option>
						{accounts.map((a) => (
							<option key={a.id} value={a.id}>
								{a.name}
							</option>
						))}
					</Select>
				</Field>
				<Button
					type="submit"
					variant="primary"
					disabled={
						!name.trim() || cents === null || cents <= 0 || add.isPending
					}
				>
					<PlusIcon className="size-3.5" strokeWidth={2.6} /> Adicionar
				</Button>
			</form>
		</Card>
	);
}

function NoListState({ month }: { month: string }) {
	const { year } = parseYearMonth(month);
	const plans = usePlans().data ?? [];
	const generate = useGeneratePlan();
	const create = useCreatePlan();
	const plan = plans.find((p) => p.year === year);
	const previous = plans.find((p) => p.year === year - 1);

	if (plan && !plan.generated) {
		return (
			<EmptyState
				title={`O plano de ${year} ainda não tem listas mensais`}
				actions={
					<>
						<Button
							variant="primary"
							disabled={generate.isPending}
							onClick={async () => {
								const res = await generate.mutateAsync(year);
								toast.success(`${res.created} itens criados nos 12 meses`);
							}}
						>
							Gerar 12 listas
						</Button>
						<Link to="/plano" search={{ ano: year }}>
							<Button>Ver plano anual</Button>
						</Link>
					</>
				}
			>
				Gere as listas para cada mês ter a sua checklist.
			</EmptyState>
		);
	}
	if (plan) {
		return (
			<EmptyState
				title={`${monthLabel(month)} não tem itens`}
				actions={
					<Link to="/plano" search={{ ano: year }}>
						<Button>Ver plano anual</Button>
					</Link>
				}
			>
				O plano de {year} não tem itens para este mês. Adicione itens no plano
				anual ou um item não planeado.
			</EmptyState>
		);
	}
	return (
		<EmptyState
			title={`${monthLabel(month)} ainda não tem lista`}
			actions={
				<>
					{previous ? (
						<Button
							variant="primary"
							disabled={create.isPending}
							onClick={async () => {
								await create.mutateAsync({ year, copyFrom: year - 1 });
								toast.success(`Plano de ${year} copiado de ${year - 1}`);
							}}
						>
							Copiar plano de {year - 1}
						</Button>
					) : null}
					<Link to="/plano" search={{ ano: year }}>
						<Button variant={previous ? "secondary" : "primary"}>
							Criar plano {year}
						</Button>
					</Link>
				</>
			}
		>
			As listas mensais vêm do plano anual.{" "}
			{previous
				? `Copie o plano de ${year - 1} (ajusta os valores depois) ou comece um plano novo.`
				: "Comece por criar o plano do ano."}
		</EmptyState>
	);
}
