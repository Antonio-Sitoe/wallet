export function Illustration() {
	return (
		<svg
			role="img"
			aria-label="Ilustração: uma carteira aberta e vazia, com uma lupa à procura da página"
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

			<text
				x="160"
				y="78"
				textAnchor="middle"
				fontFamily="JetBrains Mono, ui-monospace, monospace"
				fontSize="34"
				fontWeight="700"
				fill="var(--color-line)"
				letterSpacing="2"
			>
				404
			</text>

			<rect
				x="112"
				y="92"
				width="84"
				height="58"
				rx="11"
				fill="var(--color-hover)"
				stroke="var(--color-control)"
				strokeWidth="2"
			/>
			<rect
				x="112"
				y="92"
				width="84"
				height="14"
				rx="7"
				fill="var(--color-money-line)"
			/>
			<rect
				x="120"
				y="97"
				width="68"
				height="4"
				rx="2"
				fill="var(--color-panel-2)"
			/>
			<rect
				x="174"
				y="114"
				width="30"
				height="20"
				rx="7"
				fill="var(--color-panel)"
				stroke="var(--color-control)"
				strokeWidth="2"
			/>
			<circle cx="185" cy="124" r="3.5" fill="var(--color-money)" />
			<path
				d="M124 120 H160 M124 132 H150"
				stroke="var(--color-line-strong)"
				strokeWidth="3"
				strokeLinecap="round"
				strokeDasharray="4 5"
			/>

			<g className="wl-search">
				<circle
					cx="222"
					cy="76"
					r="18"
					fill="rgba(121,192,255,.06)"
					stroke="var(--color-fg-2)"
					strokeWidth="4"
				/>
				<path
					d="M235 89 L250 104"
					stroke="var(--color-fg-2)"
					strokeWidth="6"
					strokeLinecap="round"
				/>
				<text
					x="222"
					y="83"
					textAnchor="middle"
					fontFamily="JetBrains Mono, ui-monospace, monospace"
					fontSize="19"
					fontWeight="700"
					fill="var(--color-warn)"
				>
					?
				</text>
			</g>

			<g className="animate-pulse">
				<circle
					cx="96"
					cy="70"
					r="10"
					fill="var(--color-money-bg)"
					stroke="var(--color-money)"
					strokeWidth="2"
				/>
				<path
					d="M96 65 V75"
					stroke="var(--color-money)"
					strokeWidth="2"
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
