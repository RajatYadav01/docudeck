import { describe, expect, it } from "vitest";
import { decryptDocumentContent, encryptDocumentContent } from "./crypto";

describe("document content encryption", () => {
	it("round-trips structured content with AES-256-GCM", () => {
		const value = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "private text" }] }] };
		const encrypted = encryptDocumentContent(value);
		expect(encrypted.ciphertext).not.toContain("private text");
		expect(decryptDocumentContent(encrypted.ciphertext, encrypted.version)).toEqual(value);
	});

	it("rejects tampered ciphertext", () => {
		const encrypted = encryptDocumentContent({ secret: "value" });
		const parts = encrypted.ciphertext.split(".");
		parts[3] = `${parts[3]}AA`;
		expect(() => decryptDocumentContent(parts.join("."), encrypted.version)).toThrow();
	});
});
