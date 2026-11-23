import fastifyCors from "@fastify/cors";
import type { Auth } from "@wallet/auth";
import type { Database } from "@wallet/db";
import Fastify, { type FastifyError, type FastifyServerOptions } from "fastify";

import { createAuthGuard, toHeaders } from "./lib/auth-guard";
import { AppError } from "./lib/errors";
import { createAccountsModule } from "./modules/accounts";
import { createAnalyticsModule } from "./modules/analytics";
import { createBudgetsModule } from "./modules/budgets";
import { createCategoriesModule, SYSTEM_SLUGS } from "./modules/categories";
import { createDashboardModule } from "./modules/dashboard";
import { createImportsModule } from "./modules/imports";
import { createTransactionsModule } from "./modules/transactions";

export type AppOptions = {
	db: Database;
	auth: Auth;
	corsOrigins: string[];
	logger?: FastifyServerOptions["logger"];
};

/**
 * Composition root of the modular monolith. Modules never import each other: each declares the small
 * interface it needs from the others (a "port") and this function wires the real services into them.
 */
export function buildModules(db: Database) {
	// Accounts and categories ask transactions for counts and sums, and transactions asks them to validate ids.
	// The ports below are closures, so the cycle is only resolved at call time.
	let transactions: ReturnType<typeof createTransactionsModule> | undefined;
	let budgets: ReturnType<typeof createBudgetsModule> | undefined;
	const tx = () => transactions!.service;
	const budget = () => budgets!.service;

	const accounts = createAccountsModule(db, {
		activity: {
			statsByAccount: (userId, ids) => tx().statsByAccount(userId, ids),
		},
	});
	const categories = createCategoriesModule(db, {
		activity: { countByCategory: (userId) => tx().countByCategory(userId) },
	});
	transactions = createTransactionsModule(db, {
		accounts: { assertOwned: accounts.service.assertOwned },
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
	const imports = createImportsModule(
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
		},
		categories: { list: categories.service.list },
	});
	const dashboard = createDashboardModule(db);
	return {
		accounts,
		categories,
		transactions,
		budgets,
		imports,
		analytics,
		dashboard,
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

	app.setErrorHandler((error: FastifyError | AppError, request, reply) => {
		if (error instanceof AppError) {
			return reply.status(error.statusCode).send({
				error: {
					code: error.code,
					message: error.message,
					details: error.details,
				},
			});
		}
		// Fastify's own client errors: malformed JSON, body too large, unsupported media type…
		if (error.statusCode && error.statusCode < 500) {
			return reply.status(error.statusCode).send({
				error: { code: error.code ?? "BAD_REQUEST", message: error.message },
			});
		}
		request.log.error({ err: error }, "Unhandled error");
		return reply
			.status(500)
			.send({ error: { code: "INTERNAL_ERROR", message: "Erro interno" } });
	});

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
