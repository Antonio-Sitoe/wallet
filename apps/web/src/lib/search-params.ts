import {
	BREAKDOWN_DIMENSIONS,
	DEBT_DIRECTIONS,
	isYearMonth,
	MONEY_FLOWS,
} from "@wallet/shared";
import {
	createParser,
	createSerializer,
	type inferParserType,
	parseAsBoolean,
	parseAsString,
	parseAsStringLiteral,
	type UseQueryStatesKeysMap,
	useQueryStates,
} from "nuqs";
import { useCallback, useMemo } from "react";
import { PERIODS, type Period } from "@/components/transactions/utils";
import { paths } from "@/lib/paths";

export const PAYMENT_TABS = ["next", "overdue", "done", "all"] as const;

const ANALYTICS_PERIODS = ["month", "30d", "year"] as const;
const STATS_PERIODS = [...ANALYTICS_PERIODS, "all"] as const;

const parseAsYearMonth = createParser({
	parse: (value) => (isYearMonth(value) ? value : null),
	serialize: (value: string) => value,
});

const parseAsIsoDay = createParser({
	parse: (value) => (/^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null),
	serialize: (value: string) => value,
});

const parseAsYear = createParser({
	parse: (value) => {
		const year = Number(value);
		return Number.isInteger(year) && year >= 2000 && year <= 2100 ? year : null;
	},
	serialize: (value: number) => String(value),
});

const id = parseAsString;
const archived = parseAsBoolean;

const SEARCH = {
	dashboard: {
		period: parseAsStringLiteral(ANALYTICS_PERIODS),
		from: parseAsIsoDay,
	},
	transactions: {
		period: parseAsStringLiteral(Object.keys(PERIODS) as Period[]),
		account: parseAsString,
		category: parseAsString,
		type: parseAsStringLiteral([
			"expense",
			"income",
			"transfer",
			"adjustment",
		] as const),
		month: parseAsString,
		payee: parseAsString,
		label: parseAsString,
		q: parseAsString,
		id,
	},
	accounts: {
		id,
		archived,
		validate: parseAsBoolean,
		create: parseAsBoolean,
	},
	budget: { month: parseAsYearMonth },
	stats: {
		period: parseAsStringLiteral(STATS_PERIODS),
		from: parseAsIsoDay,
		by: parseAsStringLiteral(BREAKDOWN_DIMENSIONS),
		flow: parseAsStringLiteral(MONEY_FLOWS),
	},
	debts: {
		id,
		tab: parseAsStringLiteral([...DEBT_DIRECTIONS, "history"] as const),
		archived,
	},
	goals: {
		id,
		archived,
		tab: parseAsStringLiteral(["active", "done"] as const),
	},
	payments: { id, tab: parseAsStringLiteral(PAYMENT_TABS) },
	plan: { year: parseAsYear },
	import: { id, sheet: parseAsString },
	shopping: { id, archived },
	categories: { id },
	assistant: { id },
} satisfies Record<string, UseQueryStatesKeysMap>;

export type SearchPage = keyof typeof SEARCH;

type Defined<T> = { [K in keyof T]?: Exclude<T[K], null> };

export type PageSearch<P extends SearchPage> = Defined<
	inferParserType<(typeof SEARCH)[P]>
>;

type SearchUpdate<P extends SearchPage> =
	| PageSearch<P>
	| ((prev: PageSearch<P>) => PageSearch<P>);

const withoutNulls = <T extends Record<string, unknown>>(values: T) =>
	Object.fromEntries(
		Object.entries(values).filter(([, value]) => value !== null),
	) as Defined<T>;

export function searchHref<P extends SearchPage>(
	page: P,
	search: PageSearch<P> = {},
) {
	const serialize = createSerializer(SEARCH[page]);
	return serialize(paths[page], search as never);
}

export function usePageSearch<P extends SearchPage>(page: P): PageSearch<P> {
	const [values] = useQueryStates(SEARCH[page]);
	return useMemo(() => withoutNulls(values) as PageSearch<P>, [values]);
}

export function usePageNavigate<P extends SearchPage>(page: P) {
	const keys = SEARCH[page];
	const [values, setValues] = useQueryStates(keys, { history: "push" });
	return useCallback(
		({ search, replace }: { search: SearchUpdate<P>; replace?: boolean }) => {
			const next =
				typeof search === "function"
					? search(withoutNulls(values) as PageSearch<P>)
					: search;
			const cleared = Object.fromEntries(
				Object.keys(keys).map((key) => [
					key,
					(next as Record<string, unknown>)[key] ?? null,
				]),
			);
			void setValues(cleared as never, replace ? { history: "replace" } : {});
		},
		[keys, values, setValues],
	);
}
