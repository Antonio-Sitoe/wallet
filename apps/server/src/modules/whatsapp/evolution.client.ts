export type WhatsappSender = {
	sendText: (phone: string, text: string) => Promise<void>;
};

export type EvolutionConfig = {
	url: string;
	instance: string;
	apiKey: string;
};

export function createEvolutionSender(config: EvolutionConfig): WhatsappSender {
	const base = config.url.replace(/\/$/, "");
	return {
		async sendText(phone, text) {
			const response = await fetch(
				`${base}/message/sendText/${encodeURIComponent(config.instance)}`,
				{
					method: "POST",
					headers: { "content-type": "application/json", apikey: config.apiKey },
					body: JSON.stringify({ number: phone, text }),
				},
			);
			if (!response.ok)
				throw new Error(
					`Evolution sendText ${response.status}: ${(await response.text()).slice(0, 200)}`,
				);
		},
	};
}
