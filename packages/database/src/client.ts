import { getWebEnv } from "@docudeck/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { relations } from "./db/relations";

const globalForDocudeck = globalThis as typeof globalThis & {
	docudeckSql?: ReturnType<typeof postgres>;
	docudeckDb?: ReturnType<typeof createDatabase>;
};

function createDatabase() {
	const env = getWebEnv();
	const sql = postgres(env.DATABASE_URL, {
		max: env.NODE_ENV === "production" ? 5 : 10,
		idle_timeout: 20,
		connect_timeout: 10,
		ssl:
			env.DATABASE_URL.includes("localhost") ||
			env.DATABASE_URL.includes("127.0.0.1") ||
			env.DATABASE_URL.includes("docudeck-database")
				? false
				: "require",
	});
	globalForDocudeck.docudeckSql = sql;
	// Drizzle ORM v1 accepts the existing postgres.js client through the `client` config.
	return drizzle({ client: sql, relations });
}

export function getDb() {
	globalForDocudeck.docudeckDb ??= createDatabase();
	return globalForDocudeck.docudeckDb;
}

export async function closeDbConnection() {
	await globalForDocudeck.docudeckSql?.end({ timeout: 5 });
	delete globalForDocudeck.docudeckDb;
	delete globalForDocudeck.docudeckSql;
}
