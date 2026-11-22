import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { Button, Card, Field, Segmented, TextInput } from "@/components/kit";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/login")({
	ssr: false,
	component: LoginPage,
});

function LoginPage() {
	const navigate = useNavigate();
	const [mode, setMode] = useState<"in" | "up">("in");
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [busy, setBusy] = useState(false);

	async function submit(e: React.FormEvent) {
		e.preventDefault();
		if (password.length < 8)
			return toast.error("A palavra-passe tem de ter pelo menos 8 caracteres");
		setBusy(true);
		const options = {
			onSuccess: () => {
				navigate({ to: "/painel" });
			},
			onError: (ctx: { error: { message?: string; statusText?: string } }) => {
				toast.error(
					ctx.error.message ||
						ctx.error.statusText ||
						"Não foi possível entrar",
				);
			},
		};
		if (mode === "in")
			await authClient.signIn.email({ email, password }, options);
		else
			await authClient.signUp.email(
				{ name: name || email.split("@")[0]!, email, password },
				options,
			);
		setBusy(false);
	}

	return (
		<main className="bg-canvas flex min-h-svh items-center justify-center p-4">
			<Card className="w-full max-w-[380px] overflow-hidden">
				<div className="border-line flex items-center gap-2.5 border-b px-5 py-4">
					<div className="bg-money flex size-7 items-center justify-center rounded-[7px]">
						<svg
							aria-hidden="true"
							width="17"
							height="17"
							viewBox="0 0 24 24"
							fill="none"
							stroke="#04130A"
							strokeWidth="2.2"
							strokeLinecap="round"
							strokeLinejoin="round"
						>
							<rect x="3" y="6" width="18" height="13" rx="2" />
							<path d="M16 12.5h2M3 9h18" />
						</svg>
					</div>
					<div className="flex flex-col">
						<h1 className="text-[15px] font-semibold">Wallet</h1>
						<span className="num text-dim text-[11px]">
							gestor financeiro pessoal · MZN
						</span>
					</div>
				</div>
				<form className="flex flex-col gap-3.5 p-5" onSubmit={submit}>
					<Segmented
						value={mode}
						onChange={setMode}
						options={[
							{ value: "in", label: "Entrar" },
							{ value: "up", label: "Criar conta" },
						]}
					/>
					{mode === "up" ? (
						<Field label="Nome">
							<TextInput
								value={name}
								onChange={(e) => setName(e.target.value)}
								autoComplete="name"
							/>
						</Field>
					) : null}
					<Field label="Email">
						<TextInput
							type="email"
							required
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							autoComplete="email"
						/>
					</Field>
					<Field label="Palavra-passe">
						<TextInput
							type="password"
							required
							minLength={8}
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							autoComplete={mode === "in" ? "current-password" : "new-password"}
						/>
					</Field>
					<Button
						type="submit"
						variant="primary"
						disabled={busy}
						className="mt-1 h-9"
					>
						{busy ? "A entrar…" : mode === "in" ? "Entrar" : "Criar conta"}
					</Button>
				</form>
			</Card>
		</main>
	);
}
