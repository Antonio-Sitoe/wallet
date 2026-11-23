import { Link, useRouter } from "@tanstack/react-router";
import { Button } from "@wallet/ui/components/button";
import { ArrowLeftIcon, LayoutDashboardIcon } from "lucide-react";
import { Illustration } from "@/components/feedback/not-found-illustration";

export const LINKS = [
	{ to: "/dashboard", label: "Painel" },
	{ to: "/transactions", label: "Transacções" },
	{ to: "/accounts", label: "Contas" },
	{ to: "/budget", label: "Orçamento" },
] as const;

export function NotFound() {
	const router = useRouter();
	const path = typeof window === "undefined" ? "" : window.location.pathname;

	return (
		<main className="bg-canvas flex min-h-[calc(100svh-28px)] w-full flex-1 items-center justify-center bg-[radial-gradient(#141920_1px,transparent_1px)] [background-size:24px_24px] px-6 py-12">
			<section
				aria-labelledby="nf-title"
				className="flex w-[520px] max-w-full flex-col items-center gap-[22px] text-center"
			>
				<Illustration />

				<div className="flex flex-col gap-2">
					<span className="num text-warn text-xs">
						erro 404 · página não encontrada
					</span>
					<h1
						id="nf-title"
						className="m-0 text-2xl font-semibold tracking-[-.01em]"
					>
						Esta página não está na carteira
					</h1>
					<p className="text-fg-2 m-0 text-sm leading-relaxed">
						O endereço que abriste não existe ou foi movido. Os teus dados estão
						seguros: volta ao painel ou escolhe uma das secções abaixo.
					</p>
				</div>

				{path && (
					<div className="num border-line bg-panel text-dim inline-flex max-w-full items-center gap-2 rounded-[8px] border px-3 py-1.5 text-[11px]">
						<span className="text-warn">?</span>
						<span className="truncate">{path}</span>
					</div>
				)}

				<div className="flex flex-wrap items-center justify-center gap-2.5">
					<Link
						to="/dashboard"
						className="bg-money text-money-ink hover:bg-money-2 focus-visible:ring-offset-canvas focus-visible:ring-money inline-flex h-11 items-center justify-center gap-2.5 rounded-[10px] px-[22px] text-[15px] font-semibold outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
					>
						<LayoutDashboardIcon
							aria-hidden="true"
							className="size-[17px]"
							strokeWidth={2.4}
						/>
						Ir para o painel
					</Link>
					<Button
						variant="neutral"
						onClick={() => router.history.back()}
						className="border-line-strong text-fg-2 hover:bg-hover hover:text-fg focus-visible:ring-info-2 inline-flex h-11 cursor-pointer items-center gap-2 rounded-[10px] border bg-transparent px-[18px] text-sm outline-none focus-visible:ring-2"
					>
						<ArrowLeftIcon aria-hidden="true" className="size-4" />
						Voltar
					</Button>
				</div>

				<nav
					aria-label="Secções"
					className="num text-dim flex flex-wrap items-center justify-center gap-x-1 gap-y-1 text-[11px]"
				>
					{LINKS.map((link, i) => (
						<span key={link.to} className="inline-flex items-center gap-1">
							{i > 0 && <span className="text-faint">·</span>}
							<Link
								to={link.to}
								className="hover:text-fg rounded px-1 py-0.5 underline-offset-2 hover:underline"
							>
								{link.label}
							</Link>
						</span>
					))}
				</nav>
			</section>
		</main>
	);
}
