import type { Category, CreateCategoryInput } from "@wallet/shared";
import { refreshMoney } from "@/actions/shared/refresh-money";
import { useApiMutation } from "@/actions/shared/use-api-mutation";
import { api } from "@/lib/api";

export const useCreateCategory = () =>
	useApiMutation(
		(
			body: Partial<CreateCategoryInput> &
				Pick<CreateCategoryInput, "name" | "kind">,
		) => api<Category>("/categories", { method: "POST", body }),
		refreshMoney,
	);
