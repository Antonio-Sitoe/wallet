/** Data hooks: one place that knows the API paths and which caches a change touches. */
import {
	type QueryClient,
	useInfiniteQuery,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import type {
	Account,
	Category,
	CommitImportInput,
	CreateAccountInput,
	CreateCategoryInput,
	CreateMonthItemInput,
	CreatePlanItemInput,
	CreateTransactionInput,
	CreateTransferInput,
	ImportBatchSummary,
	ImportPreview,
	MonthBudget,
	MonthItem,
	PayMonthItemInput,
	Plan,
	PlanItem,
	Transaction,
	TransactionPage,
	Transfer,
	UpdateAccountInput,
	UpdateCategoryInput,
	UpdateMonthItemInput,
	UpdatePlanItemInput,
	UpdateTransactionInput,
	UpdateTransferInput,
	WalletMapping,
} from "@wallet/shared";
import { toast } from "sonner";

import { api, errorMessage } from "./api";

/** Dates travel as ISO strings; the shared input types use Date after parsing. */
type Wire<T> = {
	[K in keyof T]: T[K] extends Date
		? string
		: T[K] extends Date | undefined
			? string | undefined
			: T[K];
};

/** Anything that moves money can change balances, lists, budgets and category counts. */
function refreshMoney(qc: QueryClient) {
	for (const key of [
		"accounts",
		"transactions",
		"transaction",
		"transfer",
		"budget-month",
		"plan",
		"categories",
		"month-item",
	]) {
		qc.invalidateQueries({ queryKey: [key] });
	}
}

/** useMutation with the error toast every screen wants. */
function useApiMutation<TVars, TResult>(
	fn: (vars: TVars) => Promise<TResult>,
	onDone: (qc: QueryClient) => void,
) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: fn,
		onSuccess: () => onDone(qc),
		onError: (error) => toast.error(errorMessage(error)),
	});
}

// ---- Accounts

export const useAccounts = (includeArchived = false) =>
	useQuery({
		queryKey: ["accounts", { includeArchived }],
		queryFn: () => api<Account[]>("/accounts", { query: { includeArchived } }),
	});

export const useCreateAccount = () =>
	useApiMutation(
		(
			body: Partial<CreateAccountInput> &
				Pick<CreateAccountInput, "name" | "type">,
		) => api<Account>("/accounts", { method: "POST", body }),
		refreshMoney,
	);

export const useUpdateAccount = () =>
	useApiMutation(
		({ id, ...body }: UpdateAccountInput & { id: string }) =>
			api<Account>(`/accounts/${id}`, { method: "PATCH", body }),
		refreshMoney,
	);

export const useReconcileAccount = () =>
	useApiMutation(
		({ id, balance }: { id: string; balance: number }) =>
			api<Account>(`/accounts/${id}/reconcile`, {
				method: "POST",
				body: { balance },
			}),
		refreshMoney,
	);

export const useDeleteAccount = () =>
	useApiMutation(
		(id: string) => api<void>(`/accounts/${id}`, { method: "DELETE" }),
		refreshMoney,
	);

// ---- Categories

export const useCategories = () =>
	useQuery({
		queryKey: ["categories"],
		queryFn: () => api<Category[]>("/categories"),
	});

export const useCreateCategory = () =>
	useApiMutation(
		(
			body: Partial<CreateCategoryInput> &
				Pick<CreateCategoryInput, "name" | "kind">,
		) => api<Category>("/categories", { method: "POST", body }),
		refreshMoney,
	);

export const useUpdateCategory = () =>
	useApiMutation(
		({ id, ...body }: UpdateCategoryInput & { id: string }) =>
			api<Category>(`/categories/${id}`, { method: "PATCH", body }),
		refreshMoney,
	);

export const useDeleteCategory = () =>
	useApiMutation(
		(id: string) => api<void>(`/categories/${id}`, { method: "DELETE" }),
		refreshMoney,
	);

export const useWalletMap = () =>
	useQuery({
		queryKey: ["wallet-map"],
		queryFn: () => api<WalletMapping[]>("/categories/wallet-map"),
	});

