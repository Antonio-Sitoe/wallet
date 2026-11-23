import type { Category, UpdateCategoryInput } from "@wallet/shared";
import { refreshMoney } from "@/actions/shared/refresh-money";
import { useApiMutation } from "@/actions/shared/use-api-mutation";
import { api } from "@/lib/api";

export const useUpdateCategory = () =>
	useApiMutation(
		({ id, ...body }: UpdateCategoryInput & { id: string }) =>
			api<Category>(`/categories/${id}`, { method: "PATCH", body }),
		refreshMoney,
	);
