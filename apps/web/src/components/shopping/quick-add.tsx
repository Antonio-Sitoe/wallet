import { parseShoppingLine } from "@wallet/shared";
import { Input } from "@wallet/ui/components/input";
import { CornerDownLeftIcon } from "lucide-react";
import { useState } from "react";
import { useAddShoppingItem } from "@/actions/shopping/use-add-shopping-item";
import { useShoppingPrices } from "@/actions/shopping/use-shopping-prices";
import { itemDetail } from "@/components/shopping/utils";
import { money } from "@/utils/format";

const key = (name: string) => name.trim().toLocaleLowerCase("pt");

export function QuickAdd({ listId }: { listId: string }) {
	const add = useAddShoppingItem();
	const prices = useShoppingPrices().data ?? [];
	const [text, setText] = useState("");
	const parsed = parseShoppingLine(text);
	const known = parsed
		? prices.find((p) => key(p.name) === key(parsed.name))
		: undefined;
	const remembered = parsed && parsed.unitPrice === null ? known : undefined;
	const line = parsed
		? { ...parsed, unitPrice: parsed.unitPrice ?? known?.unitPrice ?? null }
		: null;

	return (
		<form
			className="border-line flex flex-col gap-1.5 border-b px-3.5 py-3"
			onSubmit={async (e) => {
				e.preventDefault();
				if (!line || add.isPending) return;
				await add.mutateAsync({ listId, ...line });
				setText("");
			}}
		>
			<label htmlFor="quick-add" className="sr-only">
				Adicionar item
			</label>
			<div className="relative">
				<Input
					id="quick-add"
					autoComplete="off"
					list="shopping-names"
					value={text}
					onChange={(e) => setText(e.target.value)}
					placeholder="Adicionar: Arroz 2x 350"
					className="pr-9"
				/>
				<datalist id="shopping-names">
					{prices.map((p) => (
						<option key={p.name} value={p.name} />
					))}
				</datalist>
				<CornerDownLeftIcon
					aria-hidden="true"
					className="text-dim pointer-events-none absolute top-1/2 right-3 size-3.5 -translate-y-1/2"
				/>
			</div>
			<span className="num text-dim min-h-4 text-[11px]">
				{line
					? [
							line.name,
							itemDetail(line),
							line.unitPrice !== null && line.quantity !== 1
								? `= ${money(Math.round(line.quantity * line.unitPrice))}`
								: "",
							remembered
								? remembered.paid
									? "preço da última compra"
									: "preço estimado antes"
								: "",
						]
							.filter(Boolean)
							.join(" · ")
					: "nome, quantidade (2x) e preço por unidade · Enter adiciona"}
			</span>
		</form>
	);
}
