import "./load-env";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { getDb } from "./client";
import { encryptDocumentContent } from "./crypto";
import { documentShares, documents, users } from "./db/schema";

const DEMO_PASSWORD = "Docudeck!2026";
const DEMO_USERS = [
	{ id: "10000000-0000-4000-8000-000000000001", name: "Alice Morgan", email: "alice@example.com" },
	{ id: "10000000-0000-4000-8000-000000000002", name: "Bob Chen", email: "bob@example.com" },
	{ id: "10000000-0000-4000-8000-000000000003", name: "Charlie Rivera", email: "charlie@example.com" },
] as const;

async function seed() {
	const db = getDb();
	const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
	for (const user of DEMO_USERS) {
		await db
			.insert(users)
			.values({ ...user, passwordHash })
			.onConflictDoNothing({ target: users.email });
	}

	const [alice] = await db.select().from(users).where(eq(users.email, "alice@example.com")).limit(1);
	const [bob] = await db.select().from(users).where(eq(users.email, "bob@example.com")).limit(1);
	if (!alice || !bob) throw new Error("Could not load demo users after seeding");

	const sampleDocumentId = "11000000-0000-4000-8000-000000000001";
	const sampleContent = {
		type: "doc",
		content: [
			{ type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Welcome to Docudeck" }] },
			{ type: "paragraph", content: [{ type: "text", text: "A clean workspace for shared documents." }] },
			{
				type: "bulletList",
				content: [
					{
						type: "listItem",
						content: [{ type: "paragraph", content: [{ type: "text", text: "Create and format documents" }] }],
					},
					{ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Share with teammates" }] }] },
					{
						type: "listItem",
						content: [{ type: "paragraph", content: [{ type: "text", text: "Keep every change safely stored" }] }],
					},
				],
			},
		],
	};
	const encrypted = encryptDocumentContent(sampleContent);
	await db
		.insert(documents)
		.values({
			id: sampleDocumentId,
			title: "Welcome to Docudeck",
			ownerId: alice.id,
			contentCiphertext: encrypted.ciphertext,
			encryptionVersion: encrypted.version,
		})
		.onConflictDoNothing({ target: documents.id });

	// Keep the sample access relationship in place on every idempotent seed run.
	await db
		.insert(documentShares)
		.values({
			documentId: sampleDocumentId,
			userId: bob.id,
			role: "editor",
			createdBy: alice.id,
		})
		.onConflictDoNothing();
	console.info("Demo data is ready. Password for all seeded users:", DEMO_PASSWORD);
}

seed().catch((error: unknown) => {
	console.error("Database seed failed:", error);
	process.exitCode = 1;
});
