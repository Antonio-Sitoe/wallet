import {
	CARD_SIZES,
	DASHBOARD_CARD_TYPES,
	type DashboardCard,
	type DashboardCardType,
} from "@wallet/shared";
import { Button } from "@wallet/ui/components/button";
import { PlusIcon } from "lucide-react";
import { toast } from "sonner";
import type { Period } from "@/@types/period";
import { useAddCard } from "@/actions/dashboard/use-add-card";
import { CardBody } from "@/components/dashboard/card-body";
import { CARD_CATALOG } from "@/components/dashboard/utils";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";

export function AddCardDialog({
	open,
	onClose,
	period,
	existing,
}: {
	open: boolean;
	onClose: () => void;
	period: Period;
	existing: DashboardCard[];
}) {
	const add = useAddCard();
	const sections = [
		...new Set(Object.values(CARD_CATALOG).map((c) => c.section)),
	];
	return (
		<Dialog
			open={open}
			onOpenChange={(o) => !o && onClose()}
			title="Adicionar carta"
			description="pré-visualização com os seus dados do período actual"
			width={1100}
		>
			{sections.map((section) => (
				<section key={section} className="flex flex-col gap-3">
					<h3 className="text-[17px] font-semibold">{section}</h3>
					<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
						{DASHBOARD_CARD_TYPES.filter(
							(t) => CARD_CATALOG[t].section === section,
						).map((type: DashboardCardType) => {
							const onBoard = existing.filter((c) => c.type === type).length;
							return (
								<Card
									key={type}
									className="group relative flex flex-col overflow-hidden"
								>
									<div className="border-line flex items-start justify-between gap-2 border-b px-4 py-3">
										<div className="flex flex-col gap-0.5">
											<h4 className="text-sm font-semibold">
												{CARD_CATALOG[type].title}
											</h4>
											<span className="text-dim text-xs">
												{CARD_CATALOG[type].description}
											</span>
										</div>
										{onBoard ? (
											<span className="num text-dim text-[11px]">
												já no painel ×{onBoard}
											</span>
										) : null}
									</div>
									<div
										className="pointer-events-none max-h-[230px] overflow-hidden p-4 opacity-90"
										aria-hidden="true"
									>
										<CardBody
											type={type}
											period={period}
											config={
												type === "cash-flow-trend" ? { range: "year" } : {}
											}
										/>
									</div>
									<div className="absolute inset-x-0 bottom-3 flex justify-center">
										<Button
											variant="primary"
											className="shadow-lg"
											disabled={add.isPending}
											onClick={async () => {
												await add.mutateAsync({
													type,
													size: CARD_SIZES[type === "summary" ? 1 : 0],
													config:
														type === "cash-flow-trend" ? { range: "year" } : {},
												});
												toast.success(
													`${CARD_CATALOG[type].title} adicionada ao painel`,
												);
												onClose();
											}}
										>
											<PlusIcon className="size-3.5" strokeWidth={2.6} />{" "}
											Adicionar
										</Button>
									</div>
								</Card>
							);
						})}
					</div>
				</section>
			))}
		</Dialog>
	);
}
