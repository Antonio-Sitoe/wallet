export function Illustration({ ledColor }: { ledColor: string }) {
	return (
		<svg
			role="img"
			aria-label="Ilustração: uma ficha desligada da tomada, com uma faísca entre as duas"
			viewBox="0 0 320 200"
			width="320"
			height="200"
			className="h-auto max-w-full"
		>
			<circle
				cx="160"
				cy="100"
				r="92"
				fill="none"
				stroke="var(--color-line)"
				strokeWidth="1.5"
				strokeDasharray="3 7"
			/>
			<circle
				cx="160"
				cy="100"
				r="64"
				fill="var(--color-panel)"
				stroke="var(--color-selected)"
				strokeWidth="1.5"
			/>
			<path
				d="M0 116 C48 116 56 100 92 100"
				fill="none"
				stroke="var(--color-line-overlay)"
				strokeWidth="7"
				strokeLinecap="round"
			/>
			<rect
				x="88"
				y="80"
				width="40"
				height="40"
				rx="9"
				fill="var(--color-hover)"
				stroke="var(--color-control)"
				strokeWidth="2"
			/>
			<rect x="96" y="92" width="6" height="16" rx="2" fill="var(--color-line-overlay)" />
			<path
				d="M128 90 H143 M128 110 H143"
				stroke="var(--color-fg-2)"
				strokeWidth="4.5"
				strokeLinecap="round"
			/>
			<rect
				x="180"
				y="78"
				width="44"
				height="44"
				rx="10"
				fill="var(--color-hover)"
				stroke="var(--color-control)"
				strokeWidth="2"
			/>
			<rect x="180" y="87" width="7" height="6" rx="1.5" fill="var(--color-canvas)" />
			<rect x="180" y="107" width="7" height="6" rx="1.5" fill="var(--color-canvas)" />
			<circle cx="211" cy="91" r="3.5" fill={ledColor} />
			<path
				d="M224 100 C260 100 270 84 320 84"
				fill="none"
				stroke="var(--color-line-overlay)"
				strokeWidth="7"
				strokeLinecap="round"
			/>
			<g className="animate-pulse">
				<polyline
					points="160,76 154,94 166,98 158,118"
					fill="none"
					stroke="var(--color-danger-2)"
					strokeWidth="3"
					strokeLinecap="round"
					strokeLinejoin="round"
				/>
				<path
					d="M148 72 L151 79 M172 116 L176 123 M170 80 L176 76"
					stroke="var(--color-warn)"
					strokeWidth="2.2"
					strokeLinecap="round"
				/>
			</g>
			<circle cx="70" cy="46" r="2.5" fill="var(--color-line-overlay)" />
			<circle cx="252" cy="152" r="2.5" fill="var(--color-line-overlay)" />
			<circle cx="262" cy="40" r="1.8" fill="var(--color-line-overlay)" />
			<circle cx="58" cy="160" r="1.8" fill="var(--color-line-overlay)" />
		</svg>
	);
}
