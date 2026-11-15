import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

// Database scripts run with packages/database as their working directory, so resolve the
// monorepo-root .env explicitly rather than looking for packages/database/.env.
const packageSourceDirectory = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(packageSourceDirectory, "../../../.env") });
