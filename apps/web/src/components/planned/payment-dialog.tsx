import {
	addDays,
	dueDates,
	type PlannedFrequency,
	type PlannedKind,
	type PlannedPayment,
	todayIso,
} from "@wallet/shared";
import { Button } from "@wallet/ui/components/button";
import { Input } from "@wallet/ui/components/input";
import { useState } from "react";
import { useAccounts } from "@/actions/accounts/use-accounts";
import { useCategories } from "@/actions/categories/use-categories";
import { usePlan } from "@/actions/plan/use-plan";
import { useCreatePlannedPayment } from "@/actions/planned/use-create-planned-payment";
import { useUpdatePlannedPayment } from "@/actions/planned/use-update-planned-payment";
import {
	dateLabel,
	FREQUENCY_LABEL,
	REMIND_LABEL,
} from "@/components/planned/utils";
import { DatePicker } from "@/components/ui/date-picker";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { MoneyInput } from "@/components/ui/money-input";
import { Segmented } from "@/components/ui/segmented";
import { Select } from "@/components/ui/select";
import { money, moneyInput, parseMoney } from "@/utils/format";

const FORM_ID = "planned-payment-form";

const REMINDERS = [
	{ value: "0", label: "No dia" },
	{ value: "1", label: "1 dia antes" },
	{ value: "3", label: "3 dias antes" },
	{ value: "none", label: "Sem" },
] as const;

