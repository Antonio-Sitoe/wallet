import { parseShoppingLine } from "@wallet/shared";
import { Input } from "@wallet/ui/components/input";
import { CornerDownLeftIcon } from "lucide-react";
import { useState } from "react";
import { useAddShoppingItem } from "@/actions/shopping/use-add-shopping-item";
import { itemDetail } from "@/components/shopping/utils";
import { money } from "@/utils/format";

export function QuickAdd({ listId }: { listId: string }) {
	const add = useAddShoppingItem();
	const [text, setText] = useState("");
	const parsed = parseShoppingLine(text);

	return (
		<form
			className="border-line flex flex-col gap-1.5 border-b px-3.5 py-3"
			onSubmit={async (e) => {
				e.preventDefault();
				if (!parsed || add.isPending) return;
				await add.mutateAsync({ listId, ...parsed });
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
					value={text}
					onChange={(e) => setText(e.target.value)}
					placeholder="Adicionar: Arroz 2x 350"
					className="pr-9"
				/>
				<CornerDownLeftIcon
					aria-hidden="true"
					className="text-dim pointer-events-none absolute top-1/2 right-3 size-3.5 -translate-y-1/2"
				/>
			</div>
			<span className="num text-dim min-h-4 text-[11px]">
				{parsed
					? [
							parsed.name,
							itemDetail(parsed),
							parsed.unitPrice !== null && parsed.quantity !== 1
								? `= ${money(Math.round(parsed.quantity * parsed.unitPrice))}`
								: "",
						]
							.filter(Boolean)
							.join(" · ")
					: "nome, quantidade (2x) e preço por unidade · Enter adiciona"}
			</span>
		</form>
	);
}
