/** Convert the supported Tiptap JSON subset to Markdown without trusting HTML strings. */
export function tiptapJsonToMarkdown(node: unknown): string {
	if (!node || typeof node !== "object") return "";
	const item = node as {
		type?: string;
		text?: string;
		attrs?: Record<string, unknown>;
		marks?: Array<{ type?: string }>;
		content?: unknown[];
	};
	if (item.type === "text") {
		let text = item.text ?? "";
		for (const mark of item.marks ?? []) {
			if (mark.type === "bold") text = `**${text}**`;
			if (mark.type === "italic") text = `*${text}*`;
			if (mark.type === "underline") text = `<u>${text}</u>`;
		}
		return text;
	}

	const children = (item.content ?? []).map(tiptapJsonToMarkdown).join("");
	switch (item.type) {
		case "heading":
			return `${"#".repeat(Math.max(1, Math.min(6, Number(item.attrs?.level ?? 1))))} ${children.trim()}\n\n`;
		case "paragraph":
			return `${children.trim()}\n\n`;
		case "bulletList":
			return `${(item.content ?? []).map((child) => `- ${tiptapJsonToMarkdown(child).trim()}`).join("\n")}\n\n`;
		case "orderedList": {
			const start = Number(item.attrs?.start ?? 1);
			return `${(item.content ?? []).map((child, index) => `${start + index}. ${tiptapJsonToMarkdown(child).trim()}`).join("\n")}\n\n`;
		}
		case "listItem":
			return children.trim();
		case "blockquote":
			return children
				.split("\n")
				.map((line) => (line ? `> ${line}` : line))
				.join("\n");
		case "hardBreak":
			return "  \n";
		case "doc":
			return children.trim();
		default:
			return children;
	}
}
