import { Pill } from "@/components/ui/pill";

const MAX_SHOWN_PCT = 999;

export function Delta({
	now,
	before,
	goodWhenUp,
}: {
	now: number;
	before: number;
	goodWhenUp: boolean;
}) {
	if (before === 0)
		return (
			<span className="num text-dim text-[11px]">sem período anterior</span>
		);
	const pct = Math.round(((now - before) / Math.abs(before)) * 100);
	const good = pct === 0 ? null : pct > 0 === goodWhenUp;
	return (
		<Pill
			tone={good === null ? "neutral" : good ? "ok" : "warn"}
			className="gap-1 self-start"
		>
			<span aria-hidden="true">{pct > 0 ? "↑" : pct < 0 ? "↓" : "="}</span>
			{Math.abs(pct) > MAX_SHOWN_PCT ? "> " : ""}
			{pct > 0 ? "+" : pct < 0 ? "−" : ""}
			{Math.min(Math.abs(pct), MAX_SHOWN_PCT)}% vs anterior
		</Pill>
	);
}
