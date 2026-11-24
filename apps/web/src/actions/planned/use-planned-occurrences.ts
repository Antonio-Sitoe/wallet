import { useQuery } from "@tanstack/react-query";
import type { PlannedOccurrence } from "@wallet/shared";
import { api } from "@/lib/api";

export const usePlannedOccurrences = (range: {
	from: string;
	to: string;
	today: string;
}) =>
	useQuery({
		queryKey: ["planned", "occurrences", range],
		queryFn: () =>
			api<PlannedOccurrence[]>("/planned-payments/occurrences", {
				query: range,
			}),
	});
