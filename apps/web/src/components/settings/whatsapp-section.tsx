import { formatPhone, WHATSAPP_CODE_LENGTH } from "@wallet/shared";
import { Button } from "@wallet/ui/components/button";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@wallet/ui/components/collapsible";
import {
	InputOTP,
	InputOTPGroup,
	InputOTPSeparator,
	InputOTPSlot,
} from "@wallet/ui/components/input-otp";
import {
	CheckCircle2Icon,
	ChevronDownIcon,
	MessageCircleIcon,
	SmartphoneIcon,
} from "lucide-react";
import { type FormEvent, type ReactNode, useState } from "react";
import { toast } from "sonner";
import {
	useLinkWhatsapp,
	useUnlinkWhatsapp,
	useVerifyWhatsapp,
	useWhatsapp,
} from "@/actions/settings/use-whatsapp";
import { SettingsSection } from "@/components/settings/settings-row";
import { useConfirm } from "@/contexts/confirm-context";
import { errorMessage } from "@/lib/api";
import { openExternal } from "@/lib/open-external";

const COMMANDS = [
	["saldo", "saldo de todas as contas"],
	["- 250 mpesa pão", "saída de 250 MZN na M-Pesa"],
	["+ 5000 bci salário", "entrada"],
	["t 1000 bci mpesa", "transferência"],
	["- 250 mpesa pão #alimentação", "com categoria"],
	["ajuda", "lista de comandos"],
] as const;

const LOCAL_PHONE_LENGTH = 9;
const COUNTRY_CODE = "258";

function localDigits(value: string) {
	let digits = value.replace(/\D/g, "");
	if (digits.startsWith("00")) digits = digits.slice(2);
	if (digits.startsWith(COUNTRY_CODE) && digits.length > LOCAL_PHONE_LENGTH)
		digits = digits.slice(COUNTRY_CODE.length);
	return digits.slice(0, LOCAL_PHONE_LENGTH);
}

function formatLocalPhone(digits: string) {
	return [digits.slice(0, 2), digits.slice(2, 5), digits.slice(5)]
		.filter(Boolean)
		.join(" ");
}

function Card({ children }: { children: ReactNode }) {
	return (
		<div className="border-line bg-panel rounded-card flex flex-col gap-4 border p-4">
			{children}
		</div>
	);
}

function CardHeader({
	icon,
	title,
	description,
	badge,
}: {
	icon: ReactNode;
	title: ReactNode;
	description: ReactNode;
	badge?: ReactNode;
}) {
	return (
		<div className="flex items-start gap-3">
			<span className="bg-money-bg text-money flex size-9 shrink-0 items-center justify-center rounded-full">
				{icon}
			</span>
			<div className="flex min-w-0 flex-col gap-0.5">
				<span className="text-fg inline-flex flex-wrap items-center gap-2 text-[13px] font-medium">
					{title}
					{badge}
				</span>
				<span className="text-dim text-[12px] leading-relaxed">
					{description}
				</span>
			</div>
		</div>
	);
}

