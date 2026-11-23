import { Button } from "@wallet/ui/components/button";
import { useRef, useState } from "react";
import { useSheetPreview } from "@/actions/imports/use-sheet-preview";
import { useUploadSheet } from "@/actions/imports/use-upload-sheet";
import { SheetReview } from "@/components/imports/sheet-review";
import { Card } from "@/components/ui/card";
import { CardHeader } from "@/components/ui/card-header";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

export function SheetImport({
	id,
	onOpen,
	onClose,
}: {
	id: string | null;
	onOpen: (id: string) => void;
	onClose: () => void;
}) {
	const upload = useUploadSheet();
	const preview = useSheetPreview(id);
	const inputRef = useRef<HTMLInputElement>(null);
	const [year, setYear] = useState(new Date().getFullYear());

	async function send(file: File) {
		const bytes = new Uint8Array(await file.arrayBuffer());
		let binary = "";
		for (let i = 0; i < bytes.length; i += 0x8000)
			binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
		const res = await upload.mutateAsync({
			name: file.name,
			contentBase64: btoa(binary),
			year,
		});
		onOpen(res.id);
	}

	return (
		<Card className="overflow-hidden">
			<CardHeader
				title="Folha de cálculo (Excel)"
				meta="a sheet «Gastos com salario»: cada mês vira uma lista; os itens que se repetem vão para o plano anual"
				actions={
					id ? (
						<Button variant="neutral" size="sm" onClick={onClose}>
							Fechar
						</Button>
					) : (
						<>
							<Select
								size="sm"
								aria-label="Ano da folha"
								className="w-auto"
								value={year}
								onValueChange={(value) => setYear(Number(value))}
								items={[
									...[year - 1, year, year + 1].map((y) => ({
										value: String(y),
										label: `meses de ${y}`,
									})),
								]}
							/>
							<input
								ref={inputRef}
								type="file"
								accept=".xlsx"
								className="sr-only"
								onChange={(e) => e.target.files?.[0] && send(e.target.files[0])}
							/>
							<Button
								size="sm"
								variant="primary"
								disabled={upload.isPending}
								onClick={() => inputRef.current?.click()}
							>
								{upload.isPending ? "A ler…" : "Escolher .xlsx"}
							</Button>
						</>
					)
				}
			/>
			{id ? (
				preview.data ? (
					<SheetReview key={preview.data.id} preview={preview.data} />
				) : (
					<Skeleton className="m-3 h-40" />
				)
			) : null}
		</Card>
	);
}
