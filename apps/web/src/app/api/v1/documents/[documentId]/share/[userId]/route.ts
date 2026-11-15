import { documentShares, getDb } from "@docudeck/database";
import { and, eq } from "drizzle-orm";
import { requireUser } from "@/features/auth/lib/require-user";
import { assertOwner, getDocumentAccess } from "@/features/documents/lib/access";
import { jsonError } from "@/lib/http";

export async function DELETE(_request: Request, context: { params: Promise<{ documentId: string; userId: string }> }) {
	try {
		const owner = await requireUser();
		const { documentId, userId } = await context.params;
		const { role } = await getDocumentAccess(documentId, owner.id);
		assertOwner(role);
		await getDb()
			.delete(documentShares)
			.where(and(eq(documentShares.documentId, documentId), eq(documentShares.userId, userId)));
		return Response.json({ success: true });
	} catch (error) {
		return jsonError(error);
	}
}
