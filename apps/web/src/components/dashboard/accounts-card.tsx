import { Link } from "@tanstack/react-router";
import { useAccounts } from "@/actions/accounts/use-accounts";
import { Empty } from "@/components/dashboard/empty";
import { Loading } from "@/components/dashboard/loading";
import { ACCOUNT_TYPE_LABEL, money } from "@/utils/format";

export function AccountsCard() {
	const accounts = useAccounts().data;
	if (!accounts) return <Loading />;
	if (accounts.length === 0) return <Empty>Ainda não há contas.</Empty>;
	return (
		<table className="w-full border-collapse">
			<thead>
				<tr>
					{["Conta", "Tipo", "Saldo"].map((h, i) => (
						<th
							key={h}
							scope="col"
							className={`num border-line text-dim border-b pb-2 text-[11px] font-medium tracking-[.06em] uppercase ${i === 2 ? "text-right" : "text-left"}`}
						>
							{h}
						</th>
					))}
				</tr>
			</thead>
			<tbody>
				{[...accounts]
					.sort((a, b) => b.balance - a.balance)
					.map((a) => (
						<tr key={a.id} className="border-hover border-b last:border-0">
							<td className="py-2">
								<Link
									to="/accounts"
									search={{ id: a.id }}
									className="text-fg flex items-center gap-2 no-underline hover:underline"
								>
									<span
										aria-hidden="true"
										className="size-2 rounded-sm"
										style={{ background: a.color ?? "#8B949E" }}
									/>
									{a.name}
								</Link>
							</td>
							<td className="text-fg-2 py-2 text-xs">
								{ACCOUNT_TYPE_LABEL[a.type]}
							</td>
							<td
								className={`num py-2 text-right ${a.balance < 0 ? "text-warn" : ""}`}
							>
								{money(a.balance)}
							</td>
						</tr>
					))}
			</tbody>
		</table>
	);
}
