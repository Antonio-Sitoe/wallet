import type { SheetPreview } from "@wallet/shared";
import { Button } from "@wallet/ui/components/button";
import { Checkbox } from "@wallet/ui/components/checkbox";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@wallet/ui/components/collapsible";
import {
	Table,
	TableBody,
	TableCell,
	TableRow,
} from "@wallet/ui/components/table";
import { ChevronDownIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useAccounts } from "@/actions/accounts/use-accounts";
import { useCategories } from "@/actions/categories/use-categories";
import { useCommitSheet } from "@/actions/imports/use-commit-sheet";
import { categoryItems } from "@/components/ui/category-items";
import { Hint } from "@/components/ui/hint";
import { Pill } from "@/components/ui/pill";
import { Select } from "@/components/ui/select";
import { GROUP_LABEL, MONTH_SHORT, money } from "@/utils/format";

export function SheetReview({ preview }: { preview: SheetPreview }) {
	const categories = useCategories().data ?? [];
	const accounts = useAccounts().data ?? [];
	const commit = useCommitSheet();
	const draft = preview.status === "draft";
	const [months, setMonths] = useState(() =>
		Object.fromEntries(
			preview.months.map((m) => [
				m.month,
				{ include: true, createPayments: m.suggestPayments },
			]),
		),
	);
	const [overrides, setOverrides] = useState<Record<string, string | null>>({});
	const [accountId, setAccountId] = useState("");
	const name = (id: string | null) =>
		categories.find((c) => c.id === id)?.name ?? "sem categoria";
	const accountName = (id: string | null) =>
		accounts.find((a) => a.id === id)?.name;
	const included = preview.months.filter((m) => months[m.month]?.include);
	const paying = included.filter((m) => months[m.month]?.createPayments);

	return (
		<div className="flex flex-col gap-4 p-4">
			{preview.result ? (
				<Pill tone="ok" className="self-start">
					aplicada · {preview.result.monthItems} itens nas listas ·{" "}
					{preview.result.planItems} no plano · {preview.result.payments}{" "}
					pagamentos
				</Pill>
			) : null}

			<div className="flex flex-col gap-2">
				<h3 className="text-sm font-semibold">
					Plano anual {preview.year} · {preview.planItems.length} itens que se
					repetem
				</h3>
				<div className="border-line overflow-x-auto rounded-lg border">
					<Table className="w-full min-w-[640px] border-collapse text-[13px]">
						<TableBody>
							{preview.planItems.map((p) => (
								<TableRow
									key={p.key}
									className="border-hover border-b last:border-0"
								>
									<TableCell className="px-3 py-1.5 whitespace-normal">
										{p.name}
									</TableCell>
									<TableCell className="num px-3 py-1.5 text-right whitespace-normal">
										{money(p.amount)}
									</TableCell>
									<TableCell className="num text-dim px-3 py-1.5 text-[11px] whitespace-normal">
										{p.months.length === 12
											? "todos os meses"
											: p.months.map((m) => MONTH_SHORT[m - 1]).join(", ")}
									</TableCell>
									<TableCell className="num text-dim px-3 py-1.5 text-[11px] whitespace-normal">
										{GROUP_LABEL[p.group].toLowerCase()}
										{p.partial ? " · aos poucos" : ""}
										{p.toAccountId ? ` · → ${accountName(p.toAccountId)}` : ""}
									</TableCell>
									<TableCell className="px-3 py-1.5 whitespace-normal">
										<Select
											size="sm"
											aria-label={`Categoria de ${p.name}`}
											disabled={!draft}
											className="max-w-[220px]"
											value={
												(p.key in overrides
													? overrides[p.key]
													: p.categoryId) ?? ""
											}
											onValueChange={(value) =>
												setOverrides((o) => ({
													...o,
													[p.key]: value || null,
												}))
											}
											items={[
												{ value: "", label: "Sem categoria" },
												...categoryItems(categories, "expense"),
											]}
										/>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
			</div>

			<div className="flex flex-col gap-2">
				<h3 className="text-sm font-semibold">Meses</h3>
				<p className="text-dim text-xs">
					«Já registado» é o que as transacções (Wallet e registos manuais) já
					cobrem pela categoria. «Criar pagamentos» marca como pago o que falta,
					com uma despesa no último dia do mês; está ligado por defeito nos
					meses passados que os registos quase não cobrem.
				</p>
				<div className="border-line overflow-hidden rounded-lg border">
					{preview.months.map((m) => {
						const state = months[m.month] ?? {
							include: true,
							createPayments: false,
						};
						return (
							<Collapsible
								key={m.month}
								className="border-hover border-b last:border-0"
							>
								<div className="flex flex-wrap items-center gap-3 px-3 py-2">
									<label className="flex items-center gap-2">
										<Checkbox
											disabled={!draft}
											checked={state.include}
											onCheckedChange={(checked) =>
												setMonths((s) => ({
													...s,
													[m.month]: { ...state, include: checked },
												}))
											}
										/>
										<span className="font-medium">{m.label}</span>
									</label>
									<span className="num text-dim text-xs">
										{m.items.length} itens
									</span>
									<span className="num ml-auto text-xs">{money(m.total)}</span>
									<span className="num text-dim w-40 text-right text-xs">
										já registado {money(m.walletSpent)}
									</span>
									<label className="text-fg-2 flex items-center gap-1.5 text-xs">
										<Checkbox
											disabled={!draft || !state.include}
											checked={state.createPayments}
											onCheckedChange={(checked) =>
												setMonths((s) => ({
													...s,
													[m.month]: {
														...state,
														createPayments: checked,
													},
												}))
											}
										/>
										criar pagamentos
									</label>
									<CollapsibleTrigger
										render={
											<Button
												variant="quiet"
												size="icon-sm"
												aria-label={`Ver itens de ${m.label}`}
												className="group/trigger"
											/>
										}
									>
										<ChevronDownIcon className="size-4 transition-transform group-data-panel-open/trigger:rotate-180" />
									</CollapsibleTrigger>
								</div>
								<CollapsibleContent>
									<ul className="bg-panel-2 px-3 py-2">
										{m.items.map((i) => (
											<li key={i.key} className="num flex gap-3 py-0.5 text-xs">
												<span className="min-w-0 flex-1 truncate font-sans">
													{i.name}
													{i.planKey ? "" : " · não planeado"}
												</span>
												<span className="text-dim w-40 truncate">
													{name(
														i.key in overrides
															? (overrides[i.key] ?? null)
															: i.categoryId,
													)}
												</span>
												<span className="w-20 text-right">
													{money(i.amount)}
												</span>
												<span className="text-dim w-24 text-right">
													{i.walletSpent ? `${money(i.walletSpent)} reg.` : ""}
												</span>
											</li>
										))}
									</ul>
								</CollapsibleContent>
							</Collapsible>
						);
					})}
				</div>
				{preview.skipped.length ? (
					<p className="num text-dim text-[11px]">
						Linhas sem valor, ignoradas:{" "}
						{preview.skipped
							.map((s) => `${s.text} (linha ${s.row})`)
							.join(", ")}
					</p>
				) : null}
				{preview.otherSheets.length ? (
					<p className="num text-dim text-[11px]">
						Outras folhas ({preview.otherSheets.join(", ")}) ficam para a Fase 4
						(metas e dívidas).
					</p>
				) : null}
			</div>

			{draft ? (
				<div className="flex flex-wrap items-end justify-end gap-2">
					{/* biome-ignore lint/a11y/noLabelWithoutControl: the Select below is a native <select> */}
					<label className="text-fg-2 mr-auto flex flex-col gap-1 text-xs">
						Conta de onde saíram os pagamentos
						<Select
							size="md"
							className="w-56"
							value={accountId}
							onValueChange={(value) => setAccountId(value)}
							items={[
								{
									value: "",
									label: String(paying.length ? "escolher conta…" : "—"),
								},
								...accounts.map((a) => ({
									value: a.id,
									label: a.name,
								})),
							]}
						/>
					</label>
					<Hint
						label={
							paying.length > 0 && !accountId
								? "Escolha a conta dos pagamentos"
								: undefined
						}
						wrap
					>
						<Button
							variant="primary"
							disabled={
								included.length === 0 ||
								commit.isPending ||
								(paying.length > 0 && !accountId)
							}
							onClick={async () => {
								const res = await commit.mutateAsync({
									id: preview.id,
									accountId: accountId || null,
									months: preview.months.map((m) => ({
										month: m.month,
										...(months[m.month] ?? {
											include: true,
											createPayments: false,
										}),
									})),
									categories: overrides,
								});
								toast.success(
									`Folha importada: ${res.result?.monthItems ?? 0} itens, ${res.result?.payments ?? 0} pagamentos`,
								);
							}}
						>
							{commit.isPending
								? "A importar…"
								: `Importar ${included.length} meses${paying.length ? ` · pagar ${paying.length}` : ""}`}
						</Button>
					</Hint>
				</div>
			) : null}
		</div>
	);
}
