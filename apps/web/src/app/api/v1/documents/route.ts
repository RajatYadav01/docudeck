import { DEFAULT_DOCUMENT_CONTENT } from "@docudeck/constants";
import { documentShares, documents, encryptDocumentContent, getDb, users } from "@docudeck/database";
import { createDocumentSchema } from "@docudeck/schemas";
import { desc, eq } from "drizzle-orm";
import { requireUser } from "@/features/auth/lib/require-user";
import { jsonError, readJson } from "@/lib/http";

export async function GET() {
	try {
		const user = await requireUser();
		const db = getDb();
		const owned = await db
			.select({
				id: documents.id,
				title: documents.title,
				ownerId: documents.ownerId,
				ownerName: users.name,
				updatedAt: documents.updatedAt,
				createdAt: documents.createdAt,
			})
			.from(documents)
			.innerJoin(users, eq(documents.ownerId, users.id))
			.where(eq(documents.ownerId, user.id))
			.orderBy(desc(documents.updatedAt));
		const shared = await db
			.select({
				id: documents.id,
				title: documents.title,
				ownerId: documents.ownerId,
				ownerName: users.name,
				updatedAt: documents.updatedAt,
				createdAt: documents.createdAt,
				role: documentShares.role,
			})
			.from(documents)
			.innerJoin(users, eq(documents.ownerId, users.id))
			.innerJoin(documentShares, eq(documentShares.documentId, documents.id))
			.where(eq(documentShares.userId, user.id))
			.orderBy(desc(documents.updatedAt));
		return Response.json(
			{
				owned: owned.map((row) => ({
					...row,
					updatedAt: row.updatedAt.toISOString(),
					createdAt: row.createdAt.toISOString(),
					accessRole: "owner" as const,
				})),
				shared: shared.map((row) => ({
					id: row.id,
					title: row.title,
					ownerId: row.ownerId,
					ownerName: row.ownerName,
					updatedAt: row.updatedAt.toISOString(),
					createdAt: row.createdAt.toISOString(),
					accessRole: row.role,
				})),
			},
			{ headers: { "Cache-Control": "no-store" } },
		);
	} catch (error) {
		return jsonError(error);
	}
}

export async function POST(request: Request) {
	try {
		const user = await requireUser();
		const input = createDocumentSchema.parse(await readJson<unknown>(request));
		const encrypted = encryptDocumentContent(DEFAULT_DOCUMENT_CONTENT);
		const [document] = await getDb()
			.insert(documents)
			.values({
				title: input.title ?? "Untitled Document",
				ownerId: user.id,
				contentCiphertext: encrypted.ciphertext,
				encryptionVersion: encrypted.version,
			})
			.returning({ id: documents.id, title: documents.title });
		return Response.json({ document }, { status: 201 });
	} catch (error) {
		return jsonError(error);
	}
}
