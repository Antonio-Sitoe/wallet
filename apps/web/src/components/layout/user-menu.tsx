import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuShortcut,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from "@wallet/ui/components/dropdown-menu";
import {
	ChevronsUpDownIcon,
	EyeOffIcon,
	LogOutIcon,
	SettingsIcon,
	UserIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useProfile } from "@/actions/settings/use-profile";
import { initials } from "@/components/accounts/utils";
import {
	THEMES,
	type ThemeName,
	useThemeSetter,
} from "@/components/layout/theme-switch";
import { usePreferencesContext } from "@/contexts/preferences-context";
import { useOpenSettings } from "@/contexts/settings-context";
import { authClient } from "@/lib/auth-client";

function Avatar({
	name,
	image,
	className,
}: {
	name: string;
	image: string | null | undefined;
	className?: string;
}) {
	return (
		<span
			className={`bg-info-bg text-info flex shrink-0 items-center justify-center overflow-hidden rounded-full text-[11px] font-semibold ${className ?? "size-8"}`}
		>
			{image ? (
				<img src={image} alt="" className="size-full object-cover" />
			) : (
				initials(name) || "?"
			)}
		</span>
	);
}

function useMounted() {
	const [mounted, setMounted] = useState(false);
	useEffect(() => setMounted(true), []);
	return mounted;
}

export function UserMenu({
	mod,
	onSignOut,
}: {
	mod: string;
	onSignOut: () => void;
}) {
	const { data: session } = authClient.useSession();
	const { data: profile } = useProfile();
	const { preferences, update } = usePreferencesContext();
	const openSettings = useOpenSettings();
	const { theme, setTheme } = useThemeSetter();
	const mounted = useMounted();
	const name = profile?.name ?? session?.user.name ?? "—";
	const email = profile?.email ?? session?.user.email ?? "";
	const image = profile?.image ?? session?.user.image;
	const currentTheme = mounted ? (theme ?? "system") : "system";
	const CurrentThemeIcon =
		THEMES.find((t) => t.value === currentTheme)?.icon ?? THEMES[0].icon;

	return (
		<DropdownMenu>
			<DropdownMenuTrigger className="hover:bg-hover data-popup-open:bg-selected focus-visible:ring-focus/50 flex w-full cursor-pointer items-center gap-2.5 rounded-lg p-1.5 text-left outline-none focus-visible:ring-2">
				<Avatar name={name} image={image} />
				<span className="flex min-w-0 flex-1 flex-col">
					<span className="truncate text-[13px] font-medium">{name}</span>
					<span className="num text-dim truncate text-[11px]">{email}</span>
				</span>
				<ChevronsUpDownIcon className="text-dim size-4 shrink-0" />
			</DropdownMenuTrigger>
			<DropdownMenuContent
				side="top"
				align="start"
				sideOffset={6}
				className="bg-surface-raised border-line-overlay shadow-popover w-(--anchor-width) min-w-60 rounded-lg border p-1 ring-0"
			>
				<DropdownMenuGroup>
					<DropdownMenuLabel className="flex items-center gap-2.5 px-2 py-2">
						<Avatar name={name} image={image} className="size-9" />
						<span className="flex min-w-0 flex-col">
							<span className="text-fg truncate text-[13px] font-medium">
								{name}
							</span>
							<span className="num text-dim truncate text-[11px]">{email}</span>
						</span>
					</DropdownMenuLabel>
				</DropdownMenuGroup>
				<DropdownMenuSeparator className="bg-line my-1" />
				<DropdownMenuGroup>
					<DropdownMenuItem
						className="text-[13px]"
						onClick={() => openSettings("profile")}
					>
						<UserIcon />
						Perfil
					</DropdownMenuItem>
					<DropdownMenuItem
						className="text-[13px]"
						onClick={() => openSettings()}
					>
						<SettingsIcon />
						Definições
						<DropdownMenuShortcut className="num">{mod},</DropdownMenuShortcut>
					</DropdownMenuItem>
				</DropdownMenuGroup>
				<DropdownMenuSeparator className="bg-line my-1" />
				<DropdownMenuGroup>
					<DropdownMenuCheckboxItem
						className="text-[13px]"
						checked={preferences?.hideMoney ?? false}
						disabled={!preferences}
						onCheckedChange={(hideMoney) => update({ hideMoney })}
					>
						<EyeOffIcon />
						Ocultar valores
						<DropdownMenuShortcut className="num mr-5">
							⇧{mod}H
						</DropdownMenuShortcut>
					</DropdownMenuCheckboxItem>
					<DropdownMenuSub>
						<DropdownMenuSubTrigger className="text-[13px]">
							<CurrentThemeIcon />
							Tema
						</DropdownMenuSubTrigger>
						<DropdownMenuSubContent className="bg-surface-raised border-line-overlay shadow-popover min-w-44 rounded-lg border p-1 ring-0">
							<DropdownMenuRadioGroup
								value={currentTheme}
								onValueChange={(value) => setTheme(value as ThemeName)}
							>
								{THEMES.map(({ value, label, icon: Icon }) => (
									<DropdownMenuRadioItem
										key={value}
										value={value}
										className="text-[13px]"
									>
										<Icon />
										{label}
									</DropdownMenuRadioItem>
								))}
							</DropdownMenuRadioGroup>
						</DropdownMenuSubContent>
					</DropdownMenuSub>
				</DropdownMenuGroup>
				<DropdownMenuSeparator className="bg-line my-1" />
				<DropdownMenuItem
					variant="destructive"
					className="text-[13px]"
					onClick={onSignOut}
				>
					<LogOutIcon />
					Sair
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
