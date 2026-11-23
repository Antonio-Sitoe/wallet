export const ACCOUNT_COLORS = [
	"#3FB950",
	"#58A6FF",
	"#F0883E",
	"#A371F7",
	"#39C5BB",
	"#D29922",
	"#F778BA",
	"#8B949E",
] as const;

export function ColorSwatches({
	value,
	onChange,
	disabled,
}: {
	value: string | null;
	onChange: (color: string) => void;
	disabled?: boolean;
}) {
	const current = value?.toLowerCase();
	return (
		<div className="flex flex-wrap gap-2">
			{ACCOUNT_COLORS.map((c) => {
				const selected = c.toLowerCase() === current;
				return (
					<button
						key={c}
						type="button"
						aria-pressed={selected}
						aria-label={`Cor ${c}`}
						disabled={disabled}
						onClick={() => onChange(c)}
						className="size-7 cursor-pointer rounded-md disabled:cursor-not-allowed disabled:opacity-50"
						style={{
							background: c,
							outline: selected ? "2px solid #E6E8EB" : "none",
							outlineOffset: 2,
						}}
					/>
				);
			})}
		</div>
	);
}
