import type { Category } from "@wallet/shared";
import { Card } from "@/components/ui/card";
import { CardHeader } from "@/components/ui/card-header";
import { CategoryOptions } from "@/components/ui/category-options";
import { Select } from "@/components/ui/select";
import { useSetWalletMapping, useWalletMap } from "@/lib/queries";

export function WalletMapping({ categories }: { categories: Category[] }) {
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
