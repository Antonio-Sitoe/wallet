import { Link } from "@tanstack/react-router";
import { useAccounts } from "@/actions/accounts/use-accounts";

export function SidebarAccounts() {
	const accounts = useAccounts().data ?? [];
	if (accounts.length === 0) return null;
	const short = (cents: number) => {
		const mzn = Math.abs(cents / 100);
		const body =
			mzn >= 1000
				? `${(mzn / 1000).toFixed(1).replace(/\.0$/, "")}k`
				: String(Math.round(mzn));
		return `${cents < 0 ? "−" : ""}${body}`;
	};
	return (
		<div className="hidden min-h-0 flex-col gap-0.5 overflow-y-auto md:flex">
			<div className="num text-dim px-2 pb-1.5 text-[11px] tracking-[.06em] uppercase">
				Contas
			</div>
			{[...accounts]
				.sort((a, b) => b.balance - a.balance)
				.map((a) => (
					<Link
						key={a.id}
						to="/accounts"
						search={{ id: a.id }}
						className="text-fg-2 hover:bg-hover hover:text-fg flex h-[30px] items-center gap-2.5 rounded-md px-2 no-underline"
					>
						<span
							aria-hidden="true"
							className="size-2 rounded-sm"
							style={{ background: a.color ?? "#8B949E" }}
						/>
						<span className="min-w-0 flex-1 truncate">{a.name}</span>
						<span
							className={`num text-[11px] ${a.balance < 0 ? "text-warn" : "text-dim"}`}
						>
							{short(a.balance)}
						</span>
					</Link>
				))}
		</div>
	);
}
