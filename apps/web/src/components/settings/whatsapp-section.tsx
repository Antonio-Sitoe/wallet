import { formatPhone, WHATSAPP_CODE_LENGTH } from "@wallet/shared";
import { Button } from "@wallet/ui/components/button";
import { Input } from "@wallet/ui/components/input";
import { CheckCircle2Icon, MessageCircleIcon } from "lucide-react";
import { type FormEvent, useState } from "react";
import { toast } from "sonner";
import {
	useLinkWhatsapp,
	useUnlinkWhatsapp,
	useVerifyWhatsapp,
	useWhatsapp,
} from "@/actions/settings/use-whatsapp";
import {
	SettingsRow,
	SettingsSection,
} from "@/components/settings/settings-row";
import { useConfirm } from "@/contexts/confirm-context";
import { errorMessage } from "@/lib/api";

const COMMANDS = [
	["saldo", "saldo de todas as contas"],
	["- 250 mpesa pão", "saída de 250 MZN na M-Pesa"],
	["+ 5000 bci salário", "entrada"],
	["t 1000 bci mpesa", "transferência"],
	["- 250 mpesa pão #alimentação", "com categoria"],
	["ajuda", "lista de comandos"],
] as const;

function Commands() {
	return (
		<ul className="flex flex-col gap-1.5">
			{COMMANDS.map(([command, meaning]) => (
				<li key={command} className="flex flex-wrap items-baseline gap-2">
					<code className="num bg-panel-2 border-line rounded border px-1.5 py-px text-[12px]">
						{command}
					</code>
					<span className="text-dim text-[12px]">{meaning}</span>
				</li>
			))}
		</ul>
	);
}

export function WhatsappSection() {
	const status = useWhatsapp();
	const link = useLinkWhatsapp();
	const verify = useVerifyWhatsapp();
	const unlink = useUnlinkWhatsapp();
	const confirmAction = useConfirm();
	const [phone, setPhone] = useState("");
	const [code, setCode] = useState("");
	const [changing, setChanging] = useState(false);

	const data = status.data;
	if (!data) return null;

	const description =
		"Registe entradas, saídas e transferências e veja o saldo enviando mensagens ao número do Wallet no WhatsApp.";

	if (!data.enabled)
		return (
			<SettingsSection title="WhatsApp" description={description}>
				<SettingsRow
					title="Indisponível"
					description="O WhatsApp ainda não está configurado neste servidor."
				/>
			</SettingsSection>
		);

	const pending =
		!data.verified &&
		!!data.phone &&
		!!data.codeExpiresAt &&
		Date.parse(data.codeExpiresAt) > Date.now();
	const botLink = data.botNumber ? `https://wa.me/${data.botNumber}` : null;

	const sendCode = async (event?: FormEvent) => {
		event?.preventDefault();
		const target = phone.trim() || data.phone || "";
		if (!target) return;
		try {
			const next = await link.mutateAsync(target);
			setChanging(false);
			setCode("");
			toast.success(`Código enviado para ${formatPhone(next.phone ?? "")}`);
		} catch (error) {
			toast.error(errorMessage(error));
		}
	};

	const confirmCode = async (event: FormEvent) => {
		event.preventDefault();
		try {
			await verify.mutateAsync(code.trim());
			toast.success("WhatsApp ligado");
		} catch (error) {
			toast.error(errorMessage(error));
		}
	};

	const remove = async () => {
		if (
			!(await confirmAction({
				title: "Desligar o WhatsApp? As mensagens deste número deixam de chegar à sua conta.",
			}))
		)
			return;
		try {
			await unlink.mutateAsync();
			toast.success("WhatsApp desligado");
		} catch (error) {
			toast.error(errorMessage(error));
		}
	};

	if (data.verified && data.phone && !changing)
		return (
			<SettingsSection title="WhatsApp" description={description}>
				<SettingsRow
					title={
						<span className="inline-flex items-center gap-2">
							{formatPhone(data.phone)}
							<span className="bg-money-bg text-money inline-flex items-center gap-1 rounded-full px-2 py-px text-[11px]">
								<CheckCircle2Icon className="size-3" /> ligado
							</span>
						</span>
					}
					description={
						data.botNumber
							? `Envie mensagens deste número para ${formatPhone(data.botNumber)}.`
							: "Envie mensagens deste número para o número do Wallet."
					}
				>
					<Button variant="quiet" onClick={() => setChanging(true)}>
						Mudar número
					</Button>
					<Button variant="quiet" onClick={remove} disabled={unlink.isPending}>
						Desligar
					</Button>
					{botLink ? (
						<a href={botLink} target="_blank" rel="noreferrer">
							<Button variant="primary">
								<MessageCircleIcon className="size-3.5" /> Abrir conversa
							</Button>
						</a>
					) : null}
				</SettingsRow>
				<SettingsRow title="Comandos" stacked>
					<Commands />
				</SettingsRow>
			</SettingsSection>
		);

	if (pending && !changing)
		return (
			<SettingsSection title="WhatsApp" description={description}>
				<SettingsRow
					title="Confirme o número"
					description={`Enviámos um código de ${WHATSAPP_CODE_LENGTH} dígitos para ${formatPhone(data.phone ?? "")} pelo WhatsApp.`}
					stacked
				>
					<form className="flex flex-wrap gap-2" onSubmit={confirmCode}>
						<Input
							aria-label="Código"
							inputMode="numeric"
							autoComplete="one-time-code"
							maxLength={WHATSAPP_CODE_LENGTH}
							placeholder="000000"
							className="num w-32 tracking-[.3em]"
							value={code}
							onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
						/>
						<Button
							variant="primary"
							type="submit"
							disabled={code.length !== WHATSAPP_CODE_LENGTH || verify.isPending}
						>
							Confirmar
						</Button>
						<Button
							variant="quiet"
							type="button"
							onClick={() => sendCode()}
							disabled={link.isPending}
						>
							Reenviar código
						</Button>
						<Button
							variant="quiet"
							type="button"
							onClick={() => {
								setPhone("");
								setChanging(true);
							}}
						>
							Mudar número
						</Button>
					</form>
				</SettingsRow>
			</SettingsSection>
		);

	return (
		<SettingsSection title="WhatsApp" description={description}>
			<SettingsRow
				title="O seu número de WhatsApp"
				description="Enviamos um código por WhatsApp para confirmar que o número é seu."
				stacked
			>
				<form className="flex flex-wrap gap-2" onSubmit={sendCode}>
					<Input
						aria-label="Número de WhatsApp"
						type="tel"
						inputMode="tel"
						placeholder="84 123 4567"
						className="w-56"
						value={phone}
						onChange={(e) => setPhone(e.target.value)}
					/>
					<Button
						variant="primary"
						type="submit"
						disabled={!phone.trim() || link.isPending}
					>
						Enviar código
					</Button>
					{changing ? (
						<Button
							variant="quiet"
							type="button"
							onClick={() => setChanging(false)}
						>
							Cancelar
						</Button>
					) : null}
				</form>
			</SettingsRow>
			<SettingsRow title="O que pode enviar" stacked>
				<Commands />
			</SettingsRow>
		</SettingsSection>
	);
}