export const useSetWalletMapping = () =>
	useApiMutation(
		(body: WalletMapping) =>
			api<WalletMapping[]>("/categories/wallet-map", { method: "PUT", body }),
		(qc) => {
			qc.invalidateQueries({ queryKey: ["wallet-map"] });
			qc.invalidateQueries({ queryKey: ["categories"] });
			qc.invalidateQueries({ queryKey: ["import"] });
		},
	);

// ---- Transactions

export type TransactionFilters = {
	from?: string;
	to?: string;
	accountId?: string[];
	categoryId?: string[];
	type?: "expense" | "income" | "transfer";
	referenceMonth?: string;
	q?: string;
};

export const useTransactionPages = (filters: TransactionFilters, limit = 100) =>
	useInfiniteQuery({
		queryKey: ["transactions", filters, limit],
		initialPageParam: undefined as string | undefined,
		queryFn: ({ pageParam }) =>
			api<TransactionPage>("/transactions", {
				query: { ...filters, limit, cursor: pageParam },
			}),
		getNextPageParam: (last) => last.nextCursor ?? undefined,
	});

export const useTransaction = (id: string | null) =>
	useQuery({
		queryKey: ["transaction", id],
		queryFn: () => api<Transaction>(`/transactions/${id}`),
		enabled: !!id,
	});

export const useTransfer = (id: string | null) =>
	useQuery({
		queryKey: ["transfer", id],
		queryFn: () => api<Transfer>(`/transfers/${id}`),
		enabled: !!id,
	});

export const useCreateTransaction = () =>
	useApiMutation(
		(
			body: Wire<Partial<CreateTransactionInput>> &
				Pick<CreateTransactionInput, "type" | "accountId" | "amount">,
		) => api<Transaction>("/transactions", { method: "POST", body }),
		refreshMoney,
	);

export const useUpdateTransaction = () =>
	useApiMutation(
		({ id, ...body }: Wire<UpdateTransactionInput> & { id: string }) =>
			api<Transaction>(`/transactions/${id}`, { method: "PATCH", body }),
		refreshMoney,
	);

export const useDeleteTransaction = () =>
	useApiMutation(
		(id: string) => api<void>(`/transactions/${id}`, { method: "DELETE" }),
		refreshMoney,
	);

export const useCreateTransfer = () =>
	useApiMutation(
		(
			body: Wire<Omit<CreateTransferInput, "referenceMonth">> & {
				referenceMonth?: string;
			},
		) => api<Transfer>("/transfers", { method: "POST", body }),
		refreshMoney,
	);

export const useUpdateTransfer = () =>
	useApiMutation(
		({ id, ...body }: Wire<UpdateTransferInput> & { id: string }) =>
			api<Transfer>(`/transfers/${id}`, { method: "PATCH", body }),
		refreshMoney,
	);

export const useDeleteTransfer = () =>
	useApiMutation(
		(id: string) => api<void>(`/transfers/${id}`, { method: "DELETE" }),
		refreshMoney,
	);

// ---- Imports

export const useImports = () =>
	useQuery({
		queryKey: ["imports"],
		queryFn: () => api<ImportBatchSummary[]>("/imports"),
	});

export const useImportPreview = (id: string | null) =>
	useQuery({
		queryKey: ["import", id],
		queryFn: () => api<ImportPreview>(`/imports/${id}`),
		enabled: !!id,
	});

export const useUploadWallet = () =>
	useApiMutation(
		(files: { name: string; content: string }[]) =>
			api<ImportPreview>("/imports/wallet", {
				method: "POST",
				body: { files },
			}),
		(qc) => qc.invalidateQueries({ queryKey: ["imports"] }),
	);

export const useCommitImport = () =>
	useApiMutation(
		({ id, ...body }: Partial<CommitImportInput> & { id: string }) =>
			api<
				ImportPreview & {
					result: {
						transactions: number;
						transfers: number;
						skippedDuplicates: number;
						ignored: number;
					};
				}
			>(`/imports/${id}/commit`, { method: "POST", body }),
		(qc) => {
			refreshMoney(qc);
			qc.invalidateQueries({ queryKey: ["imports"] });
			qc.invalidateQueries({ queryKey: ["import"] });
			qc.invalidateQueries({ queryKey: ["wallet-map"] });
		},
	);

