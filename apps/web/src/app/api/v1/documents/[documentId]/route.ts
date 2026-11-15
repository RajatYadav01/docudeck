import {
	decryptDocumentContent,
	documentShares,
	documents,
	documentVersions,
	encryptDocumentContent,
	getDb,
	users,
} from "@docudeck/database";
import { updateDocumentSchema } from "@docudeck/schemas";
import { and, eq } from "drizzle-orm";
import { requireUser } from "@/features/auth/lib/require-user";
import { assertCanEdit, assertOwner, getDocumentAccess } from "@/features/documents/lib/access";
import { HttpError, jsonError, readJson } from "@/lib/http";

export async function GET(_request: Request, context: { params: Promise<{ documentId: string }> }) {
	try {
		const user = await requireUser();
		const { documentId } = await context.params;
		const { document, role } = await getDocumentAccess(documentId, user.id);
		const [owner] = await getDb().select({ name: users.name }).from(users).where(eq(users.id, document.ownerId)).limit(1);
		const collaborators = await getDb()
			.select({ userId: documentShares.userId, name: users.name, email: users.email, role: documentShares.role })
			.from(documentShares)
			.innerJoin(users, eq(documentShares.userId, users.id))
			.where(eq(documentShares.documentId, documentId));
		return Response.json(
			{
				document: {
					id: document.id,
					title: document.title,
					content: decryptDocumentContent(document.contentCiphertext, document.encryptionVersion),
					ownerId: document.ownerId,
					ownerName: owner?.name ?? "Unknown",
					revision: document.revision,
					updatedAt: document.updatedAt.toISOString(),
					accessRole: role,
				},
				collaborators,
			},
			{ headers: { "Cache-Control": "no-store" } },
		);
	} catch (error) {
		return jsonError(error);
	}
}

export async function PATCH(request: Request, context: { params: Promise<{ documentId: string }> }) {
	try {
		const user = await requireUser();
		const { documentId } = await context.params;
		const input = updateDocumentSchema.parse(await readJson<unknown>(request));
		const { document, role } = await getDocumentAccess(documentId, user.id);

		if (input.title !== undefined) assertOwner(role);
		if (input.content !== undefined) assertCanEdit(role);
		if (input.expectedRevision !== undefined && input.expectedRevision !== document.revision) {
			throw new HttpError(409, "This document changed since you opened it. Reload before saving your changes.");
		}

		const db = getDb();
		let encrypted: ReturnType<typeof encryptDocumentContent> | undefined;
		if (input.content !== undefined) encrypted = encryptDocumentContent(input.content);
		const updateValues: Partial<typeof documents.$inferInsert> = { updatedAt: new Date() };
		if (input.title !== undefined) updateValues.title = input.title;
		if (encrypted) {
			updateValues.contentCiphertext = encrypted.ciphertext;
			updateValues.encryptionVersion = encrypted.version;
			updateValues.revision = document.revision + 1;
		}

		const updated = await db.transaction(async (tx) => {
			if (encrypted) {
				await tx.insert(documentVersions).values({
					documentId,
					versionNumber: document.revision + 1,
					title: document.title,
					contentCiphertext: document.contentCiphertext,
					encryptionVersion: document.encryptionVersion,
					createdBy: user.id,
				});
			}
			const filters =
				input.expectedRevision === undefined
					? eq(documents.id, documentId)
					: and(eq(documents.id, documentId), eq(documents.revision, input.expectedRevision));
			const [row] = await tx
				.update(documents)
				.set(updateValues)
				.where(filters)
				.returning({ id: documents.id, title: documents.title, revision: documents.revision, updatedAt: documents.updatedAt });
			if (!row) throw new HttpError(409, "This document changed since you opened it. Reload before saving your changes.");
			return row;
		});
		return Response.json({ document: { ...updated, updatedAt: updated.updatedAt.toISOString() } });
	} catch (error) {
		return jsonError(error);
	}
}

export async function DELETE(_request: Request, context: { params: Promise<{ documentId: string }> }) {
	try {
		const user = await requireUser();
		const { documentId } = await context.params;
		const { role } = await getDocumentAccess(documentId, user.id);
		assertOwner(role);
		await getDb().delete(documents).where(eq(documents.id, documentId));
		return Response.json({ success: true });
	} catch (error) {
		return jsonError(error);
	}
}
