import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@wallet/ui/components/table";
import { Link } from "react-router";
import { useAccounts } from "@/actions/accounts/use-accounts";
import { Empty } from "@/components/dashboard/empty";
import { Loading } from "@/components/dashboard/loading";
import { searchHref } from "@/lib/search-params";
import { ACCOUNT_TYPE_LABEL, money } from "@/utils/format";

export function AccountsCard() {
	const accounts = useAccounts().data;
	if (!accounts) return <Loading />;
	if (accounts.length === 0) return <Empty>Ainda não há contas.</Empty>;
	return (
		<Table className="w-full border-collapse text-[13px]">
			<TableHeader>
				<TableRow className="border-0 hover:bg-transparent">
					{["Conta", "Tipo", "Saldo"].map((h, i) => (
						<TableHead
							key={h}
							scope="col"
							className={`num border-line text-dim border-b pb-2 text-[11px] font-medium tracking-[.06em] uppercase ${i === 2 ? "text-right" : "text-left"} h-auto px-0 whitespace-normal`}
						>
							{h}
						</TableHead>
					))}
				</TableRow>
			</TableHeader>
			<TableBody>
				{[...accounts]
					.sort((a, b) => b.balance - a.balance)
					.map((a) => (
						<TableRow
							key={a.id}
							className="border-hover border-b last:border-0"
						>
							<TableCell className="px-0 py-2 whitespace-normal">
								<Link
									to={searchHref("accounts", { id: a.id })}
									className="text-fg flex items-center gap-2 no-underline hover:underline"
								>
									<span
										aria-hidden="true"
										className="size-2 rounded-sm"
										style={{ background: a.color ?? "var(--color-dim)" }}
									/>
									{a.name}
								</Link>
							</TableCell>
							<TableCell className="text-fg-2 px-0 py-2 text-xs whitespace-normal">
								{ACCOUNT_TYPE_LABEL[a.type]}
							</TableCell>
							<TableCell
								className={`num py-2 text-right ${a.balance < 0 ? "text-warn" : ""} px-0 whitespace-normal`}
							>
								{money(a.balance)}
							</TableCell>
						</TableRow>
					))}
			</TableBody>
		</Table>
	);
}
