import type { whatsappLinks } from "@wallet/db/schema/whatsapp";
import type {
	CreateTransactionInput,
	CreateTransferInput,
} from "@wallet/shared";

import type { WhatsappSender } from "./evolution.client";
import type { NamedAccount, NamedCategory } from "./whatsapp.interpreter";

export type WhatsappLinkRow = typeof whatsappLinks.$inferSelect;

export type WhatsappDeps = {
	accounts: { list: (userId: string) => Promise<NamedAccount[]> };
	categories: { list: (userId: string) => Promise<NamedCategory[]> };
	transactions: {
		create: (userId: string, input: CreateTransactionInput) => Promise<unknown>;
		createTransfer: (
			userId: string,
			input: CreateTransferInput,
		) => Promise<unknown>;
	};
};

export type WhatsappConfig = {
	sender: WhatsappSender | null;
	botNumber: string | null;
	webhookSecret: string | null;
};
