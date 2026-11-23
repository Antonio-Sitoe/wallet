import { useState } from "react";
import { toast } from "sonner";
import { Check } from "@/components/plan/check";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CardHeader } from "@/components/ui/card-header";
import { Field } from "@/components/ui/field";
import { MoneyInput } from "@/components/ui/money-input";
import { useCreatePlan } from "@/lib/queries";
import { parseMoney } from "@/utils/format";

export function CreatePlan({
	year,
	hasPrevious,
}: {
	year: number;
	hasPrevious: boolean;
}) {
	const create = useCreatePlan();
	const [income, setIncome] = useState("");
	const [copy, setCopy] = useState(hasPrevious);
	const [copySeasonal, setCopySeasonal] = useState(true);
	const [copyOneOff, setCopyOneOff] = useState(false);
	const cents = income === "" ? 0 : parseMoney(income);
	return (
		<Card className="max-w-[560px]">
			<CardHeader
				title={`Criar o plano de ${year}`}
				meta="planeia o ano uma vez; cada mês vira uma checklist"
			/>
			<form
				className="flex flex-col gap-3.5 p-4"
				onSubmit={async (e) => {
					e.preventDefault();
					if (cents === null) return;
					await create.mutateAsync({
						year,
						expectedIncome: cents,
						...(copy ? { copyFrom: year - 1, copySeasonal, copyOneOff } : {}),
					});
					toast.success(`Plano de ${year} criado`);
				}}
			>
				<Field
					label="Salário previsto por mês (MZN)"
					hint={copy ? "vazio = o mesmo do ano anterior" : undefined}
				>
					<MoneyInput
						value={income}
						onChange={(e) => setIncome(e.target.value)}
						placeholder="55 000"
					/>
				</Field>
				{hasPrevious ? (
					<div className="border-line flex flex-col gap-2 rounded-lg border p-3">
						<Check checked={copy} onChange={setCopy}>
							Copiar os itens de {year - 1}
						</Check>
						{copy ? (
							<>
								<Check checked={copySeasonal} onChange={setCopySeasonal}>
									Copiar itens sazonais (ex.: Escola de Inglês jun–ago)
								</Check>
								<Check checked={copyOneOff} onChange={setCopyOneOff}>
									Copiar itens de uma vez (ex.: iPhone, Obra)
								</Check>
							</>
						) : null}
					</div>
				) : null}
				<Button
					type="submit"
					variant="primary"
					disabled={cents === null || create.isPending}
					className="self-start"
				>
					Criar plano {year}
				</Button>
			</form>
		</Card>
	);
}
