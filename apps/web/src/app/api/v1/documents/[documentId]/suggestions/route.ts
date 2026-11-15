import { decryptDocumentContent, documentSuggestions, encryptDocumentContent, getDb, users } from "@docudeck/database";
import { createSuggestionSchema } from "@docudeck/schemas";
import { asc, eq } from "drizzle-orm";
import { requireUser } from "@/features/auth/lib/require-user";
import { assertCanComment, getDocumentAccess } from "@/features/documents/lib/access";
import { jsonError, readJson } from "@/lib/http";

export async function GET(_request: Request, context: { params: Promise<{ documentId: string }> }) {
	try {
		const user = await requireUser();
		const { documentId } = await context.params;
		await getDocumentAccess(documentId, user.id);
		const rows = await getDb()
			.select({
				id: documentSuggestions.id,
				authorId: documentSuggestions.authorId,
				authorName: users.name,
				originalCiphertext: documentSuggestions.originalCiphertext,
				proposedCiphertext: documentSuggestions.proposedCiphertext,
				status: documentSuggestions.status,
				createdAt: documentSuggestions.createdAt,
				resolvedAt: documentSuggestions.resolvedAt,
			})
			.from(documentSuggestions)
			.innerJoin(users, eq(documentSuggestions.authorId, users.id))
			.where(eq(documentSuggestions.documentId, documentId))
			.orderBy(asc(documentSuggestions.createdAt));

		return Response.json(
			{
				suggestions: rows.map((row) => ({
					id: row.id,
					authorId: row.authorId,
					authorName: row.authorName,
					originalText: decryptDocumentContent<string>(row.originalCiphertext),
					proposedText: decryptDocumentContent<string>(row.proposedCiphertext),
					status: row.status,
					createdAt: row.createdAt.toISOString(),
					resolvedAt: row.resolvedAt?.toISOString() ?? null,
				})),
			},
			{ headers: { "Cache-Control": "no-store" } },
		);
	} catch (error) {
		return jsonError(error);
	}
}

export async function POST(request: Request, context: { params: Promise<{ documentId: string }> }) {
	try {
		const user = await requireUser();
		const { documentId } = await context.params;
		const { role } = await getDocumentAccess(documentId, user.id);
		assertCanComment(role);
		const input = createSuggestionSchema.parse(await readJson<unknown>(request));
		const original = encryptDocumentContent(input.originalText);
		const proposed = encryptDocumentContent(input.proposedText);
		const [suggestion] = await getDb()
			.insert(documentSuggestions)
			.values({
				documentId,
				authorId: user.id,
				originalCiphertext: original.ciphertext,
				proposedCiphertext: proposed.ciphertext,
				status: "pending",
			})
			.returning({ id: documentSuggestions.id, createdAt: documentSuggestions.createdAt });

		return Response.json(
			{
				suggestion: {
					id: suggestion?.id,
					authorId: user.id,
					authorName: user.name,
					...input,
					status: "pending",
					createdAt: suggestion?.createdAt.toISOString(),
				},
			},
			{ status: 201 },
		);
	} catch (error) {
		return jsonError(error);
	}
}
