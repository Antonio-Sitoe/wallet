import type { FastifyBaseLogger } from "fastify";
import { PgBoss } from "pg-boss";

import type { PlannedService } from "./planned.service";

export const AUTO_CONFIRM_QUEUE = "planned-auto-confirm";
const EVERY_HOUR = "0 * * * *";
const TIMEZONE = "Africa/Maputo";

export async function startPlannedJobs(
	connectionString: string,
	service: PlannedService,
	log: FastifyBaseLogger,
) {
	const boss = new PgBoss({ connectionString, schema: "pgboss" });
	boss.on("error", (error) => log.error({ error }, "pg-boss error"));
	await boss.start();
	await boss.createQueue(AUTO_CONFIRM_QUEUE, { policy: "singleton" });
	await boss.work(AUTO_CONFIRM_QUEUE, async () => {
		const { confirmed, failed } = await service.autoConfirmDue();
		for (const ref of confirmed)
			log.info(ref, "planned payment auto-confirmed");
		for (const { error, ...ref } of failed)
			log.warn({ ...ref, error }, "planned payment auto-confirm failed");
		return { confirmed: confirmed.length, failed: failed.length };
	});
	await boss.schedule(AUTO_CONFIRM_QUEUE, EVERY_HOUR, null, {
		tz: TIMEZONE,
		missed: "once",
	});
	await boss.send(AUTO_CONFIRM_QUEUE);
	return () => boss.stop({ graceful: true });
}
