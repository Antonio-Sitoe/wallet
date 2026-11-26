export type NamedAccount = { id: string; name: string; balance: number };
export type NamedCategory = {
	id: string;
	name: string;
	kind: string;
	archived: boolean;
};

export type TransactionCommand = {
	kind: "transaction";
	type: "expense" | "income";
	accountId: string;
	categoryId: string | null;
	amount: number;
	note: string | null;
	summary: string;
	accountIds: string[];
};

export type TransferCommand = {
	kind: "transfer";
	fromAccountId: string;
	toAccountId: string;
	amount: number;
	note: string | null;
	summary: string;
	accountIds: string[];
};

export type Interpretation =
	| { kind: "reply"; text: string }
	| { kind: "silent" }
	| TransactionCommand
	| TransferCommand;

export const HELP = [
	"Comandos:",
	"saldo",
	"- 250 mpesa pão  (saída)",
	"+ 5000 bci salário  (entrada)",
	"t 1000 bci mpesa  (transferência)",
	"Opcional: #categoria no fim, ex.: - 250 mpesa pão #alimentação",
].join("\n");

export const normalizeName = (value: string | null | undefined) =>
	String(value ?? "")
		.normalize("NFD")
		.replace(/[̀-ͯ]/g, "")
		.toLowerCase()
		.replace(/[^a-z0-9]/g, "");

export function formatMoney(cents: number) {
	const sign = cents < 0 ? "-" : "";
	const abs = Math.abs(Math.round(cents));
	const whole = String(Math.floor(abs / 100)).replace(
		/\B(?=(\d{3})+(?!\d))/g,
		" ",
	);
	return `${sign}${whole},${String(abs % 100).padStart(2, "0")}`;
}

export function toCents(raw: string): number | null {
	let text = raw.replace(/\s/g, "");
	if (!/^[\d.,]+$/.test(text)) return null;
	if (text.includes(",")) text = text.replace(/\./g, "").replace(",", ".");
	else if (/^\d{1,3}(\.\d{3})+$/.test(text)) text = text.replace(/\./g, "");
	const value = Number(text);
	if (!Number.isFinite(value) || value <= 0) return null;
	return Math.round(value * 100);
}

type Choice<T> = { item: T } | { error: string };

function pick<T extends { name: string }>(
	items: T[],
	wanted: string,
	label: string,
): Choice<T> {
	const key = normalizeName(wanted);
	if (!key) return { error: `Falta o nome da ${label}.` };
	const tests = [
		(name: string) => name === key,
		(name: string) => name.startsWith(key),
		(name: string) => name.includes(key),
	];
	for (const test of tests) {
		const found = items.filter((item) => test(normalizeName(item.name)));
		if (found.length === 1) return { item: found[0] as T };
		if (found.length > 1)
			return {
				error: `Qual ${label}? ${found.map((item) => item.name).join(" / ")}`,
			};
	}
	return {
		error: `Não encontrei a ${label} "${wanted}". Opções: ${items.map((item) => item.name).join(", ")}`,
	};
}

export function balanceReply(accounts: NamedAccount[]) {
	const total = accounts.reduce((sum, account) => sum + account.balance, 0);
	const lines = accounts.map(
		(account) => `${account.name}: ${formatMoney(account.balance)}`,
	);
	return [...lines, `Total: ${formatMoney(total)} MZN`].join("\n");
}

export function interpret(
	text: string,
	accounts: NamedAccount[],
	categories: NamedCategory[],
): Interpretation {
	const message = text.trim();

	if (/^saldo$/i.test(message))
		return { kind: "reply", text: balanceReply(accounts) };

	const transfer = message.match(/^t\s+([\d.,]+)\s+(\S+)\s+(\S+)\s*(.*)$/i);
	if (transfer) {
		const [, rawAmount = "", fromName = "", toName = "", rest = ""] = transfer;
		const amount = toCents(rawAmount);
		if (!amount)
			return { kind: "reply", text: `Valor inválido: ${rawAmount}\n\n${HELP}` };
		const from = pick(accounts, fromName, "conta de origem");
		if ("error" in from) return { kind: "reply", text: from.error };
		const to = pick(accounts, toName, "conta de destino");
		if ("error" in to) return { kind: "reply", text: to.error };
		if (from.item.id === to.item.id)
			return {
				kind: "reply",
				text: "A conta de origem e a de destino têm de ser diferentes.",
			};
		return {
			kind: "transfer",
			fromAccountId: from.item.id,
			toAccountId: to.item.id,
			amount,
			note: rest.trim() || null,
			summary: `Transferência ${formatMoney(amount)} MZN · ${from.item.name} → ${to.item.name}`,
			accountIds: [from.item.id, to.item.id],
		};
	}

	const entry = message.match(/^([+-])\s*([\d.,]+)\s+(\S+)\s*(.*)$/);
	if (entry) {
		const [, sign, rawAmount = "", accountName = "", rest = ""] = entry;
		const type = sign === "+" ? "income" : "expense";
		const amount = toCents(rawAmount);
		if (!amount)
			return { kind: "reply", text: `Valor inválido: ${rawAmount}\n\n${HELP}` };
		const account = pick(accounts, accountName, "conta");
		if ("error" in account) return { kind: "reply", text: account.error };
		const tag = rest.match(/(?:^|\s)#(\S+)/)?.[1];
		const note = rest.replace(/(?:^|\s)#\S+/g, "").trim() || null;
		let categoryId: string | null = null;
		let categoryName = "";
		if (tag) {
			const options = categories.filter(
				(category) => category.kind === type && !category.archived,
			);
			const category = pick(options, tag, "categoria");
			if ("error" in category) return { kind: "reply", text: category.error };
			categoryId = category.item.id;
			categoryName = ` · ${category.item.name}`;
		}
		return {
			kind: "transaction",
			type,
			accountId: account.item.id,
			categoryId,
			amount,
			note,
			summary: `${type === "income" ? "Entrada" : "Saída"} ${formatMoney(amount)} MZN · ${account.item.name}${categoryName}`,
			accountIds: [account.item.id],
		};
	}

	if (/^(ajuda|help|\?)$/i.test(message)) return { kind: "reply", text: HELP };
	return { kind: "silent" };
}

export function afterWriteReply(
	summary: string,
	accountIds: string[],
	accounts: NamedAccount[],
) {
	const balances = accountIds
		.map((id) => accounts.find((account) => account.id === id))
		.filter((account): account is NamedAccount => !!account)
		.map((account) => `${account.name}: ${formatMoney(account.balance)}`);
	return [`✅ ${summary}`, "Saldo agora:", ...balances].join("\n");
}
