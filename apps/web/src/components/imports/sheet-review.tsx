import type { SheetPreview } from "@wallet/shared";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CategoryOptions } from "@/components/ui/category-options";
import { Pill } from "@/components/ui/pill";
import { Select } from "@/components/ui/select";
import { useAccounts, useCategories, useCommitSheet } from "@/lib/queries";
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
					<table className="w-full min-w-[640px] border-collapse">
						<tbody>
							{preview.planItems.map((p) => (
								<tr key={p.key} className="border-hover border-b last:border-0">
									<td className="px-3 py-1.5">{p.name}</td>
									<td className="num px-3 py-1.5 text-right">
										{money(p.amount)}
									</td>
									<td className="num text-dim px-3 py-1.5 text-[11px]">
										{p.months.length === 12
											? "todos os meses"
											: p.months.map((m) => MONTH_SHORT[m - 1]).join(", ")}
									</td>
									<td className="num text-dim px-3 py-1.5 text-[11px]">
										{GROUP_LABEL[p.group].toLowerCase()}
										{p.partial ? " · aos poucos" : ""}
										{p.toAccountId ? ` · → ${accountName(p.toAccountId)}` : ""}
									</td>
									<td className="px-3 py-1.5">
										<Select
											aria-label={`Categoria de ${p.name}`}
											disabled={!draft}
											className="h-7 max-w-[220px] text-xs"
											value={
												(p.key in overrides
													? overrides[p.key]
													: p.categoryId) ?? ""
											}
											onChange={(e) =>
												setOverrides((o) => ({
													...o,
													[p.key]: e.target.value || null,
												}))
											}
										>
											<option value="">Sem categoria</option>
											<CategoryOptions categories={categories} kind="expense" />
										</Select>
									</td>
								</tr>
							))}
						</tbody>
					</table>
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
							<details
								key={m.month}
								className="border-hover border-b last:border-0"
							>
								<summary className="flex cursor-pointer flex-wrap items-center gap-3 px-3 py-2">
									<label className="flex items-center gap-2">
										<input
											type="checkbox"
											disabled={!draft}
											checked={state.include}
											onClick={(e) => e.stopPropagation()}
											onChange={(e) =>
												setMonths((s) => ({
													...s,
													[m.month]: { ...state, include: e.target.checked },
												}))
											}
											className="size-4 accent-[#3FB950]"
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
										<input
											type="checkbox"
											disabled={!draft || !state.include}
											checked={state.createPayments}
											onClick={(e) => e.stopPropagation()}
											onChange={(e) =>
												setMonths((s) => ({
													...s,
													[m.month]: {
														...state,
														createPayments: e.target.checked,
													},
												}))
											}
											className="size-4 accent-[#3FB950]"
										/>
										criar pagamentos
									</label>
								</summary>
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
											<span className="w-20 text-right">{money(i.amount)}</span>
											<span className="text-dim w-24 text-right">
												{i.walletSpent ? `${money(i.walletSpent)} reg.` : ""}
											</span>
										</li>
									))}
								</ul>
							</details>
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
							className="h-8 w-56"
							value={accountId}
							onChange={(e) => setAccountId(e.target.value)}
						>
							<option value="">
								{paying.length ? "escolher conta…" : "—"}
							</option>
							{accounts.map((a) => (
								<option key={a.id} value={a.id}>
									{a.name}
								</option>
							))}
						</Select>
					</label>
					<Button
						variant="primary"
						disabled={
							included.length === 0 ||
							commit.isPending ||
							(paying.length > 0 && !accountId)
						}
						title={
							paying.length > 0 && !accountId
								? "Escolha a conta dos pagamentos"
								: undefined
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
				</div>
			) : null}
		</div>
	);
}
