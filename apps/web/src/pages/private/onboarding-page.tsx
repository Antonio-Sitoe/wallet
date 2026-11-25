import { DownloadIcon, PlusIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router";
import { MOD } from "@/components/layout/app-shell";
import { authClient } from "@/lib/auth-client";
import { searchHref } from "@/lib/search-params";

const IMPORT_STEPS = [
	"Ficheiros CSV + .xlsx",
	"Contas e saldos iniciais",
	"Categorias do Wallet → app",
	`Folha ${new Date().getFullYear()} → plano e listas`,
];

const FRESH_STEPS = [
	"Contas com saldo actual",
	"Salário previsto",
	"Plano anual",
	"Primeira lista do mês",
];

function Steps({ items, line }: { items: string[]; line: string }) {
	return (
		<ol className={`flex flex-col gap-1.5 border-t pt-3 ${line}`}>
			{items.map((item, i) => (
				<li key={item} className="text-fg-2 flex items-baseline gap-2.5">
					<span className="num text-dim w-check text-[11px]">{i + 1}</span>
					<span>{item}</span>
				</li>
			))}
		</ol>
	);
}

function Kbd({ children }: { children: ReactNode }) {
	return (
		<kbd className="num border-line-strong bg-hover text-fg-2 rounded border px-1.25 py-px text-[11px]">
			{children}
		</kbd>
	);
}

export function OnboardingPage() {
	const name = authClient.useSession().data?.user.name?.split(" ")[0];
	const year = new Date().getFullYear();

	return (
		<div className="bg-canvas flex min-h-svh flex-col text-[13px]">
			<header className="border-hover flex h-10 items-center justify-end border-b px-3.5">
				<span className="num text-dim text-[11px]">primeiro uso · 1 de 4</span>
			</header>
			<main className="flex flex-1 justify-center px-4 py-10 sm:px-6 sm:py-16">
				<div className="flex w-205 max-w-full flex-col gap-7">
					<div className="flex flex-col gap-2">
						<span className="num text-money text-xs">$ wallet init</span>
						<h1 className="text-[28px] font-semibold tracking-[-.015em]">
							Olá{name ? `, ${name}` : ""}. Como queres começar?
						</h1>
						<p className="text-fg-2 max-w-155 text-sm leading-[1.55]">
							O app substitui a folha Calculo Financeiro. Podes trazer o
							histórico do Wallet e da folha, ou começar com contas e um plano
							novos.
						</p>
					</div>

					<div className="flex flex-wrap gap-4">
						<Link
							to="/import"
							className="border-money bg-money-bg/40 rounded-card text-fg hover:bg-money-bg/70 flex flex-[1_1_320px] flex-col gap-3.5 border p-5.5 transition-colors"
						>
							<div className="flex items-center justify-between">
								<DownloadIcon
									aria-hidden="true"
									className="text-money size-6.5"
									strokeWidth={1.8}
								/>
								<span className="num bg-money-bg text-money-2 border-money-line rounded-full border px-2 py-0.5 text-[11px]">
									recomendado
								</span>
							</div>
							<div className="flex flex-col gap-1.5">
								<span className="text-base font-semibold">
									Importar do Wallet e da folha
								</span>
								<span className="text-fg-2 leading-normal">
									Traz o histórico de transacções do Wallet, as contas e o plano
									de {year}.
								</span>
							</div>
							<Steps items={IMPORT_STEPS} line="border-money-line" />
							<span className="text-money mt-auto font-medium">
								Começar import →
							</span>
						</Link>

						<Link
							to={searchHref("accounts", { create: true })}
							className="border-line-strong bg-panel rounded-card text-fg hover:border-info-2 flex flex-[1_1_320px] flex-col gap-3.5 border p-5.5 transition-colors"
						>
							<PlusIcon
								aria-hidden="true"
								className="text-fg-2 size-6.5"
								strokeWidth={1.8}
							/>
							<div className="flex flex-col gap-1.5">
								<span className="text-base font-semibold">Começar do zero</span>
								<span className="text-fg-2 leading-normal">
									Cria as contas à mão, usa as categorias da folha e monta o
									plano anual.
								</span>
							</div>
							<Steps items={FRESH_STEPS} line="border-line" />
							<span className="text-info-2 mt-auto font-medium">
								Criar contas →
							</span>
						</Link>
					</div>

					<div className="border-line bg-panel rounded-card flex flex-wrap items-center justify-between gap-3 border px-4 py-3.5">
						<span className="text-fg-2 flex flex-wrap items-center gap-1">
							Atalhos: <Kbd>{MOD}N</Kbd> nova transacção ·{" "}
							<Kbd>{`${MOD}0–9`}</Kbd> ecrãs
						</span>
						<Link
							to="/dashboard"
							className="text-info-2 hover:text-info underline underline-offset-2"
						>
							Saltar para o painel
						</Link>
					</div>
				</div>
			</main>
		</div>
	);
}