function Commands() {
	return (
		<Collapsible className="group border-line bg-panel rounded-card border">
			<CollapsibleTrigger className="text-fg-2 hover:text-fg flex w-full cursor-pointer items-center justify-between px-4 py-3 text-[13px]">
				Comandos que pode enviar
				<ChevronDownIcon className="text-dim size-4 transition-transform group-data-open:rotate-180" />
			</CollapsibleTrigger>
			<CollapsibleContent>
				<ul className="border-line flex flex-col gap-2 border-t px-4 pt-3 pb-4">
					{COMMANDS.map(([command, meaning]) => (
						<li key={command} className="flex flex-wrap items-baseline gap-2">
							<code className="num bg-panel-2 border-line rounded border px-1.5 py-px text-[12px]">
								{command}
							</code>
							<span className="text-dim text-[12px]">{meaning}</span>
						</li>
					))}
				</ul>
			</CollapsibleContent>
		</Collapsible>
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
				<Card>
					<CardHeader
						icon={<MessageCircleIcon className="size-4" />}
						title="Indisponível"
						description="O WhatsApp ainda não está configurado neste servidor."
					/>
				</Card>
			</SettingsSection>
		);

	const pending =
		!data.verified &&
		!!data.phone &&
		!!data.codeExpiresAt &&
		Date.parse(data.codeExpiresAt) > Date.now();
	const botLink = data.botNumber ? `https://wa.me/${data.botNumber}` : null;
	const phoneComplete = phone.length === LOCAL_PHONE_LENGTH;

	const sendCode = async (event?: FormEvent) => {
		event?.preventDefault();
		const target = phone ? `${COUNTRY_CODE}${phone}` : (data.phone ?? "");
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

	const confirmCode = async (event?: FormEvent) => {
		event?.preventDefault();
		if (code.length !== WHATSAPP_CODE_LENGTH) return;
		try {
			await verify.mutateAsync(code);
			toast.success("WhatsApp ligado");
		} catch (error) {
			setCode("");
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
				<div className="flex flex-col gap-3">
					<Card>
						<CardHeader
							icon={<CheckCircle2Icon className="size-4" />}
							title={<span className="num">{formatPhone(data.phone)}</span>}
							badge={
								<span className="bg-money-bg text-money rounded-full px-2 py-px text-[11px]">
									ligado
								</span>
							}
							description={
								data.botNumber
									? `Envie mensagens deste número para ${formatPhone(data.botNumber)}.`
									: "Envie mensagens deste número para o número do Wallet."
							}
						/>
						<div className="flex flex-wrap gap-2">
							{botLink ? (
								<Button
									variant="primary"
									size="lg"
									onClick={() =>
										openExternal(botLink).catch((error) =>
											toast.error(errorMessage(error)),
										)
									}
								>
									<MessageCircleIcon className="size-3.5" /> Abrir conversa
								</Button>
							) : null}
							<Button
								variant="neutral"
								size="lg"
								onClick={() => {
									setPhone("");
									setChanging(true);
								}}
							>
								Mudar número
							</Button>
							<Button
								variant="quiet"
								size="lg"
								onClick={remove}
								isLoading={unlink.isPending}
							>
								Desligar
							</Button>
						</div>
					</Card>
					<Commands />
				</div>
			</SettingsSection>
		);

	if (pending && !changing)
		return (
			<SettingsSection title="WhatsApp" description={description}>
				<Card>
					<CardHeader
						icon={<MessageCircleIcon className="size-4" />}
						title="Confirme o número"
						description={
							<>
								Enviámos um código de {WHATSAPP_CODE_LENGTH} dígitos para{" "}
								<span className="num text-fg-2">
									{formatPhone(data.phone ?? "")}
								</span>{" "}
								pelo WhatsApp.
							</>
						}
					/>
					<form className="flex flex-col gap-4" onSubmit={confirmCode}>
						<InputOTP
							aria-label="Código"
							maxLength={WHATSAPP_CODE_LENGTH}
							value={code}
							onChange={(value) => setCode(value.replace(/\D/g, ""))}
							autoFocus
							disabled={verify.isPending}
						>
							<InputOTPGroup>
								<InputOTPSlot index={0} />
								<InputOTPSlot index={1} />
								<InputOTPSlot index={2} />
							</InputOTPGroup>
							<InputOTPSeparator />
							<InputOTPGroup>
								<InputOTPSlot index={3} />
								<InputOTPSlot index={4} />
								<InputOTPSlot index={5} />
							</InputOTPGroup>
						</InputOTP>
						<div className="flex flex-wrap gap-2">
							<Button
								variant="primary"
								size="lg"
								type="submit"
								disabled={code.length !== WHATSAPP_CODE_LENGTH}
								isLoading={verify.isPending}
							>
								Confirmar
							</Button>
							<Button
								variant="neutral"
								size="lg"
								type="button"
								onClick={() => sendCode()}
								isLoading={link.isPending}
							>
								Reenviar código
							</Button>
							<Button
								variant="quiet"
								size="lg"
								type="button"
								onClick={() => {
									setPhone("");
									setChanging(true);
								}}
							>
								Mudar número
							</Button>
						</div>
					</form>
				</Card>
			</SettingsSection>
		);

	return (
		<SettingsSection title="WhatsApp" description={description}>
			<div className="flex flex-col gap-3">
				<Card>
					<CardHeader
						icon={<SmartphoneIcon className="size-4" />}
						title="O seu número de WhatsApp"
						description="Enviamos um código por WhatsApp para confirmar que o número é seu."
					/>
					<form className="flex flex-wrap gap-2" onSubmit={sendCode}>
						<label className="border-input dark:bg-background focus-within:border-ring focus-within:ring-ring/50 flex h-9 w-60 items-center rounded-md border transition-colors focus-within:ring-3">
							<span className="num text-dim border-line flex h-full items-center border-r px-2.5 text-[13px]">
								+{COUNTRY_CODE}
							</span>
							<input
								aria-label="Número de WhatsApp"
								type="tel"
								inputMode="tel"
								autoComplete="tel-national"
								placeholder="84 123 4567"
								className="num placeholder:text-muted-foreground h-full min-w-0 flex-1 bg-transparent px-2.5 text-[13px] tracking-wide outline-none"
								value={formatLocalPhone(phone)}
								onChange={(e) => setPhone(localDigits(e.target.value))}
							/>
						</label>
						<Button
							variant="primary"
							size="lg"
							type="submit"
							disabled={!phoneComplete}
							isLoading={link.isPending}
						>
							Enviar código
						</Button>
						{changing ? (
							<Button
								variant="quiet"
								size="lg"
								type="button"
								onClick={() => setChanging(false)}
							>
								Cancelar
							</Button>
						) : null}
					</form>
				</Card>
				<Commands />
			</div>
		</SettingsSection>
	);
}
