import type { ShoppingItem, ShoppingListSummary } from "@wallet/shared";
import { Button } from "@wallet/ui/components/button";
import { Skeleton } from "@wallet/ui/components/skeleton";
import { cn } from "@wallet/ui/lib/utils";
import {
	ArchiveIcon,
	ArchiveRestoreIcon,
	CopyIcon,
	PencilIcon,
	PlusIcon,
	Trash2Icon,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import { useAccounts } from "@/actions/accounts/use-accounts";
import { useDeleteShoppingList } from "@/actions/shopping/use-delete-shopping-list";
import { useDuplicateShoppingList } from "@/actions/shopping/use-duplicate-shopping-list";
import { useRemoveShoppingItem } from "@/actions/shopping/use-remove-shopping-item";
import { useShoppingList } from "@/actions/shopping/use-shopping-list";
import { useShoppingLists } from "@/actions/shopping/use-shopping-lists";
import { useUnbuyShoppingItem } from "@/actions/shopping/use-unbuy-shopping-item";
import { useUpdateShoppingList } from "@/actions/shopping/use-update-shopping-list";
import { BuyItemDialog } from "@/components/shopping/buy-item-dialog";
import { ItemDialog } from "@/components/shopping/item-dialog";
import { ListDialog } from "@/components/shopping/list-dialog";
import { QuickAdd } from "@/components/shopping/quick-add";
import { ShoppingItemRow } from "@/components/shopping/shopping-item-row";
import { itemsLabel } from "@/components/shopping/utils";
import { Card } from "@/components/ui/card";
import { CardHeader } from "@/components/ui/card-header";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorNote } from "@/components/ui/error-note";
import { Page } from "@/components/ui/page";
import { PageHeader } from "@/components/ui/page-header";
import { PageTitle } from "@/components/ui/page-title";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Stat } from "@/components/ui/stat";
import { StatRow } from "@/components/ui/stat-row";
import { useConfirm } from "@/contexts/confirm-context";
import {
	searchHref,
	usePageNavigate,
	usePageSearch,
} from "@/lib/search-params";
import { addMonths, currentMonth, money, monthLabel } from "@/utils/format";

type Editing = { kind: "new" } | { kind: "edit"; list: ShoppingListSummary };

