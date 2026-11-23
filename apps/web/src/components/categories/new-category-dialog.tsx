import type { Category } from "@wallet/shared";
import { Button } from "@wallet/ui/components/button";
import { Input } from "@wallet/ui/components/input";
import { useState } from "react";
import { toast } from "sonner";
import { useCreateCategory } from "@/actions/categories/use-create-category";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/select";

const FORM_ID = "new-category-form";

export function NewCategoryDialog({
	categories,
	onClose,
}: {
	categories: Category[];
	onClose: () => void;
}) {
	const create = useCreateCategory();
	const [name, setName] = useState("");
	const [kind, setKind] = useState<"expense" | "income">("expense");
	const [parentId, setParentId] = useState("");
	const parent = categories.find((c) => c.id === parentId);
	const canSubmit = !!name.trim() && !create.isPending;
	return (
		<Dialog
			open
			onOpenChange={(open) => {
				if (!open) onClose();
			}}
			title="Nova categoria"
			description="dois níveis: principal › subcategoria"
			width={480}
			footer={
				<>
					<Button variant="neutral" onClick={onClose}>
						Cancelar
					</Button>
					<Button
						type="submit"
						form={FORM_ID}
						variant="primary"
						disabled={!canSubmit}
					>
						Criar categoria
					</Button>
				</>
			}
		>
			<form
				id={FORM_ID}
				className="flex flex-col gap-3.5"
				onSubmit={async (e) => {
					e.preventDefault();
					if (!canSubmit) return;
					const created = await create.mutateAsync({
						name: name.trim(),
						kind,
						parentId: parentId || null,
						color: parent?.color ?? undefined,
					});
					toast.success(`Categoria ${created.name} criada`);
					onClose();
				}}
			>
				<Field label="Nome">
					<Input
						value={name}
						onChange={(e) => setName(e.target.value)}
						placeholder="Ex.: Vovó Ester"
					/>
				</Field>
				<div className="grid grid-cols-2 gap-3">
					<Field label="Tipo">
						<Select
							value={kind}
							onValueChange={(value) => setKind(value as "expense" | "income")}
							items={[
								{ value: "expense", label: "Saída" },
								{ value: "income", label: "Entrada" },
							]}
						/>
					</Field>
					<Field label="Categoria mãe">
						<Select
							value={parentId}
							onValueChange={(value) => setParentId(value)}
							items={[
								{ value: "", label: "Nenhuma (principal)" },
								...categories
									.filter((c) => !c.parentId && !c.isSystem)
									.map((c) => ({ value: c.id, label: c.name })),
							]}
						/>
					</Field>
				</div>
			</form>
		</Dialog>
	);
}
