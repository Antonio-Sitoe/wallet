import type { TemplateType, TransactionTemplate } from "@wallet/shared";
import { Button } from "@wallet/ui/components/button";
import { Input } from "@wallet/ui/components/input";
import { Skeleton } from "@wallet/ui/components/skeleton";
import {
	ArrowDownIcon,
	ArrowLeftRightIcon,
	ArrowUpIcon,
	MinusIcon,
	PencilIcon,
	PlusIcon,
	Trash2Icon,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useAccounts } from "@/actions/accounts/use-accounts";
import { useCategories } from "@/actions/categories/use-categories";
import {
	useCreateTemplate,
	useDeleteTemplate,
	useReorderTemplates,
	useUpdateTemplate,
} from "@/actions/settings/use-template-mutations";
import { useTemplates } from "@/actions/settings/use-templates";
import { SettingsSection } from "@/components/settings/settings-row";
import { categoryItems } from "@/components/ui/category-items";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { MoneyInput } from "@/components/ui/money-input";
import { Segmented } from "@/components/ui/segmented";
import { Select } from "@/components/ui/select";
import { useConfirm } from "@/contexts/confirm-context";
import { money, moneyInput, parseMoney } from "@/utils/format";

const TYPE_ICON = {
	expense: { icon: MinusIcon, className: "bg-warn-bg text-warn" },
	income: { icon: PlusIcon, className: "bg-money-bg text-money" },
	transfer: { icon: ArrowLeftRightIcon, className: "bg-info-bg text-info" },
} as const;

