import type { ImportPreview, ReviewResolution } from "@wallet/shared";
import { Button } from "@wallet/ui/components/button";
import {
	Table,
	TableBody,
	TableCell,
	TableRow,
} from "@wallet/ui/components/table";
import { useState } from "react";
import { toast } from "sonner";
import { useAccounts } from "@/actions/accounts/use-accounts";
import { useCategories } from "@/actions/categories/use-categories";
import { useCommitImport } from "@/actions/imports/use-commit-import";
import { Card } from "@/components/ui/card";
import { CardHeader } from "@/components/ui/card-header";
import { categoryItems } from "@/components/ui/category-items";
import { Hint } from "@/components/ui/hint";
import { Pill } from "@/components/ui/pill";
import { Select } from "@/components/ui/select";
import { Stat } from "@/components/ui/stat";
import { StatRow } from "@/components/ui/stat-row";
import { dayKey, dayLabel, money } from "@/utils/format";

export function ImportReview({
	preview,
	onDone,
}: {
	preview: ImportPreview;
	onDone: () => void;
}) {
	const categories = useCategories().data ?? [];
	const accounts = useAccounts().data ?? [];
	const commit = useCommitImport();
	const [categoryMap, setCategoryMap] = useState<Record<string, string>>({});
	const [resolutions, setResolutions] = useState<
		Record<string, ReviewResolution>
	>({});
	const draft = preview.status === "draft";
	const unmapped = preview.categories.filter(
		(c) => !c.categoryId && !categoryMap[c.walletName],
	);
	const t = preview.totals;

	return (
		<>
			<StatRow>
				<Stat
					label="Novas"
					value={t.new}
					note="após juntar e limpar"
					tone="ok"
				/>
				<Stat label="Duplicadas" value={t.duplicate} note="mesmo import_hash" />
				<Stat
					label="Transferências"
					value={t.transferPairs}
					note="pares saída + entrada"
				/>
				<Stat
					label="Xitique"
					value={t.savingsTransfers}
					note="Estique → conta poupança"
				/>
				<Stat
					label="Mês da nota"
					value={t.referenceMonthFromNote}
					note='notas como "Abril"'
				/>
				<Stat
					label="Para rever"
					value={t.toReview}
					note="transferências soltas"
					tone={t.toReview ? "warn" : undefined}
				/>
			</StatRow>

			<div className="flex flex-wrap items-start gap-[18px]">
				<Card className="min-w-0 flex-[1_1_380px] overflow-hidden">
					<CardHeader title="Ficheiros" />
					{preview.files.map((f) => (
						<div
							key={f.name}
							className="border-hover flex items-center gap-3 border-b px-3.5 py-2.5 text-xs last:border-0"
						>
							<span className="num min-w-0 flex-1 truncate">{f.name}</span>
							<span className="num text-dim">
								{f.firstDate ? dayLabel(dayKey(f.firstDate)) : "—"} –{" "}
								{f.lastDate ? dayLabel(dayKey(f.lastDate)) : "—"}
							</span>
							<span className={`num ${f.new ? "text-money" : "text-dim"}`}>
								{f.new} novas · {f.duplicate} dup.
							</span>
						</div>
					))}
				</Card>
				<Card className="min-w-0 flex-[1_1_300px] overflow-hidden">
					<CardHeader
						title="Contas"
						meta="as que não existem são criadas com saldo 0"
					/>
					{preview.accounts.map((a) => (
						<div
							key={a.name}
							className="border-hover flex items-center gap-3 border-b px-3.5 py-2 text-xs last:border-0"
						>
							<span className="min-w-0 flex-1">{a.name}</span>
							<span className="num text-dim">{a.rows} reg.</span>
							<Pill tone={a.existingAccountId ? "neutral" : "ok"}>
								{a.existingAccountId ? "existe" : "nova"}
							</Pill>
						</div>
					))}
				</Card>
			</div>

			<Card className="overflow-hidden">
				<CardHeader
					title="Categorias Wallet → app"
					meta={
						unmapped.length ? `${unmapped.length} por mapear` : "todas mapeadas"
					}
				/>
				<div className="grid grid-cols-1 md:grid-cols-2">
					{preview.categories.map((c) => {
						const value = categoryMap[c.walletName] ?? c.categoryId ?? "";
						return (
							<div
								key={c.walletName}
								className="border-hover flex items-center gap-3 border-b px-3.5 py-1.5"
							>
								<span className="num min-w-0 flex-1 truncate text-xs">
									{c.walletName}
								</span>
								<span className="num text-dim w-14 text-right text-[11px]">
									{c.rows}
								</span>
								<Select
									size="sm"
									aria-label={`Categoria para ${c.walletName}`}
									disabled={!draft}
									className={`max-w-[240px] ${value ? "" : "border-warn-line text-warn"}`}
									value={value}
									onValueChange={(value) =>
										setCategoryMap((m) => ({
											...m,
											[c.walletName]: value,
										}))
									}
									items={[
										{ value: "", label: "escolher…" },
										...categoryItems(categories),
									]}
								/>
							</div>
						);
					})}
				</div>
			</Card>

			{preview.review.length > 0 ? (
				<Card className="overflow-x-auto">
					<CardHeader
						title={`Rever ${preview.review.length} linhas`}
						meta="transferências do Wallet sem o outro lado na mesma data"
					/>
					<Table className="w-full min-w-[640px] border-collapse text-[13px]">
						<TableBody>
							{preview.review.map((r) => {
								const decision = resolutions[r.key] ?? "ignore";
								const value =
									typeof decision === "object"
										? `to:${decision.transferTo}`
										: decision;
								return (
									<TableRow key={r.key} className="border-hover border-b">
										<TableCell className="num text-dim px-3.5 py-2 text-xs whitespace-normal">
											{dayLabel(dayKey(r.occurredAt))}
										</TableCell>
										<TableCell className="px-3.5 py-2 text-xs whitespace-normal">
											{r.account}
										</TableCell>
										<TableCell className="num px-3.5 py-2 text-right text-xs whitespace-normal">
											{r.type === "expense" ? "−" : "+"}
											{money(r.amount)}
										</TableCell>
										<TableCell className="px-3.5 py-2 whitespace-normal">
											<Select
												size="sm"
												aria-label="Resolver"
												disabled={!draft}
												value={value}
												onValueChange={(value) => {
													const v = value;
													setResolutions((m) => ({
														...m,
														[r.key]: v.startsWith("to:")
															? { transferTo: v.slice(3) }
															: (v as "ignore" | "keep"),
													}));
												}}
												items={[
													{ value: "ignore", label: "ignorar" },
													{
														value: "keep",
														label: `tratar como ${r.type === "expense" ? "despesa" : "entrada"}`,
													},
													...accounts
														.filter((a) => a.name !== r.account)
														.map((a) => ({
															value: `to:${a.id}`,
															label: `criar o outro lado em ${a.name}`,
														})),
												]}
											/>
										</TableCell>
									</TableRow>
								);
							})}
						</TableBody>
					</Table>
				</Card>
			) : null}

			{draft ? (
				<div className="flex flex-wrap items-center justify-end gap-2">
					<span className="num text-dim mr-auto text-xs">
						{t.transactions} transacções a criar · saldos iniciais a 0
						(acerte-os depois em Contas)
					</span>
					<Button variant="neutral" onClick={onDone}>
						Cancelar
					</Button>
					<Hint
						label={
							unmapped.length
								? "Mapeie todas as categorias primeiro"
								: undefined
						}
						wrap
					>
						<Button
							variant="primary"
							disabled={unmapped.length > 0 || commit.isPending}
							onClick={async () => {
								const filled = Object.fromEntries(
									Object.entries(categoryMap).filter(([, v]) => v),
								);
								const res = await commit.mutateAsync({
									id: preview.id,
									categoryMap: filled,
									resolutions,
								});
								toast.success(
									`Importadas ${res.result.transactions} transacções (${res.result.transfers} transferências)`,
								);
							}}
						>
							{commit.isPending ? "A importar…" : `Importar ${t.new} linhas`}
						</Button>
					</Hint>
				</div>
			) : (
				<Pill tone="ok" className="self-start">
					importação aplicada
				</Pill>
			)}
		</>
	);
}
