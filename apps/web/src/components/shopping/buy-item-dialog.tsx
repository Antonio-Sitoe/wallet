import type { ShoppingItem, ShoppingListSummary } from "@wallet/shared";
import { Button } from "@wallet/ui/components/button";
import { useState } from "react";
import { toast } from "sonner";
import { useAccounts } from "@/actions/accounts/use-accounts";
import { useBuyShoppingItem } from "@/actions/shopping/use-buy-shopping-item";
import { itemDetail } from "@/components/shopping/utils";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { MoneyInput } from "@/components/ui/money-input";
import { Select } from "@/components/ui/select";
import { money, moneyInput, parseMoney } from "@/utils/format";

const FORM_ID = "buy-item-form";

export function BuyItemDialog({
	list,
	item,
	onClose,
}: {
	list: ShoppingListSummary;
	item: ShoppingItem;
	onClose: () => void;
}) {
	const buy = useBuyShoppingItem();
	const accounts = (useAccounts().data ?? []).filter((a) => !a.archived);
	const [amount, setAmount] = useState(
		item.estimated ? moneyInput(item.estimated) : "",
	);
	const [accountId, setAccountId] = useState(list.accountId ?? "");
	const account = accountId || accounts[0]?.id || "";
	const cents = parseMoney(amount);
	const canSubmit = cents !== null && cents > 0 && !!account && !buy.isPending;
	const diff = cents !== null && item.estimated ? cents - item.estimated : 0;

	return (
		<Dialog
			open
			onOpenChange={(open) => {
				if (!open) onClose();
			}}
			title={`Comprei · ${item.name}`}
			description={[
				itemDetail(item),
				item.estimated ? `estimado ${money(item.estimated)}` : "",
			]
				.filter(Boolean)
				.join(" · ")}
			width={440}
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
						isLoading={buy.isPending}
					>
						Marcar comprado
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
					await buy.mutateAsync({
						listId: list.id,
						itemId: item.id,
						amount: cents,
						accountId: account,
					});
					toast.success(`${item.name} · ${money(cents)} MZN registados`);
					onClose();
				}}
			>
				<Field
					label="Preço real (MZN)"
					hint={
						diff
							? `${diff > 0 ? "+" : "−"}${money(Math.abs(diff))} face ao estimado`
							: undefined
					}
				>
					<MoneyInput
						large
						autoFocus
						value={amount}
						onChange={(e) => setAmount(e.target.value)}
					/>
				</Field>
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
				<p className="text-dim text-xs leading-relaxed">
					Cria uma despesa com este valor
					{list.monthItem
						? `, ligada a «${list.monthItem.name}» no orçamento do mês`
						: ""}
					. Desmarcar apaga a despesa.
				</p>
			</form>
		</Dialog>
	);
}
