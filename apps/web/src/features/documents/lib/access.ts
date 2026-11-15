import type { DocumentRole } from "@docudeck/constants";
import { documentShares, documents, getDb } from "@docudeck/database";
import { and, eq } from "drizzle-orm";
import { HttpError } from "@/lib/http";

export async function getDocumentAccess(documentId: string, userId: string) {
	const db = getDb();
	const [document] = await db.select().from(documents).where(eq(documents.id, documentId)).limit(1);
	if (!document) throw new HttpError(404, "Document not found");
	if (document.ownerId === userId) return { document, role: "owner" as const };
	const [share] = await db
		.select({ role: documentShares.role })
		.from(documentShares)
		.where(and(eq(documentShares.documentId, documentId), eq(documentShares.userId, userId)))
		.limit(1);
	if (!share) throw new HttpError(404, "Document not found");
	return { document, role: share.role as DocumentRole };
}

export function assertCanEdit(role: DocumentRole) {
	if (role !== "owner" && role !== "editor") throw new HttpError(403, "You do not have permission to edit this document");
}

export function assertCanComment(role: DocumentRole) {
	if (role === "viewer") throw new HttpError(403, "You do not have permission to comment on this document");
}

export function assertOwner(role: DocumentRole) {
	if (role !== "owner") throw new HttpError(403, "Only the document owner can manage sharing and its title");
}
