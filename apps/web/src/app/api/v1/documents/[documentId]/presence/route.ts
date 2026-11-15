import { ACTIVE_PRESENCE_WINDOW_SECONDS } from "@docudeck/constants";
import { documentPresence, getDb, users } from "@docudeck/database";
import { and, eq, gt } from "drizzle-orm";
import { requireUser } from "@/features/auth/lib/require-user";
import { getDocumentAccess } from "@/features/documents/lib/access";
import { jsonError } from "@/lib/http";

export async function GET(_request: Request, context: { params: Promise<{ documentId: string }> }) {
	try {
		const user = await requireUser();
		const { documentId } = await context.params;
		await getDocumentAccess(documentId, user.id);
		const cutoff = new Date(Date.now() - ACTIVE_PRESENCE_WINDOW_SECONDS * 1000);
		const active = await getDb()
			.select({ id: users.id, name: users.name, lastSeenAt: documentPresence.lastSeenAt })
			.from(documentPresence)
			.innerJoin(users, eq(documentPresence.userId, users.id))
			.where(and(eq(documentPresence.documentId, documentId), gt(documentPresence.lastSeenAt, cutoff)));
		return Response.json(
			{ active: active.map((person) => ({ ...person, lastSeenAt: person.lastSeenAt.toISOString() })) },
			{ headers: { "Cache-Control": "no-store" } },
		);
	} catch (error) {
		return jsonError(error);
	}
}

export async function POST(_request: Request, context: { params: Promise<{ documentId: string }> }) {
	try {
		const user = await requireUser();
		const { documentId } = await context.params;
		await getDocumentAccess(documentId, user.id);
		await getDb()
			.insert(documentPresence)
			.values({ documentId, userId: user.id, lastSeenAt: new Date() })
			.onConflictDoUpdate({ target: [documentPresence.documentId, documentPresence.userId], set: { lastSeenAt: new Date() } });
		return Response.json({ success: true });
	} catch (error) {
		return jsonError(error);
	}
}
