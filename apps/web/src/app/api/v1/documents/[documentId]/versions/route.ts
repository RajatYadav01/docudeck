import { decryptDocumentContent, documentVersions, getDb } from "@docudeck/database";
import { desc, eq } from "drizzle-orm";
import { requireUser } from "@/features/auth/lib/require-user";
import { assertCanEdit, getDocumentAccess } from "@/features/documents/lib/access";
import { jsonError } from "@/lib/http";

export async function GET(_request: Request, context: { params: Promise<{ documentId: string }> }) {
	try {
		const user = await requireUser();
		const { documentId } = await context.params;
		const { role } = await getDocumentAccess(documentId, user.id);
		assertCanEdit(role);
		const versions = await getDb()
			.select()
			.from(documentVersions)
			.where(eq(documentVersions.documentId, documentId))
			.orderBy(desc(documentVersions.versionNumber));
		return Response.json(
			{
				versions: versions.map((version) => ({
					id: version.id,
					versionNumber: version.versionNumber,
					title: version.title,
					content: decryptDocumentContent(version.contentCiphertext, version.encryptionVersion),
					createdBy: version.createdBy,
					createdAt: version.createdAt.toISOString(),
				})),
			},
			{ headers: { "Cache-Control": "no-store" } },
		);
	} catch (error) {
		return jsonError(error);
	}
}
