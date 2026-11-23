import fastifyCors from "@fastify/cors";
import type { Auth } from "@wallet/auth";
import type { Database } from "@wallet/db";
import Fastify, { type FastifyServerOptions } from "fastify";

import { createAccountsModule } from "./modules/accounts";
import { createAnalyticsModule } from "./modules/analytics";
import { createBudgetsModule } from "./modules/budgets";
import { createCategoriesModule, SYSTEM_SLUGS } from "./modules/categories";
import { createDashboardModule } from "./modules/dashboard";
import { createGoalsModule } from "./modules/goals";
import { createImportsModule } from "./modules/imports";
import { createTransactionsModule } from "./modules/transactions";
import { errorHandler } from "./shared/errors/error-handler";
import { createAuthGuard, toHeaders } from "./shared/middleware/auth-guard";

export type AppOptions = {
	db: Database;
	auth: Auth;
	corsOrigins: string[];
	logger?: FastifyServerOptions["logger"];
};

export function buildModules(db: Database) {
	let transactions: ReturnType<typeof createTransactionsModule> | undefined;
	let budgets: ReturnType<typeof createBudgetsModule> | undefined;
	let imports: ReturnType<typeof createImportsModule> | undefined;
	const tx = () => transactions!.service;
	const budget = () => budgets!.service;

	const accounts = createAccountsModule(db, {
		activity: {
			statsByAccount: (userId, ids) => tx().statsByAccount(userId, ids),
			createAdjustment: (userId, input) => tx().createAdjustment(userId, input),
			wipe: async (userId) => {
				const removed = await tx().wipe(userId);
				await imports!.service.wipe(userId);
				return removed;
			},
		},
	});
	const categories = createCategoriesModule(db, {
		activity: { countByCategory: (userId) => tx().countByCategory(userId) },
	});
	transactions = createTransactionsModule(db, {
		accounts: {
			assertOwned: (userId, ids, exec) =>
				accounts.service.assertOwned(userId, ids, exec),
		},
		categories: {
			assertOwned: categories.service.assertOwned,
			withDescendants: categories.service.withDescendants,
			transferCategoryId: (userId, exec) =>
				categories.service.systemCategoryId(
					userId,
					SYSTEM_SLUGS.transfer,
					exec,
				),
		},
		budgets: {
			assertMonthItemOwned: (userId, id) =>
				budget().assertMonthItemOwned(userId, id),
		},
	});
	budgets = createBudgetsModule(db, {
		accounts: {
			assertOwned: (userId, ids) => accounts.service.assertOwned(userId, ids),
		},
		categories: {
			assertOwned: (userId, ids) => categories.service.assertOwned(userId, ids),
			parentMap: categories.service.parentMap,
		},
		transactions: transactions.service,
	});
	imports = createImportsModule(
		db,
		{
			accounts: accounts.service,
			categories: {
				getWalletMap: categories.service.getWalletMap,
				setWalletMappings: categories.service.setWalletMappings,
				transferCategoryId: (userId, exec) =>
					categories.service.systemCategoryId(
						userId,
						SYSTEM_SLUGS.transfer,
						exec,
					),
				savingsCategoryId: (userId, exec) =>
					categories.service.systemCategoryId(
						userId,
						SYSTEM_SLUGS.savings,
						exec,
					),
			},
			transactions: transactions.service,
		},
		{
			accounts: accounts.service,
			categories: {
				idsBySlug: (userId) => categories.service.idsBySlug(userId),
				ensureDefaults: (userId) => categories.service.ensureDefaults(userId),
			},
			budgets: budgets.service,
			transactions: transactions.service,
		},
	);
	const analytics = createAnalyticsModule({
		transactions: transactions.service,
		accounts: {
			initialTotal: async (userId) =>
				(await accounts.service.list(userId, { includeArchived: true })).reduce(
					(s, a) => s + a.initialBalance,
					0,
				),
			list: (userId) =>
				accounts.service.list(userId, { includeArchived: true }),
		},
		categories: { list: categories.service.list },
	});
	const dashboard = createDashboardModule(db);
	const goals = createGoalsModule(db, {
		accounts: {
			assertOwned: (userId, ids) => accounts.service.assertOwned(userId, ids),
		},
		transactions: transactions.service,
		budgets: budgets.service,
	});
	return {
		accounts,
		categories,
		transactions,
		budgets,
		imports,
		analytics,
		dashboard,
		goals,
	};
}

export function buildApp({ db, auth, corsOrigins, logger = true }: AppOptions) {
	const app = Fastify({ logger });

	app.register(fastifyCors, {
		origin: corsOrigins,
		methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
		allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
		exposedHeaders: ["set-auth-token"],
		credentials: true,
		maxAge: 86400,
	});

	app.setErrorHandler(errorHandler);

	app.route({
		method: ["GET", "POST"],
		url: "/api/auth/*",
		async handler(request, reply) {
			const url = new URL(request.url, `http://${request.headers.host}`);
			const response = await auth.handler(
				new Request(url.toString(), {
					method: request.method,
					headers: toHeaders(request.headers),
					body: request.body ? JSON.stringify(request.body) : undefined,
				}),
			);
			reply.status(response.status);
			response.headers.forEach((value, key) => {
				reply.header(key, value);
			});
			return reply.send(response.body ? await response.text() : null);
		},
	});

	app.get("/", async () => "OK");

	const modules = buildModules(db);
	app.decorateRequest("userId", "");
	app.register(
		async (api) => {
			api.addHook(
				"preHandler",
				createAuthGuard((headers) => auth.api.getSession({ headers })),
			);
			for (const module of Object.values(modules))
				await api.register(module.routes);
		},
		{ prefix: "/api" },
	);

	return app;
}
