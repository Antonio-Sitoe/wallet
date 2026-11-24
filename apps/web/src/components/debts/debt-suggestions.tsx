import type { DebtSuggestion } from "@wallet/shared";
import { Button } from "@wallet/ui/components/button";
import { toast } from "sonner";
import { useIgnoreDebtSuggestion } from "@/actions/debts/use-ignore-debt-suggestion";
import { Card } from "@/components/ui/card";
import { CardHeader } from "@/components/ui/card-header";
import { money } from "@/utils/format";

const count = (n: number, one: string, many: string) =>
	`${n} ${n === 1 ? one : many}`;

export function DebtSuggestions({
	suggestions,
	onConvert,
}: {
	suggestions: DebtSuggestion[];
	onConvert: (suggestion: DebtSuggestion) => void;
}) {
	const ignore = useIgnoreDebtSuggestion();
	return (
		<Card className="overflow-hidden">
			<CardHeader
				title="Histórico do Wallet"
				meta="notas «pessoa → eu» e «eu → pessoa» · empréstimos"
			/>
			<ul>
				{suggestions.map((s) => (
					<li
						key={s.key}
						className="border-hover flex flex-wrap items-center gap-3 border-b px-3.5 py-2.5 last:border-0"
					>
						<span className="flex min-w-0 flex-1 flex-col gap-0.5">
							<span className="font-medium">{s.person}</span>
							<span className="num text-dim text-[11px]">
								{count(s.outCount, "saída", "saídas")} {money(s.outTotal)} ·{" "}
								{count(s.inCount, "entrada", "entradas")} {money(s.inTotal)}
							</span>
						</span>
						<span className="num text-fg-2 text-xs">
							{s.direction === "owed_to_me" ? "deve-te" : "deves"}{" "}
							{money(s.net)}
						</span>
						<Button size="sm" variant="neutral" onClick={() => onConvert(s)}>
							Converter em dívida
						</Button>
						<Button
							size="sm"
							variant="quiet"
							onClick={async () => {
								await ignore.mutateAsync(s.key);
								toast.success(`${s.person} ignorado`);
							}}
						>
							Ignorar
						</Button>
					</li>
				))}
			</ul>
		</Card>
	);
}
