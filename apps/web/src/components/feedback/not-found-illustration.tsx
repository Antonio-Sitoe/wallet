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
				stroke="#1F242B"
				strokeWidth="1.5"
				strokeDasharray="3 7"
			/>
			<circle
				cx="160"
				cy="100"
				r="64"
				fill="#0F1216"
				stroke="#1A1F26"
				strokeWidth="1.5"
			/>

			<text
				x="160"
				y="78"
				textAnchor="middle"
				fontFamily="JetBrains Mono, ui-monospace, monospace"
				fontSize="34"
				fontWeight="700"
				fill="#1F242B"
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
				fill="#161B22"
				stroke="#6E7681"
				strokeWidth="2"
			/>
			<rect x="112" y="92" width="84" height="14" rx="7" fill="#1F4D2B" />
			<rect x="120" y="97" width="68" height="4" rx="2" fill="#0B0E12" />
			<rect
				x="174"
				y="114"
				width="30"
				height="20"
				rx="7"
				fill="#0F1216"
				stroke="#6E7681"
				strokeWidth="2"
			/>
			<circle cx="185" cy="124" r="3.5" fill="#3FB950" />
			<path
				d="M124 120 H160 M124 132 H150"
				stroke="#2D333B"
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
					stroke="#ADB5BD"
					strokeWidth="4"
				/>
				<path
					d="M235 89 L250 104"
					stroke="#ADB5BD"
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
					fill="#FFA657"
				>
					?
				</text>
			</g>

			<g className="animate-pulse">
				<circle
					cx="96"
					cy="70"
					r="10"
					fill="#0E1F14"
					stroke="#3FB950"
					strokeWidth="2"
				/>
				<path
					d="M96 65 V75"
					stroke="#3FB950"
					strokeWidth="2"
					strokeLinecap="round"
				/>
			</g>

			<circle cx="70" cy="46" r="2.5" fill="#30363D" />
			<circle cx="252" cy="152" r="2.5" fill="#30363D" />
			<circle cx="262" cy="40" r="1.8" fill="#30363D" />
			<circle cx="58" cy="160" r="1.8" fill="#30363D" />
		</svg>
	);
}
