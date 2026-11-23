import { WalletMinimalIcon } from "lucide-react";

export function BrandMark() {
	return (
		<div className="bg-money text-money-ink rounded-control flex size-7 shrink-0 items-center justify-center">
			<WalletMinimalIcon
				aria-hidden="true"
				className="size-[17px]"
				strokeWidth={2.2}
			/>
		</div>
	);
}
