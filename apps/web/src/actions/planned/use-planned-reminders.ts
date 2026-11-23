import { useQuery } from "@tanstack/react-query";
import type { PlannedReminder } from "@wallet/shared";
import { api } from "@/lib/api";

export const usePlannedReminders = (today: string, enabled: boolean) =>
	useQuery({
		queryKey: ["planned", "reminders", today],
		queryFn: () =>
			api<PlannedReminder[]>("/planned-payments/reminders", {
				query: { today },
			}),
		enabled,
		refetchInterval: 30 * 60_000,
	});
