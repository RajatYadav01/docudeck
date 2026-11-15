import { z } from "zod";

export const databaseEnvSchema = z.object({
	NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
	DATABASE_URL: z.url(),
	DOCUMENT_ENCRYPTION_KEY: z.string().min(1),
});

export type DatabaseEnv = z.infer<typeof databaseEnvSchema>;

export function getDatabaseEnv(): DatabaseEnv {
	const result = databaseEnvSchema.safeParse(process.env);

	if (!result.success) {
		throw new Error(`Invalid Docudeck database environment:\n${z.prettifyError(result.error)}`);
	}

	return result.data;
}
