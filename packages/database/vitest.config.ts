import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		environment: "node",
		setupFiles: ["./vitest.setup.ts"],
		include: ["src/**/*.unit.test.ts", "src/**/*.integration.test.ts"],
	},
});
