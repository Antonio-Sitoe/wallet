/** Usage: npx tsx scripts/check-wallet-csv.ts <file.csv>... — prints what an import of these files would do. */
import { readFileSync } from "node:fs";
import { basename } from "node:path";

import {
	buildWalletPlan,
	parseWalletCsv,
} from "../src/modules/imports/wallet-csv";

const paths = process.argv.slice(2);
if (paths.length === 0) {
	console.error("Usage: tsx scripts/check-wallet-csv.ts <file.csv>...");
	process.exit(1);
}
// Largest file first, like the importer: it holds the full history.
const parsed = paths
	.map((p) => parseWalletCsv(basename(p), readFileSync(p, "utf8")))
	.sort((a, b) => b.rows.length - a.rows.length);
for (const p of parsed)
	for (const e of p.errors) console.error("parse error", e);
const { plan, summary } = buildWalletPlan(
	parsed.map((p) => ({ name: p.rows[0]?.file ?? "?", rows: p.rows })),
	new Set(),
);
console.log(JSON.stringify(summary, null, 2));
console.log("review:");
for (const r of plan.review)
	console.log(" ", r.reason, r.occurredAt, r.account, r.type, r.amount / 100);
