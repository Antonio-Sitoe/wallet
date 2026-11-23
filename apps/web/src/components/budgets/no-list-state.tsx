import { Link } from "@tanstack/react-router";
import { parseYearMonth } from "@wallet/shared";
import { toast } from "sonner";
import { useCreatePlan } from "@/actions/plan/use-create-plan";
import { useGeneratePlan } from "@/actions/plan/use-generate-plan";
import { usePlans } from "@/actions/plan/use-plans";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { monthLabel } from "@/utils/format";

export function NoListState({ month }: { month: string }) {
	const { year } = parseYearMonth(month);
	const plans = usePlans().data ?? [];
	const generate = useGeneratePlan();
	const create = useCreatePlan();
	const plan = plans.find((p) => p.year === year);
	const previous = plans.find((p) => p.year === year - 1);

	if (plan && !plan.generated) {
		return (
			<EmptyState
				title={`O plano de ${year} ainda não tem listas mensais`}
				actions={
					<>
						<Button
							variant="primary"
							disabled={generate.isPending}
							onClick={async () => {
								const res = await generate.mutateAsync(year);
								toast.success(`${res.created} itens criados nos 12 meses`);
							}}
						>
							Gerar 12 listas
						</Button>
						<Link to="/plan" search={{ year: year }}>
							<Button>Ver plano anual</Button>
						</Link>
					</>
				}
			>
				Gere as listas para cada mês ter a sua checklist.
			</EmptyState>
		);
	}
	if (plan) {
		return (
			<EmptyState
				title={`${monthLabel(month)} não tem itens`}
				actions={
					<Link to="/plan" search={{ year: year }}>
						<Button>Ver plano anual</Button>
					</Link>
				}
			>
				O plano de {year} não tem itens para este mês. Adicione itens no plano
				anual ou um item não planeado.
			</EmptyState>
		);
	}
	return (
		<EmptyState
			title={`${monthLabel(month)} ainda não tem lista`}
			actions={
				<>
					{previous ? (
						<Button
							variant="primary"
							disabled={create.isPending}
							onClick={async () => {
								await create.mutateAsync({ year, copyFrom: year - 1 });
								toast.success(`Plano de ${year} copiado de ${year - 1}`);
							}}
						>
							Copiar plano de {year - 1}
						</Button>
					) : null}
					<Link to="/plan" search={{ year: year }}>
						<Button variant={previous ? "secondary" : "primary"}>
							Criar plano {year}
						</Button>
					</Link>
				</>
			}
		>
			As listas mensais vêm do plano anual.{" "}
			{previous
				? `Copie o plano de ${year - 1} (ajusta os valores depois) ou comece um plano novo.`
				: "Comece por criar o plano do ano."}
		</EmptyState>
	);
}