export function PaymentDialog({
	payment,
	onClose,
	onSaved,
}: {
	payment?: PlannedPayment;
	onClose: () => void;
	onSaved: (id: string) => void;
}) {
	const create = useCreatePlannedPayment();
	const update = useUpdatePlannedPayment();
	const accounts = (useAccounts().data ?? []).filter((a) => !a.archived);
	const categories = (useCategories().data ?? []).filter(
		(c) => c.kind === "expense" && !c.archived && !c.isSystem,
	);
	const [kind, setKind] = useState<PlannedKind>(payment?.kind ?? "expense");
	const [name, setName] = useState(payment?.name ?? "");
	const [amount, setAmount] = useState(
		payment ? moneyInput(payment.amount) : "",
	);
	const [startDate, setStartDate] = useState(
		payment?.startDate ?? addDays(todayIso(), 1),
	);
	const [accountId, setAccountId] = useState(payment?.accountId ?? "");
	const [toAccountId, setToAccountId] = useState(payment?.toAccountId ?? "");
	const [categoryId, setCategoryId] = useState(payment?.categoryId ?? "");
	const [frequency, setFrequency] = useState<PlannedFrequency>(
		payment?.frequency ?? "monthly",
	);
	const [remind, setRemind] = useState(
		payment
			? payment.remindDays === null
				? "none"
				: String(payment.remindDays)
			: "1",
	);
	const [planItemId, setPlanItemId] = useState(payment?.planItemId ?? "");
	const year = Number(startDate.slice(0, 4));
	const planItems = usePlan(year).data?.items ?? [];

	const cents = parseMoney(amount);
	const account = accountId || accounts[0]?.id || "";
	const xitique = accounts.find((a) => /xitique|estique/i.test(a.name));
	const transfer = kind === "transfer";
	const busy = create.isPending || update.isPending;
	const canSubmit =
		!!name.trim() &&
		cents !== null &&
		cents > 0 &&
		!!account &&
		(!transfer || (!!toAccountId && toAccountId !== account)) &&
		!busy;

	const next = dueDates(
		{ frequency, startDate },
		startDate,
		addDays(startDate, 800),
	).slice(0, 4);
	const perYear = frequency === "monthly" ? 12 : 1;
	const accountName = (id: string) => accounts.find((a) => a.id === id)?.name;
	const categoryName = (id: string) => {
		const c = categories.find((x) => x.id === id);
		const parent = categories.find((x) => x.id === c?.parentId);
		return c ? (parent ? `${parent.name} › ${c.name}` : c.name) : undefined;
	};
	const planItem = planItems.find((i) => i.id === planItemId);

	function pickPlanItem(id: string) {
		setPlanItemId(id);
		const item = planItems.find((i) => i.id === id);
		if (!item) return;
		if (!name.trim()) setName(item.name);
		if (!amount.trim()) setAmount(moneyInput(item.amount));
		if (item.toAccountId) {
			setKind("transfer");
			setToAccountId(item.toAccountId);
		} else if (item.categoryId && !categoryId) setCategoryId(item.categoryId);
		if (item.accountId && !accountId) setAccountId(item.accountId);
	}

	function applyXitique() {
		if (!xitique) return;
		setKind("transfer");
		setToAccountId(xitique.id);
		if (!name.trim()) setName("Estique / Xitique");
	}

	const summary = transfer
		? `Ao confirmar: transferência de ${money(cents ?? 0)} MZN de ${accountName(account) ?? "—"} para ${accountName(toAccountId) ?? "—"}.`
		: `Ao confirmar: despesa de ${money(cents ?? 0)} MZN em ${accountName(account) ?? "—"}${categoryId ? `, categoria ${categoryName(categoryId)}` : ""}.`;

	return (
		<Dialog
			open
			onOpenChange={(open) => {
				if (!open) onClose();
			}}
			title={payment ? "Editar pagamento planeado" : "Novo pagamento planeado"}
			description="aparece em Pagamentos · confirmar cria a transacção"
			width={600}
			footer={
				<>
					<Button variant="neutral" onClick={onClose}>
						Cancelar
					</Button>
					<Button
						type="submit"
						form={FORM_ID}
						variant="primary"
						disabled={!canSubmit}
					>
						{payment ? "Guardar" : "Criar pagamento"}
					</Button>
				</>
			}
		>
			<form
				id={FORM_ID}
				className="flex flex-col gap-3.5"
				onSubmit={async (e) => {
					e.preventDefault();
					if (!canSubmit || cents === null) return;
					const body = {
						name: name.trim(),
						kind,
						amount: cents,
						accountId: account,
						toAccountId: transfer ? toAccountId : null,
						categoryId: transfer ? null : categoryId || null,
						frequency,
						startDate,
						remindDays: remind === "none" ? null : Number(remind),
						planItemId: planItemId || null,
					};
					const saved = payment
						? await update.mutateAsync({ id: payment.id, ...body })
						: await create.mutateAsync(body);
					onSaved(saved.id);
				}}
			>
				<div className="flex flex-wrap items-center gap-2">
					<Segmented
						className="flex-1"
						value={kind}
						onChange={setKind}
						options={[
							{ value: "expense", label: "Despesa" },
							{ value: "transfer", label: "Transferência" },
						]}
					/>
					{xitique && !payment ? (
						<Button size="sm" variant="neutral" onClick={applyXitique}>
							Xitique mensal
						</Button>
					) : null}
				</div>

				<Field label="Nome">
					<Input
						autoFocus
						placeholder={transfer ? "Estique / Xitique" : "Renda da casa"}
						value={name}
						onChange={(e) => setName(e.target.value)}
					/>
				</Field>

				<div className="grid gap-3 sm:grid-cols-2">
					<Field label="Valor (MZN)">
						<MoneyInput
							large
							value={amount}
							onChange={(e) => setAmount(e.target.value)}
						/>
					</Field>
					<Field label={payment ? "Data de referência" : "Primeira data"}>
						<DatePicker value={startDate} onChange={setStartDate} />
					</Field>
				</div>

				<div className="grid gap-3 sm:grid-cols-2">
					<Field label="Sai da conta">
						<Select
							value={account}
							onValueChange={setAccountId}
							items={accounts.map((a) => ({
								value: a.id,
								label: `${a.name} · ${money(a.balance)}`,
							}))}
							placeholder="Escolher conta"
						/>
					</Field>
					{transfer ? (
						<Field label="Entra na conta">
							<Select
								value={toAccountId}
								onValueChange={setToAccountId}
								items={accounts
									.filter((a) => a.id !== account)
									.map((a) => ({
										value: a.id,
										label: `${a.name} · ${money(a.balance)}`,
									}))}
								placeholder="Escolher conta"
							/>
						</Field>
					) : (
						<Field label="Categoria">
							<Select
								value={categoryId}
								onValueChange={setCategoryId}
								items={[
									{ value: "", label: "Sem categoria" },
									...categories.map((c) => ({
										value: c.id,
										label: categoryName(c.id) ?? c.name,
									})),
								]}
							/>
						</Field>
					)}
				</div>

				<Field label="Frequência">
					<Segmented
						value={frequency}
						onChange={setFrequency}
						options={(["once", "monthly", "yearly"] as const).map((f) => ({
							value: f,
							label: FREQUENCY_LABEL[f].replace(/^./, (c) => c.toUpperCase()),
						}))}
					/>
				</Field>

				<Field
					label="Lembrete"
					hint={REMIND_LABEL(remind === "none" ? null : Number(remind))}
				>
					<Segmented
						value={remind}
						onChange={setRemind}
						options={REMINDERS.map((r) => ({ value: r.value, label: r.label }))}
					/>
				</Field>

				<Field
					label={`Item do plano anual ${year}`}
					hint={
						planItem
							? `confirmar marca «${planItem.name}» na lista do mês do vencimento`
							: "opcional · liga cada confirmação à lista do mês"
					}
				>
					<Select
						value={planItemId}
						onValueChange={pickPlanItem}
						items={[
							{ value: "", label: "Nenhum" },
							...planItems.map((i) => ({
								value: i.id,
								label: `${i.name} · ${money(i.amount)}`,
							})),
						]}
					/>
				</Field>

				<div className="bg-panel-2 border-line text-fg-2 rounded-control border px-3 py-2.5 text-xs leading-relaxed">
					{summary}
					{next.length ? (
						<span className="num text-dim mt-1.5 block text-[11px]">
							{next.map((d) => dateLabel(d)).join(" · ")}
							{frequency === "once"
								? ""
								: ` · ${money((cents ?? 0) * perYear)} MZN por ano`}
						</span>
					) : null}
				</div>
			</form>
		</Dialog>
	);
}
