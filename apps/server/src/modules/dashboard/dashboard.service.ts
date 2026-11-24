import { notFound, unprocessable } from "../../shared/errors/app-error";
import type {
	CardSize,
	CreateCardInput,
	DashboardCard,
	DashboardCardType,
} from "./dashboard.schema";
import {
	type CardRow,
	type IDashboardRepository,
	SEEDED_MARKER,
} from "./dashboard.types";

const DEFAULT_SIZE: Record<DashboardCardType, CardSize> = {
	summary: "full",
	"cash-flow": "half",
	"cash-flow-trend": "half",
	"period-comparison": "half",
	"balance-trend": "half",
	"spending-by-category": "half",
	accounts: "half",
	upcoming: "half",
	"last-records": "half",
	"pie-categories": "half",
	"pie-accounts": "half",
	"pie-cash-flow": "half",
};

const DEFAULT_LAYOUT: {
	type: DashboardCardType;
	config?: Record<string, unknown>;
}[] = [
	{ type: "summary" },
	{ type: "cash-flow-trend", config: { range: "year" } },
	{ type: "accounts" },
	{ type: "spending-by-category" },
	{ type: "pie-categories" },
	{ type: "upcoming" },
	{ type: "pie-accounts" },
	{ type: "period-comparison" },
	{ type: "last-records" },
];

const toCard = (r: CardRow): DashboardCard => ({
	id: r.id,
	type: r.type as DashboardCardType,
	size: r.size,
	position: r.position,
	config: (r.config ?? {}) as Record<string, unknown>,
});

const visible = (rows: CardRow[]) =>
	rows.filter((r) => r.type !== SEEDED_MARKER);

export class DashboardService {
	constructor(private readonly repository: IDashboardRepository) {}

	async list(userId: string): Promise<DashboardCard[]> {
		let rows = await this.repository.list(userId);
		if (rows.length === 0 && !(await this.repository.hasMarker(userId))) {
			await this.repository.insertMany(
				DEFAULT_LAYOUT.map((c, position) => ({
					userId,
					type: c.type,
					size: DEFAULT_SIZE[c.type],
					position,
					config: c.config ?? {},
				})),
			);
			rows = await this.repository.list(userId);
		}
		return visible(rows).map(toCard);
	}

	async add(userId: string, input: CreateCardInput) {
		const current = await this.list(userId);
		const row = await this.repository.insert({
			userId,
			type: input.type,
			size: input.size ?? DEFAULT_SIZE[input.type],
			position: current.length,
			config: input.config,
		});
		return toCard(row);
	}

	async update(
		userId: string,
		id: string,
		input: { size?: CardSize; config?: Record<string, unknown> },
	) {
		const row = await this.repository.update(userId, id, input);
		if (!row) throw notFound("Carta");
		return toCard(row);
	}

	async remove(userId: string, id: string) {
		if (!(await this.repository.delete(userId, id))) throw notFound("Carta");
		if (visible(await this.repository.list(userId)).length === 0) {
			await this.repository.insert({
				userId,
				type: SEEDED_MARKER,
				position: 9999,
			});
		}
	}

	async reorder(userId: string, ids: string[]) {
		const current = visible(await this.repository.list(userId));
		const known = new Set(current.map((r) => r.id));
		if (ids.length !== known.size || ids.some((id) => !known.has(id))) {
			throw unprocessable(
				"INVALID_ORDER",
				"A ordem tem de incluir todas as cartas, uma vez cada",
			);
		}
		await this.repository.setOrder(userId, ids);
		return this.list(userId);
	}

	async reset(userId: string) {
		await this.repository.deleteAll(userId);
		return this.list(userId);
	}
}
