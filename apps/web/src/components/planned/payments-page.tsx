import { getRouteApi } from "@tanstack/react-router";
import {
	addDays,
	type PlannedOccurrence,
	type PlannedPayment,
	todayIso,
} from "@wallet/shared";
import { Button } from "@wallet/ui/components/button";
import { Skeleton } from "@wallet/ui/components/skeleton";
import { PlusIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useAccounts } from "@/actions/accounts/use-accounts";
import { useCategories } from "@/actions/categories/use-categories";
import { useConfirmPlannedPayment } from "@/actions/planned/use-confirm-planned-payment";
import { usePlannedOccurrences } from "@/actions/planned/use-planned-occurrences";
import { usePlannedPayments } from "@/actions/planned/use-planned-payments";
import { useUndoPlannedPayment } from "@/actions/planned/use-undo-planned-payment";
import { OccurrenceRow } from "@/components/planned/occurrence-row";
import { PaymentDetail } from "@/components/planned/payment-detail";
import { PaymentDialog } from "@/components/planned/payment-dialog";
import {
	GROUP_LABEL,
	type GroupKey,
	groupOf,
	isOpen,
} from "@/components/planned/utils";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorNote } from "@/components/ui/error-note";
import { Page } from "@/components/ui/page";
import { PageHeader } from "@/components/ui/page-header";
import { PageTitle } from "@/components/ui/page-title";
import { Segmented } from "@/components/ui/segmented";
import { Stat } from "@/components/ui/stat";
import { StatRow } from "@/components/ui/stat-row";
import { money } from "@/utils/format";

const route = getRouteApi("/_private/payments");

export const PAYMENT_TABS = ["next", "overdue", "done", "all"] as const;
export type PaymentTab = (typeof PAYMENT_TABS)[number];

const GROUP_ORDER: GroupKey[] = [
	"overdue",
	"due",
	"month",
	"later",
	"paid",
	"skipped",
];

const count = (n: number, one: string, many: string) =>
	`${n} ${n === 1 ? one : many}`;

