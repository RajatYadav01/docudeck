import { decryptDocumentContent } from "@docudeck/database";
import { requireUser } from "@/features/auth/lib/require-user";
import { getDocumentAccess } from "@/features/documents/lib/access";
import { tiptapJsonToMarkdown } from "@/features/documents/lib/markdown";
import { jsonError } from "@/lib/http";

export async function GET(request: Request, context: { params: Promise<{ documentId: string }> }) {
	try {
		const user = await requireUser();
		const { documentId } = await context.params;
		const { document } = await getDocumentAccess(documentId, user.id);
		const format = new URL(request.url).searchParams.get("format");
		if (format !== "markdown") return Response.json({ error: "Supported export format: markdown" }, { status: 400 });
		const content = decryptDocumentContent(document.contentCiphertext, document.encryptionVersion);
		const markdown = `# ${document.title}\n\n${tiptapJsonToMarkdown(content)}\n`;
		const safeName =
			document.title
				.replace(/[^a-z0-9-_ ]/gi, "")
				.trim()
				.replace(/\s+/g, "-") || "document";
		return new Response(markdown, {
			headers: {
				"Content-Type": "text/markdown; charset=utf-8",
				"Content-Disposition": `attachment; filename="${safeName}.md"`,
				"Cache-Control": "no-store",
			},
		});
	} catch (error) {
		return jsonError(error);
	}
}
