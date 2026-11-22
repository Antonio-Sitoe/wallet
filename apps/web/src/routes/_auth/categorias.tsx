import { createFileRoute } from "@tanstack/react-router";
import type { Category } from "@wallet/shared";
import { PlusIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import {
	Button,
	Card,
	CardHeader,
	CategoryOptions,
	ErrorNote,
	Field,
	Page,
	PageHeader,
	PageTitle,
	Pill,
	Segmented,
	Select,
	Skeleton,
	TextInput,
} from "@/components/kit";
import {
	useCategories,
	useCreateCategory,
	useDeleteCategory,
	useSetWalletMapping,
	useUpdateCategory,
	useWalletMap,
} from "@/lib/queries";

export const Route = createFileRoute("/_auth/categorias")({
	validateSearch: z.object({ id: z.string().optional() }),
	component: CategoriesPage,
});

const PALETTE = [
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
const KIND_LABEL = {
	expense: "saída",
	income: "entrada",
	system: "sistema",
} as const;

function CategoriesPage() {
	const { id } = Route.useSearch();
	const navigate = Route.useNavigate();
	const categories = useCategories();
	const [tab, setTab] = useState<"all" | "expense" | "income">("all");
	const [creating, setCreating] = useState(false);
	const list = categories.data ?? [];
	const tops = list.filter((c) => !c.parentId);
	const childrenOf = (pid: string) => list.filter((c) => c.parentId === pid);
	const keep = (c: Category) =>
		tab === "all" ||
		c.kind === tab ||
		childrenOf(c.id).some((k) => k.kind === tab);
	const selected = list.find((c) => c.id === id);

	return (
		<>
			<PageHeader crumb={["categorias"]}>
				<Button variant="primary" onClick={() => setCreating(true)}>
					<PlusIcon className="size-3.5" strokeWidth={2.6} /> Nova categoria
				</Button>
			</PageHeader>
			<Page>
				<PageTitle
					title="Categorias"
					meta={`${tops.length} principais · ${list.length - tops.length} subcategorias`}
				/>
				{categories.error ? <ErrorNote error={categories.error} /> : null}
				{creating ? (
					<NewCategoryForm
						categories={list}
						onDone={(newId) => {
							setCreating(false);
							if (newId) navigate({ search: { id: newId } });
						}}
					/>
				) : null}

				<div className="flex flex-wrap items-start gap-[18px]">
					<Card className="min-w-0 flex-[3_1_520px] overflow-hidden">
						<div className="border-line flex items-center justify-between border-b px-3.5 py-2.5">
							<Segmented
								className="w-64"
								value={tab}
								onChange={setTab}
								options={[
									{ value: "all", label: "Todas" },
									{ value: "expense", label: "Saídas" },
									{ value: "income", label: "Entradas" },
								]}
							/>
						</div>
						{categories.isPending ? (
							<Skeleton className="m-3 h-64" />
						) : (
							<table className="w-full border-collapse">
								<thead>
									<tr className="bg-panel-2">
										{["Categoria", "Tipo", "No Wallet", "Registos"].map(
											(h, i) => (
												<th
													key={h}
													scope="col"
													className={`num border-line text-dim border-b px-3.5 py-2 text-[11px] font-medium tracking-[.06em] uppercase ${i === 3 ? "text-right" : "text-left"}`}
												>
													{h}
												</th>
											),
										)}
									</tr>
								</thead>
								<tbody>
									{tops
										.filter(keep)
										.flatMap((top) => [
											top,
											...childrenOf(top.id).filter(
												(c) => tab === "all" || c.kind === tab,
											),
										])
										.map((c) => (
											<tr
												key={c.id}
												onClick={() => navigate({ search: { id: c.id } })}
												className={`border-hover hover:bg-hover cursor-pointer border-b ${c.id === id ? "bg-hover" : ""} ${c.archived ? "opacity-50" : ""}`}
											>
												<td className="px-3.5 py-2">
													<span
														className={`flex items-center gap-2 ${c.parentId ? "text-fg-2 pl-4" : "font-medium"}`}
													>
														<span
															className="size-2.5 rounded-sm"
															style={{ background: c.color ?? "#8B949E" }}
														/>
														<button
															type="button"
															className="cursor-pointer text-left"
														>
															{c.name}
														</button>
													</span>
												</td>
												<td className="num text-fg-2 px-3.5 py-2 text-xs">
													{KIND_LABEL[c.kind]}
												</td>
												<td className="num text-dim max-w-[260px] truncate px-3.5 py-2 text-xs">
													{c.walletNames.join(", ") || "—"}
												</td>
												<td className="num px-3.5 py-2 text-right text-xs">
													{c.transactionCount || "—"}
												</td>
											</tr>
										))}
								</tbody>
							</table>
						)}
					</Card>
					{selected ? (
						<CategoryDetail
							key={selected.id}
							category={selected}
							categories={list}
							onDeleted={() => navigate({ search: {} })}
						/>
					) : null}
				</div>

				<WalletMapping categories={list} />
			</Page>
		</>
	);
}

function NewCategoryForm({
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

function CategoryDetail({
	category,
	categories,
	onDeleted,
}: {
	category: Category;
	categories: Category[];
	onDeleted: () => void;
}) {
	const update = useUpdateCategory();
	const remove = useDeleteCategory();
	const [name, setName] = useState(category.name);
	const parent = categories.find((c) => c.id === category.parentId);
	const color = category.color ?? "#8B949E";
	const hasChildren = categories.some((c) => c.parentId === category.id);

	return (
		<Card className="min-w-0 flex-[2_1_320px] overflow-hidden">
			<div className="border-line flex items-center gap-3 border-b px-4 py-3.5">
				<span
					className="size-9 rounded-lg"
					style={{ background: `${color}24`, border: `1px solid ${color}` }}
				/>
				<div className="flex min-w-0 flex-col">
					<h2 className="text-[15px] font-semibold">{category.name}</h2>
					<span className="num text-dim text-[11px]">
						{parent
							? `${parent.name} › ${category.name}`
							: "categoria principal"}{" "}
						· {KIND_LABEL[category.kind]}
					</span>
				</div>
			</div>
			<div className="flex flex-col gap-3.5 p-4">
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
								<TextInput
									value={name}
									onChange={(e) => setName(e.target.value)}
								/>
							</Field>
							<Button
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
													.map((k) =>
														update.mutateAsync({ id: k.id, color: c }),
													),
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
							variant="ghost"
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
								if (!confirm(`Apagar ${category.name}?`)) return;
								await remove.mutateAsync(category.id);
								onDeleted();
							}}
						>
							Apagar
						</Button>
					</div>
				) : null}
			</div>
		</Card>
	);
}

