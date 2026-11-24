import { defineConfig } from "tsdown";

export default defineConfig({
	entry: { index: "./src/server.ts" },
	format: "esm",
	outDir: "./dist",
	clean: true,
	deps: {
		alwaysBundle: [/@wallet\/.*/],
	},
});
