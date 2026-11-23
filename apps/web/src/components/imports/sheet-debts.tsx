import type { SheetPreview } from "@wallet/shared";
import { Checkbox } from "@wallet/ui/components/checkbox";
import {
	Table,
	TableBody,
	TableCell,
	TableRow,
} from "@wallet/ui/components/table";
import { DIRECTION_LABEL } from "@/components/debts/utils";
import { Pill } from "@/components/ui/pill";
import { money } from "@/utils/format";

export function SheetDebts({
	preview,
	draft,
	excluded,
	onExcludedChange,
}: {
	preview: SheetPreview;
	draft: boolean;
	excluded: Set<string>;
	onExcludedChange: (next: Set<string>) => void;
}) {
	return (
		<section className="flex flex-col gap-2">
			<div className="flex flex-wrap items-baseline justify-between gap-2">
				<h3 className="text-sm font-semibold">Dívidas · aba Dívidas</h3>
				<span className="num text-dim text-[11px]">
					os pagamentos registam-se depois, no ecrã Dívidas
				</span>
			</div>
			<div className="border-line overflow-x-auto rounded-lg border">
				<Table className="min-w-[480px] text-[13px]">
					<TableBody>
						{preview.debts.map((d) => (
							<TableRow
								key={d.key}
								className="border-hover border-b last:border-0"
							>
								<TableCell className="w-10 px-3 py-2">
									<Checkbox
										aria-label={`Importar dívida de ${d.person}`}
										disabled={!draft}
										checked={!excluded.has(d.key)}
										onCheckedChange={(checked) => {
											const next = new Set(excluded);
											if (checked) next.delete(d.key);
											else next.add(d.key);
											onExcludedChange(next);
										}}
									/>
								</TableCell>
								<TableCell className="px-3 py-2 font-medium whitespace-normal">
									{d.person}
								</TableCell>
								<TableCell className="px-3 py-2">
									<Pill tone={d.direction === "owed_to_me" ? "warn" : "danger"}>
										{DIRECTION_LABEL[d.direction]}
									</Pill>
								</TableCell>
								<TableCell className="num px-3 py-2 text-right">
									{money(d.amount)}
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>
		</section>
	);
}
