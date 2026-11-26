import { PIN_LENGTH } from "@wallet/shared";
import { cn } from "@wallet/ui/lib/utils";
import { DeleteIcon, LockIcon } from "lucide-react";
import { type ReactNode, useCallback, useEffect, useState } from "react";
import { useVerifyPin } from "@/actions/settings/use-pin";
import { usePreferences } from "@/actions/settings/use-preferences";
import { BrandMark } from "@/components/ui/brand-mark";
import { usePreferencesContext } from "@/contexts/preferences-context";
import { errorMessage } from "@/lib/api";
import { authClient, isDesktop } from "@/lib/auth-client";

const UNLOCKED_KEY = "wallet.unlocked";
const LOCK_EVENT = "wallet:lock";

const readUnlocked = () => {
	try {
		return sessionStorage.getItem(UNLOCKED_KEY) === "1";
	} catch {
		return false;
	}
};

const writeUnlocked = (unlocked: boolean) => {
	try {
		if (unlocked) sessionStorage.setItem(UNLOCKED_KEY, "1");
		else sessionStorage.removeItem(UNLOCKED_KEY);
	} catch {}
};

export function lockApp() {
	writeUnlocked(false);
	window.dispatchEvent(new Event(LOCK_EVENT));
}

export function PinGate({ children }: { children: ReactNode }) {
	const { preferences } = usePreferencesContext();
	const { isPending } = usePreferences();
	const [unlocked, setUnlocked] = useState(readUnlocked);

	useEffect(() => {
		const onLock = () => setUnlocked(false);
		window.addEventListener(LOCK_EVENT, onLock);
		return () => window.removeEventListener(LOCK_EVENT, onLock);
	}, []);

	if (!isDesktop) return children;
	if (isPending && !unlocked) return null;
	if (!preferences?.hasPin || unlocked) return children;
	return (
		<LockScreen
			onUnlock={() => {
				writeUnlocked(true);
				setUnlocked(true);
			}}
		/>
	);
}

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"];

function useCountdown(until: string | null) {
	const [now, setNow] = useState(() => Date.now());
	useEffect(() => {
		if (!until) return;
		const timer = setInterval(() => setNow(Date.now()), 1000);
		return () => clearInterval(timer);
	}, [until]);
	if (!until) return 0;
	return Math.max(0, Math.ceil((new Date(until).getTime() - now) / 1000));
}

function LockScreen({ onUnlock }: { onUnlock: () => void }) {
	const { data: session } = authClient.useSession();
	const verify = useVerifyPin();
	const [pin, setPin] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [lockedUntil, setLockedUntil] = useState<string | null>(null);
	const secondsLeft = useCountdown(lockedUntil);
	const locked = secondsLeft > 0;

	const submit = useCallback(async () => {
		if (pin.length < PIN_LENGTH || locked || verify.isPending) return;
		try {
			const result = await verify.mutateAsync(pin);
			if (result.ok) return onUnlock();
			setPin("");
			setLockedUntil(result.lockedUntil);
			setError(
				result.lockedUntil
					? "Demasiadas tentativas erradas"
					: `PIN errado · ${result.attemptsLeft} ${result.attemptsLeft === 1 ? "tentativa" : "tentativas"} até bloquear`,
			);
		} catch (e) {
			setPin("");
			setError(errorMessage(e));
		}
	}, [pin, locked, verify, onUnlock]);

	const press = useCallback(
		(key: string) => {
			if (locked) return;
			setError(null);
			if (key === "⌫") return setPin((p) => p.slice(0, -1));
			setPin((p) => (p.length >= PIN_LENGTH ? p : p + key));
		},
		[locked],
	);

	useEffect(() => {
		if (pin.length === PIN_LENGTH) submit();
	}, [pin, submit]);

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (/^\d$/.test(e.key)) press(e.key);
			else if (e.key === "Backspace") press("⌫");
			else if (e.key === "Enter") submit();
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [press, submit]);

	const minutes = Math.floor(secondsLeft / 60);
	const seconds = String(secondsLeft % 60).padStart(2, "0");

	return (
		<main className="bg-canvas text-fg flex min-h-svh flex-col items-center justify-center gap-7 p-6 max-md:pt-[max(24px,var(--safe-top))] max-md:pb-[max(24px,var(--safe-bottom))]">
			<div className="flex flex-col items-center gap-3 text-center">
				<BrandMark />
				<h1 className="text-[17px] font-semibold">Wallet bloqueado</h1>
				<p className="text-dim text-[13px]">
					{session?.user.name ? `${session.user.name} · ` : ""}introduza o PIN
					para continuar
				</p>
			</div>

			<div className="flex h-4 items-center gap-2.5" aria-hidden="true">
				{Array.from({ length: PIN_LENGTH }, (_, i) => (
					<span
						// biome-ignore lint/suspicious/noArrayIndexKey: dots are positional
						key={i}
						className={cn(
							"size-3 rounded-full border transition-colors",
							i < pin.length
								? "bg-fg border-fg"
								: "border-line-strong bg-transparent",
						)}
					/>
				))}
			</div>
			<span className="sr-only" aria-live="polite">
				{pin.length} dígitos introduzidos
			</span>

			<p
				role="alert"
				className={cn(
					"num -mt-3 min-h-4 text-center text-xs",
					locked ? "text-warn" : "text-danger",
				)}
			>
				{locked ? (
					<span className="inline-flex items-center gap-1.5">
						<LockIcon className="size-3" /> bloqueado · tente de novo em{" "}
						{minutes}:{seconds}
					</span>
				) : (
					error
				)}
			</p>

			<div className="grid w-[248px] grid-cols-3 gap-2.5 max-md:w-[280px] max-md:gap-3.5">
				{KEYS.map((key) =>
					key === "" ? (
						<span key="blank" />
					) : (
						<button
							key={key}
							type="button"
							disabled={locked}
							aria-label={key === "⌫" ? "Apagar" : key}
							onClick={() => press(key)}
							className="border-line bg-panel hover:bg-hover num flex h-14 cursor-pointer items-center justify-center rounded-xl border text-xl disabled:cursor-not-allowed disabled:opacity-40 max-md:h-16 max-md:rounded-full max-md:text-[26px]"
						>
							{key === "⌫" ? <DeleteIcon className="size-5" /> : key}
						</button>
					),
				)}
			</div>

			<button
				type="button"
				onClick={submit}
				disabled={pin.length < PIN_LENGTH || locked || verify.isPending}
				className="bg-money text-money-ink hover:bg-money-2 h-input rounded-control w-[248px] cursor-pointer font-semibold disabled:cursor-not-allowed disabled:opacity-40 max-md:h-[52px] max-md:w-[280px] max-md:rounded-2xl"
			>
				Desbloquear
			</button>
		</main>
	);
}
