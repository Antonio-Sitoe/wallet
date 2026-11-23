import type { Category } from "@wallet/shared";
import { Button } from "@wallet/ui/components/button";
import { Input } from "@wallet/ui/components/input";
import { useState } from "react";
import { toast } from "sonner";
import { useDeleteCategory } from "@/actions/categories/use-delete-category";
import { useUpdateCategory } from "@/actions/categories/use-update-category";
import { KIND_LABEL } from "@/components/categories/utils";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Pill } from "@/components/ui/pill";
import { useConfirm } from "@/contexts/confirm-context";

export const PALETTE = [
	"#56D364",
	"#58A6FF",
	"#39C5BB",
	"#79C0FF",
	"#A371F7",
	"#D2A8FF",
	"#F778BA",
	"#E3B341",
	"#D29922",
	"#FF7B72",
	"#8B949E",
];

export function CategoryDetail({
	category,
	categories,
	onDeleted,
	onClose,
}: {
	category: Category;
	categories: Category[];
	onDeleted: () => void;
	onClose: () => void;
}) {
	const confirmAction = useConfirm();
	const update = useUpdateCategory();
	const remove = useDeleteCategory();
	const [name, setName] = useState(category.name);
	const parent = categories.find((c) => c.id === category.parentId);
	const color = category.color ?? "#8B949E";
	const hasChildren = categories.some((c) => c.parentId === category.id);

	return (
		<Dialog
			open
			onOpenChange={(open) => {
				if (!open) onClose();
			}}
			width={480}
			title={
				<span className="flex items-center gap-3">
					<span
						className="size-9 shrink-0 rounded-lg"
						style={{ background: `${color}24`, border: `1px solid ${color}` }}
					/>
					<span className="flex min-w-0 flex-col">
						<span>{category.name}</span>
						<span className="num text-dim text-[11px] font-normal">
							{parent
								? `${parent.name} › ${category.name}`
								: "categoria principal"}{" "}
							· {KIND_LABEL[category.kind]}
						</span>
					</span>
				</span>
			}
		>
			{category.isSystem ? (
				<p className="text-fg-2">
					Categoria de sistema, gerida pela app (transferências). Não se edita
					nem apaga.
				</p>
			) : (
				<>
					<form
						className="grid grid-cols-[1fr_auto] items-end gap-2"
						onSubmit={async (e) => {
							e.preventDefault();
							await update.mutateAsync({
								id: category.id,
								name: name.trim(),
							});
							toast.success("Categoria actualizada");
						}}
					>
						<Field label="Nome">
							<Input value={name} onChange={(e) => setName(e.target.value)} />
						</Field>
						<Button
							variant="neutral"
							type="submit"
							disabled={!name.trim() || name === category.name}
						>
							Guardar
						</Button>
					</form>
					<div className="flex flex-col gap-1.5">
						<span className="text-fg-2 text-xs">
							Cor{hasChildren ? " (aplica-se às subcategorias)" : ""}
						</span>
						<div className="flex flex-wrap gap-1.5">
							{PALETTE.map((c) => (
								<button
									key={c}
									type="button"
									aria-label={c}
									aria-pressed={c.toLowerCase() === color.toLowerCase()}
									onClick={async () => {
										await update.mutateAsync({ id: category.id, color: c });
										await Promise.all(
											categories
												.filter((k) => k.parentId === category.id)
												.map((k) => update.mutateAsync({ id: k.id, color: c })),
										);
									}}
									className="size-6 cursor-pointer rounded-md"
									style={{
										background: c,
										outline:
											c.toLowerCase() === color.toLowerCase()
												? "2px solid #E6E8EB"
												: "none",
										outlineOffset: 2,
									}}
								/>
							))}
						</div>
					</div>
				</>
			)}
			<div className="flex flex-col gap-1.5">
				<span className="text-fg-2 text-xs">Importa do Wallet</span>
				<div className="flex flex-wrap gap-1.5">
					{category.walletNames.length ? (
						category.walletNames.map((w) => <Pill key={w}>{w}</Pill>)
					) : (
						<Pill>sem origem</Pill>
					)}
				</div>
			</div>
			<span className="num text-dim text-[11px]">
				{category.transactionCount} transacções
			</span>
			{!category.isSystem ? (
				<div className="flex gap-2">
					<Button
						variant="quiet"
						onClick={() =>
							update.mutate({ id: category.id, archived: !category.archived })
						}
					>
						{category.archived ? "Reactivar" : "Arquivar"}
					</Button>
					<Button
						variant="danger"
						className="ml-auto"
						disabled={category.transactionCount > 0 || hasChildren}
						title={
							category.transactionCount > 0
								? "Em uso: arquive em vez de apagar"
								: hasChildren
									? "Tem subcategorias"
									: undefined
						}
						onClick={async () => {
							if (!(await confirmAction({ title: `Apagar ${category.name}?` })))
								return;
							await remove.mutateAsync(category.id);
							onDeleted();
						}}
					>
						Apagar
					</Button>
				</div>
			) : null}
		</Dialog>
	);
}
