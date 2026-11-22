/**
 * The category tree every user starts with: the design's tree (built from the spreadsheet) merged with the
 * Wallet categories found in the 2023–2026 export. `wallet` lists the Wallet names that import into each one.
 * Slugs are stable keys; names and colours are the user's to change.
 */

export type DefaultCategory = {
	slug: string;
	name: string;
	kind: "expense" | "income" | "system";
	color: string;
	wallet?: string[];
	children?: Omit<DefaultCategory, "color" | "children">[];
};

export const SYSTEM_SLUGS = {
	transfer: "transferencia",
	savings: "estique",
} as const;

export const DEFAULT_CATEGORIES: DefaultCategory[] = [
	{
		slug: "rendimento",
		name: "Rendimento",
		kind: "income",
		color: "#3FB950",
		wallet: ["Income"],
		children: [
			{
				slug: "rendimento.salario",
				name: "Salário",
				kind: "income",
				wallet: ["Wage, invoices"],
			},
			{
				slug: "rendimento.vendas",
				name: "Vendas e serviços",
				kind: "income",
				wallet: ["Sale"],
			},
			{
				slug: "rendimento.juros",
				name: "Juros e dividendos",
				kind: "income",
				wallet: ["Interests, dividends"],
			},
			{
				slug: "rendimento.rendas",
				name: "Rendas",
				kind: "income",
				wallet: ["Rental income"],
			},
		],
	},
	{
		slug: "moradia",
		name: "Moradia",
		kind: "expense",
		color: "#A371F7",
		wallet: ["Housing"],
		children: [
			{
				slug: "moradia.energia",
				name: "Energia e água",
				kind: "expense",
				wallet: ["Energy, utilities"],
			},
			{
				slug: "moradia.manutencao",
				name: "Manutenção",
				kind: "expense",
				wallet: ["Maintenance, repairs"],
			},
		],
	},
	{
		slug: "alimentacao",
		name: "Alimentação",
		kind: "expense",
		color: "#E3B341",
		wallet: ["Food & Drinks"],
		children: [
			{
				slug: "alimentacao.restaurantes",
				name: "Restaurantes",
				kind: "expense",
				wallet: ["Restaurant, fast-food"],
			},
		],
	},
	{
		slug: "transporte",
		name: "Transporte",
		kind: "expense",
		color: "#58A6FF",
		wallet: ["Transportation"],
		children: [
			{
				slug: "transporte.viatura",
				name: "Viatura",
				kind: "expense",
				wallet: ["Vehicles, chattels", "Vehicle"],
			},
		],
	},
	{
		slug: "educacao",
		name: "Educação",
		kind: "expense",
		color: "#39C5BB",
		children: [
			{
				slug: "educacao.escola-sarita",
				name: "Escola de Sarita",
				kind: "expense",
			},
			{
				slug: "educacao.escola-junior",
				name: "Escola de junior",
				kind: "expense",
				wallet: ["Escola de junior"],
			},
			{
				slug: "educacao.faculdade",
				name: "Faculdade",
				kind: "expense",
				wallet: ["Faculdade"],
			},
			{ slug: "educacao.ingles", name: "Escola de Inglês", kind: "expense" },
			{
				slug: "educacao.cursos",
				name: "Cursos e livros",
				kind: "expense",
				wallet: ["Education, development"],
			},
		],
	},
	{
		slug: "comunicacoes",
		name: "Comunicações",
		kind: "expense",
		color: "#79C0FF",
		children: [
			{
				slug: "comunicacoes.internet",
				name: "Internet",
				kind: "expense",
				wallet: ["Internet"],
			},
			{
				slug: "comunicacoes.credito",
				name: "Crédito / chamadas",
				kind: "expense",
				wallet: ["Communication, PC", "Telephony, mobile phone"],
			},
		],
	},
	{
		slug: "subscricoes",
		name: "Subscrições",
		kind: "expense",
		color: "#F778BA",
		children: [
			{
				slug: "subscricoes.spotify",
				name: "Spotify",
				kind: "expense",
				wallet: ["Spotify"],
			},
			{
				slug: "subscricoes.servidores",
				name: "Servidores",
				kind: "expense",
				wallet: ["Servidores"],
			},
			{ slug: "subscricoes.claude", name: "Claude Code", kind: "expense" },
			{
				slug: "subscricoes.software",
				name: "Software e apps",
				kind: "expense",
				wallet: ["Software, apps, games"],
			},
			{
				slug: "subscricoes.streaming",
				name: "TV e streaming",
				kind: "expense",
				wallet: ["TV, Streaming"],
			},
			{
				slug: "subscricoes.livros",
				name: "Livros e áudio",
				kind: "expense",
				wallet: ["Books, audio, subscriptions"],
			},
		],
	},
	{
		slug: "familia",
		name: "Família",
		kind: "expense",
		color: "#D2A8FF",
		children: [
			{ slug: "familia.vovos", name: "Vovós", kind: "expense" },
			{
				slug: "familia.mesada-wil",
				name: "Mesada de Wil",
				kind: "expense",
				wallet: ["Mesada de wil"],
			},
			{
				slug: "familia.animais",
				name: "Animais",
				kind: "expense",
				wallet: ["Pets, animals"],
			},
		],
	},
	{
		slug: "obra",
		name: "Obra",
		kind: "expense",
		color: "#D29922",
		wallet: ["Construção"],
	},
	{
		slug: SYSTEM_SLUGS.savings,
		name: "Estique / Xitique",
		kind: "expense",
		color: "#56D364",
		wallet: ["Estique ou xitique"],
	},
	{
		slug: "dividas",
		name: "Dívidas",
		kind: "expense",
		color: "#FF7B72",
		children: [
			{
				slug: "dividas.pagas",
				name: "Pagas",
				kind: "expense",
				wallet: ["Loans, interests"],
			},
			{
				slug: "dividas.recebidas",
				name: "Recebidas",
				kind: "income",
				wallet: ["Lending, renting"],
			},
		],
	},
	{
		slug: "investimentos",
		name: "Investimentos",
		kind: "expense",
		color: "#2EA043",
		wallet: ["Investments", "Financial investments"],
		children: [
			{
				slug: "investimentos.poupanca",
				name: "Poupança",
				kind: "expense",
				wallet: ["Savings"],
			},
		],
	},
	{
		slug: "electronica",
		name: "Electrónica",
		kind: "expense",
		color: "#8B949E",
		wallet: ["Electronics, accessories"],
	},
	{
		slug: "roupa",
		name: "Roupa",
		kind: "expense",
		color: "#DB61A2",
		wallet: ["Clothes & Footwear"],
	},
	{
		slug: "compras",
		name: "Compras",
		kind: "expense",
		color: "#BC8CFF",
		wallet: ["Shopping", "Jewels, accessories", "Stationery, tools"],
	},
	{
		slug: "saude",
		name: "Saúde",
		kind: "expense",
		color: "#FFA198",
		wallet: ["Health care, doctor"],
		children: [
			{
				slug: "saude.beleza",
				name: "Beleza e bem-estar",
				kind: "expense",
				wallet: ["Wellness, beauty", "Health and beauty"],
			},
		],
	},
	{
		slug: "lazer",
		name: "Lazer",
		kind: "expense",
		color: "#FFA657",
		wallet: ["Life & Entertainment", "Hobbies", "Leisure time"],
		children: [
			{
				slug: "lazer.viagens",
				name: "Viagens",
				kind: "expense",
				wallet: ["Holiday, trips, hotels"],
			},
		],
	},
	{
		slug: "social",
		name: "Social / Imprevistos",
		kind: "expense",
		color: "#ADB5BD",
		wallet: ["Life events"],
		children: [
			{
				slug: "social.presentes",
				name: "Presentes e doações",
				kind: "expense",
				wallet: ["Charity, gifts", "Gifts, joy"],
			},
			{
				slug: "social.mulheres",
				name: "Mulheres",
				kind: "expense",
				wallet: ["Mulheres"],
			},
		],
	},
	{
		slug: "financeiras",
		name: "Despesas financeiras",
		kind: "expense",
		color: "#6E7681",
		wallet: ["Financial expenses", "Refunds (tax, purchase)"],
		children: [
			{
				slug: "financeiras.impostos",
				name: "Impostos e multas",
				kind: "expense",
				wallet: ["Taxes", "Fines"],
			},
		],
	},
	{
		slug: SYSTEM_SLUGS.transfer,
		name: "Transferência",
		kind: "system",
		color: "#6E7681",
		wallet: ["Transfer, withdraw"],
	},
];
