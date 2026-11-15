type JsonNode = {
	type?: string;
	text?: string;
	content?: JsonNode[];
	[key: string]: unknown;
};

export type TextReplacementResult = { ok: true; document: JsonNode } | { ok: false; reason: "not-found" | "ambiguous" };

/** Replace a unique phrase inside one ProseMirror text node and preserve its marks/attributes. */
export function replaceUniqueText(document: unknown, originalText: string, proposedText: string): TextReplacementResult {
	if (!document || typeof document !== "object") return { ok: false, reason: "not-found" };
	const root = document as JsonNode;
	const matches: JsonNode[] = [];

	function find(node: JsonNode) {
		if (node.type === "text" && typeof node.text === "string" && node.text.includes(originalText)) matches.push(node);
		for (const child of node.content ?? []) find(child);
	}
	find(root);

	const occurrences = matches.reduce((count, node) => {
		let from = 0;
		let nodeCount = 0;
		while ((from = (node.text ?? "").indexOf(originalText, from)) !== -1) {
			nodeCount += 1;
			from += originalText.length;
		}
		return count + nodeCount;
	}, 0);

	if (occurrences === 0) return { ok: false, reason: "not-found" };
	if (occurrences !== 1) return { ok: false, reason: "ambiguous" };

	let replaced = false;
	function clone(node: JsonNode): JsonNode {
		if (!replaced && node.type === "text" && typeof node.text === "string" && node.text.includes(originalText)) {
			replaced = true;
			return { ...node, text: node.text.replace(originalText, proposedText) };
		}
		return { ...node, ...(node.content ? { content: node.content.map(clone) } : {}) };
	}
	return { ok: true, document: clone(root) };
}
