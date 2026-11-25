import type { ComponentType } from "react";
import { createBrowserRouter, redirect } from "react-router";
import { ConnectionError } from "@/components/feedback/connection-error";
import { Loader } from "@/components/feedback/loader";
import { NotFound } from "@/components/feedback/not-found";
import { RootLayout } from "@/components/layout/root-layout";
import { getSession } from "@/lib/auth-client";
import { isFirstUse } from "@/lib/first-use";
import { paths } from "@/lib/paths";

async function requireSession() {
	const session = await getSession();
	if (!session.data) throw redirect(paths.login);
	return null;
}

const page =
	<K extends string>(load: () => Promise<Record<K, ComponentType>>, name: K) =>
	async () => ({ Component: (await load())[name] });

export const router = createBrowserRouter([
	{
		Component: RootLayout,
		ErrorBoundary: ConnectionError,
		HydrateFallback: Loader,
		children: [
			{
				path: paths.home,
				loader: async () => {
					await requireSession();
					throw redirect((await isFirstUse()) ? paths.start : paths.dashboard);
				},
			},
			{
				path: paths.login,
				lazy: page(() => import("@/pages/public/login-page"), "LoginPage"),
			},
			{
				path: paths.start,
				loader: requireSession,
				lazy: page(
					() => import("@/pages/private/onboarding-page"),
					"OnboardingPage",
				),
			},
			{ path: "/painel", loader: () => redirect(paths.dashboard) },
			{
				loader: requireSession,
				lazy: page(
					() => import("@/components/layout/auth-layout"),
					"AuthLayout",
				),
				children: [
					{
						path: paths.dashboard,
						lazy: page(
							() => import("@/pages/private/dashboard-page"),
							"Dashboard",
						),
					},
					{
						path: paths.transactions,
						lazy: page(
							() => import("@/pages/private/transactions-page"),
							"TransactionsPage",
						),
					},
					{
						path: paths.accounts,
						lazy: page(
							() => import("@/pages/private/accounts-page"),
							"AccountsPage",
						),
					},
					{
						path: paths.budget,
						lazy: page(
							() => import("@/pages/private/budget-page"),
							"BudgetPage",
						),
					},
					{
						path: paths.stats,
						lazy: page(() => import("@/pages/private/stats-page"), "StatsPage"),
					},
					{
						path: paths.debts,
						lazy: page(() => import("@/pages/private/debts-page"), "DebtsPage"),
					},
					{
						path: paths.goals,
						lazy: page(() => import("@/pages/private/goals-page"), "GoalsPage"),
					},
					{
						path: paths.payments,
						lazy: page(
							() => import("@/pages/private/payments-page"),
							"PaymentsPage",
						),
					},
					{
						path: paths.plan,
						lazy: page(() => import("@/pages/private/plan-page"), "PlanPage"),
					},
					{
						path: paths.import,
						lazy: page(
							() => import("@/pages/private/import-page"),
							"ImportPage",
						),
					},
					{
						path: paths.shopping,
						lazy: page(
							() => import("@/pages/private/shopping-page"),
							"ShoppingPage",
						),
					},
					{
						path: paths.categories,
						lazy: page(
							() => import("@/pages/private/categories-page"),
							"CategoriesPage",
						),
					},
					{
						path: paths.assistant,
						lazy: page(
							() => import("@/pages/private/assistant-page"),
							"AssistantPage",
						),
					},
					{ path: "*", Component: NotFound },
				],
			},
		],
	},
]);
