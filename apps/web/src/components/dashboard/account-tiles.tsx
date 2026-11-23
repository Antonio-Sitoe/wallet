import { Link } from "@tanstack/react-router";
import type { Account, AccountType } from "@wallet/shared";
import { Skeleton } from "@wallet/ui/components/skeleton";
import {
	LandmarkIcon,
	type LucideIcon,
	PiggyBankIcon,
	PlusIcon,
	SmartphoneIcon,
	WalletIcon,
} from "lucide-react";
import { useAccounts } from "@/actions/accounts/use-accounts";
import { money } from "@/utils/format";

const ICON_BY_TYPE: Record<AccountType, LucideIcon> = {
	bank: LandmarkIcon,
	mobile_wallet: SmartphoneIcon,
	cash: WalletIcon,
	savings: PiggyBankIcon,
};

const FALLBACK_COLOR = "#8B949E";

const SKELETON_KEYS = ["a", "b", "c", "d", "e"];

const GRID =
	"grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-5";

function AccountTile({ account }: { account: Account }) {
	const color = account.color ?? FALLBACK_COLOR;
	const Icon = ICON_BY_TYPE[account.type];
	return (
		<Link
			to="/accounts"
			search={{ id: account.id }}
			className="group border-line flex min-w-0 items-center gap-3 rounded-[10px] border p-3 no-underline transition-colors hover:brightness-125"
			style={{
				background: `color-mix(in srgb, ${color} 16%, var(--color-panel))`,
			}}
		>
			<span
				aria-hidden="true"
				className="flex size-10 shrink-0 items-center justify-center rounded-lg text-white"
				style={{ background: color }}
			>
				<Icon className="size-5" strokeWidth={2.2} />
			</span>
			<span className="min-w-0">
				<span className="text-fg block truncate text-sm font-semibold">
					{account.name}
				</span>
				<span
					className={`num block truncate text-sm ${account.balance < 0 ? "text-warn" : "text-fg"}`}
				>
					{money(account.balance)} MZN
				</span>
			</span>
		</Link>
	);
}

export function AccountTiles() {
	const accounts = useAccounts();

	if (accounts.isPending)
		return (
			<div className={GRID}>
				{SKELETON_KEYS.map((key) => (
					<Skeleton key={key} className="h-16.5" />
				))}
			</div>
		);

	return (
		<section aria-label="Saldos das contas" className={GRID}>
			{(accounts.data ?? []).map((account) => (
				<AccountTile key={account.id} account={account} />
			))}
			<Link
				to="/accounts"
				search={{ create: true }}
				className="border-line-strong text-fg-2 hover:text-fg hover:border-fg-2 flex min-h-16.5 items-center justify-center gap-1.5 rounded-[10px] border border-dashed text-sm no-underline transition-colors"
			>
				<PlusIcon className="size-4" aria-hidden="true" /> Adicionar conta
			</Link>
		</section>
	);
}