export function PaymentsPage() {
	const { id, tab = "next" } = route.useSearch();
	const navigate = route.useNavigate();
	const [today] = useState(todayIso);
	const [range] = useState(() => ({
		from: addDays(today, -90),
		to: addDays(today, 62),
		today,
	}));
	const payments = usePlannedPayments();
	const occurrences = usePlannedOccurrences(range);
	const accounts = useAccounts(true).data ?? [];
	const categories = useCategories().data ?? [];
	const confirm = useConfirmPlannedPayment();
	const undo = useUndoPlannedPayment();
	const [editing, setEditing] = useState<
		{ kind: "new" } | { kind: "edit"; payment: PlannedPayment } | null
	>(null);

	const month = today.slice(0, 7);
	const all = occurrences.data ?? [];
	const list = payments.data ?? [];
	const go = (search: { id?: string; tab?: PaymentTab }) =>
		navigate({ search: { id, tab, ...search } });

	const accountName = (accountId: string | null) =>
		accounts.find((a) => a.id === accountId)?.name ?? "—";
	const categoryName = (categoryId: string | null) => {
		const c = categories.find((x) => x.id === categoryId);
		const parent = categories.find((x) => x.id === c?.parentId);
		return c ? (parent ? `${parent.name} › ${c.name}` : c.name) : null;
	};
	const routeOf = (o: {
		accountId: string | null;
		toAccountId: string | null;
		categoryId: string | null;
		kind: string;
	}) =>
		o.kind === "transfer"
			? `${accountName(o.accountId)} → ${accountName(o.toAccountId)}`
			: [accountName(o.accountId), categoryName(o.categoryId)]
					.filter(Boolean)
					.join(" · ");

	const sum = (xs: PlannedOccurrence[]) =>
		xs.reduce((s, o) => s + (o.paidAmount ?? o.amount), 0);
	const overdue = all.filter((o) => o.status === "overdue");
	const due = all.filter((o) => o.status === "due");
	const leftThisMonth = all.filter(
		(o) => isOpen(o) && o.dueDate.startsWith(month),
	);
	const paidThisMonth = all.filter(
		(o) => o.status === "paid" && o.dueDate.startsWith(month),
	);
	const open = all.filter(isOpen);
	const done = all.filter((o) => !isOpen(o));

	const shown =
		tab === "next"
			? open
			: tab === "overdue"
				? overdue
				: tab === "done"
					? [...done].reverse()
					: all;
	const groups = GROUP_ORDER.map((key) => ({
		key,
		items: shown.filter((o) => groupOf(o, month) === key),
	})).filter((g) => g.items.length);

	const selected = list.find((p) => p.id === id);

	async function confirmOne(o: PlannedOccurrence) {
		const paid = await confirm.mutateAsync({
			id: o.paymentId,
			dueDate: o.dueDate,
		});
		toast.success(
			`${o.name} · ${money(paid.paidAmount ?? o.amount)} MZN registado em ${accountName(paid.paidAccountId)}`,
			{
				action: {
					label: "Desfazer",
					onClick: () => undo.mutate({ id: o.paymentId, dueDate: o.dueDate }),
				},
			},
		);
	}

	const newButton = (
		<Button variant="primary" onClick={() => setEditing({ kind: "new" })}>
			<PlusIcon className="size-3.5" strokeWidth={2.6} /> Novo pagamento
		</Button>
	);

	return (
		<>
			<PageHeader crumb={["pagamentos"]}>{newButton}</PageHeader>
			<Page>
				<PageTitle
					title="Pagamentos planeados"
					meta="renda, escola, Xitique e o que se repete · confirmar cria a transacção e marca o item da lista do mês"
				/>
				{payments.error ? <ErrorNote error={payments.error} /> : null}
				{occurrences.error ? <ErrorNote error={occurrences.error} /> : null}

				{payments.isPending || occurrences.isPending ? (
					<Skeleton className="h-64" />
				) : list.length === 0 ? (
					<EmptyState title="Sem pagamentos planeados" actions={newButton}>
						Regista o que pagas todos os meses ou todos os anos: renda,
						propinas, internet, seguro. O Estique / Xitique entra como
						transferência mensal para a conta Xitique (Poupança).
					</EmptyState>
				) : (
					<>
						<StatRow>
							<Stat
								label="Atrasados"
								value={money(sum(overdue))}
								note={`${count(overdue.length, "pagamento", "pagamentos")} · confirma ou salta`}
								tone={overdue.length ? "warn" : "dim"}
							/>
							<Stat
								label="Próximos 7 dias"
								value={money(sum(due))}
								note={count(due.length, "pagamento", "pagamentos")}
								tone={due.length ? undefined : "dim"}
							/>
							<Stat
								label="Falta este mês"
								value={money(sum(leftThisMonth))}
								note={count(
									leftThisMonth.length,
									"por confirmar",
									"por confirmar",
								)}
							/>
							<Stat
								label="Pagos este mês"
								value={money(sum(paidThisMonth))}
								note={`${paidThisMonth.length} de ${paidThisMonth.length + leftThisMonth.length} confirmados`}
								tone={paidThisMonth.length ? "ok" : "dim"}
							/>
						</StatRow>

						<div className="flex flex-wrap items-start gap-[18px]">
							<section
								aria-label="Lista de pagamentos"
								className="flex min-w-0 flex-[3_1_520px] flex-col gap-2.5"
							>
								<Segmented
									value={tab}
									onChange={(next) => go({ tab: next })}
									options={[
										{ value: "next", label: `Próximos · ${open.length}` },
										{
											value: "overdue",
											label: `Atrasados · ${overdue.length}`,
										},
										{ value: "done", label: `Pagos · ${done.length}` },
										{ value: "all", label: `Todos · ${all.length}` },
									]}
								/>
								<Card className="overflow-hidden">
									{groups.length === 0 ? (
										<p className="text-dim px-3.5 py-9 text-center">
											{tab === "overdue"
												? "Nada atrasado."
												: "Nada aqui nos próximos dois meses."}
										</p>
									) : null}
									{groups.map((g) => (
										<div key={g.key}>
											<div className="border-line bg-panel-2 flex items-center justify-between border-b px-3.5 py-1.5">
												<h2
													className={
														g.key === "overdue"
															? "num text-danger text-[11px] font-semibold tracking-[.06em] uppercase"
															: "num text-dim text-[11px] font-semibold tracking-[.06em] uppercase"
													}
												>
													{GROUP_LABEL[g.key]}
												</h2>
												<span className="num text-dim text-xs">
													{money(sum(g.items))} MZN
												</span>
											</div>
											{g.items.map((o) => (
												<OccurrenceRow
													key={`${o.paymentId}|${o.dueDate}`}
													occurrence={o}
													route={routeOf(o)}
													selected={o.paymentId === id}
													busy={confirm.isPending || undo.isPending}
													onSelect={() => go({ id: o.paymentId })}
													onConfirm={() => confirmOne(o)}
													onUndo={() =>
														undo.mutate({ id: o.paymentId, dueDate: o.dueDate })
													}
												/>
											))}
										</div>
									))}
								</Card>
							</section>

							{selected ? (
								<PaymentDetail
									payment={selected}
									occurrences={all.filter((o) => o.paymentId === selected.id)}
									route={routeOf(selected)}
									busy={confirm.isPending}
									onConfirm={confirmOne}
									onEdit={() => setEditing({ kind: "edit", payment: selected })}
									onClose={() => go({ id: undefined })}
								/>
							) : null}
						</div>
					</>
				)}
			</Page>

			{editing ? (
				<PaymentDialog
					payment={editing.kind === "edit" ? editing.payment : undefined}
					onClose={() => setEditing(null)}
					onSaved={(savedId) => {
						setEditing(null);
						go({ id: savedId });
					}}
				/>
			) : null}
		</>
	);
}
