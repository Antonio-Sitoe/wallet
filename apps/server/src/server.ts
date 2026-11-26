import { buildApp } from "./app";
import { desktopOrigins, ENV } from "./infrastructure/config/env.server";
import { auth, db } from "./infrastructure/services";
import { createEvolutionSender } from "./modules/whatsapp";

const evolution =
	ENV.EVOLUTION_URL && ENV.EVOLUTION_INSTANCE && ENV.EVOLUTION_API_KEY
		? createEvolutionSender({
				url: ENV.EVOLUTION_URL,
				instance: ENV.EVOLUTION_INSTANCE,
				apiKey: ENV.EVOLUTION_API_KEY,
			})
		: null;

const app = buildApp({
	db,
	auth,
	corsOrigins: [ENV.CORS_ORIGIN, ...desktopOrigins],
	jobs: { connectionString: ENV.DATABASE_URL },
	whatsapp: {
		sender: evolution,
		botNumber: ENV.WHATSAPP_BOT_NUMBER ?? null,
		webhookSecret: evolution ? (ENV.WHATSAPP_WEBHOOK_SECRET ?? null) : null,
	},
});

app.listen({ port: 3000, host: "0.0.0.0" }, (err) => {
	if (err) {
		app.log.error(err);
		process.exit(1);
	}
});