export const useDeleteImport = () =>
	useApiMutation(
		(id: string) =>
			api<{ removed: { transactions: number; transfers: number } }>(
				`/imports/${id}`,
				{ method: "DELETE" },
			),
		(qc) => {
			refreshMoney(qc);
			qc.invalidateQueries({ queryKey: ["imports"] });
		},
	);

// ---- Budget

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

export const usePlan = (year: number) =>
	useQuery({
		queryKey: ["plan", year],
		queryFn: () => api<Plan>(`/budgets/plans/${year}`),
		retry: (count, error) =>
			(error as { status?: number }).status !== 404 && count < 2,
	});

export const useCreatePlan = () =>
	useApiMutation(
		(body: {
			year: number;
			expectedIncome?: number;
			copyFrom?: number;
			copyOneOff?: boolean;
			copySeasonal?: boolean;
		}) => api<Plan>("/budgets/plans", { method: "POST", body }),
		refreshMoney,
	);

export const useUpdatePlan = () =>
	useApiMutation(
		({ year, expectedIncome }: { year: number; expectedIncome: number }) =>
			api<Plan>(`/budgets/plans/${year}`, {
				method: "PATCH",
				body: { expectedIncome },
			}),
		refreshMoney,
	);

export const useGeneratePlan = () =>
	useApiMutation(
		(year: number) =>
			api<{ created: number; plan: Plan }>(`/budgets/plans/${year}/generate`, {
				method: "POST",
			}),
		refreshMoney,
	);

export const useAddPlanItem = () =>
	useApiMutation(
		({
			year,
			...body
		}: Partial<CreatePlanItemInput> &
			Pick<CreatePlanItemInput, "name" | "amount"> & { year: number }) =>
			api<PlanItem>(`/budgets/plans/${year}/items`, { method: "POST", body }),
		refreshMoney,
	);

export const useUpdatePlanItem = () =>
	useApiMutation(
		({ id, ...body }: UpdatePlanItemInput & { id: string }) =>
			api<PlanItem>(`/budgets/plan-items/${id}`, { method: "PATCH", body }),
		refreshMoney,
	);

export const useDeletePlanItem = () =>
	useApiMutation(
		({ id, applyFrom }: { id: string; applyFrom?: string }) =>
			api<void>(`/budgets/plan-items/${id}`, {
				method: "DELETE",
				query: { applyFrom },
			}),
		refreshMoney,
	);

export const useMonthBudget = (month: string) =>
	useQuery({
		queryKey: ["budget-month", month],
		queryFn: () => api<MonthBudget>(`/budgets/months/${month}`),
	});

export const useAddMonthItem = () =>
	useApiMutation(
		({
			month,
			...body
		}: Partial<CreateMonthItemInput> &
			Pick<CreateMonthItemInput, "name" | "amount"> & { month: string }) =>
			api<MonthItem>(`/budgets/months/${month}/items`, {
				method: "POST",
				body,
			}),
		refreshMoney,
	);

export const useUpdateMonthItem = () =>
	useApiMutation(
		({ id, ...body }: UpdateMonthItemInput & { id: string }) =>
			api<MonthItem>(`/budgets/month-items/${id}`, { method: "PATCH", body }),
		refreshMoney,
	);

export const useDeleteMonthItem = () =>
	useApiMutation(
		(id: string) =>
			api<void>(`/budgets/month-items/${id}`, { method: "DELETE" }),
		refreshMoney,
	);

export const usePayMonthItem = () =>
	useApiMutation(
		({ id, ...body }: Wire<PayMonthItemInput> & { id: string }) =>
			api<MonthItem>(`/budgets/month-items/${id}/payments`, {
				method: "POST",
				body,
			}),
		refreshMoney,
	);

export const useUnpayMonthItem = () =>
	useApiMutation(
		(id: string) =>
			api<MonthItem>(`/budgets/month-items/${id}/payments`, {
				method: "DELETE",
			}),
		refreshMoney,
	);

export const useRemovePayment = () =>
	useApiMutation(
		({ id, transactionId }: { id: string; transactionId: string }) =>
			api<MonthItem>(`/budgets/month-items/${id}/payments/${transactionId}`, {
				method: "DELETE",
			}),
		refreshMoney,
	);
