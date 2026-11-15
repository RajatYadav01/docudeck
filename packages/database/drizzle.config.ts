import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { getWebEnv } from "@docudeck/config";
import dotenv from "dotenv";
import { defineConfig } from "drizzle-kit";

// Load the workspace-root .env even though Drizzle Kit runs with this package as cwd.
dotenv.config({ path: resolve(dirname(fileURLToPath(import.meta.url)), "../../.env") });
// DATABASE_URL is validated when the config is loaded by a database command.
const env = getWebEnv();

export default defineConfig({
	dialect: "postgresql",
	schema: "./src/db/schema.ts",
	out: "./drizzle",
	dbCredentials: { url: env.DATABASE_URL },
	strict: true,
	verbose: true,
});
