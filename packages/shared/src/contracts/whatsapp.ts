import { z } from "zod";

export const WHATSAPP_CODE_LENGTH = 6;
export const WHATSAPP_CODE_MINUTES = 10;

export function normalizePhone(raw: string): string | null {
	let digits = raw.replace(/\D/g, "");
	if (digits.startsWith("00")) digits = digits.slice(2);
	if (/^8\d{8}$/.test(digits)) digits = `258${digits}`;
	return /^\d{10,15}$/.test(digits) ? digits : null;
}

export function formatPhone(phone: string | number): string {
	const digits = String(phone).replace(/\D/g, "");
	const match = digits.match(/^258(\d{2})(\d{3})(\d{4})$/);
	return match ? `+258 ${match[1]} ${match[2]} ${match[3]}` : `+${digits}`;
}

export const linkWhatsappInput = z.object({
	phone: z
		.string()
		.trim()
		.max(30)
		.transform((value, ctx) => {
			const phone = normalizePhone(value);
			if (!phone) {
				ctx.addIssue({
					code: "custom",
					message: "Número inválido. Ex.: 84 123 4567 ou +258 84 123 4567",
				});
				return z.NEVER;
			}
			return phone;
		}),
});
export type LinkWhatsappInput = z.input<typeof linkWhatsappInput>;

export const verifyWhatsappInput = z.object({
	code: z
		.string()
		.trim()
		.regex(
			new RegExp(`^\\d{${WHATSAPP_CODE_LENGTH}}$`),
			`O código tem ${WHATSAPP_CODE_LENGTH} dígitos`,
		),
});
export type VerifyWhatsappInput = z.infer<typeof verifyWhatsappInput>;

export type WhatsappStatus = {
	enabled: boolean;
	botNumber: string | null;
	phone: string | null;
	verified: boolean;
	codeExpiresAt: string | null;
};
