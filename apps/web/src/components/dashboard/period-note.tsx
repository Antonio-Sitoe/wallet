import type { Period } from "@/@types/period";
import { dayLabel } from "@/utils/format";

export const PeriodNote = ({ p }: { p: Period }) => (
	<span className="num text-dim text-[11px]">
		{dayLabel(p.from).split(" · ")[1]} – {dayLabel(p.to).split(" · ")[1]}
	</span>
);
