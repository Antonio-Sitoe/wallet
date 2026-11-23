import type { ShoppingItem } from "@wallet/shared";
import { Button } from "@wallet/ui/components/button";
import { Input } from "@wallet/ui/components/input";
import { useState } from "react";
import { useUpdateShoppingItem } from "@/actions/shopping/use-update-shopping-item";
import { quantityLabel } from "@/components/shopping/utils";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { MoneyInput } from "@/components/ui/money-input";
import { money, moneyInput, parseMoney } from "@/utils/format";

const FORM_ID = "shopping-item-form";

export function ItemDialog({
	listId,
	item,
	onClose,
}: {
	listId: string;
	item: ShoppingItem;
	onClose: () => void;
}) {
	const update = useUpdateShoppingItem();
	const [name, setName] = useState(item.name);
	const [quantity, setQuantity] = useState(quantityLabel(item.quantity));
	const [price, setPrice] = useState(
		item.unitPrice === null ? "" : moneyInput(item.unitPrice),
	);
	const qty = Number(quantity.replace(",", "."));
	const unit = price.trim() ? parseMoney(price) : null;
	const validQty = Number.isFinite(qty) && qty > 0;
	const validPrice = !price.trim() || (unit !== null && unit > 0);
	const canSubmit =
		!!name.trim() && validQty && validPrice && !update.isPending;

	return (
		<Dialog
			open
			onOpenChange={(open) => {
				if (!open) onClose();
			}}
			title="Editar item"
			description={
				item.bought
					? `comprado por ${money(item.actual ?? 0)} · o preço real edita-se na transacção`
					: undefined
			}
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
					>
						Guardar
					</Button>
				</>
			}
		>
			<form
				id={FORM_ID}
				className="flex flex-col gap-3.5"
				onSubmit={async (e) => {
					e.preventDefault();
					if (!canSubmit) return;
					await update.mutateAsync({
						listId,
						itemId: item.id,
						name: name.trim(),
						quantity: qty,
						unitPrice: unit,
					});
					onClose();
				}}
			>
				<Field label="Nome">
					<Input
						autoFocus
						value={name}
						onChange={(e) => setName(e.target.value)}
					/>
				</Field>
				<div className="grid grid-cols-2 gap-3">
					<Field
						label="Quantidade"
						hint={validQty ? undefined : "maior do que zero"}
					>
						<Input
							inputMode="decimal"
							className="num"
							value={quantity}
							onChange={(e) => setQuantity(e.target.value)}
						/>
					</Field>
					<Field
						label="Preço por unidade (MZN)"
						hint={
							validQty && unit
								? `total ${money(Math.round(qty * unit))}`
								: "opcional"
						}
					>
						<MoneyInput
							value={price}
							onChange={(e) => setPrice(e.target.value)}
						/>
					</Field>
				</div>
			</form>
		</Dialog>
	);
}
