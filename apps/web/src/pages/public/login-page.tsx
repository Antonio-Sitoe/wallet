import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@wallet/ui/components/button";
import { Input } from "@wallet/ui/components/input";
import { useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { BrandMark } from "@/components/ui/brand-mark";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import { authClient } from "@/lib/auth-client";

export function LoginPage() {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
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
		const { error } =
			mode === "in"
				? await authClient.signIn.email({ email, password })
				: await authClient.signUp.email({
						name: name || email.split("@")[0]!,
						email,
						password,
					});
		setBusy(false);
		if (error) {
			toast.error(
				error.message || error.statusText || "Não foi possível entrar",
			);
			return;
		}
		queryClient.clear();
		navigate("/");
	}

	return (
		<main className="bg-canvas flex min-h-svh items-center justify-center p-4">
			<Card className="w-full max-w-[380px] overflow-hidden">
				<div className="border-line flex items-center gap-2.5 border-b px-5 py-4">
					<BrandMark />
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
							<Input
								value={name}
								onChange={(e) => setName(e.target.value)}
								autoComplete="name"
							/>
						</Field>
					) : null}
					<Field label="Email">
						<Input
							type="email"
							required
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							autoComplete="email"
						/>
					</Field>
					<Field label="Palavra-passe">
						<Input
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
