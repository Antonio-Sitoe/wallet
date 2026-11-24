import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { TransactionsPage } from "@/components/transactions/transactions-page";
import { PERIODS, type Period } from "@/components/transactions/utils";

export const Route = createFileRoute("/_private/transactions")({
	validateSearch: z.object({
		period: z.enum(Object.keys(PERIODS) as [Period, ...Period[]]).optional(),
		account: z.string().optional(),
		category: z.string().optional(),
		type: z.enum(["expense", "income", "transfer", "adjustment"]).optional(),
		month: z.string().optional(),
		payee: z.string().optional(),
		label: z.string().optional(),
		q: z.string().optional(),
		id: z.string().optional(),
	}),
	component: TransactionsPage,
});
