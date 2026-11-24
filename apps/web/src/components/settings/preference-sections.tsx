import type {
	CheckConfirmation,
	Density,
	NotificationPreferences,
	NumberFormat,
	Theme,
} from "@wallet/shared";
import { Button } from "@wallet/ui/components/button";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAccounts } from "@/actions/accounts/use-accounts";
import { usePlan } from "@/actions/plan/use-plan";
import { useUpdatePlan } from "@/actions/plan/use-update-plan";
import {
	SettingsRow,
	SettingsSection,
	SettingsValue,
} from "@/components/settings/settings-row";
import { MoneyInput } from "@/components/ui/money-input";
import { Segmented } from "@/components/ui/segmented";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { usePreferencesContext } from "@/contexts/preferences-context";
import {
	type NotifyPermission,
	notificationPermission,
	requestNotificationPermission,
	showNotification,
} from "@/lib/notify";
import { formatAmount, moneyInput, parseMoney } from "@/utils/format";

const EXAMPLE_AMOUNT = 11_658_250;

export function BudgetSection() {
	const { preferences, update } = usePreferencesContext();
	const accounts = useAccounts().data ?? [];
	const year = new Date().getFullYear();
	const plan = usePlan(year);
	const updatePlan = useUpdatePlan();
	const current = plan.data?.expectedIncome ?? preferences?.expectedIncome;
	const [salary, setSalary] = useState("");

	useEffect(() => {
		setSalary(moneyInput(current ?? null));
	}, [current]);

	if (!preferences) return null;

	async function saveSalary() {
		const cents = parseMoney(salary);
		if (cents === null || cents < 0) return setSalary(moneyInput(current));
		if (cents === current) return;
		update({ expectedIncome: cents });
		if (plan.data)
			await updatePlan.mutateAsync({ year, expectedIncome: cents });
		toast.success(
			plan.data
				? `Salário previsto guardado no plano de ${year}`
				: "Salário previsto guardado para o próximo plano",
		);
	}

	return (
		<SettingsSection title="Orçamento">
			<SettingsRow
				title="Salário previsto por mês"
				description={`Usado na lista do mês para calcular a sobra.${plan.data ? ` Muda o plano de ${year}.` : " Entra no próximo plano que criar."}`}
				htmlFor="settings-salary"
			>
				<MoneyInput
					id="settings-salary"
					value={salary}
					onChange={(e) => setSalary(e.target.value)}
					onBlur={saveSalary}
					onKeyDown={(e) => {
						if (e.key === "Enter") e.currentTarget.blur();
					}}
					className="w-36 text-right"
					placeholder="0"
				/>
				<span className="num text-dim text-[11px]">MZN</span>
			</SettingsRow>
			<SettingsRow
				title="Conta do salário"
				description="Conta escolhida por defeito quando regista uma entrada."
			>
				<Select
					className="w-52"
					aria-label="Conta do salário"
					value={preferences.salaryAccountId ?? ""}
					onValueChange={(value) => update({ salaryAccountId: value || null })}
					items={[
						{ value: "", label: "Nenhuma" },
						...accounts.map((a) => ({ value: a.id, label: a.name })),
					]}
				/>
			</SettingsRow>
			<SettingsRow
				title="Sobra de um item"
				description="Gastar menos do que o planeado deixa a diferença na conta. Não passa para o mês seguinte."
			>
				<span className="num text-money text-xs">fica na conta</span>
			</SettingsRow>
			<SettingsRow
				title="Pedir confirmação ao marcar um item"
				description="Abre a folha com valor e conta antes de criar a transacção."
			>
				<Segmented<CheckConfirmation>
					value={preferences.confirmOnCheck}
					onChange={(confirmOnCheck) => update({ confirmOnCheck })}
					options={[
						{ value: "always", label: "Sempre" },
						{ value: "changed", label: "Só se o valor mudar" },
						{ value: "never", label: "Nunca" },
					]}
				/>
			</SettingsRow>
		</SettingsSection>
	);
}

export function GeneralSection() {
	const { preferences, update } = usePreferencesContext();
	if (!preferences) return null;
	return (
		<SettingsSection title="Geral">
			<SettingsRow
				title="Moeda base"
				description="Todos os valores são guardados em centavos."
			>
				<SettingsValue>MZN · Metical</SettingsValue>
			</SettingsRow>
			<SettingsRow title="Formato dos números">
				<Segmented<NumberFormat>
					value={preferences.numberFormat}
					onChange={(numberFormat) => update({ numberFormat })}
					options={(["space", "dot", "comma"] as const).map((format) => ({
						value: format,
						label:
							formatAmount(EXAMPLE_AMOUNT, format).split(/[,.](?=\d\d$)/)[0] ??
							"",
					}))}
				/>
			</SettingsRow>
			<SettingsRow
				title="Ocultar dinheiro"
				description="Mostra •••• no lugar dos valores, em todos os ecrãs. Útil para mostrar o ecrã a alguém."
				htmlFor="settings-hide-money"
			>
				<span className="num text-dim text-[11px]">⇧⌘H</span>
				<Switch
					id="settings-hide-money"
					checked={preferences.hideMoney}
					onCheckedChange={(hideMoney) => update({ hideMoney })}
				/>
			</SettingsRow>
		</SettingsSection>
	);
}

