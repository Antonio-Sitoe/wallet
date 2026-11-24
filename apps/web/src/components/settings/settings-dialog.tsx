import { Button } from "@wallet/ui/components/button";
import {
	DialogClose,
	DialogContent,
	Dialog as DialogRoot,
	DialogTitle,
} from "@wallet/ui/components/dialog";
import { cn } from "@wallet/ui/lib/utils";
import {
	BellIcon,
	DatabaseIcon,
	InfoIcon,
	KeyboardIcon,
	type LucideIcon,
	PaletteIcon,
	SearchIcon,
	ShieldIcon,
	SlidersHorizontalIcon,
	UserIcon,
	WalletIcon,
	XIcon,
	ZapIcon,
} from "lucide-react";
import { Fragment, type ReactNode, useMemo, useState } from "react";
import { useProfile } from "@/actions/settings/use-profile";
import { initials } from "@/components/accounts/utils";
import {
	AboutSection,
	DataSection,
	ShortcutsSection,
} from "@/components/settings/info-sections";
import {
	AppearanceSection,
	BudgetSection,
	GeneralSection,
	NotificationsSection,
} from "@/components/settings/preference-sections";
import { ProfileSection } from "@/components/settings/profile-section";
import { SecuritySection } from "@/components/settings/security-section";
import { TemplatesSection } from "@/components/settings/templates-section";
import type { SettingsSection } from "@/contexts/settings-context";

type SectionMeta = {
	id: SettingsSection;
	label: string;
	icon: LucideIcon;
	group: number;
	keywords: string;
};

const SECTIONS: SectionMeta[] = [
	{
		id: "profile",
		label: "Perfil",
		icon: UserIcon,
		group: 0,
		keywords: "nome foto avatar email conta apagar",
	},
	{
		id: "budget",
		label: "Orçamento",
		icon: WalletIcon,
		group: 0,
		keywords: "salário conta sobra confirmação marcar item",
	},
	{
		id: "general",
		label: "Geral",
		icon: SlidersHorizontalIcon,
		group: 0,
		keywords: "moeda formato números ocultar dinheiro esconder valores",
	},
	{
		id: "appearance",
		label: "Aparência",
		icon: PaletteIcon,
		group: 0,
		keywords: "tema claro escuro sistema densidade compacta confortável",
	},
	{
		id: "templates",
		label: "Modelos",
		icon: ZapIcon,
		group: 0,
		keywords: "modelos transacção rápida registo frequente transporte",
	},
	{
		id: "notifications",
		label: "Notificações",
		icon: BellIcon,
		group: 1,
		keywords: "avisos lembretes pagamentos dívidas resumo",
	},
	{
		id: "security",
		label: "Segurança",
		icon: ShieldIcon,
		group: 1,
		keywords: "pin bloquear",
	},
	{
		id: "shortcuts",
		label: "Atalhos",
		icon: KeyboardIcon,
		group: 1,
		keywords: "teclado atalhos acessibilidade",
	},
	{
		id: "data",
		label: "Dados",
		icon: DatabaseIcon,
		group: 2,
		keywords: "servidor imports exportar csv excel",
	},
	{
		id: "about",
		label: "Sobre",
		icon: InfoIcon,
		group: 2,
		keywords: "versão privacidade termos",
	},
];

const normalize = (text: string) =>
	text
		.normalize("NFD")
		.replace(/\p{Diacritic}/gu, "")
		.toLowerCase();

