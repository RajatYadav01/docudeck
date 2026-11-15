import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const projectRoot = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
	resolve: { alias: { "@": resolve(projectRoot, "src") } },
	test: {
		environment: "node",
		setupFiles: ["./vitest.setup.ts"],
		include: ["src/**/*.unit.test.ts", "src/**/*.unit.test.tsx", "src/**/*.integration.test.ts", "src/**/*.integration.test.tsx"],
		coverage: { reporter: ["text", "html"], include: ["src/features/**/*.ts", "src/lib/**/*.ts"] },
	},
});