export function ShoppingPage() {
	const { id, archived } = usePageSearch("shopping");
	const navigate = usePageNavigate("shopping");
	const confirm = useConfirm();
	const lists = useShoppingLists(!!archived);
	const all = lists.data ?? [];
	const selectedId = id && all.some((l) => l.id === id) ? id : all[0]?.id;
	const detail = useShoppingList(selectedId);
	const list = detail.data;
	const accounts = useAccounts(true).data ?? [];
	const updateList = useUpdateShoppingList();
	const deleteList = useDeleteShoppingList();
	const duplicateList = useDuplicateShoppingList();
	const removeItem = useRemoveShoppingItem();
	const unbuy = useUnbuyShoppingItem();
	const [editing, setEditing] = useState<Editing | null>(null);
	const [buying, setBuying] = useState<ShoppingItem | null>(null);
	const [editingItem, setEditingItem] = useState<ShoppingItem | null>(null);

	const select = (next?: string) =>
		navigate({ search: { archived, id: next } });
	const accountName = (accountId: string | null) =>
		accounts.find((a) => a.id === accountId)?.name;

	const toBuy = list?.items.filter((i) => !i.bought) ?? [];
	const bought = list?.items.filter((i) => i.bought) ?? [];
	const totals = list?.totals;
	const diff = totals ? totals.actual - totals.estimatedBought : 0;

	async function toggle(item: ShoppingItem) {
		if (!list) return;
		if (!item.bought) return setBuying(item);
		const ok = await confirm({
			title: `Desmarcar ${item.name}?`,
			description: `A despesa de ${money(item.actual ?? 0)} MZN é apagada.`,
			confirmLabel: "Desmarcar",
			destructive: true,
		});
		if (ok) await unbuy.mutateAsync({ listId: list.id, itemId: item.id });
	}

	async function remove(item: ShoppingItem) {
		if (!list) return;
		if (item.bought) {
			const ok = await confirm({
				title: `Apagar ${item.name}?`,
				description:
					"O item sai da lista; a despesa já registada fica nas transacções.",
				confirmLabel: "Apagar",
				destructive: true,
			});
			if (!ok) return;
		}
		await removeItem.mutateAsync({ listId: list.id, itemId: item.id });
	}

	async function duplicate() {
		if (!list || duplicateList.isPending) return;
		const copy = await duplicateList.mutateAsync({
			id: list.id,
			name: `${list.name} · ${monthLabel(addMonths(currentMonth(), 1))}`,
		});
		toast.success(`${copy.name} criada com ${itemsLabel(copy.totals.items)}`, {
			description: list.archived
				? undefined
				: "Arquiva a lista antiga quando já não precisares dela.",
		});
		select(copy.id);
	}

	async function removeList() {
		if (!list) return;
		const ok = await confirm({
			title: `Apagar a lista ${list.name}?`,
			description: list.totals.bought
				? `As ${list.totals.bought} compras já registadas ficam nas transacções.`
				: undefined,
			confirmLabel: "Apagar lista",
			destructive: true,
		});
		if (!ok) return;
		await deleteList.mutateAsync(list.id);
		toast.success(`Lista ${list.name} apagada`);
		select(undefined);
	}

	const newButton = (
		<Button variant="primary" onClick={() => setEditing({ kind: "new" })}>
			<PlusIcon className="size-3.5" strokeWidth={2.6} /> Nova lista
		</Button>
	);

	return (
		<>
			<PageHeader crumb={["compras"]}>
				<Link
					to={searchHref("shopping", { archived: !archived })}
					className="text-fg-2 hover:text-fg text-xs"
				>
					{archived ? "Esconder arquivadas" : "Mostrar arquivadas"}
				</Link>
				{newButton}
			</PageHeader>
			<Page>
				<PageTitle
					title="Lista de compras"
					meta="marcar comprado cria a despesa com o preço real"
				/>
				{lists.error ? <ErrorNote error={lists.error} /> : null}

				{lists.isPending ? (
					<Skeleton className="h-64" />
				) : all.length === 0 ? (
					<EmptyState title="Ainda não há listas" actions={newButton}>
						Cria uma lista para o rancho ou para o mercado, escreve os itens com
						o preço que esperas e vai marcando o que compras. Cada compra fica
						registada como despesa.
					</EmptyState>
				) : (
					<>
						<nav aria-label="Listas" className="flex flex-wrap gap-2">
							{all.map((l) => {
								const active = l.id === selectedId;
								return (
									<button
										key={l.id}
										type="button"
										aria-pressed={active}
										onClick={() => select(l.id)}
										className={cn(
											"rounded-control flex h-8 cursor-pointer items-center gap-2 border px-3",
											active
												? "border-money-line bg-money-bg text-fg"
												: "border-line bg-panel text-fg-2 hover:bg-hover hover:text-fg",
											l.archived && "opacity-60",
										)}
									>
										<span className="font-medium">{l.name}</span>
										<span className="num text-dim text-[11px]">
											{l.totals.bought}/{l.totals.items}
										</span>
									</button>
								);
							})}
						</nav>

						{totals ? (
							<StatRow>
								<Stat
									label="Estimado"
									value={money(totals.estimated)}
									note={itemsLabel(totals.items)}
								/>
								<Stat
									label="Real"
									value={money(totals.actual)}
									note={`${totals.bought} comprados · estimado ${money(totals.estimatedBought)}`}
									tone={totals.bought ? undefined : "dim"}
								/>
								<Stat
									label="Diferença"
									value={
										diff === 0
											? "0"
											: `${diff > 0 ? "+" : "−"}${money(Math.abs(diff))}`
									}
									note="real − estimado do que já compraste"
									tone={diff > 0 ? "warn" : diff < 0 ? "ok" : "dim"}
								/>
								<Stat
									label="Por comprar"
									value={money(totals.estimatedLeft)}
									note={itemsLabel(totals.items - totals.bought)}
									tone={totals.items - totals.bought ? undefined : "dim"}
								/>
							</StatRow>
						) : null}

						{detail.error ? <ErrorNote error={detail.error} /> : null}
						{!list ? (
							<Skeleton className="h-64" />
						) : (
							<Card className="overflow-hidden">
								<CardHeader
									title={list.name}
									meta={[
										accountName(list.accountId) ?? "conta ao marcar",
										list.monthItem
											? `orçamento: ${list.monthItem.name} · ${monthLabel(list.monthItem.month)}`
											: "sem item do orçamento",
									].join(" · ")}
									actions={
										<>
											<Button
												size="sm"
												variant="neutral"
												onClick={() => setEditing({ kind: "edit", list })}
											>
												<PencilIcon className="size-3.5" /> Editar
											</Button>
											<Button
												size="sm"
												variant="neutral"
												disabled={duplicateList.isPending}
												onClick={duplicate}
											>
												<CopyIcon className="size-3.5" /> Duplicar
											</Button>
											<Button
												size="sm"
												variant="neutral"
												onClick={() =>
													updateList.mutate({
														id: list.id,
														archived: !list.archived,
													})
												}
											>
												{list.archived ? (
													<ArchiveRestoreIcon className="size-3.5" />
												) : (
													<ArchiveIcon className="size-3.5" />
												)}
												{list.archived ? "Desarquivar" : "Arquivar"}
											</Button>
											<Button
												size="icon-sm"
												variant="quiet"
												aria-label="Apagar lista"
												onClick={removeList}
											>
												<Trash2Icon className="size-3.5" />
											</Button>
										</>
									}
								/>
								{list.totals.items ? (
									<div className="border-line border-b px-3.5 py-2.5">
										<ProgressBar
											value={list.totals.bought}
											max={list.totals.items}
										/>
									</div>
								) : null}
								{list.archived ? null : <QuickAdd listId={list.id} />}

								{list.items.length === 0 ? (
									<p className="text-dim px-3.5 py-8 text-center">
										Lista vazia. Escreve o primeiro item acima.
									</p>
								) : null}
								{toBuy.map((item) => (
									<ShoppingItemRow
										key={item.id}
										item={item}
										onToggle={() => toggle(item)}
										onEdit={() => setEditingItem(item)}
										onRemove={() => remove(item)}
									/>
								))}
								{bought.length ? (
									<>
										<div className="num text-dim bg-panel-2 border-line border-y px-3.5 py-1.5 text-[11px] tracking-[.06em] uppercase">
											Comprados · {bought.length}
										</div>
										{bought.map((item) => (
											<ShoppingItemRow
												key={item.id}
												item={item}
												accountName={accountName(item.accountId)}
												onToggle={() => toggle(item)}
												onEdit={() => setEditingItem(item)}
												onRemove={() => remove(item)}
											/>
										))}
									</>
								) : null}
							</Card>
						)}
					</>
				)}
			</Page>

			{editing ? (
				<ListDialog
					list={editing.kind === "edit" ? editing.list : undefined}
					onClose={() => setEditing(null)}
					onSaved={(savedId) => {
						setEditing(null);
						select(savedId);
					}}
				/>
			) : null}
			{list && buying ? (
				<BuyItemDialog
					list={list}
					item={buying}
					onClose={() => setBuying(null)}
				/>
			) : null}
			{list && editingItem ? (
				<ItemDialog
					listId={list.id}
					item={editingItem}
					onClose={() => setEditingItem(null)}
				/>
			) : null}
		</>
	);
}
