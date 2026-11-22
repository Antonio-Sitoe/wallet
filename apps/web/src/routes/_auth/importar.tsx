import { createFileRoute } from "@tanstack/react-router";
import type { ImportPreview, ReviewResolution } from "@wallet/shared";
import { UploadIcon } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import {
	Button,
	Card,
	CardHeader,
	CategoryOptions,
	ErrorNote,
	Page,
	PageHeader,
	PageTitle,
	Pill,
	Select,
	Skeleton,
	Stat,
	StatRow,
} from "@/components/kit";
import { dayKey, dayLabel, money } from "@/lib/format";
import {
	useAccounts,
	useCategories,
	useCommitImport,
	useDeleteImport,
	useImportPreview,
	useImports,
	useUploadWallet,
} from "@/lib/queries";

export const Route = createFileRoute("/_auth/importar")({
	validateSearch: z.object({ id: z.string().optional() }),
	component: ImportPage,
});

const STATUS = {
	draft: ["rascunho", "info"],
	committed: ["aplicada", "ok"],
	reverted: ["desfeita", "neutral"],
} as const;

function ImportPage() {
	const { id } = Route.useSearch();
	const navigate = Route.useNavigate();
	const upload = useUploadWallet();
	const history = useImports();
	const preview = useImportPreview(id ?? null);
	const remove = useDeleteImport();
	const inputRef = useRef<HTMLInputElement>(null);
	const [dragging, setDragging] = useState(false);

	async function send(files: FileList | File[]) {
		const list = [...files].filter((f) =>
			f.name.toLowerCase().endsWith(".csv"),
		);
		if (list.length === 0)
			return toast.error("Escolha ficheiros .csv exportados do Wallet");
		const contents = await Promise.all(
			list.map(async (f) => ({ name: f.name, content: await f.text() })),
		);
		const result = await upload.mutateAsync(contents);
		navigate({ search: { id: result.id } });
	}

	return (
		<>
			<PageHeader crumb={id ? ["importar", "rever"] : ["importar"]}>
				{id ? (
					<Button onClick={() => navigate({ search: {} })}>
						Nova importação
					</Button>
				) : null}
			</PageHeader>
			<Page>
				<PageTitle
					title="Importar do Wallet (CSV)"
					meta="exports do Wallet (BudgetBakers) · separados por ; · nada é gravado antes de confirmar"
				/>

				{!id ? (
					<Card
						className={`flex flex-col items-center gap-3 border-dashed px-6 py-12 text-center ${dragging ? "border-money bg-money-bg" : "border-line-strong"}`}
						onDragOver={(e) => {
							e.preventDefault();
							setDragging(true);
						}}
						onDragLeave={() => setDragging(false)}
						onDrop={(e) => {
							e.preventDefault();
							setDragging(false);
							send(e.dataTransfer.files);
						}}
					>
						<UploadIcon className="text-faint size-8" strokeWidth={1.4} />
						<h2 className="text-[17px] font-semibold">
							Arraste os ficheiros wallet_records*.csv
						</h2>
						<p className="text-fg-2 max-w-[460px]">
							Pode enviar vários exports de uma vez: as linhas repetidas entre
							ficheiros (e as já importadas) são ignoradas.
						</p>
						<input
							ref={inputRef}
							type="file"
							accept=".csv,text/csv"
							multiple
							className="sr-only"
							onChange={(e) => e.target.files && send(e.target.files)}
						/>
						<Button
							variant="primary"
							disabled={upload.isPending}
							onClick={() => inputRef.current?.click()}
						>
							{upload.isPending ? "A ler…" : "Escolher ficheiros"}
						</Button>
					</Card>
				) : preview.isPending ? (
					<Skeleton className="h-96" />
				) : preview.error ? (
					<ErrorNote error={preview.error} />
				) : preview.data ? (
					<ImportReview
						key={preview.data.id}
						preview={preview.data}
						onDone={() => navigate({ search: {} })}
					/>
				) : null}

				<Card className="overflow-hidden">
					<CardHeader
						title="Importações"
						meta="desfazer apaga as transacções e transferências criadas por essa importação"
					/>
					{history.isPending ? (
						<Skeleton className="m-3 h-20" />
					) : (history.data ?? []).length === 0 ? (
						<p className="text-dim px-4 py-6 text-center">
							Ainda não importou nada.
						</p>
					) : (
						(history.data ?? []).map((b) => (
							<div
								key={b.id}
								className="border-hover flex flex-wrap items-center gap-3 border-b px-3.5 py-2.5 last:border-0"
							>
								<Pill tone={STATUS[b.status][1]}>{STATUS[b.status][0]}</Pill>
								<span className="num text-dim text-xs">
									{dayLabel(dayKey(b.createdAt))}
								</span>
								<span className="min-w-0 flex-1 truncate text-xs">
									{b.fileNames.join(", ")}
								</span>
								<span className="num text-fg-2 text-xs">
									{b.totals.new} novas · {b.totals.duplicate} duplicadas
								</span>
								{b.status === "draft" ? (
									<Button
										size="sm"
										onClick={() => navigate({ search: { id: b.id } })}
									>
										Rever
									</Button>
								) : null}
								{b.status !== "reverted" ? (
									<Button
										size="sm"
										variant={b.status === "committed" ? "danger" : "ghost"}
										onClick={async () => {
											if (
												b.status === "committed" &&
												!confirm(
													"Desfazer esta importação? As transacções que ela criou são apagadas.",
												)
											)
												return;
											const res = await remove.mutateAsync(b.id);
											toast.success(
												b.status === "committed"
													? `Importação desfeita: ${res.removed.transactions} transacções apagadas`
													: "Rascunho descartado",
											);
											if (b.id === id) navigate({ search: {} });
										}}
									>
										{b.status === "committed" ? "Desfazer" : "Descartar"}
									</Button>
								) : null}
							</div>
						))
					)}
				</Card>
			</Page>
		</>
	);
}

