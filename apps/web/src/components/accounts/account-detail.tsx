import { Link } from "@tanstack/react-router";
import { ACCOUNT_TYPES, type Account, type AccountType } from "@wallet/shared";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useDeleteAccount } from "@/actions/accounts/use-delete-account";
import { useReconcileAccount } from "@/actions/accounts/use-reconcile-account";
import { useUpdateAccount } from "@/actions/accounts/use-update-account";
import { useCategories } from "@/actions/categories/use-categories";
import { useTransactionPages } from "@/actions/transactions/use-transaction-pages";
import { initials } from "@/components/accounts/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { MoneyInput } from "@/components/ui/money-input";
import { Select } from "@/components/ui/select";
import { Swatch } from "@/components/ui/swatch";
import { TextInput } from "@/components/ui/text-input";
import { useNewTransaction } from "@/contexts/new-transaction-context";
import {
	ACCOUNT_TYPE_LABEL,
	dayKey,
	dayLabel,
	money,
	moneyInput,
	parseMoney,
	signedMoney,
} from "@/utils/format";

export function AccountDetail({
	account,
	onDeleted,
}: {
	account: Account;
	onDeleted: () => void;
}) {
	const update = useUpdateAccount();
	const reconcile = useReconcileAccount();
	const remove = useDeleteAccount();
	const openNew = useNewTransaction();
	const categories = useCategories().data ?? [];
	const recent = useTransactionPages({ accountId: [account.id] }, 8);
	const items = recent.data?.pages[0]?.items ?? [];
	const [name, setName] = useState(account.name);
	const [type, setType] = useState(account.type);
	const [balance, setBalance] = useState(moneyInput(account.balance));
	useEffect(() => setBalance(moneyInput(account.balance)), [account.balance]);
	const balanceCents = parseMoney(balance);
	const categoryName = (id: string | null) =>
		categories.find((c) => c.id === id)?.name ?? "Sem categoria";

	return (
		<Card className="min-w-0 flex-[1_1_340px] overflow-hidden">
			<div className="border-line flex items-center gap-3 border-b px-4 py-3.5">
				<Swatch
					color={account.color}
					label={initials(account.name)}
					className="size-9"
				/>
				<div className="flex min-w-0 flex-1 flex-col">
					<h2 className="text-[17px] font-semibold">{account.name}</h2>
					<span className="num text-dim text-[11px]">
						{ACCOUNT_TYPE_LABEL[account.type]} · saldo inicial{" "}
						{money(account.initialBalance)}
					</span>
				</div>
				<span
					className={`num text-xl ${account.balance < 0 ? "text-warn" : ""}`}
				>
					{money(account.balance)}
				</span>
			</div>

			<div className="flex flex-col gap-3.5 p-4">
				<form
					className="grid grid-cols-[1fr_auto] items-end gap-2"
					onSubmit={async (e) => {
						e.preventDefault();
						if (balanceCents === null) return;
						await reconcile.mutateAsync({
							id: account.id,
							balance: balanceCents,
						});
						toast.success(
							`Saldo de ${account.name} acertado para ${money(balanceCents)} MZN`,
						);
					}}
				>
					<Field label="Saldo real hoje (MZN) · cria um acerto pela diferença">
						<MoneyInput
							value={balance}
							onChange={(e) => setBalance(e.target.value)}
						/>
					</Field>
					<Button
						type="submit"
						disabled={
							balanceCents === null ||
							balanceCents === account.balance ||
							reconcile.isPending
						}
					>
						Acertar
					</Button>
				</form>

				<form
					className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
					onSubmit={async (e) => {
						e.preventDefault();
						await update.mutateAsync({
							id: account.id,
							name: name.trim(),
							type,
						});
						toast.success("Conta actualizada");
					}}
				>
					<Field label="Nome">
						<TextInput value={name} onChange={(e) => setName(e.target.value)} />
					</Field>
					<Field label="Tipo">
						<Select
							value={type}
							onChange={(e) => setType(e.target.value as AccountType)}
						>
							{ACCOUNT_TYPES.map((t) => (
								<option key={t} value={t}>
									{ACCOUNT_TYPE_LABEL[t]}
								</option>
							))}
						</Select>
					</Field>
					<Button
						type="submit"
						disabled={
							!name.trim() || (name === account.name && type === account.type)
						}
					>
						Guardar
					</Button>
				</form>

				<div className="border-line overflow-hidden rounded-lg border">
					<div className="border-line bg-panel-2 flex items-center justify-between border-b px-3 py-2">
						<h3 className="text-sm font-semibold">Movimentos recentes</h3>
						<Link
							to="/transactions"
							search={{ account: account.id }}
							className="text-xs"
						>
							ver todos
						</Link>
					</div>
					{items.length === 0 ? (
						<p className="text-dim px-3 py-4 text-center">Sem movimentos.</p>
					) : (
						items.map((t) => (
							<div
								key={t.id}
								className="border-hover flex items-center gap-3 border-b px-3 py-2 text-xs last:border-0"
							>
								<span className="num text-dim w-24">
									{dayLabel(dayKey(t.occurredAt))}
								</span>
								<span className="min-w-0 flex-1 truncate">
									{t.type === "transfer"
										? "Transferência"
										: t.type === "adjustment"
											? "Acerto de saldo"
											: categoryName(t.categoryId)}
								</span>
								<span className={`num ${t.amount > 0 ? "text-money" : ""}`}>
									{signedMoney(t.amount)}
								</span>
							</div>
						))
					)}
				</div>

				<div className="flex flex-wrap gap-2">
					<Button onClick={() => openNew({ accountId: account.id })}>
						Nova transacção nesta conta
					</Button>
					<Button
						variant="ghost"
						onClick={async () => {
							await update.mutateAsync({
								id: account.id,
								archived: !account.archived,
							});
							toast.success(
								account.archived ? "Conta reactivada" : "Conta arquivada",
							);
						}}
					>
						{account.archived ? "Reactivar" : "Arquivar"}
					</Button>
					<Button
						variant="danger"
						className="ml-auto"
						disabled={account.transactionCount > 0}
						title={
							account.transactionCount > 0
								? "Tem transacções: arquive em vez de apagar"
								: undefined
						}
						onClick={async () => {
							if (!confirm(`Apagar a conta ${account.name}?`)) return;
							await remove.mutateAsync(account.id);
							toast.success("Conta apagada");
							onDeleted();
						}}
					>
						Apagar
					</Button>
				</div>
			</div>
		</Card>
	);
}
