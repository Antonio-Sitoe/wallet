import { Button } from "@wallet/ui/components/button";
import { Input } from "@wallet/ui/components/input";
import { LockIcon, ShieldCheckIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useRemovePin, useSetPin } from "@/actions/settings/use-pin";
import { lockApp } from "@/components/settings/pin-gate";
import {
	SettingsRow,
	SettingsSection,
} from "@/components/settings/settings-row";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { usePreferencesContext } from "@/contexts/preferences-context";
import { ApiError, errorMessage } from "@/lib/api";
import { isDesktop } from "@/lib/auth-client";

type PinMode = "set" | "change" | "remove";

export function SecuritySection({ onLock }: { onLock: () => void }) {
	const { preferences } = usePreferencesContext();
	const [mode, setMode] = useState<PinMode | null>(null);
	if (!preferences) return null;
	const hasPin = preferences.hasPin;

	if (!isDesktop) {
		return (
			<SettingsSection
				title="Segurança"
				description="O PIN só está disponível no app de desktop."
			>
				<SettingsRow
					title="PIN ao abrir o app"
					description="Instale o Wallet no computador para proteger o app com um PIN."
				>
					<Button variant="primary" disabled>
						Definir PIN
					</Button>
				</SettingsRow>
			</SettingsSection>
		);
	}

	return (
		<SettingsSection
			title="Segurança"
			description="O PIN fica guardado com hash no servidor. Depois de 5 tentativas erradas o app bloqueia durante 5 minutos, e o tempo dobra a cada novo bloqueio."
		>
			<SettingsRow
				title={
					<span className="inline-flex items-center gap-2">
						PIN ao abrir o app
						{hasPin ? (
							<span className="bg-money-bg text-money inline-flex items-center gap-1 rounded-full px-2 py-px text-[11px]">
								<ShieldCheckIcon className="size-3" /> activo
							</span>
						) : null}
					</span>
				}
				description="Pedido sempre que abre o Wallet num separador ou janela nova."
			>
				{hasPin ? (
					<>
						<Button variant="quiet" onClick={() => setMode("remove")}>
							Remover
						</Button>
						<Button variant="neutral" onClick={() => setMode("change")}>
							Mudar PIN
						</Button>
					</>
				) : (
					<Button variant="primary" onClick={() => setMode("set")}>
						Definir PIN
					</Button>
				)}
			</SettingsRow>
			<SettingsRow
				title="Bloquear agora"
				description={
					hasPin
						? "Esconde o app até introduzir o PIN."
						: "Precisa de um PIN primeiro."
				}
			>
				<Button
					variant="neutral"
					disabled={!hasPin}
					onClick={() => {
						onLock();
						lockApp();
					}}
				>
					<LockIcon className="size-3.5" /> Bloquear
				</Button>
			</SettingsRow>
			{mode ? <PinDialog mode={mode} onClose={() => setMode(null)} /> : null}
		</SettingsSection>
	);
}

const digitsOnly = (value: string) => value.replace(/\D/g, "").slice(0, 8);

function pinErrorMessage(error: unknown) {
	if (error instanceof ApiError && error.code === "WRONG_PIN") {
		const left = (error.details as { attemptsLeft?: number })?.attemptsLeft;
		return left === undefined
			? "PIN actual errado"
			: `PIN actual errado · ${left} ${left === 1 ? "tentativa" : "tentativas"} até bloquear`;
	}
	if (error instanceof ApiError && error.code === "PIN_LOCKED") {
		const until = (error.details as { lockedUntil?: string })?.lockedUntil;
		return until
			? `Bloqueado até às ${new Date(until).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })}`
			: error.message;
	}
	return errorMessage(error);
}

function PinDialog({ mode, onClose }: { mode: PinMode; onClose: () => void }) {
	const setPin = useSetPin();
	const removePin = useRemovePin();
	const [current, setCurrent] = useState("");
	const [next, setNext] = useState("");
	const [repeat, setRepeat] = useState("");
	const [error, setError] = useState<string | null>(null);
	const needsCurrent = mode !== "set";
	const needsNew = mode !== "remove";
	const mismatch = needsNew && repeat.length > 0 && repeat !== next;
	const valid =
		(!needsCurrent || current.length >= 4) &&
		(!needsNew || (next.length >= 4 && next === repeat));
	const pending = setPin.isPending || removePin.isPending;

	async function save() {
		if (!valid || pending) return;
		setError(null);
		try {
			if (mode === "remove") {
				await removePin.mutateAsync(current);
				toast.success("PIN removido");
			} else {
				await setPin.mutateAsync({
					pin: next,
					currentPin: needsCurrent ? current : undefined,
				});
				toast.success(mode === "set" ? "PIN definido" : "PIN mudado");
			}
			onClose();
		} catch (e) {
			setCurrent("");
			setError(pinErrorMessage(e));
		}
	}

	const title = {
		set: "Definir PIN",
		change: "Mudar PIN",
		remove: "Remover PIN",
	}[mode];

	return (
		<Dialog
			open
			onOpenChange={(open) => !open && onClose()}
			title={title}
			description="4 a 8 dígitos"
			width={380}
			footer={
				<>
					<Button variant="quiet" onClick={onClose}>
						Cancelar
					</Button>
					<Button
						variant={mode === "remove" ? "danger" : "primary"}
						disabled={!valid || pending}
						onClick={save}
					>
						{mode === "remove" ? "Remover" : "Guardar"}
					</Button>
				</>
			}
		>
			<form
				className="flex flex-col gap-3"
				onSubmit={(e) => {
					e.preventDefault();
					save();
				}}
			>
				{needsCurrent ? (
					<Field label="PIN actual">
						<Input
							type="password"
							inputMode="numeric"
							autoComplete="off"
							autoFocus
							value={current}
							onChange={(e) => setCurrent(digitsOnly(e.target.value))}
							className="num tracking-[.4em]"
						/>
					</Field>
				) : null}
				{needsNew ? (
					<>
						<Field label="Novo PIN">
							<Input
								type="password"
								inputMode="numeric"
								autoComplete="off"
								autoFocus={!needsCurrent}
								value={next}
								onChange={(e) => setNext(digitsOnly(e.target.value))}
								className="num tracking-[.4em]"
							/>
						</Field>
						<Field
							label="Repetir o novo PIN"
							hint={mismatch ? "os PINs não coincidem" : undefined}
						>
							<Input
								type="password"
								inputMode="numeric"
								autoComplete="off"
								value={repeat}
								onChange={(e) => setRepeat(digitsOnly(e.target.value))}
								className="num tracking-[.4em]"
							/>
						</Field>
					</>
				) : null}
				{error ? (
					<p role="alert" className="text-danger text-xs">
						{error}
					</p>
				) : null}
				<button type="submit" className="hidden" />
			</form>
		</Dialog>
	);
}
