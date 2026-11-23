import { getRouteApi } from "@tanstack/react-router";
import type { Category } from "@wallet/shared";
import { PlusIcon } from "lucide-react";
import { useState } from "react";
import { CategoryDetail } from "@/components/categories/category-detail";
import { NewCategoryForm } from "@/components/categories/new-category-form";
import { KIND_LABEL } from "@/components/categories/utils";
import { WalletMapping } from "@/components/categories/wallet-mapping";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ErrorNote } from "@/components/ui/error-note";
import { Page } from "@/components/ui/page";
import { PageHeader } from "@/components/ui/page-header";
import { PageTitle } from "@/components/ui/page-title";
import { Segmented } from "@/components/ui/segmented";
import { Skeleton } from "@/components/ui/skeleton";
import { useCategories } from "@/lib/queries";

const route = getRouteApi("/_private/categories");

export function CategoriesPage() {
	const { id } = route.useSearch();
	const navigate = route.useNavigate();
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
