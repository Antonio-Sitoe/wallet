import { yearMonthOf } from "@wallet/shared";

import {
	AppError,
	notFound,
	unprocessable,
} from "../../shared/errors/app-error";
import type { GoalsRepository } from "./goals.repository";
import type {
	ContributeGoalInput,
	CreateGoalInput,
	CreateGoalPartInput,
	Goal,
	GoalDetail,
	UpdateGoalInput,
	UpdateGoalPartInput,
} from "./goals.schema";
import type {
	ContributionRow,
	GoalPartRow,
	GoalRow,
	GoalsDeps,
	PlanLinkRow,
} from "./goals.types";

const toGoal = (
	row: GoalRow,
	parts: GoalPartRow[],
	plan: PlanLinkRow | undefined,
	contributions: ContributionRow[],
): Goal => ({
	id: row.id,
	name: row.name,
	description: row.description,
	color: row.color,
	target: row.target,
	startingAmount: row.startingAmount,
	saved: row.startingAmount + contributions.reduce((s, c) => s + c.amount, 0),
	accountId: row.accountId,
	deadline: row.deadline,
	archived: row.archived,
	plan: plan ?? null,
	parts: parts
		.filter((p) => p.goalId === row.id)
		.map((p) => ({ id: p.id, name: p.name, amount: p.amount, paid: p.paid })),
	contributionCount: contributions.length,
	lastContributionAt: contributions[0]?.occurredAt.toISOString() ?? null,
});

export class GoalsService {
	constructor(
		private readonly repository: GoalsRepository,
		private readonly deps: GoalsDeps,
	) {}

	async list(
		userId: string,
		options: { includeArchived: boolean },
	): Promise<Goal[]> {
		const rows = await this.repository.list(userId, options.includeArchived);
		const [parts, plans, contributions] = await Promise.all([
			this.repository.partsFor(rows.map((r) => r.id)),
			this.planMap(rows),
			Promise.all(rows.map((r) => this.repository.contributions(userId, r))),
		]);
		return rows.map((row, i) =>
			toGoal(
				row,
				parts,
				row.planItemId ? plans.get(row.planItemId) : undefined,
				contributions[i]!,
			),
		);
	}

	async get(userId: string, id: string): Promise<GoalDetail> {
		const row = await this.find(userId, id);
		const [parts, plans, contributions] = await Promise.all([
			this.repository.partsFor([row.id]),
			this.planMap([row]),
			this.repository.contributions(userId, row),
		]);
		return {
			...toGoal(
				row,
				parts,
				row.planItemId ? plans.get(row.planItemId) : undefined,
				contributions,
			),
			contributions: contributions.map((c) => ({
				...c,
				occurredAt: c.occurredAt.toISOString(),
			})),
		};
	}

	async create(userId: string, input: CreateGoalInput): Promise<GoalDetail> {
		await this.deps.accounts.assertOwned(userId, [input.accountId]);
		let planItemId: string | null = null;
		if (input.addToPlan) {
			if (!input.monthlyContribution)
				throw unprocessable(
					"MONTHLY_REQUIRED",
					"Indique a contribuição mensal para criar o item no plano",
				);
			planItemId = await this.addToPlan(userId, input);
		}
		const goal = await this.repository.insert({
			userId,
			name: input.name,
			description: input.description ?? null,
			color: input.color ?? null,
			target: input.target,
			startingAmount: input.startingAmount,
			accountId: input.accountId,
			deadline: input.deadline ?? null,
			planItemId,
			sortOrder: await this.repository.countGoals(userId),
		});
		return this.get(userId, goal.id);
	}

	async update(
		userId: string,
		id: string,
		input: UpdateGoalInput,
	): Promise<GoalDetail> {
		await this.find(userId, id);
		if (input.accountId)
			await this.deps.accounts.assertOwned(userId, [input.accountId]);
		await this.repository.update(userId, id, input);
		return this.get(userId, id);
	}

	async remove(userId: string, id: string) {
		await this.find(userId, id);
		await this.repository.delete(userId, id);
	}

	async contribute(
		userId: string,
		id: string,
		input: ContributeGoalInput,
	): Promise<GoalDetail> {
		const goal = await this.find(userId, id);
		if (input.fromAccountId === goal.accountId)
			throw unprocessable(
				"SAME_ACCOUNT",
				"A conta de origem tem de ser diferente da conta da meta",
			);
		const occurredAt = input.occurredAt ?? new Date();
		const monthItemId = goal.planItemId
			? await this.repository.monthItemFor(
					userId,
					goal.planItemId,
					yearMonthOf(occurredAt),
				)
			: undefined;
		await this.deps.transactions.createTransfer(
			userId,
			{
				fromAccountId: input.fromAccountId,
				toAccountId: goal.accountId,
				amount: input.amount,
				occurredAt,
				note: input.note ?? null,
				monthItemId: monthItemId ?? null,
			},
			{ goalId: goal.id },
		);
		return this.get(userId, id);
	}

	async addPart(
		userId: string,
		goalId: string,
		input: CreateGoalPartInput,
	): Promise<GoalDetail> {
		await this.find(userId, goalId);
		await this.repository.insertPart({
			userId,
			goalId,
			...input,
			sortOrder: await this.repository.countParts(goalId),
		});
		return this.get(userId, goalId);
	}

	async updatePart(
		userId: string,
		id: string,
		input: UpdateGoalPartInput,
	): Promise<GoalDetail> {
		const part = await this.findPart(userId, id);
		await this.repository.updatePart(userId, id, input);
		return this.get(userId, part.goalId);
	}

	async removePart(userId: string, id: string): Promise<GoalDetail> {
		const part = await this.findPart(userId, id);
		await this.repository.deletePart(userId, id);
		return this.get(userId, part.goalId);
	}

	private async addToPlan(userId: string, input: CreateGoalInput) {
		const year = Number(yearMonthOf(new Date()).slice(0, 4));
		try {
			const item = await this.deps.budgets.addPlanItem(userId, year, {
				name: input.name,
				group: "savings",
				categoryId: null,
				amount: input.monthlyContribution!,
				frequency: "monthly",
				months: [],
				accountId: null,
				toAccountId: input.accountId,
				partial: true,
				step: null,
			});
			return item.id;
		} catch (error) {
			if (error instanceof AppError && error.statusCode === 404)
				throw unprocessable(
					"NO_PLAN",
					`Crie o plano de ${year} antes de ligar a meta ao plano`,
				);
			throw error;
		}
	}

	private async planMap(rows: GoalRow[]) {
		const ids = rows.map((r) => r.planItemId).filter((v): v is string => !!v);
		const links = await this.repository.planLinks(ids);
		return new Map(links.map((l) => [l.id, l]));
	}

	private async find(userId: string, id: string) {
		const row = await this.repository.findById(userId, id);
		if (!row) throw notFound("Meta");
		return row;
	}

	private async findPart(userId: string, id: string) {
		const part = await this.repository.findPart(userId, id);
		if (!part) throw notFound("Parte da meta");
		return part;
	}
}
