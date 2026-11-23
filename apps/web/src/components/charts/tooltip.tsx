import type { Tip } from "@/components/charts/utils";

export function Tooltip({ tip, width }: { tip: Tip | null; width: number }) {
	if (!tip) return null;
	const left = Math.min(Math.max(tip.x + 12, 0), width - 190);
	return (
		<div
			role="status"
			className="border-line-strong bg-hover pointer-events-none absolute z-10 min-w-[170px] rounded-md border px-2.5 py-2 text-xs shadow-[0_8px_24px_rgba(1,4,9,.6)]"
			style={{ left, top: Math.max(tip.y - 10, 0) }}
		>
			<div className="num text-dim mb-1 text-[11px]">{tip.title}</div>
			{tip.rows.map((r) => (
				<div key={r.label} className="flex items-center gap-2">
					<span
						className={
							r.line
								? "inline-block h-0.5 w-3"
								: "inline-block size-2 rounded-sm"
						}
						style={{ background: r.color }}
					/>
					<span className="text-fg-2 flex-1">{r.label}</span>
					<strong className="num text-fg font-medium">{r.value}</strong>
				</div>
			))}
		</div>
	);
}
