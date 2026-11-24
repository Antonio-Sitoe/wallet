import type { Database, DbExecutor } from "@wallet/db";
import { importBatches } from "@wallet/db/schema/imports";
import { and, desc, eq } from "drizzle-orm";

import type {
	BatchRow,
	IImportsRepository,
	NewBatchRow,
} from "./imports.types";

export class ImportsRepository implements IImportsRepository {
	constructor(private readonly db: Database) {}

	transaction<T>(fn: (tx: DbExecutor) => Promise<T>) {
		return this.db.transaction(fn);
	}

	async findById(
		userId: string,
		id: string,
		options: { source?: BatchRow["source"] } = {},
	) {
		const [row] = await this.db
			.select()
			.from(importBatches)
			.where(
				and(
					eq(importBatches.userId, userId),
					eq(importBatches.id, id),
					options.source ? eq(importBatches.source, options.source) : undefined,
				),
			);
		return row;
	}

	list(userId: string) {
		return this.db
			.select({
				id: importBatches.id,
				status: importBatches.status,
				createdAt: importBatches.createdAt,
				committedAt: importBatches.committedAt,
				summary: importBatches.summary,
				source: importBatches.source,
			})
			.from(importBatches)
			.where(eq(importBatches.userId, userId))
			.orderBy(desc(importBatches.createdAt));
	}

	async committedSummaries(userId: string) {
		const rows = await this.db
			.select({ summary: importBatches.summary })
			.from(importBatches)
			.where(
				and(
					eq(importBatches.userId, userId),
					eq(importBatches.status, "committed"),
				),
			);
		return rows.map((r) => r.summary);
	}

	async insert(row: NewBatchRow) {
		const [created] = await this.db
			.insert(importBatches)
			.values(row)
			.returning();
		return created!;
	}

	async update(
		id: string,
		set: Partial<NewBatchRow>,
		exec: DbExecutor = this.db,
	) {
		await exec.update(importBatches).set(set).where(eq(importBatches.id, id));
	}

	async delete(id: string) {
		await this.db.delete(importBatches).where(eq(importBatches.id, id));
	}

	async deleteAll(userId: string) {
		await this.db.delete(importBatches).where(eq(importBatches.userId, userId));
	}
}
