import type { ShoppingItem } from "@wallet/shared";
import { Button } from "@wallet/ui/components/button";
import { Checkbox } from "@wallet/ui/components/checkbox";
import { cn } from "@wallet/ui/lib/utils";
import { Trash2Icon } from "lucide-react";
import { itemDetail } from "@/components/shopping/utils";
import { money } from "@/utils/format";

export function ShoppingItemRow({
	item,
	accountName,
	onToggle,
	onEdit,
	onRemove,
}: {
	item: ShoppingItem;
	accountName?: string;
	onToggle: () => void;
	onEdit: () => void;
	onRemove: () => void;
}) {
	const detail = itemDetail(item);
	const diff =
		item.actual !== null && item.estimated ? item.actual - item.estimated : 0;
	return (
		<div className="border-hover group flex items-center gap-3 border-b px-3.5 py-2 last:border-0">
			<Checkbox
				checked={item.bought}
				onCheckedChange={onToggle}
				aria-label={
					item.bought ? `Desmarcar ${item.name}` : `Comprei ${item.name}`
				}
			/>
			<button
				type="button"
				onClick={onEdit}
				className="flex min-w-0 flex-1 cursor-pointer flex-col items-start gap-0.5 text-left"
			>
				<span
					className={cn(
						"truncate",
						item.bought && "text-dim decoration-faint line-through",
					)}
				>
					{item.name}
				</span>
				{detail || (item.bought && accountName) ? (
					<span className="num text-dim text-[11px]">
						{[detail, item.bought ? accountName : ""]
							.filter(Boolean)
							.join(" · ")}
					</span>
				) : null}
			</button>
			<span className="flex flex-col items-end gap-0.5">
				{item.bought ? (
					<>
						<span className="num">{money(item.actual ?? 0)}</span>
						{item.estimated ? (
							<span
								className={cn(
									"num text-[11px]",
									diff > 0 ? "text-warn" : diff < 0 ? "text-money" : "text-dim",
								)}
							>
								{diff === 0
									? "= estimado"
									: `${diff > 0 ? "+" : "−"}${money(Math.abs(diff))}`}
							</span>
						) : null}
					</>
				) : (
					<span
						className={cn("num", item.estimated ? "text-fg-2" : "text-faint")}
					>
						{item.estimated ? money(item.estimated) : "—"}
					</span>
				)}
			</span>
			<Button
				variant="quiet"
				size="icon-sm"
				aria-label={`Apagar ${item.name}`}
				onClick={onRemove}
				className="opacity-60 group-hover:opacity-100 focus-visible:opacity-100"
			>
				<Trash2Icon className="size-3.5" />
			</Button>
		</div>
	);
}
