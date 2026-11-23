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
		<span
			className={`num inline-flex w-fit items-center gap-1 self-start rounded-full border px-2 py-0.5 text-[11px] whitespace-nowrap ${
				good === null
					? "border-line-strong text-dim"
					: good
						? "border-money-line bg-money-bg text-money-2"
						: "border-warn-line bg-warn-bg text-warn"
			}`}
		>
			<span aria-hidden="true">{pct > 0 ? "↑" : pct < 0 ? "↓" : "="}</span>
			{pct > 0 ? "+" : pct < 0 ? "−" : ""}
			{Math.abs(pct)}% vs anterior
		</span>
	);
}
