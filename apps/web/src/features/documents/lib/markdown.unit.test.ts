import { describe, expect, it } from "vitest";
import { tiptapJsonToMarkdown } from "./markdown";

describe("tiptapJsonToMarkdown", () => {
	it("preserves supported headings, text marks and lists", () => {
		const document = {
			type: "doc",
			content: [
				{ type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Plan" }] },
				{ type: "paragraph", content: [{ type: "text", text: "Important", marks: [{ type: "bold" }] }] },
				{
					type: "bulletList",
					content: [{ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "First task" }] }] }],
				},
			],
		};
		expect(tiptapJsonToMarkdown(document)).toBe("## Plan\n\n**Important**\n\n- First task");
	});

	it("keeps ordered lists numbered", () => {
		const document = {
			type: "doc",
			content: [
				{
					type: "orderedList",
					content: [
						{ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "First" }] }] },
						{ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Second" }] }] },
					],
				},
			],
		};
		expect(tiptapJsonToMarkdown(document)).toBe("1. First\n2. Second");
	});

	it("returns an empty string for invalid input", () => {
		expect(tiptapJsonToMarkdown(null)).toBe("");
		expect(tiptapJsonToMarkdown("plain string")).toBe("");
	});
});
