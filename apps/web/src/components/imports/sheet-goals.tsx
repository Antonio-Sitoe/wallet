import type { Account, SheetPreview } from "@wallet/shared";
import { Checkbox } from "@wallet/ui/components/checkbox";
import {
	Table,
	TableBody,
	TableCell,
	TableRow,
} from "@wallet/ui/components/table";
import { Field } from "@/components/ui/field";
import { MoneyInput } from "@/components/ui/money-input";
import { Select } from "@/components/ui/select";
import { money, moneyInput, parseMoney } from "@/utils/format";

export type SheetGoalChoice = { include: boolean; target: string };

export function SheetGoals({
	preview,
	accounts,
	draft,
	goals,
	onGoalsChange,
	partGoals,
	onPartGoalsChange,
	goalAccountId,
	onGoalAccountChange,
}: {
	preview: SheetPreview;
	accounts: Account[];
	draft: boolean;
	goals: Record<string, SheetGoalChoice>;
	onGoalsChange: (next: Record<string, SheetGoalChoice>) => void;
	partGoals: Record<string, string | null>;
	onPartGoalsChange: (next: Record<string, string | null>) => void;
	goalAccountId: string;
	onGoalAccountChange: (id: string) => void;
}) {
	const included = preview.goals.filter((g) => goals[g.key]?.include);
	const goalOptions = [
		{ value: "", label: "não importar" },
		...included.map((g) => ({ value: g.key, label: g.name })),
	];

	return (
		<section className="flex flex-col gap-2">
			<div className="flex flex-wrap items-baseline justify-between gap-2">
				<h3 className="text-sm font-semibold">Metas · aba Emergência</h3>
				<span className="num text-dim text-[11px]">
					cada meta começa com o valor que já está poupado
				</span>
			</div>
			<div className="border-line overflow-x-auto rounded-lg border">
				<Table className="min-w-[560px] text-[13px]">
					<TableBody>
						{preview.goals.map((g) => {
							const choice = goals[g.key] ?? {
								include: true,
								target: moneyInput(g.target),
							};
							return (
								<TableRow
									key={g.key}
									className="border-hover border-b last:border-0"
								>
									<TableCell className="w-10 px-3 py-2">
										<Checkbox
											aria-label={`Importar ${g.name}`}
											disabled={!draft}
											checked={choice.include}
											onCheckedChange={(include) =>
												onGoalsChange({
													...goals,
													[g.key]: { ...choice, include },
												})
											}
										/>
									</TableCell>
									<TableCell className="px-3 py-2 font-medium whitespace-normal">
										{g.name}
									</TableCell>
									<TableCell className="num text-fg-2 px-3 py-2 text-xs whitespace-normal">
										poupado {money(g.saved)}
									</TableCell>
									<TableCell className="w-44 px-3 py-2 whitespace-normal">
										<MoneyInput
											aria-label={`Alvo de ${g.name}`}
											disabled={!draft || !choice.include}
											value={choice.target}
											onChange={(e) =>
												onGoalsChange({
													...goals,
													[g.key]: { ...choice, target: e.target.value },
												})
											}
										/>
									</TableCell>
									<TableCell className="num text-dim px-3 py-2 text-[11px] whitespace-normal">
										{g.suggestedTarget
											? "alvo sugerido: 3 meses de despesas"
											: "alvo da folha"}
									</TableCell>
								</TableRow>
							);
						})}
					</TableBody>
				</Table>
			</div>

			{preview.goalParts.length > 0 ? (
				<div className="border-line overflow-x-auto rounded-lg border">
					<Table className="min-w-[560px] text-[13px]">
						<TableBody>
							{preview.goalParts.map((p) => (
								<TableRow
									key={p.key}
									className="border-hover border-b last:border-0"
								>
									<TableCell className="px-3 py-2 whitespace-normal">
										{p.name}
									</TableCell>
									<TableCell className="num text-fg-2 px-3 py-2 text-xs whitespace-normal">
										pago {money(p.paid)}
										{p.missing ? ` · falta ${money(p.missing)}` : ""}
									</TableCell>
									<TableCell className="w-52 px-3 py-2 whitespace-normal">
										<Select
											size="sm"
											aria-label={`Meta de ${p.name}`}
											disabled={!draft}
											value={
												(p.key in partGoals ? partGoals[p.key] : p.goalKey) ??
												""
											}
											onValueChange={(value) =>
												onPartGoalsChange({
													...partGoals,
													[p.key]: value || null,
												})
											}
											items={goalOptions}
										/>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
			) : null}

			{draft && included.length > 0 ? (
				<Field
					label="Conta onde fica o dinheiro das metas"
					className="max-w-xs"
				>
					<Select
						value={goalAccountId}
						onValueChange={onGoalAccountChange}
						items={accounts.map((a) => ({ value: a.id, label: a.name }))}
						placeholder="Escolher conta"
					/>
				</Field>
			) : null}
		</section>
	);
}

export const goalsForCommit = (
	preview: SheetPreview,
	goals: Record<string, SheetGoalChoice>,
) =>
	preview.goals.map((g) => {
		const choice = goals[g.key];
		const target = choice ? parseMoney(choice.target) : null;
		return {
			key: g.key,
			include: choice?.include ?? true,
			...(target && target > 0 ? { target } : {}),
		};
	});