function ImportReview({
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
									aria-label={`Categoria para ${c.walletName}`}
									disabled={!draft}
									className={`h-7 max-w-[240px] text-xs ${value ? "" : "border-warn-line text-warn"}`}
									value={value}
									onChange={(e) =>
										setCategoryMap((m) => ({
											...m,
											[c.walletName]: e.target.value,
										}))
									}
								>
									<option value="">escolher…</option>
									<CategoryOptions categories={categories} />
								</Select>
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
					<table className="w-full min-w-[640px] border-collapse">
						<tbody>
							{preview.review.map((r) => {
								const decision = resolutions[r.key] ?? "ignore";
								const value =
									typeof decision === "object"
										? `to:${decision.transferTo}`
										: decision;
								return (
									<tr key={r.key} className="border-hover border-b">
										<td className="num text-dim px-3.5 py-2 text-xs">
											{dayLabel(dayKey(r.occurredAt))}
										</td>
										<td className="px-3.5 py-2 text-xs">{r.account}</td>
										<td className="num px-3.5 py-2 text-right text-xs">
											{r.type === "expense" ? "−" : "+"}
											{money(r.amount)}
										</td>
										<td className="px-3.5 py-2">
											<Select
												aria-label="Resolver"
												disabled={!draft}
												className="h-7 text-xs"
												value={value}
												onChange={(e) => {
													const v = e.target.value;
													setResolutions((m) => ({
														...m,
														[r.key]: v.startsWith("to:")
															? { transferTo: v.slice(3) }
															: (v as "ignore" | "keep"),
													}));
												}}
											>
												<option value="ignore">ignorar</option>
												<option value="keep">
													tratar como{" "}
													{r.type === "expense" ? "despesa" : "entrada"}
												</option>
												{accounts
													.filter((a) => a.name !== r.account)
													.map((a) => (
														<option key={a.id} value={`to:${a.id}`}>
															criar o outro lado em {a.name}
														</option>
													))}
											</Select>
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</Card>
			) : null}

			{draft ? (
				<div className="flex flex-wrap items-center justify-end gap-2">
					<span className="num text-dim mr-auto text-xs">
						{t.transactions} transacções a criar · saldos iniciais a 0
						(acerte-os depois em Contas)
					</span>
					<Button onClick={onDone}>Cancelar</Button>
					<Button
						variant="primary"
						disabled={unmapped.length > 0 || commit.isPending}
						title={
							unmapped.length
								? "Mapeie todas as categorias primeiro"
								: undefined
						}
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
				</div>
			) : (
				<Pill tone="ok" className="self-start">
					importação aplicada
				</Pill>
			)}
		</>
	);
}
