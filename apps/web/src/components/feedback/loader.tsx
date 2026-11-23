import { useEffect, useState } from "react";

export const MESSAGES = [
	"A contar as moedas…",
	"A somar os saldos…",
	"A arrumar a carteira…",
	"A fazer as contas…",
	"Quase lá…",
];

export const COINS = [0, 0.8, 1.6];

export function Loader() {
	const [i, setI] = useState(0);

	useEffect(() => {
		const id = setInterval(() => setI((n) => (n + 1) % MESSAGES.length), 1800);
		return () => clearInterval(id);
	}, []);

	return (
		<div
			role="status"
			aria-live="polite"
			className="wl-loader bg-canvas/85 fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm"
		>
			<div className="flex flex-col items-center gap-5">
				<div className="relative size-40">
					<div className="wl-glow bg-money/20 absolute inset-6 rounded-full blur-2xl" />
					<svg
						viewBox="0 0 160 160"
						className="relative size-full overflow-visible"
						aria-hidden="true"
					>
						<ellipse
							className="wl-shadow"
							cx="80"
							cy="146"
							rx="46"
							ry="5"
							fill="#000"
							opacity="0.45"
						/>

						<g className="wl-wallet">
							<rect
								x="30"
								y="52"
								width="100"
								height="22"
								rx="9"
								fill="#1f4d2b"
							/>
							<rect x="38" y="58" width="84" height="6" rx="3" fill="#0b0e12" />

							{COINS.map((delay) => (
								<g
									key={delay}
									className="wl-coin-drop"
									style={{ animationDelay: `${delay}s` }}
								>
									<g
										className="wl-coin-spin"
										style={{ animationDelay: `${delay}s` }}
									>
										<circle cx="80" cy="70" r="12" fill="#f2c14e" />
										<circle
											cx="80"
											cy="70"
											r="8.5"
											fill="none"
											stroke="#c9961f"
											strokeWidth="1.6"
										/>
										<path
											d="M80 64.5v11M77.2 66.8c0-1.3 1.2-2.1 2.8-2.1s2.8.8 2.8 2c0 2.8-5.6 1.7-5.6 4.6 0 1.2 1.2 2 2.8 2s2.8-.8 2.8-2.1"
											fill="none"
											stroke="#c9961f"
											strokeWidth="1.5"
											strokeLinecap="round"
										/>
										<ellipse
											cx="75.5"
											cy="65"
											rx="2.6"
											ry="1.6"
											fill="#fff"
											opacity="0.55"
										/>
									</g>
								</g>
							))}

							<rect
								x="22"
								y="64"
								width="116"
								height="74"
								rx="15"
								fill="#0e1f14"
								stroke="#3fb950"
								strokeWidth="2.5"
							/>
							<rect
								x="30"
								y="72"
								width="100"
								height="58"
								rx="10"
								fill="none"
								stroke="#1f4d2b"
								strokeWidth="1.5"
								strokeDasharray="4 4"
							/>
							<rect
								x="98"
								y="88"
								width="40"
								height="26"
								rx="9"
								fill="#0b0e12"
								stroke="#3fb950"
								strokeWidth="2.5"
							/>
							<circle
								className="wl-clasp"
								cx="112"
								cy="101"
								r="4.5"
								fill="#56d364"
							/>
						</g>

						<g className="wl-sparkles" fill="#56d364">
							<path d="M40 40l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" />
							<path d="M120 34l1.5 3.5 3.5 1.5-3.5 1.5-1.5 3.5-1.5-3.5-3.5-1.5 3.5-1.5z" />
							<circle cx="132" cy="56" r="2" />
							<circle cx="28" cy="58" r="1.6" />
						</g>
					</svg>
				</div>

				<div className="text-fg-2 flex h-5 items-center gap-2 text-sm">
					<span key={i} className="wl-msg">
						{MESSAGES[i]}
					</span>
				</div>
				<div className="flex gap-1.5" aria-hidden="true">
					{[0, 1, 2].map((d) => (
						<span
							key={d}
							className="wl-dot bg-money size-1.5 rounded-full"
							style={{ animationDelay: `${d * 0.15}s` }}
						/>
					))}
				</div>
			</div>
		</div>
	);
}
