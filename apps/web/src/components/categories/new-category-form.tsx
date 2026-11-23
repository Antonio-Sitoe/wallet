import type { Category } from "@wallet/shared";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CardHeader } from "@/components/ui/card-header";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { TextInput } from "@/components/ui/text-input";
import { useCreateCategory } from "@/lib/queries";

export function NewCategoryForm({
	categories,
	onDone,
}: {
	categories: Category[];
	onDone: (id?: string) => void;
}) {
	const create = useCreateCategory();
	const [name, setName] = useState("");
	const [kind, setKind] = useState<"expense" | "income">("expense");
	const [parentId, setParentId] = useState("");
	const parent = categories.find((c) => c.id === parentId);
	return (
		<Card>
			<CardHeader
				title="Nova categoria"
				meta="dois níveis: principal › subcategoria"
			/>
			<form
				className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-[2fr_1fr_2fr_auto] sm:items-end"
				onSubmit={async (e) => {
					e.preventDefault();
					const created = await create.mutateAsync({
						name: name.trim(),
						kind,
						parentId: parentId || null,
						color: parent?.color ?? undefined,
					});
					toast.success(`Categoria ${created.name} criada`);
					onDone(created.id);
				}}
			>
				<Field label="Nome">
					<TextInput
						autoFocus
						value={name}
						onChange={(e) => setName(e.target.value)}
						placeholder="Ex.: Vovó Ester"
					/>
				</Field>
				<Field label="Tipo">
					<Select
						value={kind}
						onChange={(e) => setKind(e.target.value as "expense" | "income")}
					>
						<option value="expense">Saída</option>
						<option value="income">Entrada</option>
					</Select>
				</Field>
				<Field label="Categoria mãe">
					<Select
						value={parentId}
						onChange={(e) => setParentId(e.target.value)}
					>
						<option value="">Nenhuma (principal)</option>
						{categories
							.filter((c) => !c.parentId && !c.isSystem)
							.map((c) => (
								<option key={c.id} value={c.id}>
									{c.name}
								</option>
							))}
					</Select>
				</Field>
				<div className="flex gap-2">
					<Button onClick={() => onDone()}>Cancelar</Button>
					<Button
						type="submit"
						variant="primary"
						disabled={!name.trim() || create.isPending}
					>
						Criar
					</Button>
				</div>
			</form>
		</Card>
	);
}