export function AppearanceSection() {
	const { preferences, update } = usePreferencesContext();
	if (!preferences) return null;
	return (
		<SettingsSection title="Aparência">
			<SettingsRow
				title="Tema"
				description="Fica guardado na conta e segue-o em todos os dispositivos. ⇧⌘L alterna."
			>
				<Segmented<Theme>
					value={preferences.theme}
					onChange={(theme) => update({ theme })}
					options={[
						{ value: "system", label: "Sistema" },
						{ value: "light", label: "Claro" },
						{ value: "dark", label: "Escuro" },
					]}
				/>
			</SettingsRow>
			<SettingsRow
				title="Densidade"
				description="Confortável dá mais espaço às linhas e aos botões."
			>
				<Segmented<Density>
					value={preferences.density}
					onChange={(density) => update({ density })}
					options={[
						{ value: "compact", label: "Compacta" },
						{ value: "comfortable", label: "Confortável" },
					]}
				/>
			</SettingsRow>
		</SettingsSection>
	);
}

const NOTIFICATIONS: {
	key: keyof NotificationPreferences;
	title: string;
	description: string;
}[] = [
	{
		key: "upcomingPayments",
		title: "Pagamentos planeados",
		description:
			"Pagamentos planeados com lembrete: antes da data, no dia e enquanto estiverem atrasados.",
	},
	{
		key: "unpaidItems",
		title: "Itens por pagar",
		description:
			"A partir do dia 20, um lembrete por dia com os itens da lista do mês ainda por pagar.",
	},
	{
		key: "debtReminders",
		title: "Dívidas",
		description:
			"Na data de lembrete de uma dívida a receber ou a pagar, e nos dias seguintes até ficar paga.",
	},
	{
		key: "monthSummary",
		title: "Resumo do mês",
		description:
			"Nos primeiros dias do mês: entradas, saídas e sobra do mês anterior.",
	},
];

const PERMISSION_TEXT: Record<NotifyPermission, string> = {
	granted: "Permitidas · os avisos aparecem no sistema",
	default: "Ainda por permitir · os avisos aparecem só dentro do app",
	denied: "Bloqueadas no sistema · os avisos aparecem só dentro do app",
	unsupported: "Este ambiente não suporta notificações do sistema",
};

function PermissionRow() {
	const [permission, setPermission] = useState<NotifyPermission | null>(null);
	useEffect(() => {
		void notificationPermission().then(setPermission);
	}, []);
	return (
		<SettingsRow
			title="Notificações do sistema"
			description={permission ? PERMISSION_TEXT[permission] : "A verificar…"}
		>
			{permission === "default" || permission === "denied" ? (
				<Button
					variant="neutral"
					onClick={async () => {
						const next = await requestNotificationPermission();
						setPermission(next);
						if (next === "denied")
							toast.error(
								"O sistema bloqueou as notificações. Pode activá-las nas definições do sistema.",
							);
					}}
				>
					Permitir
				</Button>
			) : null}
			<Button
				variant="neutral"
				onClick={async () => {
					const sent = await showNotification(
						"Wallet",
						"Assim chegam os avisos que escolher aqui.",
					);
					if (!sent)
						toast("Wallet", {
							description: "Assim chegam os avisos dentro do app.",
						});
				}}
			>
				Testar
			</Button>
		</SettingsRow>
	);
}

export function NotificationsSection() {
	const { preferences, update } = usePreferencesContext();
	if (!preferences) return null;
	return (
		<SettingsSection
			title="Notificações"
			description="O app verifica os avisos ao abrir e a cada 15 minutos enquanto está aberto. Cada aviso aparece uma vez."
		>
			<PermissionRow />
			{NOTIFICATIONS.map((n) => (
				<SettingsRow
					key={n.key}
					title={n.title}
					description={n.description}
					htmlFor={`settings-notify-${n.key}`}
				>
					<Switch
						id={`settings-notify-${n.key}`}
						checked={preferences.notifications[n.key]}
						onCheckedChange={(checked) =>
							update({ notifications: { [n.key]: checked } })
						}
					/>
				</SettingsRow>
			))}
		</SettingsSection>
	);
}
