import { Dialog } from "@/components/ui/dialog";

export const TERMS_UPDATED = "24 de Novembro de 2026";

const TERMS: { title: string; body: string[] }[] = [
	{
		title: "1. O que é o Wallet",
		body: [
			"O Wallet é uma ferramenta pessoal para registar contas, transacções, orçamento, metas e dívidas. Serve para organizar o teu dinheiro; não é um banco, não movimenta dinheiro e não se liga às tuas contas bancárias.",
			"Ao criar uma conta e usar o app, aceitas estes termos. Se não concordares, não uses o app.",
		],
	},
	{
		title: "2. A tua conta",
		body: [
			"Cada conta é de uma só pessoa. És responsável por manter a palavra-passe e o PIN em segredo e por tudo o que for feito com a tua sessão.",
			"Os dados que registas são teus. Podes exportá-los a qualquer momento em Definições › Dados e apagar a conta em Definições › Perfil; apagar a conta remove todos os dados de forma definitiva.",
		],
	},
	{
		title: "3. Onde ficam os dados",
		body: [
			"Os dados ficam na base de dados do servidor a que o app está ligado (indicado em Definições › Dados). Quem gere esse servidor é responsável pelas cópias de segurança e pela segurança do acesso.",
			"O app não vende nem partilha os teus dados com terceiros. Funcionalidades que dependam de serviços externos, como o assistente de IA ou o WhatsApp, só enviam o necessário para responder, e são indicadas antes de ficarem activas.",
		],
	},
	{
		title: "4. Números e sugestões",
		body: [
			"Os saldos, estatísticas, avisos e respostas do assistente são calculados a partir do que registas e importas. Podem estar errados se os dados estiverem incompletos, duplicados ou mal classificados.",
			"Nada no app é aconselhamento financeiro, fiscal ou jurídico. As decisões sobre o teu dinheiro são tuas; confirma os valores importantes com o teu banco.",
		],
	},
	{
		title: "5. Uso aceitável",
		body: [
			"Não uses o app para registar dados de outras pessoas sem autorização, para actividades ilegais ou para tentar aceder a contas e dados que não são teus.",
		],
	},
	{
		title: "6. Disponibilidade e garantias",
		body: [
			"O app é fornecido tal como está, sem garantia de funcionamento contínuo ou livre de erros. Podem existir interrupções, mudanças de funcionalidades ou perda de dados por falhas técnicas; mantém exportações regulares do que for importante.",
			"Na medida permitida pela lei, os autores não respondem por perdas resultantes do uso do app ou de decisões tomadas com base nele.",
		],
	},
	{
		title: "7. Alterações",
		body: [
			"Estes termos podem mudar. A data da última versão fica no topo; mudanças importantes são avisadas no app antes de entrarem em vigor. Continuar a usar o app depois disso significa que aceitas a nova versão.",
		],
	},
];

export function TermsDialog({
	open,
	onOpenChange,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	return (
		<Dialog
			open={open}
			onOpenChange={onOpenChange}
			title="Termos de uso"
			description={`Última actualização: ${TERMS_UPDATED}`}
			width={640}
		>
			<article className="flex flex-col gap-4 leading-relaxed">
				{TERMS.map((section) => (
					<section key={section.title} className="flex flex-col gap-1.5">
						<h3 className="text-fg text-[13px] font-semibold">
							{section.title}
						</h3>
						{section.body.map((paragraph) => (
							<p key={paragraph.slice(0, 32)} className="text-fg-2">
								{paragraph}
							</p>
						))}
					</section>
				))}
			</article>
		</Dialog>
	);
}