function WalletMapping({ categories }: { categories: Category[] }) {
	const map = useWalletMap();
	const set = useSetWalletMapping();
	const rows = (map.data ?? [])
		.slice()
		.sort(
			(a, b) =>
				Number(!!a.categoryId) - Number(!!b.categoryId) ||
				a.walletName.localeCompare(b.walletName),
		);
	const unmapped = rows.filter((r) => !r.categoryId).length;
	return (
		<Card className="overflow-hidden">
			<CardHeader
				title="Mapeamento Wallet → app"
				meta={`${rows.length} nomes do Wallet${unmapped ? ` · ${unmapped} por mapear` : ""} · usado em todas as importações`}
			/>
			<div className="grid grid-cols-1 gap-x-6 md:grid-cols-2">
				{rows.map((r) => (
					<div
						key={r.walletName}
						className="border-hover flex items-center gap-3 border-b px-3.5 py-1.5"
					>
						<span className="num min-w-0 flex-1 truncate text-xs">
							{r.walletName}
						</span>
						<span className="text-faint">→</span>
						<Select
							aria-label={`Categoria para ${r.walletName}`}
							className={`h-7 max-w-[240px] text-xs ${r.categoryId ? "" : "border-warn-line text-warn"}`}
							value={r.categoryId ?? ""}
							onChange={(e) =>
								set.mutate({
									walletName: r.walletName,
									categoryId: e.target.value || null,
								})
							}
						>
							<option value="">escolher…</option>
							<CategoryOptions categories={categories} />
							{categories
								.filter((c) => c.isSystem)
								.map((c) => (
									<option key={c.id} value={c.id}>
										{c.name}
									</option>
								))}
						</Select>
					</div>
				))}
			</div>
		</Card>
	);
}
