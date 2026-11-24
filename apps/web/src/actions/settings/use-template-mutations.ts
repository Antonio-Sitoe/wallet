import type { QueryClient } from "@tanstack/react-query";
import type {
	CreateTemplateInput,
	TransactionTemplate,
	UpdateTemplateInput,
} from "@wallet/shared";
import { TEMPLATES_KEY } from "@/actions/settings/keys";
import { useApiMutation } from "@/actions/shared/use-api-mutation";
import { api } from "@/lib/api";

const refreshTemplates = (qc: QueryClient) =>
	qc.invalidateQueries({ queryKey: TEMPLATES_KEY });

export const useCreateTemplate = () =>
	useApiMutation(
		(body: CreateTemplateInput) =>
			api<TransactionTemplate>("/settings/templates", { method: "POST", body }),
		refreshTemplates,
	);

export const useUpdateTemplate = () =>
	useApiMutation(
		({ id, ...body }: UpdateTemplateInput & { id: string }) =>
			api<TransactionTemplate>(`/settings/templates/${id}`, {
				method: "PATCH",
				body,
			}),
		refreshTemplates,
	);

export const useDeleteTemplate = () =>
	useApiMutation(
		(id: string) =>
			api<void>(`/settings/templates/${id}`, { method: "DELETE" }),
		refreshTemplates,
	);

export const useReorderTemplates = () =>
	useApiMutation(
		(ids: string[]) =>
			api<TransactionTemplate[]>("/settings/templates/order", {
				method: "PUT",
				body: { ids },
			}),
		refreshTemplates,
	);
