import { documentComments, getDb } from "@docudeck/database";
import { resolveCommentSchema } from "@docudeck/schemas";
import { and, eq } from "drizzle-orm";
import { requireUser } from "@/features/auth/lib/require-user";
import { assertCanComment, getDocumentAccess } from "@/features/documents/lib/access";
import { HttpError, jsonError, readJson } from "@/lib/http";

export async function PATCH(request: Request, context: { params: Promise<{ documentId: string; commentId: string }> }) {
	try {
		const user = await requireUser();
		const { documentId, commentId } = await context.params;
		const { role } = await getDocumentAccess(documentId, user.id);
		assertCanComment(role);
		const input = resolveCommentSchema.parse(await readJson<unknown>(request));
		const [updated] = await getDb()
			.update(documentComments)
			.set({ isResolved: input.isResolved, updatedAt: new Date() })
			.where(and(eq(documentComments.id, commentId), eq(documentComments.documentId, documentId)))
			.returning({ id: documentComments.id, isResolved: documentComments.isResolved });
		if (!updated) throw new HttpError(404, "Comment not found");
		return Response.json({ comment: updated });
	} catch (error) {
		return jsonError(error);
	}
}
