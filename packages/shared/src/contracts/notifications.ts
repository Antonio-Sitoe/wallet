import { z } from "zod";

export const NOTIFICATION_KINDS = [
	"upcomingPayments",
	"unpaidItems",
	"debtReminders",
	"monthSummary",
] as const;
export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

export type AppNotice = {
	key: string;
	kind: NotificationKind;
	title: string;
	body: string;
	href: string;
};

export const noticesQuery = z.object({
	today: z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}$/, "Use AAAA-MM-DD")
		.optional(),
});
