import { defineConfig } from "vite-plus";

const ignored = [
	"node_modules/**",
	"**/node_modules/**",
	"apps/web/dist/**",
	"apps/server/dist/**",
	"packages/db/dist/**",
];

export default defineConfig({
	lint: {
		ignorePatterns: ignored,
		options: {
			typeAware: false,
			typeCheck: false,
		},
	},
	fmt: {
		ignorePatterns: [
			...ignored,
			"packages/db/src/migrations/**",
			"**/*.json",
			"**/*.jsonc",
			"**/*.md",
		],
		useTabs: true,
		printWidth: 80,
		singleQuote: false,
		semi: true,
		sortPackageJson: false,
	},
	staged: {
		"*.{js,ts,jsx,tsx,vue,svelte,json,jsonc,css,md}": "vp check --fix",
	},
});
