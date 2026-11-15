import { decryptDocumentContent, documentComments, encryptDocumentContent, getDb, users } from "@docudeck/database";
import { createCommentSchema } from "@docudeck/schemas";
import { asc, eq } from "drizzle-orm";
import { requireUser } from "@/features/auth/lib/require-user";
import { assertCanComment, getDocumentAccess } from "@/features/documents/lib/access";
import { jsonError, readJson } from "@/lib/http";

export async function GET(_request: Request, context: { params: Promise<{ documentId: string }> }) {
	try {
		const user = await requireUser();
		const { documentId } = await context.params;
		await getDocumentAccess(documentId, user.id);
		const comments = await getDb()
			.select({
				id: documentComments.id,
				authorId: documentComments.authorId,
				authorName: users.name,
				bodyCiphertext: documentComments.bodyCiphertext,
				isResolved: documentComments.isResolved,
				createdAt: documentComments.createdAt,
			})
			.from(documentComments)
			.innerJoin(users, eq(documentComments.authorId, users.id))
			.where(eq(documentComments.documentId, documentId))
			.orderBy(asc(documentComments.createdAt));
		return Response.json(
			{
				comments: comments.map((comment) => ({
					id: comment.id,
					authorId: comment.authorId,
					authorName: comment.authorName,
					...decryptDocumentContent<{ body: string; anchorData?: Record<string, unknown> | null }>(comment.bodyCiphertext),
					isResolved: comment.isResolved,
					createdAt: comment.createdAt.toISOString(),
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
		const input = createCommentSchema.parse(await readJson<unknown>(request));
		const encrypted = encryptDocumentContent({ body: input.body, anchorData: input.anchorData ?? null });
		const [comment] = await getDb()
			.insert(documentComments)
			.values({
				documentId,
				authorId: user.id,
				bodyCiphertext: encrypted.ciphertext,
				// Anchor metadata is part of the encrypted payload; keep the legacy query column empty.
				anchorData: null,
			})
			.returning({ id: documentComments.id, createdAt: documentComments.createdAt });
		return Response.json(
			{
				comment: {
					...comment,
					body: input.body,
					authorName: user.name,
					authorId: user.id,
					createdAt: comment?.createdAt.toISOString(),
				},
			},
			{ status: 201 },
		);
	} catch (error) {
		return jsonError(error);
	}
}
