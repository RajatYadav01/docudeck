import {
	decryptDocumentContent,
	documentSuggestions,
	documents,
	documentVersions,
	encryptDocumentContent,
	getDb,
} from "@docudeck/database";
import { resolveSuggestionSchema } from "@docudeck/schemas";
import { and, eq } from "drizzle-orm";
import { requireUser } from "@/features/auth/lib/require-user";
import { assertCanEdit, getDocumentAccess } from "@/features/documents/lib/access";
import { replaceUniqueText } from "@/features/suggestions/lib";
import { HttpError, jsonError, readJson } from "@/lib/http";

export async function PATCH(request: Request, context: { params: Promise<{ documentId: string; suggestionId: string }> }) {
	try {
		const user = await requireUser();
		const { documentId, suggestionId } = await context.params;
		const { document, role } = await getDocumentAccess(documentId, user.id);
		assertCanEdit(role);
		const input = resolveSuggestionSchema.parse(await readJson<unknown>(request));
		const db = getDb();
		const [suggestion] = await db
			.select()
			.from(documentSuggestions)
			.where(
				and(
					eq(documentSuggestions.id, suggestionId),
					eq(documentSuggestions.documentId, documentId),
					eq(documentSuggestions.status, "pending"),
				),
			)
			.limit(1);
		if (!suggestion) throw new HttpError(404, "Pending suggestion not found");

		if (input.status === "rejected") {
			const [updated] = await db
				.update(documentSuggestions)
				.set({ status: "rejected", resolvedAt: new Date() })
				.where(and(eq(documentSuggestions.id, suggestionId), eq(documentSuggestions.status, "pending")))
				.returning({ id: documentSuggestions.id, status: documentSuggestions.status });
			if (!updated) throw new HttpError(409, "This suggestion was already reviewed");
			return Response.json({ suggestion: updated });
		}

		const originalText = decryptDocumentContent<string>(suggestion.originalCiphertext);
		const proposedText = decryptDocumentContent<string>(suggestion.proposedCiphertext);
		const currentContent = decryptDocumentContent(document.contentCiphertext, document.encryptionVersion);
		const replacement = replaceUniqueText(currentContent, originalText, proposedText);
		if (!replacement.ok) {
			const reason =
				replacement.reason === "not-found"
					? "The suggested original text is no longer in the document. Reject or recreate this suggestion."
					: "The original text occurs more than once. Recreate the suggestion with a more specific phrase.";
			throw new HttpError(409, reason);
		}

		const encrypted = encryptDocumentContent(replacement.document);
		const now = new Date();
		const result = await db.transaction(async (tx) => {
			await tx.insert(documentVersions).values({
				documentId,
				versionNumber: document.revision + 1,
				title: document.title,
				contentCiphertext: document.contentCiphertext,
				encryptionVersion: document.encryptionVersion,
				createdBy: user.id,
			});
			const [updatedDocument] = await tx
				.update(documents)
				.set({
					contentCiphertext: encrypted.ciphertext,
					encryptionVersion: encrypted.version,
					revision: document.revision + 1,
					updatedAt: now,
				})
				.where(and(eq(documents.id, documentId), eq(documents.revision, document.revision)))
				.returning({ id: documents.id, revision: documents.revision });
			if (!updatedDocument) throw new HttpError(409, "The document changed while reviewing this suggestion. Reload and try again.");
			const [updatedSuggestion] = await tx
				.update(documentSuggestions)
				.set({ status: "accepted", resolvedAt: now })
				.where(and(eq(documentSuggestions.id, suggestionId), eq(documentSuggestions.status, "pending")))
				.returning({ id: documentSuggestions.id, status: documentSuggestions.status });
			if (!updatedSuggestion) throw new HttpError(409, "This suggestion was already reviewed");
			return { document: updatedDocument, suggestion: updatedSuggestion };
		});
		return Response.json(result);
	} catch (error) {
		return jsonError(error);
	}
}
