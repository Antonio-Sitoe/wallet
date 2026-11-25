import { ArrowLeftRightIcon, ScaleIcon } from "lucide-react";
import { Link } from "react-router";
import { useAccounts } from "@/actions/accounts/use-accounts";
import { useCategories } from "@/actions/categories/use-categories";
import { useTransactionPages } from "@/actions/transactions/use-transaction-pages";
import { Empty } from "@/components/dashboard/empty";
import { Loading } from "@/components/dashboard/loading";
import { searchHref } from "@/lib/search-params";
import { ink, tint } from "@/utils/color";
import { dayKey, dayLabel, signedMoney } from "@/utils/format";

export function LastRecordsCard() {
	const page = useTransactionPages({}, 6).data?.pages[0]?.items;
	const categories = useCategories().data ?? [];
	const accounts = useAccounts().data ?? [];
	if (!page) return <Loading />;
	if (page.length === 0) return <Empty>Ainda não há transacções.</Empty>;
	return (
		<ul className="flex flex-col">
			{page.map((t) => {
				const c = categories.find((x) => x.id === t.categoryId);
				return (
					<li key={t.id} className="border-hover border-b last:border-0">
						<Link
							to={searchHref("transactions", { id: t.id })}
							className="text-fg hover:bg-hover flex items-center gap-3 py-2 no-underline"
						>
							<span
								aria-hidden="true"
								className="num flex size-7 items-center justify-center rounded-md text-xs font-semibold"
								style={{
									background: tint(c?.color ?? "var(--color-dim)"),
									color: ink(c?.color ?? "var(--color-dim)"),
								}}
							>
								{t.type === "transfer" ? (
									<ArrowLeftRightIcon className="size-3.5" />
								) : t.type === "adjustment" ? (
									<ScaleIcon className="size-3.5" />
								) : (
									(c?.name[0] ?? "?")
								)}
							</span>
							<span className="flex min-w-0 flex-1 flex-col">
								<span className="truncate">
									{t.type === "transfer"
										? "Transferência"
										: t.type === "adjustment"
											? "Acerto de saldo"
											: (c?.name ?? "Sem categoria")}
								</span>
								<span className="num text-dim text-[11px]">
									{accounts.find((a) => a.id === t.accountId)?.name} ·{" "}
									{dayLabel(dayKey(t.occurredAt))}
								</span>
							</span>
							<span
								className={`num ${t.amount > 0 && (t.type === "income" || t.type === "expense") ? "text-money" : ""}`}
							>
								{signedMoney(t.amount)}
							</span>
						</Link>
					</li>
				);
			})}
		</ul>
	);
}
