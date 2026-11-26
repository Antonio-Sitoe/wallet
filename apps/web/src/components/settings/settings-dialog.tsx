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
	ChevronLeftIcon,
	ChevronRightIcon,
	DatabaseIcon,
	InfoIcon,
	KeyboardIcon,
	type LucideIcon,
	MessageCircleIcon,
	PaletteIcon,
	SearchIcon,
	ShieldIcon,
	SlidersHorizontalIcon,
	UserIcon,
	WalletIcon,
	XIcon,
	ZapIcon,
} from "lucide-react";
import {
	Fragment,
	type ReactNode,
	useEffect,
	useMemo,
	useState,
} from "react";
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
import { SessionsSection } from "@/components/settings/sessions-section";
import { TemplatesSection } from "@/components/settings/templates-section";
import { WhatsappSection } from "@/components/settings/whatsapp-section";
import type { SettingsSection } from "@/contexts/settings-context";
import { useIsMobile } from "@/hooks/use-is-mobile";

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
		id: "whatsapp",
		label: "WhatsApp",
		icon: MessageCircleIcon,
		group: 1,
		keywords: "whatsapp mensagens bot número telemóvel registar saldo",
	},
	{
		id: "security",
		label: "Segurança",
		icon: ShieldIcon,
		group: 1,
		keywords: "pin bloquear sessões dispositivos terminar",
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

const TILE: Record<SettingsSection, string> = {
	profile: "#3987e5",
	budget: "#199e70",
	general: "#6e7681",
	appearance: "#8250df",
	templates: "#d29922",
	notifications: "#e5534b",
	whatsapp: "#25a244",
	security: "#3987e5",
	shortcuts: "#6e7681",
	data: "#d95926",
	about: "#6e7681",
};

const normalize = (text: string) =>
	text
		.normalize("NFD")
		.replace(/\p{Diacritic}/gu, "")
		.toLowerCase();

type SettingsDialogProps = {
	open: boolean;
	section: SettingsSection;
	direct?: boolean;
	onSectionChange: (section: SettingsSection) => void;
	onOpenChange: (open: boolean) => void;
};

function useVisibleSections(query: string) {
	return useMemo(() => {
		const q = normalize(query.trim());
		if (!q) return SECTIONS;
		return SECTIONS.filter((s) =>
			normalize(`${s.label} ${s.keywords}`).includes(q),
		);
	}, [query]);
}

function sectionContent(close: () => void): Record<SettingsSection, ReactNode> {
	return {
		profile: <ProfileSection />,
		budget: <BudgetSection />,
		general: <GeneralSection />,
		appearance: <AppearanceSection />,
		templates: <TemplatesSection />,
		notifications: <NotificationsSection />,
		whatsapp: <WhatsappSection />,
		security: (
			<div className="flex flex-col gap-8">
				<SecuritySection onLock={close} />
				<SessionsSection />
			</div>
		),
		shortcuts: <ShortcutsSection />,
		data: <DataSection onNavigate={close} />,
		about: <AboutSection />,
	};
}

export function SettingsDialog(props: SettingsDialogProps) {
	const isMobile = useIsMobile();
	return isMobile ? (
		<MobileSettings {...props} />
	) : (
		<DesktopSettings {...props} />
	);
}

function MobileSettings({
	open,
	section,
	direct,
	onSectionChange,
	onOpenChange,
}: SettingsDialogProps) {
	const [query, setQuery] = useState("");
	const [view, setView] = useState<"list" | "detail">("list");
	const { data: profile } = useProfile();
	const close = () => onOpenChange(false);
	const visible = useVisibleSections(query);
	const content = sectionContent(close);
	const current = SECTIONS.find((s) => s.id === section);

	useEffect(() => {
		if (open) {
			setView(direct ? "detail" : "list");
			setQuery("");
		}
	}, [open, direct]);

	const groups = [0, 1, 2]
		.map((g) =>
			visible.filter((s) => s.group === g && s.id !== "shortcuts"),
		)
		.filter((list) => list.length > 0);

	return (
		<DialogRoot open={open} onOpenChange={onOpenChange}>
			<DialogContent
				showCloseButton={false}
				className="bg-canvas text-fg data-open:slide-in-from-bottom data-open:zoom-in-100 data-closed:slide-out-to-bottom data-closed:zoom-out-100 fixed inset-0 top-0 left-0 flex h-svh w-full max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none border-0 p-0 text-[15px] ring-0 duration-250 sm:max-w-none"
			>
				<header className="bg-canvas border-line pt-safe relative flex min-h-[52px] shrink-0 items-end border-b">
					<div className="flex h-[52px] w-full items-center px-2">
						{view === "detail" ? (
							<button
								type="button"
								onClick={() => setView("list")}
								className="text-info-2 flex h-11 cursor-pointer items-center gap-0.5 pr-2 text-[16px]"
							>
								<ChevronLeftIcon className="size-6" strokeWidth={2.2} />
								Definições
							</button>
						) : null}
						<DialogTitle className="text-fg pointer-events-none absolute inset-x-0 bottom-0 flex h-[52px] items-center justify-center text-[17px] font-semibold">
							{view === "detail" ? (current?.label ?? "Definições") : "Definições"}
						</DialogTitle>
						<DialogClose
							render={
								<button
									type="button"
									className="text-info-2 ml-auto flex h-11 cursor-pointer items-center px-2 text-[16px] font-semibold"
								/>
							}
						>
							OK
						</DialogClose>
					</div>
				</header>

				{view === "list" ? (
					<div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
						<div className="flex flex-col gap-6 px-4 pt-4 pb-[max(24px,var(--safe-bottom))]">
							{profile ? (
								<button
									type="button"
									onClick={() => {
										onSectionChange("profile");
										setView("detail");
									}}
									className="bg-panel border-line active:bg-hover flex cursor-pointer items-center gap-3.5 rounded-[18px] border p-4 text-left"
								>
									<span className="bg-info-bg text-info flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-full text-lg font-semibold">
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
									<span className="flex min-w-0 flex-1 flex-col gap-0.5">
										<span className="truncate text-[17px] font-semibold">
											{profile.name}
										</span>
										<span className="text-dim truncate text-[13px]">
											{profile.email}
										</span>
									</span>
									<ChevronRightIcon className="text-faint size-5 shrink-0" />
								</button>
							) : null}

							<label className="bg-panel border-line focus-within:border-focus flex h-11 items-center gap-2 rounded-[12px] border px-3">
								<SearchIcon className="text-dim size-4 shrink-0" />
								<span className="sr-only">Procurar nas definições</span>
								<input
									value={query}
									onChange={(e) => setQuery(e.target.value)}
									placeholder="Procurar"
									className="placeholder:text-dim min-w-0 flex-1 bg-transparent outline-none"
								/>
							</label>

							{groups.map((list) => (
								<div
									key={list[0]?.id}
									className="bg-panel border-line overflow-hidden rounded-[18px] border"
								>
									{list.map((s, i) => {
										const Icon = s.icon;
										return (
											<Fragment key={s.id}>
												{i ? <div className="bg-line ml-[58px] h-px" /> : null}
												<button
													type="button"
													onClick={() => {
														onSectionChange(s.id);
														setView("detail");
													}}
													className="active:bg-hover flex min-h-[52px] w-full cursor-pointer items-center gap-3.5 px-3.5 text-left"
												>
													<span
														className="flex size-[30px] shrink-0 items-center justify-center rounded-[8px] text-white"
														style={{ background: TILE[s.id] }}
													>
														<Icon className="size-[18px]" strokeWidth={2} />
													</span>
													<span className="flex-1">{s.label}</span>
													<ChevronRightIcon className="text-faint size-5 shrink-0" />
												</button>
											</Fragment>
										);
									})}
								</div>
							))}
							{visible.length === 0 ? (
								<p className="text-dim py-6 text-center text-sm">
									Nada encontrado
								</p>
							) : null}
						</div>
					</div>
				) : (
					<div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
						<div className="flex flex-col gap-8 px-4 pt-5 pb-[max(32px,var(--safe-bottom))]">
							{content[section]}
						</div>
					</div>
				)}
			</DialogContent>
		</DialogRoot>
	);
}

function DesktopSettings({
	open,
	section,
	onSectionChange,
	onOpenChange,
}: SettingsDialogProps) {
	const [query, setQuery] = useState("");
	const { data: profile } = useProfile();
	const close = () => onOpenChange(false);
	const visible = useVisibleSections(query);
	const content = sectionContent(close);

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
