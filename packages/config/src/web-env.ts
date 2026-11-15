import { z } from "zod";

// Validate environment variables lazily so Next.js can inspect/build the app without production secrets.
const webEnvSchema = z.object({
	NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
	DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
	SESSION_SECRET: z.string().min(32, "SESSION_SECRET must contain at least 32 characters"),
	DOCUMENT_ENCRYPTION_KEY: z.string().regex(/^[a-fA-F0-9]{64}$/, "DOCUMENT_ENCRYPTION_KEY must be 32 bytes encoded as 64 hex characters"),
	NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
});

export type WebEnv = z.infer<typeof webEnvSchema>;

export function getWebEnv(source: NodeJS.ProcessEnv = process.env): WebEnv {
	const parsed = webEnvSchema.safeParse(source);
	if (!parsed.success) {
		const details = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("\n");
		throw new Error(`Invalid Docudeck web environment:\n${details}`);
	}
	return parsed.data;
}
