import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@wallet/ui/components/button";
import {
	FieldLabel,
	Field as FieldRoot,
} from "@wallet/ui/components/field";
import { Input } from "@wallet/ui/components/input";
import { Eye, EyeOff } from "lucide-react";
import { useId, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { Field } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import { authClient } from "@/lib/auth-client";
import { offlineEnabled } from "@/lib/offline/flag";
import { loadOffline } from "@/lib/offline/registry";

const inputClass =
	"border-line-strong bg-panel text-fg placeholder:text-faint focus-visible:border-money focus-visible:ring-money/20 dark:bg-panel h-[52px] rounded-[14px] px-4 text-[16px] md:text-[16px]";

const fieldClass = "gap-1.5 [&>label]:px-1 [&>label]:text-[13px]";

function LoginMark() {
	return (
		<div className="relative size-[60px]">
			<div
				aria-hidden="true"
				className="pointer-events-none absolute top-1/2 left-1/2 h-[520px] w-[560px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,color-mix(in_srgb,var(--color-money)_16%,transparent),transparent)]"
			/>
			<div className="bg-money relative flex size-[60px] items-center justify-center rounded-[18px] shadow-[0_10px_30px_color-mix(in_srgb,var(--color-money)_30%,transparent)]">
				<svg
					aria-hidden="true"
					width="32"
					height="32"
					viewBox="0 0 24 24"
					fill="none"
					stroke="var(--color-money-ink)"
					strokeWidth="2.2"
					strokeLinecap="round"
					strokeLinejoin="round"
				>
					<rect x="3" y="6" width="18" height="13" rx="2" />
					<path d="M16 12.5h2M3 9h18" />
				</svg>
			</div>
		</div>
	);
}

export function LoginPage() {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const [mode, setMode] = useState<"in" | "up">("in");
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [busy, setBusy] = useState(false);
	const passwordId = useId();

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
		if (offlineEnabled) await (await loadOffline()).resetOfflineCollections();
		queryClient.clear();
		navigate("/");
	}

	const signingUp = mode === "up";

	return (
		<main className="bg-canvas text-fg relative flex min-h-svh justify-center overflow-hidden px-5 pt-[max(54px,env(safe-area-inset-top))] pb-[max(34px,env(safe-area-inset-bottom))] md:items-center md:py-12">
			<form
				onSubmit={submit}
				className="relative flex w-full max-w-[400px] flex-col gap-6 max-md:min-h-[calc(100svh-max(54px,env(safe-area-inset-top))-max(34px,env(safe-area-inset-bottom)))]"
			>
				<header className="flex flex-col gap-[18px] pt-9 md:pt-0">
					<LoginMark />
					<div className="relative flex flex-col gap-1.5">
						<h1 className="text-[32px] leading-[38px] font-bold tracking-[-0.02em]">
							{signingUp ? "Criar conta" : "Entrar no Wallet"}
						</h1>
						<p className="text-dim text-[15px] leading-[21px]">
							{signingUp
								? "Os dados ficam no teu servidor."
								: "Bem-vindo de volta."}
						</p>
					</div>
				</header>

				<Segmented
					value={mode}
					onChange={setMode}
					className="relative [&>button]:h-[38px] [&>button]:text-[14px]"
					options={[
						{ value: "in", label: "Entrar" },
						{ value: "up", label: "Criar conta" },
					]}
				/>

				<div className="relative flex flex-col gap-3.5">
					{signingUp ? (
						<Field label="Nome" className={fieldClass}>
							<Input
								value={name}
								onChange={(e) => setName(e.target.value)}
								autoComplete="name"
								placeholder="Como te chamamos"
								className={inputClass}
							/>
						</Field>
					) : null}
					<Field label="Email" className={fieldClass}>
						<Input
							type="email"
							inputMode="email"
							autoCapitalize="off"
							required
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							autoComplete="email"
							placeholder="nome@exemplo.com"
							className={inputClass}
						/>
					</Field>
					<FieldRoot className={fieldClass}>
						<FieldLabel
							htmlFor={passwordId}
							className="text-fg-2 font-normal"
						>
							Palavra-passe
						</FieldLabel>
						<div className="relative">
							<Input
								id={passwordId}
								type={showPassword ? "text" : "password"}
								required
								minLength={8}
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								autoComplete={signingUp ? "new-password" : "current-password"}
								placeholder="••••••••"
								className={`${inputClass} pr-14`}
							/>
							<button
								type="button"
								onClick={() => setShowPassword((shown) => !shown)}
								aria-label={
									showPassword ? "Esconder palavra-passe" : "Mostrar palavra-passe"
								}
								className="text-dim hover:text-fg absolute top-1 right-1 flex size-11 cursor-pointer items-center justify-center rounded-[10px]"
							>
								{showPassword ? (
									<EyeOff className="size-5" strokeWidth={1.8} />
								) : (
									<Eye className="size-5" strokeWidth={1.8} />
								)}
							</button>
						</div>
					</FieldRoot>
				</div>

				<div className="flex-1 md:hidden" />

				<Button
					type="submit"
					variant="primary"
					disabled={busy}
					className="relative h-14 rounded-2xl text-[17px] font-semibold md:mt-2"
				>
					{busy ? "A entrar…" : signingUp ? "Criar conta" : "Entrar"}
				</Button>
			</form>
		</main>
	);
}
