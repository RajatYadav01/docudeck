import { resolve } from "node:path";
import dotenv from "dotenv";
import type { NextConfig } from "next";

// The monorepo keeps one root .env file; Next normally searches from apps/web.
dotenv.config({ path: resolve(process.cwd(), "../../.env") });

const nextConfig: NextConfig = {
	transpilePackages: ["@docudeck/config", "@docudeck/constants", "@docudeck/database", "@docudeck/schemas", "@docudeck/types"],
	poweredByHeader: false,
};

export default nextConfig;
