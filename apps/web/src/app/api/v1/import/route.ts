import { MAX_IMPORT_BYTES, SUPPORTED_IMPORT_EXTENSION } from "@docudeck/constants";
import { documents, encryptDocumentContent, getDb } from "@docudeck/database";
import { requireUser } from "@/features/auth/lib/require-user";
import { HttpError, jsonError } from "@/lib/http";

function textToDocument(text: string) {
	return {
		type: "doc",
		content: text
			.replace(/\r\n?/g, "\n")
			.split("\n")
			.map((line) => ({
				type: "paragraph",
				...(line.length ? { content: [{ type: "text", text: line }] } : {}),
			})),
	};
}

export async function POST(request: Request) {
	try {
		const user = await requireUser();
		const formData = await request.formData();
		const file = formData.get("file");
		if (!(file instanceof File)) throw new HttpError(400, "Choose a text file to import");
		if (!file.name.toLowerCase().endsWith(SUPPORTED_IMPORT_EXTENSION)) throw new HttpError(415, "Only .txt files are supported");
		if (file.type && !["text/plain", "application/octet-stream"].includes(file.type))
			throw new HttpError(415, "The selected file must contain plain text");
		if (file.size > MAX_IMPORT_BYTES) throw new HttpError(413, "Files must be 1 MB or smaller");
		if (file.size === 0) throw new HttpError(400, "The selected file is empty");
		const bytes = Buffer.from(await file.arrayBuffer());
		if (bytes.includes(0)) throw new HttpError(400, "The selected file does not appear to be plain text");
		let text: string;
		try {
			text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
		} catch {
			throw new HttpError(400, "The file must use UTF-8 text encoding");
		}
		const title = file.name.replace(/\.txt$/i, "").slice(0, 200) || "Imported document";
		const encrypted = encryptDocumentContent(textToDocument(text));
		const [document] = await getDb()
			.insert(documents)
			.values({
				title,
				ownerId: user.id,
				contentCiphertext: encrypted.ciphertext,
				encryptionVersion: encrypted.version,
			})
			.returning({ id: documents.id, title: documents.title });
		return Response.json({ document }, { status: 201 });
	} catch (error) {
		return jsonError(error);
	}
}
