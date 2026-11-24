import type { AssistantAnswerData, AssistantRole } from "@wallet/shared";

export type ProviderMessage = { role: AssistantRole; content: string };

export type ProviderReply = {
	content: string;
	data: AssistantAnswerData | null;
};

export interface AssistantProvider {
	readonly name: string | null;
	readonly connected: boolean;
	reply(input: {
		userId: string;
		messages: ProviderMessage[];
	}): Promise<ProviderReply>;
}

export class PlaceholderProvider implements AssistantProvider {
	readonly name = null;
	readonly connected = false;

	async reply(): Promise<ProviderReply> {
		return {
			content:
				"Ainda não estou ligado a um modelo de IA. A pergunta ficou guardada nesta conversa; quando a integração estiver feita, respondo com as tuas transacções, contas e plano, sempre com a fonte.",
			data: { source: "assistente por ligar" },
		};
	}
}
