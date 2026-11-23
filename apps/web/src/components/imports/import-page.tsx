import { getRouteApi } from "@tanstack/react-router";
import { Button } from "@wallet/ui/components/button";
import { UploadIcon } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { useDeleteImport } from "@/actions/imports/use-delete-import";
import { useImportPreview } from "@/actions/imports/use-import-preview";
import { useImports } from "@/actions/imports/use-imports";
import { useUploadWallet } from "@/actions/imports/use-upload-wallet";
import { ImportReview } from "@/components/imports/import-review";
import { SheetImport } from "@/components/imports/sheet-import";
import { Card } from "@/components/ui/card";
import { CardHeader } from "@/components/ui/card-header";
import { ErrorNote } from "@/components/ui/error-note";
import { Page } from "@/components/ui/page";
import { PageHeader } from "@/components/ui/page-header";
import { PageTitle } from "@/components/ui/page-title";
import { Pill } from "@/components/ui/pill";
import { Skeleton } from "@/components/ui/skeleton";
import { useConfirm } from "@/contexts/confirm-context";
import { dayKey, dayLabel } from "@/utils/format";

const route = getRouteApi("/_private/import");

export const STATUS = {
	draft: ["rascunho", "info"],
	committed: ["aplicada", "ok"],
	reverted: ["desfeita", "neutral"],
} as const;

export function ImportPage() {
	const confirmAction = useConfirm();
	const { id, sheet } = route.useSearch();
	const navigate = route.useNavigate();
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
					<Button variant="neutral" onClick={() => navigate({ search: {} })}>
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

				<SheetImport
					id={sheet ?? null}
					onOpen={(sheetId) => navigate({ search: { sheet: sheetId } })}
					onClose={() => navigate({ search: {} })}
				/>

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
										variant="neutral"
										size="sm"
										onClick={() =>
											navigate({
												search:
													b.source === "sheet-xlsx"
														? { sheet: b.id }
														: { id: b.id },
											})
										}
									>
										Rever
									</Button>
								) : null}
								{b.status !== "reverted" ? (
									<Button
										size="sm"
										variant={b.status === "committed" ? "danger" : "quiet"}
										onClick={async () => {
											if (
												b.status === "committed" &&
												!(await confirmAction({
													title:
														"Desfazer esta importação? As transacções que ela criou são apagadas.",
												}))
											)
												return;
											const res = await remove.mutateAsync(b.id);
											toast.success(
												b.status === "committed"
													? `Importação desfeita: ${res.removed.transactions} transacções apagadas`
													: "Rascunho descartado",
											);
											if (b.id === id || b.id === sheet)
												navigate({ search: {} });
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
