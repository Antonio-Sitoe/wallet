import type { CardSize, DashboardCard } from "@wallet/shared";
import {
	ArrowDownIcon,
	ArrowUpIcon,
	GripVerticalIcon,
	Maximize2Icon,
	Minimize2Icon,
	Trash2Icon,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { CardBody } from "@/components/dashboard/card-body";
import { IconButton } from "@/components/dashboard/icon-button";
import { CARD_CATALOG, cardTitle } from "@/components/dashboard/utils";
import { Card } from "@/components/ui/card";
import { type Period, useRemoveCard, useUpdateCard } from "@/lib/queries";

export function DashboardCardFrame({
	card,
	period,
	index,
	count,
	dragging,
	onDragStart,
	onDragEnd,
	onDropHere,
	onMove,
}: {
	card: DashboardCard;
	period: Period;
	index: number;
	count: number;
	dragging: boolean;
	onDragStart: () => void;
	onDragEnd: () => void;
	onDropHere: () => void;
	onMove: (to: number) => void;
}) {
	const update = useUpdateCard();
	const remove = useRemoveCard();
	const [over, setOver] = useState(false);
	const hasRange =
		card.type === "cash-flow-trend" || card.type === "spending-by-category";
	const nextSize: CardSize = card.size === "full" ? "half" : "full";
	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: drop target for mouse drag; the ↑/↓ buttons do the same by keyboard
		<Card
			className={`flex min-w-0 flex-col overflow-hidden transition-opacity ${card.size === "full" ? "lg:col-span-2" : ""} ${dragging ? "opacity-40" : ""} ${over ? "ring-info-2/50 ring-2" : ""}`}
			onDragOver={(e) => {
				e.preventDefault();
				setOver(true);
			}}
			onDragLeave={() => setOver(false)}
			onDrop={(e) => {
				e.preventDefault();
				setOver(false);
				onDropHere();
			}}
		>
			<div className="border-line flex items-center gap-2 border-b px-4 py-3">
				{/* biome-ignore lint/a11y/noStaticElementInteractions: mouse drag handle; ↑/↓ buttons are the keyboard path */}
				<span
					draggable
					onDragStart={(e) => {
						e.dataTransfer.effectAllowed = "move";
						onDragStart();
					}}
					onDragEnd={onDragEnd}
					title="Arrastar para mudar a ordem"
					className="text-faint hover:text-fg-2 cursor-grab"
				>
					<GripVerticalIcon className="size-4" aria-hidden="true" />
				</span>
				<h2 className="min-w-0 flex-1 truncate text-sm font-semibold">
					{cardTitle(card.type, period, card.config)}
				</h2>
				{hasRange ? (
					<button
						type="button"
						className="num border-line-strong text-fg-2 hover:bg-hover cursor-pointer rounded-md border px-2 py-0.5 text-[11px]"
						onClick={() =>
							update.mutate({
								id: card.id,
								config: {
									...card.config,
									range: card.config.range === "year" ? "period" : "year",
								},
							})
						}
						title="Alternar entre o período escolhido e o ano inteiro"
					>
						{card.config.range === "year" ? "ano" : "período"}
					</button>
				) : null}
				<IconButton
					label="Subir"
					disabled={index === 0}
					onClick={() => onMove(index - 1)}
				>
					<ArrowUpIcon className="size-3.5" />
				</IconButton>
				<IconButton
					label="Descer"
					disabled={index === count - 1}
					onClick={() => onMove(index + 1)}
				>
					<ArrowDownIcon className="size-3.5" />
				</IconButton>
				<IconButton
					className="hidden lg:flex"
					label={nextSize === "full" ? "Largura inteira" : "Meia largura"}
					onClick={() => update.mutate({ id: card.id, size: nextSize })}
				>
					{nextSize === "full" ? (
						<Maximize2Icon className="size-3.5" />
					) : (
						<Minimize2Icon className="size-3.5" />
					)}
				</IconButton>
				<IconButton
					label="Remover carta"
					onClick={() => {
						remove.mutate(card.id);
						toast.success(`${CARD_CATALOG[card.type].title} removida`);
					}}
				>
					<Trash2Icon className="size-3.5" />
				</IconButton>
			</div>
			<div className="flex-1 p-4">
				<CardBody type={card.type} period={period} config={card.config} />
			</div>
		</Card>
	);
}
