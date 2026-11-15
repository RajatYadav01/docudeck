import { describe, expect, it } from "vitest";
import { replaceUniqueText } from "./lib";

describe("replaceUniqueText", () => {
	it("replaces a unique phrase and keeps formatting marks", () => {
		const document = {
			type: "doc",
			content: [{ type: "paragraph", content: [{ type: "text", text: "Please review this draft", marks: [{ type: "bold" }] }] }],
		};
		const result = replaceUniqueText(document, "this draft", "the proposal");
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.document.content?.[0]?.content?.[0]).toMatchObject({
				text: "Please review the proposal",
				marks: [{ type: "bold" }],
			});
		}
	});

	it("rejects missing or ambiguous phrases", () => {
		const document = {
			type: "doc",
			content: [
				{ type: "text", text: "same" },
				{ type: "text", text: "same" },
			],
		};
		expect(replaceUniqueText(document, "missing", "new")).toMatchObject({ ok: false, reason: "not-found" });
		expect(replaceUniqueText(document, "same", "new")).toMatchObject({ ok: false, reason: "ambiguous" });
	});
});
