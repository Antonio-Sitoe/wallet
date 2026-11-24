import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { PAYMENT_TABS, PaymentsPage } from "@/components/planned/payments-page";

export const Route = createFileRoute("/_private/payments")({
	validateSearch: z.object({
		id: z.string().optional(),
		tab: z.enum(PAYMENT_TABS).optional(),
	}),
	component: PaymentsPage,
});
