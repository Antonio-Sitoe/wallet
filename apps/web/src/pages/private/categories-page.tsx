import type { Category } from "@wallet/shared";
import { Button } from "@wallet/ui/components/button";
import { Skeleton } from "@wallet/ui/components/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@wallet/ui/components/table";
import { PlusIcon } from "lucide-react";
import { useState } from "react";
import { useCategories } from "@/actions/categories/use-categories";
import { CategoryDetail } from "@/components/categories/category-detail";
import { NewCategoryDialog } from "@/components/categories/new-category-dialog";
import { KIND_LABEL } from "@/components/categories/utils";
import { WalletMapping } from "@/components/categories/wallet-mapping";
import { Card } from "@/components/ui/card";
import { ErrorNote } from "@/components/ui/error-note";
import { Page } from "@/components/ui/page";
import { PageHeader } from "@/components/ui/page-header";
import { PageTitle } from "@/components/ui/page-title";
import { Segmented } from "@/components/ui/segmented";
import { useOnline } from "@/lib/connection";
import { usePageNavigate, usePageSearch } from "@/lib/search-params";

export function CategoriesPage() {
	const { id } = usePageSearch("categories");
	const navigate = usePageNavigate("categories");
	const categories = useCategories();
	const [tab, setTab] = useState<"all" | "expense" | "income">("all");
	const [creating, setCreating] = useState(false);
	const online = useOnline();
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
				{online ? (
					<Button variant="primary" onClick={() => setCreating(true)}>
						<PlusIcon className="size-3.5" strokeWidth={2.6} /> Nova categoria
					</Button>
				) : null}
			</PageHeader>
			<Page>
				<PageTitle
					title="Categorias"
					meta={`${tops.length} principais · ${list.length - tops.length} subcategorias`}
				/>
				{categories.error ? <ErrorNote error={categories.error} /> : null}
				{creating ? (
					<NewCategoryDialog
						categories={list}
						onClose={() => setCreating(false)}
					/>
				) : null}

				<div className="flex flex-wrap items-start gap-[18px]">
					<Card className="min-w-0 flex-1 overflow-hidden">
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
							<Table className="w-full border-collapse text-[13px]">
								<TableHeader>
									<TableRow className="bg-panel-2 border-0 hover:bg-transparent">
										{["Categoria", "Tipo", "No Wallet", "Registos"].map(
											(h, i) => (
												<TableHead
													key={h}
													scope="col"
													className={`num border-line text-dim border-b px-3.5 py-2 text-[11px] font-medium tracking-[.06em] uppercase ${i === 3 ? "text-right" : "text-left"} ${i === 2 ? "hidden md:table-cell" : ""} h-auto whitespace-normal`}
												>
													{h}
												</TableHead>
											),
										)}
									</TableRow>
								</TableHeader>
								<TableBody>
									{tops
										.filter(keep)
										.flatMap((top) => [
											top,
											...childrenOf(top.id).filter(
												(c) => tab === "all" || c.kind === tab,
											),
										])
										.map((c) => (
											<TableRow
												key={c.id}
												onClick={() => navigate({ search: { id: c.id } })}
												className={`border-hover hover:bg-hover cursor-pointer border-b ${c.id === id ? "bg-hover" : ""} ${c.archived ? "opacity-50" : ""}`}
											>
												<TableCell className="px-3.5 py-2 whitespace-normal">
													<span
														className={`flex items-center gap-2 ${c.parentId ? "text-fg-2 pl-4" : "font-medium"}`}
													>
														<span
															className="size-2.5 rounded-sm"
															style={{
																background: c.color ?? "var(--color-dim)",
															}}
														/>
														<button
															type="button"
															className="cursor-pointer text-left"
														>
															{c.name}
														</button>
													</span>
												</TableCell>
												<TableCell className="num text-fg-2 px-3.5 py-2 text-xs whitespace-normal">
													{KIND_LABEL[c.kind]}
												</TableCell>
												<TableCell className="num text-dim hidden max-w-[260px] truncate px-3.5 py-2 text-xs md:table-cell">
													{c.walletNames.join(", ") || "—"}
												</TableCell>
												<TableCell className="num px-3.5 py-2 text-right text-xs whitespace-normal">
													{c.transactionCount || "—"}
												</TableCell>
											</TableRow>
										))}
								</TableBody>
							</Table>
						)}
					</Card>
					{selected && online ? (
						<CategoryDetail
							key={selected.id}
							category={selected}
							categories={list}
							onDeleted={() => navigate({ search: {} })}
							onClose={() => navigate({ search: {} })}
						/>
					) : null}
				</div>

				<WalletMapping categories={list} />
			</Page>
		</>
	);
}
