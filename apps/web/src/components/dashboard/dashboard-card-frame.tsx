import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { CardSize, DashboardCard } from "@wallet/shared";
import {
	ArrowDownIcon,
	ArrowUpIcon,
	GripVerticalIcon,
	Maximize2Icon,
	Minimize2Icon,
	Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";
import type { Period } from "@/@types/period";
import { useRemoveCard } from "@/actions/dashboard/use-remove-card";
import { useUpdateCard } from "@/actions/dashboard/use-update-card";
import { CardBody } from "@/components/dashboard/card-body";
import { IconButton } from "@/components/dashboard/icon-button";
import { CARD_CATALOG, cardTitle } from "@/components/dashboard/utils";
import { Card } from "@/components/ui/card";

export function DashboardCardFrame({
	card,
	period,
	index,
	count,
	onMove,
}: {
	card: DashboardCard;
	period: Period;
	index: number;
	count: number;
	onMove: (to: number) => void;
}) {
	const update = useUpdateCard();
	const remove = useRemoveCard();
	const {
		attributes,
		listeners,
		setNodeRef,
		setActivatorNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({ id: card.id });
	const hasRange =
		card.type === "cash-flow-trend" || card.type === "spending-by-category";
	const nextSize: CardSize = card.size === "full" ? "half" : "full";
	return (
		<Card
			ref={setNodeRef}
			style={{
				transform: CSS.Translate.toString(transform),
				transition,
			}}
			className={`flex min-w-0 flex-col overflow-hidden ${card.size === "full" ? "lg:col-span-2" : ""} ${isDragging ? "ring-info-2/50 relative z-10 opacity-80 shadow-2xl ring-2" : ""}`}
		>
			<div className="border-line flex items-center gap-2 border-b px-4 py-3">
				<button
					type="button"
					ref={setActivatorNodeRef}
					{...attributes}
					{...listeners}
					aria-label="Arrastar para mudar a ordem"
					title="Arrastar para mudar a ordem"
					className={`text-faint hover:text-fg-2 touch-none ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
				>
					<GripVerticalIcon className="size-4" aria-hidden="true" />
				</button>
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
