import { documentShares, getDb, users } from "@docudeck/database";
import { shareDocumentSchema } from "@docudeck/schemas";
import { eq } from "drizzle-orm";
import { requireUser } from "@/features/auth/lib/require-user";
import { assertOwner, getDocumentAccess } from "@/features/documents/lib/access";
import { HttpError, jsonError, readJson } from "@/lib/http";

export async function POST(request: Request, context: { params: Promise<{ documentId: string }> }) {
	try {
		const owner = await requireUser();
		const { documentId } = await context.params;
		const { role } = await getDocumentAccess(documentId, owner.id);
		assertOwner(role);
		const input = shareDocumentSchema.parse(await readJson<unknown>(request));
		const [recipient] = await getDb()
			.select({ id: users.id, name: users.name, email: users.email })
			.from(users)
			.where(eq(users.email, input.email.toLowerCase()))
			.limit(1);
		if (!recipient) throw new HttpError(404, "No demo account exists with that email address");
		if (recipient.id === owner.id) throw new HttpError(400, "You already own this document");
		await getDb()
			.insert(documentShares)
			.values({ documentId, userId: recipient.id, role: input.role, createdBy: owner.id })
			.onConflictDoUpdate({
				target: [documentShares.documentId, documentShares.userId],
				set: { role: input.role, createdBy: owner.id },
			});
		return Response.json({ collaborator: { ...recipient, role: input.role } }, { status: 201 });
	} catch (error) {
		return jsonError(error);
	}
}

export async function GET(_request: Request, context: { params: Promise<{ documentId: string }> }) {
	try {
		const user = await requireUser();
		const { documentId } = await context.params;
		const { role } = await getDocumentAccess(documentId, user.id);
		if (role !== "owner") throw new HttpError(403, "Only the document owner can manage collaborators");
		const collaborators = await getDb()
			.select({ userId: documentShares.userId, name: users.name, email: users.email, role: documentShares.role })
			.from(documentShares)
			.innerJoin(users, eq(documentShares.userId, users.id))
			.where(eq(documentShares.documentId, documentId));
		return Response.json({ collaborators }, { headers: { "Cache-Control": "no-store" } });
	} catch (error) {
		return jsonError(error);
	}
}
