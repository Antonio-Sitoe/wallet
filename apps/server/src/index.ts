import { buildApp } from "./app";
import { desktopOrigins, ENV } from "./env.server";
import { auth, db } from "./services";

const app = buildApp({
	db,
	auth,
	corsOrigins: [ENV.CORS_ORIGIN, ...desktopOrigins],
});

app.listen({ port: 3000, host: "0.0.0.0" }, (err) => {
	if (err) {
		app.log.error(err);
		process.exit(1);
	}
});
