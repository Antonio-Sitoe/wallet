import type { FastifyPluginAsync } from "fastify";

import type { BudgetsController } from "./budgets.controller";

export function budgetsRoutes(
	controller: BudgetsController,
): FastifyPluginAsync {
	return async (app) => {
		app.get("/budgets/plans", controller.listPlans);
		app.post("/budgets/plans", controller.createPlan);
		app.get("/budgets/plans/:year", controller.getPlan);
		app.patch("/budgets/plans/:year", controller.updatePlan);
		app.delete("/budgets/plans/:year", controller.deletePlan);
		app.post("/budgets/plans/:year/generate", controller.generate);
		app.post("/budgets/plans/:year/items", controller.addPlanItem);
		app.patch("/budgets/plan-items/:id", controller.updatePlanItem);
		app.delete("/budgets/plan-items/:id", controller.deletePlanItem);

		app.get("/budgets/months/:month", controller.getMonth);
		app.post("/budgets/months/:month/items", controller.addMonthItem);
		app.get("/budgets/month-items/:id", controller.getMonthItem);
		app.patch("/budgets/month-items/:id", controller.updateMonthItem);
		app.delete("/budgets/month-items/:id", controller.deleteMonthItem);
		app.post("/budgets/month-items/:id/payments", controller.pay);
		app.delete("/budgets/month-items/:id/payments", controller.unpay);
		app.delete(
			"/budgets/month-items/:id/payments/:transactionId",
			controller.removePayment,
		);
	};
}