export function TemplatesSection() {
	const templates = useTemplates();
	const accounts = useAccounts(true).data ?? [];
	const categories = useCategories().data ?? [];
	const reorder = useReorderTemplates();
	const remove = useDeleteTemplate();
	const confirmAction = useConfirm();
	const [editing, setEditing] = useState<TransactionTemplate | "new" | null>(
		null,
	);
	const list = templates.data ?? [];

	const accountName = (id: string | null) =>
		accounts.find((a) => a.id === id)?.name;
	const categoryName = (id: string | null) =>
		categories.find((c) => c.id === id)?.name;

	const describe = (t: TransactionTemplate) =>
		[
			t.type === "transfer"
				? `${accountName(t.accountId) ?? "?"} → ${accountName(t.toAccountId) ?? "?"}`
				: accountName(t.accountId),
			t.type === "transfer" ? null : categoryName(t.categoryId),
			t.payee,
		]
			.filter(Boolean)
			.join(" · ") || "sem conta nem categoria";

	const move = (index: number, by: number) => {
		const ids = list.map((t) => t.id);
		const [id] = ids.splice(index, 1);
		if (!id) return;
		ids.splice(index + by, 0, id);
		reorder.mutate(ids);
	};

	return (
		<SettingsSection
			title="Modelos de registo"
			description="Registos frequentes com um clique: aparecem como botões no ecrã Transacções e no formulário de nova transacção."
		>
			{templates.isPending ? (
				<Skeleton className="my-3 h-24" />
			) : list.length === 0 ? (
				<div className="text-dim py-6 text-center text-[13px]">
					Ainda não há modelos. Crie um para o transporte diário, o pão ou o
					Xitique do mês.
				</div>
			) : (
				list.map((t, index) => {
					const type = TYPE_ICON[t.type];
					const Icon = type.icon;
					return (
						<div key={t.id} className="group flex items-center gap-3 py-2.5">
							<span
								className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${type.className}`}
							>
								<Icon className="size-4" />
							</span>
							<span className="flex min-w-0 flex-1 flex-col">
								<span className="truncate text-[13px] font-medium">
									{t.name}
								</span>
								<span className="text-dim truncate text-[11px]">
									{describe(t)}
								</span>
							</span>
							<span className="num text-fg-2 shrink-0 text-xs">
								{t.amount ? money(t.amount) : "valor livre"}
							</span>
							<span className="flex shrink-0 items-center">
								<Button
									variant="quiet"
									size="icon-xs"
									aria-label={`Subir ${t.name}`}
									disabled={index === 0 || reorder.isPending}
									onClick={() => move(index, -1)}
								>
									<ArrowUpIcon />
								</Button>
								<Button
									variant="quiet"
									size="icon-xs"
									aria-label={`Descer ${t.name}`}
									disabled={index === list.length - 1 || reorder.isPending}
									onClick={() => move(index, 1)}
								>
									<ArrowDownIcon />
								</Button>
								<Button
									variant="quiet"
									size="icon-xs"
									aria-label={`Editar ${t.name}`}
									onClick={() => setEditing(t)}
								>
									<PencilIcon />
								</Button>
								<Button
									variant="quiet"
									size="icon-xs"
									aria-label={`Apagar ${t.name}`}
									onClick={async () => {
										if (
											!(await confirmAction({
												title: `Apagar o modelo ${t.name}?`,
											}))
										)
											return;
										await remove.mutateAsync(t.id);
										toast.success("Modelo apagado");
									}}
								>
									<Trash2Icon />
								</Button>
							</span>
						</div>
					);
				})
			)}
			<div className="pt-3">
				<Button variant="neutral" onClick={() => setEditing("new")}>
					<PlusIcon className="size-3.5" /> Novo modelo
				</Button>
			</div>
			{editing ? (
				<TemplateDialog
					template={editing === "new" ? null : editing}
					accounts={accounts.filter((a) => !a.archived)}
					categories={categories}
					onClose={() => setEditing(null)}
				/>
			) : null}
		</SettingsSection>
	);
}

function TemplateDialog({
	template,
	accounts,
	categories,
	onClose,
}: {
	template: TransactionTemplate | null;
	accounts: { id: string; name: string }[];
	categories: Parameters<typeof categoryItems>[0];
	onClose: () => void;
}) {
	const create = useCreateTemplate();
	const update = useUpdateTemplate();
	const [name, setName] = useState(template?.name ?? "");
	const [type, setType] = useState<TemplateType>(template?.type ?? "expense");
	const [amount, setAmount] = useState(moneyInput(template?.amount));
	const [accountId, setAccountId] = useState(template?.accountId ?? "");
	const [toAccountId, setToAccountId] = useState(template?.toAccountId ?? "");
	const [categoryId, setCategoryId] = useState(template?.categoryId ?? "");
	const [payee, setPayee] = useState(template?.payee ?? "");
	const [note, setNote] = useState(template?.note ?? "");
	const cents = amount.trim() ? parseMoney(amount) : null;
	const amountInvalid = amount.trim() !== "" && (cents === null || cents <= 0);
	const sameAccount =
		type === "transfer" && !!accountId && accountId === toAccountId;
	const pending = create.isPending || update.isPending;

	async function save() {
		if (!name.trim() || amountInvalid || sameAccount) return;
		const body = {
			name: name.trim(),
			type,
			amount: cents,
			accountId: accountId || null,
			toAccountId: type === "transfer" ? toAccountId || null : null,
			categoryId: type === "transfer" ? null : categoryId || null,
			payee: payee.trim() || null,
			note: note.trim() || null,
		};
		if (template) await update.mutateAsync({ id: template.id, ...body });
		else await create.mutateAsync(body);
		toast.success(template ? "Modelo guardado" : "Modelo criado");
		onClose();
	}

	const accountItems = [
		{ value: "", label: "Escolher ao registar" },
		...accounts.map((a) => ({ value: a.id, label: a.name })),
	];

	return (
		<Dialog
			open
			onOpenChange={(open) => !open && onClose()}
			title={template ? "Editar modelo" : "Novo modelo"}
			description="sem valor = pergunta o valor ao registar"
			width={480}
			footer={
				<>
					<Button variant="quiet" onClick={onClose}>
						Cancelar
					</Button>
					<Button
						variant="primary"
						onClick={save}
						disabled={!name.trim() || amountInvalid || sameAccount}
						isLoading={pending}
					>
						Guardar
					</Button>
				</>
			}
		>
			<form
				className="flex flex-col gap-3"
				onSubmit={(e) => {
					e.preventDefault();
					save();
				}}
			>
				<Segmented<TemplateType>
					value={type}
					onChange={setType}
					options={[
						{ value: "expense", label: "Despesa" },
						{ value: "income", label: "Entrada" },
						{ value: "transfer", label: "Transferência" },
					]}
				/>
				<div className="grid grid-cols-2 gap-2.5">
					<Field label="Nome">
						<Input
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="Transporte"
							maxLength={60}
							autoFocus
						/>
					</Field>
					<Field
						label="Valor (MZN)"
						hint={amountInvalid ? "valor inválido" : undefined}
					>
						<MoneyInput
							value={amount}
							onChange={(e) => setAmount(e.target.value)}
							placeholder="livre"
						/>
					</Field>
					<Field label={type === "transfer" ? "De" : "Conta"}>
						<Select
							value={accountId}
							onValueChange={setAccountId}
							items={accountItems}
						/>
					</Field>
					{type === "transfer" ? (
						<Field
							label="Para"
							hint={sameAccount ? "tem de ser outra conta" : undefined}
						>
							<Select
								value={toAccountId}
								onValueChange={setToAccountId}
								items={accountItems}
							/>
						</Field>
					) : (
						<Field label="Categoria">
							<Select
								value={categoryId}
								onValueChange={setCategoryId}
								items={[
									{ value: "", label: "Sem categoria" },
									...categoryItems(categories, type),
								]}
							/>
						</Field>
					)}
				</div>
				{type === "transfer" ? null : (
					<Field label="Payee">
						<Input
							value={payee}
							onChange={(e) => setPayee(e.target.value)}
							placeholder="opcional"
						/>
					</Field>
				)}
				<Field label="Nota">
					<Input
						value={note}
						onChange={(e) => setNote(e.target.value)}
						placeholder="opcional"
					/>
				</Field>
				<button type="submit" className="hidden" />
			</form>
		</Dialog>
	);
}
