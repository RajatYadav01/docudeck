import { decryptDocumentContent, documents, documentVersions, encryptDocumentContent, getDb } from "@docudeck/database";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { requireUser } from "@/features/auth/lib/require-user";
import { assertCanEdit, getDocumentAccess } from "@/features/documents/lib/access";
import { HttpError, jsonError, readJson } from "@/lib/http";

const restoreSchema = z.object({ versionId: z.uuid() });

export async function POST(request: Request, context: { params: Promise<{ documentId: string }> }) {
	try {
		const user = await requireUser();
		const { documentId } = await context.params;
		const { document, role } = await getDocumentAccess(documentId, user.id);
		assertCanEdit(role);
		const { versionId } = restoreSchema.parse(await readJson<unknown>(request));
		const [version] = await getDb()
			.select()
			.from(documentVersions)
			.where(and(eq(documentVersions.id, versionId), eq(documentVersions.documentId, documentId)))
			.limit(1);
		if (!version) throw new HttpError(404, "Version not found");
		const snapshot = encryptDocumentContent(decryptDocumentContent(version.contentCiphertext, version.encryptionVersion));
		const db = getDb();
		const updated = await db.transaction(async (tx) => {
			await tx.insert(documentVersions).values({
				documentId,
				versionNumber: document.revision + 1,
				title: document.title,
				contentCiphertext: document.contentCiphertext,
				encryptionVersion: document.encryptionVersion,
				createdBy: user.id,
			});
			const [row] = await tx
				.update(documents)
				.set({
					title: version.title,
					contentCiphertext: snapshot.ciphertext,
					encryptionVersion: snapshot.version,
					revision: document.revision + 1,
					updatedAt: new Date(),
				})
				.where(and(eq(documents.id, documentId), eq(documents.revision, document.revision)))
				.returning({ revision: documents.revision, title: documents.title });
			if (!row) throw new HttpError(409, "The document changed. Reload and try again.");
			return row;
		});
		return Response.json({ document: updated });
	} catch (error) {
		return jsonError(error);
	}
}
