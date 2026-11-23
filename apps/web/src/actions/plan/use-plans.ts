import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export const usePlans = () =>
	useQuery({
		queryKey: ["plan", "list"],
		queryFn: () =>
			api<
				{
					id: string;
					year: number;
					expectedIncome: number;
					generated: boolean;
				}[]
			>("/budgets/plans"),
	});
