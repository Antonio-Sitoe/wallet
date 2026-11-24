import { Button } from "@wallet/ui/components/button";
import { Input } from "@wallet/ui/components/input";
import { CameraIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useDeleteProfile } from "@/actions/settings/use-delete-profile";
import { useProfile } from "@/actions/settings/use-profile";
import { useUpdateProfile } from "@/actions/settings/use-update-profile";
import { initials } from "@/components/accounts/utils";
import {
	SettingsRow,
	SettingsSection,
} from "@/components/settings/settings-row";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { authClient, clearDesktopToken } from "@/lib/auth-client";

const AVATAR_SIZE = 256;
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const ACCEPTED = ["image/png", "image/jpeg", "image/webp"];

async function avatarDataUrl(file: File) {
	const bitmap = await createImageBitmap(file);
	const side = Math.min(bitmap.width, bitmap.height);
	const canvas = document.createElement("canvas");
	canvas.width = AVATAR_SIZE;
	canvas.height = AVATAR_SIZE;
	const context = canvas.getContext("2d");
	if (!context) throw new Error("O navegador não conseguiu ler a imagem");
	context.drawImage(
		bitmap,
		(bitmap.width - side) / 2,
		(bitmap.height - side) / 2,
		side,
		side,
		0,
		0,
		AVATAR_SIZE,
		AVATAR_SIZE,
	);
	bitmap.close();
	const webp = canvas.toDataURL("image/webp", 0.85);
	return webp.startsWith("data:image/webp")
		? webp
		: canvas.toDataURL("image/jpeg", 0.85);
}

const memberSince = (iso: string) =>
	new Date(iso).toLocaleDateString("pt-PT", {
		day: "numeric",
		month: "long",
		year: "numeric",
	});

export function ProfileSection() {
	const { data: profile } = useProfile();
	const update = useUpdateProfile();
	const fileRef = useRef<HTMLInputElement>(null);
	const [name, setName] = useState("");
	const [deleting, setDeleting] = useState(false);

	useEffect(() => {
		if (profile) setName(profile.name);
	}, [profile]);

	async function pick(file: File | undefined) {
		if (!file) return;
		if (!ACCEPTED.includes(file.type))
			return toast.error("Use uma imagem PNG, JPEG ou WebP");
		if (file.size > MAX_UPLOAD_BYTES)
			return toast.error("A imagem tem mais de 10 MB");
		try {
			await update.mutateAsync({ image: await avatarDataUrl(file) });
			toast.success("Foto actualizada");
		} catch (e) {
			if (e instanceof Error && !update.isError) toast.error(e.message);
		}
	}

	async function saveName() {
		const trimmed = name.trim();
		if (!profile || !trimmed || trimmed === profile.name) {
			if (profile && !trimmed) setName(profile.name);
			return;
		}
		await update.mutateAsync({ name: trimmed });
		toast.success("Nome guardado");
	}

	return (
		<>
			<SettingsSection title="Perfil">
				<SettingsRow
					title="Foto de perfil"
					description="PNG, JPEG ou WebP, até 10 MB. Fica recortada em quadrado."
				>
					{profile?.image ? (
						<Button
							variant="quiet"
							size="sm"
							onClick={() => update.mutate({ image: null })}
						>
							Remover
						</Button>
					) : null}
					<button
						type="button"
						onClick={() => fileRef.current?.click()}
						aria-label="Mudar foto de perfil"
						className="group bg-info-bg text-info relative flex size-12 cursor-pointer items-center justify-center overflow-hidden rounded-full text-sm font-semibold"
					>
						{profile?.image ? (
							<img
								src={profile.image}
								alt=""
								className="size-full object-cover"
							/>
						) : (
							initials(profile?.name ?? "")
						)}
						<span className="absolute inset-0 hidden items-center justify-center bg-black/55 text-white group-hover:flex group-focus-visible:flex">
							<CameraIcon className="size-4" />
						</span>
					</button>
					<input
						ref={fileRef}
						type="file"
						accept={ACCEPTED.join(",")}
						className="hidden"
						onChange={(e) => {
							pick(e.target.files?.[0]);
							e.target.value = "";
						}}
					/>
				</SettingsRow>
				<SettingsRow title="Nome" htmlFor="settings-name">
					<Input
						id="settings-name"
						value={name}
						onChange={(e) => setName(e.target.value)}
						onBlur={saveName}
						onKeyDown={(e) => {
							if (e.key === "Enter") e.currentTarget.blur();
						}}
						className="w-full sm:w-64"
						maxLength={80}
					/>
				</SettingsRow>
				<SettingsRow
					title="Email"
					description="Usado para entrar. Ainda não pode ser mudado aqui."
				>
					<span className="num text-fg-2 text-xs">{profile?.email}</span>
				</SettingsRow>
				<SettingsRow title="Membro desde">
					<span className="num text-fg-2 text-xs">
						{profile ? memberSince(profile.createdAt) : "—"}
					</span>
				</SettingsRow>
			</SettingsSection>

			<SettingsSection title="Zona de perigo">
				<SettingsRow
					title="Apagar a conta"
					description="Apaga o utilizador e todos os dados: contas, transacções, planos, metas, dívidas e imports. Não dá para desfazer."
				>
					<Button variant="danger" onClick={() => setDeleting(true)}>
						Apagar conta
					</Button>
				</SettingsRow>
			</SettingsSection>

			{deleting && profile ? (
				<DeleteAccountDialog
					email={profile.email}
					onClose={() => setDeleting(false)}
				/>
			) : null}
		</>
	);
}

function DeleteAccountDialog({
	email,
	onClose,
}: {
	email: string;
	onClose: () => void;
}) {
	const remove = useDeleteProfile();
	const [typed, setTyped] = useState("");
	const matches = typed.trim().toLowerCase() === email.toLowerCase();

	async function confirm() {
		if (!matches) return;
		await remove.mutateAsync(typed);
		clearDesktopToken();
		await authClient.signOut().catch(() => undefined);
		window.location.href = "/login";
	}

	return (
		<Dialog
			open
			onOpenChange={(open) => !open && onClose()}
			title="Apagar a conta?"
			width={440}
			footer={
				<>
					<Button variant="quiet" onClick={onClose}>
						Cancelar
					</Button>
					<Button
						variant="danger"
						disabled={!matches || remove.isPending}
						onClick={confirm}
					>
						Apagar tudo
					</Button>
				</>
			}
		>
			<p className="text-fg-2 leading-relaxed">
				Todos os dados desta conta são apagados de vez. Para confirmar, escreva
				o seu email <span className="num text-fg">{email}</span>.
			</p>
			<Field label="Email">
				<Input
					value={typed}
					onChange={(e) => setTyped(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter") confirm();
					}}
					autoComplete="off"
					placeholder={email}
				/>
			</Field>
		</Dialog>
	);
}
