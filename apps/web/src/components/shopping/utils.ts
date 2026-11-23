import type { ShoppingItem } from "@wallet/shared";
import { money } from "@/utils/format";

export const quantityLabel = (quantity: number) =>
	String(quantity).replace(".", ",");

export function itemDetail(item: Pick<ShoppingItem, "quantity" | "unitPrice">) {
	const quantity = quantityLabel(item.quantity);
	if (item.unitPrice === null)
		return item.quantity === 1 ? "" : `× ${quantity}`;
	return item.quantity === 1
		? money(item.unitPrice)
		: `${quantity} × ${money(item.unitPrice)}`;
}

export const itemsLabel = (n: number) => `${n} ${n === 1 ? "item" : "itens"}`;