export function SettingsDialog({
	open,
	section,
	onSectionChange,
	onOpenChange,
}: {
	open: boolean;
	section: SettingsSection;
	onSectionChange: (section: SettingsSection) => void;
	onOpenChange: (open: boolean) => void;
}) {
	const [query, setQuery] = useState("");
	const { data: profile } = useProfile();
	const close = () => onOpenChange(false);

	const visible = useMemo(() => {
		const q = normalize(query.trim());
		if (!q) return SECTIONS;
		return SECTIONS.filter((s) =>
			normalize(`${s.label} ${s.keywords}`).includes(q),
		);
	}, [query]);

	const content: Record<SettingsSection, ReactNode> = {
		profile: <ProfileSection />,
		budget: <BudgetSection />,
		general: <GeneralSection />,
		appearance: <AppearanceSection />,
		templates: <TemplatesSection />,
		notifications: <NotificationsSection />,
		security: <SecuritySection onLock={close} />,
		shortcuts: <ShortcutsSection />,
		data: <DataSection onNavigate={close} />,
		about: <AboutSection />,
	};

	return (
		<DialogRoot open={open} onOpenChange={onOpenChange}>
			<DialogContent
				showCloseButton={false}
				className="bg-panel text-fg border-line-overlay shadow-overlay flex h-[min(720px,calc(100svh-32px))] w-[calc(100vw-32px)] max-w-[980px] flex-col gap-0 overflow-hidden rounded-[14px] border p-0 text-[13px] ring-0 sm:max-w-[980px]"
			>
				<header className="border-line flex items-center justify-between border-b px-5 py-3.5">
					<DialogTitle className="text-fg text-[15px] font-semibold">
						Definições
					</DialogTitle>
					<DialogClose
						render={
							<Button variant="quiet" size="icon-sm" aria-label="Fechar" />
						}
					>
						<XIcon className="size-4" />
					</DialogClose>
				</header>

				<div className="flex min-h-0 flex-1 flex-col md:flex-row">
					<nav
						aria-label="Secções das definições"
						className="border-line flex shrink-0 flex-col gap-1 border-b p-3 md:w-[232px] md:border-r md:border-b-0"
					>
						<label className="border-line bg-canvas focus-within:border-focus mb-2 flex h-8 items-center gap-2 rounded-lg border px-2.5">
							<SearchIcon className="text-dim size-3.5 shrink-0" />
							<span className="sr-only">Procurar nas definições</span>
							<input
								value={query}
								onChange={(e) => setQuery(e.target.value)}
								placeholder="Procurar"
								className="placeholder:text-dim min-w-0 flex-1 bg-transparent text-[13px] outline-none"
							/>
						</label>
						<div className="flex gap-0.5 overflow-x-auto md:flex-col md:overflow-visible">
							{visible.map((s, index) => {
								const Icon = s.icon;
								const active = s.id === section;
								const separated =
									index > 0 && visible[index - 1]?.group !== s.group;
								return (
									<Fragment key={s.id}>
										{separated ? (
											<span
												aria-hidden="true"
												className="bg-line mx-2 my-1.5 hidden h-px md:block"
											/>
										) : null}
										<button
											type="button"
											aria-current={active ? "page" : undefined}
											onClick={() => onSectionChange(s.id)}
											className={cn(
												"flex h-8 shrink-0 cursor-pointer items-center gap-2.5 rounded-lg px-2.5 text-left whitespace-nowrap",
												active
													? "bg-selected text-fg font-medium"
													: "text-fg-2 hover:bg-hover hover:text-fg",
											)}
										>
											<Icon
												className={cn("size-4", active && "text-money")}
												strokeWidth={1.8}
											/>
											{s.label}
										</button>
									</Fragment>
								);
							})}
							{visible.length === 0 ? (
								<span className="text-dim px-2.5 py-2 text-xs">
									Nada encontrado
								</span>
							) : null}
						</div>
						{profile ? (
							<div className="border-line mt-auto hidden items-center gap-2.5 border-t px-1 pt-3 md:flex">
								<span className="bg-info-bg text-info flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-full text-[11px] font-semibold">
									{profile.image ? (
										<img
											src={profile.image}
											alt=""
											className="size-full object-cover"
										/>
									) : (
										initials(profile.name)
									)}
								</span>
								<span className="flex min-w-0 flex-col">
									<span className="truncate text-xs font-medium">
										{profile.name}
									</span>
									<span className="num text-dim truncate text-[11px]">
										{profile.email}
									</span>
								</span>
							</div>
						) : null}
					</nav>

					<div className="min-h-0 flex-1 overflow-y-auto">
						<div className="mx-auto flex max-w-[680px] flex-col gap-8 px-5 py-5 md:px-8 md:py-6">
							{content[section]}
						</div>
					</div>
				</div>
			</DialogContent>
		</DialogRoot>
	);
}
