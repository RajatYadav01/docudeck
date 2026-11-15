import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
	testDir: "./tests",
	fullyParallel: true,
	reporter: "list",
	use: {
		baseURL: process.env.BASE_URL ?? "http://localhost:3000",
		trace: "retain-on-failure",
		...devices["Desktop Chrome"],
	},
});
